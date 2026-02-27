"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import LoginButton from "@/components/LoginButton"

export default function Home() {
    const [captions, setCaptions] = useState<any[]>([])
    const [generatedCaptions, setGeneratedCaptions] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [userVotes, setUserVotes] = useState<Record<string, number>>({})
    const [file, setFile] = useState<File | null>(null)
    const [uploadLoading, setUploadLoading] = useState(false)
    const [loading, setLoading] = useState(true)

    const FRAME_WIDTH = 600
    const FRAME_HEIGHT = 360

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)

            const [{ data: captionData }, { data: userData }] =
                await Promise.all([
                    supabase.from("captions").select("id, content, image_id").limit(20),
                    supabase.auth.getUser(),
                ])

            const caps = captionData || []
            setUser(userData.user)

            const imageIds = caps.map((c: any) => c.image_id).filter(Boolean)

            let imageMap = new Map<string, string>()

            if (imageIds.length > 0) {
                const { data: images } = await supabase
                    .from("images")
                    .select("id, url")
                    .in("id", imageIds)

                images?.forEach((img: any) => {
                    imageMap.set(img.id, img.url)
                })
            }

            const merged = caps.map((c: any) => ({
                ...c,
                image_url: c.image_id ? imageMap.get(c.image_id) || null : null,
            }))

            setCaptions(merged)
            setLoading(false)
        }

        loadData()
    }, [])

    const handleVote = async (captionId: string, value: number) => {
        if (!user) return

        setUserVotes((prev) => ({ ...prev, [captionId]: value }))

        const now = new Date().toISOString()

        await supabase.from("caption_votes").upsert(
            {
                profile_id: user.id,
                caption_id: captionId,
                vote_value: value,
                created_datetime_utc: now,
                modified_datetime_utc: now,
            },
            { onConflict: "profile_id,caption_id" }
        )
    }

    const handleUpload = async () => {
        if (!file || !user) {
            alert("Login and select a file first")
            return
        }

        setUploadLoading(true)

        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
            alert("No auth token found")
            return
        }

        // STEP 1
        const presignedRes = await fetch(
            "https://api.almostcrackd.ai/pipeline/generate-presigned-url",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contentType: file.type,
                }),
            }
        )

        const { presignedUrl, cdnUrl } = await presignedRes.json()

        // STEP 2
        await fetch(presignedUrl, {
            method: "PUT",
            headers: {
                "Content-Type": file.type,
            },
            body: file,
        })

        // STEP 3
        const registerRes = await fetch(
            "https://api.almostcrackd.ai/pipeline/upload-image-from-url",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageUrl: cdnUrl,
                    isCommonUse: false,
                }),
            }
        )

        const { imageId } = await registerRes.json()

        // STEP 4
        const captionRes = await fetch(
            "https://api.almostcrackd.ai/pipeline/generate-captions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageId,
                }),
            }
        )

        const captionData = await captionRes.json()
        setGeneratedCaptions(captionData)
        setUploadLoading(false)
    }

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 20 }}>
                Loading...
            </div>
        )
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <LoginButton />

            <p style={{ marginTop: 20, fontWeight: 600 }}>
                {user ? "Logged in" : "Not logged in"}
            </p>

            {/* ✅ WEEK 5 SECTION ADDED HERE */}
            {user && (
                <div style={{ marginTop: 30, marginBottom: 60 }}>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                        onChange={(e) =>
                            setFile(e.target.files?.[0] || null)
                        }
                    />

                    <button
                        onClick={handleUpload}
                        style={{
                            marginLeft: 15,
                            padding: "10px 25px",
                            border: "2px solid black",
                            borderRadius: 30,
                        }}
                    >
                        Upload & Generate
                    </button>

                    {uploadLoading && (
                        <p style={{ marginTop: 15 }}>
                            Generating captions...
                        </p>
                    )}

                    {generatedCaptions.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <h3>Generated Captions:</h3>
                            {generatedCaptions.map((c: any, index: number) => (
                                <p key={index} style={{ marginTop: 8 }}>
                                    {c.content || c.text}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ORIGINAL WEEK 4 FEED BELOW */}
            {captions.map((caption) => (
                <div
                    key={caption.id}
                    style={{
                        width: FRAME_WIDTH,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        marginBottom: 120,
                    }}
                >
                    <div
                        style={{
                            width: FRAME_WIDTH,
                            height: FRAME_HEIGHT,
                            backgroundColor: "black",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 16,
                            overflow: "hidden",
                        }}
                    >
                        {caption.image_url ? (
                            <img
                                src={caption.image_url}
                                alt="meme"
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                    objectFit: "contain",
                                }}
                            />
                        ) : (
                            <span style={{ color: "white" }}>No image found</span>
                        )}
                    </div>

                    <p
                        style={{
                            marginTop: 30,
                            fontSize: 22,
                            textAlign: "center",
                        }}
                    >
                        {caption.content}
                    </p>

                    {user && (
                        <div
                            style={{
                                marginTop: 30,
                                display: "flex",
                                gap: 40,
                                justifyContent: "center",
                            }}
                        >
                            <button
                                onClick={() => handleVote(caption.id, 1)}
                                style={{
                                    padding: "14px 40px",
                                    borderRadius: 40,
                                    border: "2px solid black",
                                    backgroundColor:
                                        userVotes[caption.id] === 1 ? "#facc15" : "white",
                                }}
                            >
                                👍 Upvote
                            </button>

                            <button
                                onClick={() => handleVote(caption.id, -1)}
                                style={{
                                    padding: "14px 40px",
                                    borderRadius: 40,
                                    border: "2px solid black",
                                    backgroundColor:
                                        userVotes[caption.id] === -1 ? "#facc15" : "white",
                                }}
                            >
                                👎 Downvote
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}