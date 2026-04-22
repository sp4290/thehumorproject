"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AuthStatusSection from "@/components/AuthStatusSection"

type CaptionRow = {
    id: string
    content: string
    image_id: string | null
    image_url?: string | null
}

type ViewMode = "feed" | "flashcard"

const PAGE_SIZE = 20

function findFirstUnvotedIndex(
    captions: CaptionRow[],
    votes: Record<string, number>
) {
    return captions.findIndex((caption) => votes[caption.id] === undefined)
}

function findNextUnvotedIndex(
    captions: CaptionRow[],
    votes: Record<string, number>,
    currentIndex: number
) {
    for (let i = currentIndex + 1; i < captions.length; i += 1) {
        if (votes[captions[i].id] === undefined) {
            return i
        }
    }
    return -1
}

export default function Home() {
    const [captions, setCaptions] = useState<CaptionRow[]>([])
    const [generatedCaptions, setGeneratedCaptions] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [userVotes, setUserVotes] = useState<Record<string, number>>({})
    const [file, setFile] = useState<File | null>(null)
    const [uploadLoading, setUploadLoading] = useState(false)
    const [uploadMessage, setUploadMessage] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>("feed")

    const [page, setPage] = useState(0)
    const [initialLoading, setInitialLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    const [flashcardIndex, setFlashcardIndex] = useState(-1)
    const [totalCaptionCount, setTotalCaptionCount] = useState(0)

    useEffect(() => {
        const loadTotalCount = async () => {
            const { count, error } = await supabase
                .from("captions")
                .select("*", { count: "exact", head: true })

            if (error) {
                console.log("Failed to load caption count:", error)
                return
            }

            setTotalCaptionCount(count ?? 0)
        }

        loadTotalCount()
    }, [])

    useEffect(() => {
        const loadData = async () => {
            if (page === 0) setInitialLoading(true)
            else setLoadingMore(true)

            try {
                const [{ data: captionData, error: captionError }, { data: userData }] =
                    await Promise.all([
                        supabase
                            .from("captions")
                            .select("id, content, image_id")
                            .order("id", { ascending: true })
                            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
                        supabase.auth.getUser(),
                    ])

                if (captionError) {
                    console.log("Caption load failed:", captionError)
                    setHasMore(false)
                    return
                }

                const currentUser = userData.user
                setUser(currentUser)

                const caps = (captionData || []) as CaptionRow[]

                if (caps.length < PAGE_SIZE) {
                    setHasMore(false)
                } else {
                    setHasMore(true)
                }

                const imageIds = Array.from(
                    new Set(caps.map((c) => c.image_id).filter(Boolean) as string[])
                )

                const imageMap = new Map<string, string>()

                if (imageIds.length > 0) {
                    const { data: images, error: imageError } = await supabase
                        .from("images")
                        .select("id, url")
                        .in("id", imageIds)

                    if (imageError) {
                        console.log("Image load failed:", imageError)
                    }

                    images?.forEach((img: any) => {
                        imageMap.set(img.id, img.url)
                    })
                }

                const merged = caps.map((c) => ({
                    ...c,
                    image_url: c.image_id
                        ? imageMap.get(c.image_id) || null
                        : null,
                }))

                setCaptions((prev) => {
                    if (page === 0) return merged

                    const seen = new Set(prev.map((p) => p.id))
                    const appended = merged.filter((m) => !seen.has(m.id))
                    return [...prev, ...appended]
                })

                if (currentUser && page === 0) {
                    const { data: votes, error: voteError } = await supabase
                        .from("caption_votes")
                        .select("caption_id, vote_value")
                        .eq("profile_id", currentUser.id)

                    if (voteError) {
                        console.log("Vote load failed:", voteError)
                    }

                    const voteMap: Record<string, number> = {}
                    votes?.forEach((v: any) => {
                        voteMap[v.caption_id] = v.vote_value
                    })
                    setUserVotes(voteMap)
                }
            } catch (error) {
                console.log("Load failed:", error)
                setHasMore(false)
            } finally {
                setInitialLoading(false)
                setLoadingMore(false)
            }
        }

        loadData()
    }, [page])

    useEffect(() => {
        const initUser = async () => {
            const { data } = await supabase.auth.getUser()
            const currentUser = data.user ?? null
            setUser(currentUser)

            if (currentUser) {
                const { data: votes } = await supabase
                    .from("caption_votes")
                    .select("caption_id, vote_value")
                    .eq("profile_id", currentUser.id)

                const voteMap: Record<string, number> = {}
                votes?.forEach((v: any) => {
                    voteMap[v.caption_id] = v.vote_value
                })
                setUserVotes(voteMap)
            } else {
                setUserVotes({})
            }
        }

        initUser()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user ?? null
            setUser(nextUser)
        })

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        if (viewMode !== "flashcard") return
        if (!user) return
        if (captions.length === 0) return

        const firstUnvoted = findFirstUnvotedIndex(captions, userVotes)

        if (firstUnvoted >= 0) {
            setFlashcardIndex(firstUnvoted)
        } else if (hasMore && !loadingMore) {
            setPage((prev) => prev + 1)
        } else {
            setFlashcardIndex(-1)
        }
    }, [viewMode, captions, userVotes, hasMore, loadingMore, user])

    const totalVotedCount = useMemo(() => {
        return Object.keys(userVotes).length
    }, [userVotes])

    const totalRemainingCount = useMemo(() => {
        return Math.max(totalCaptionCount - totalVotedCount, 0)
    }, [totalCaptionCount, totalVotedCount])

    const flashcardCaption =
        flashcardIndex >= 0 && flashcardIndex < captions.length
            ? captions[flashcardIndex]
            : null

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.log("Logout failed:", error)
        }
    }

    const handleVote = async (captionId: string, value: number) => {
        if (!user) {
            alert("Please log in before voting.")
            return
        }

        const optimisticVotes = { ...userVotes, [captionId]: value }
        setUserVotes(optimisticVotes)

        const { data: existingVote, error: fetchError } = await supabase
            .from("caption_votes")
            .select("id")
            .eq("profile_id", user.id)
            .eq("caption_id", captionId)
            .maybeSingle()

        if (fetchError) {
            console.log("Fetch existing vote failed:", fetchError)
            return
        }

        if (existingVote) {
            const { error } = await supabase
                .from("caption_votes")
                .update({
                    vote_value: value,
                    modified_by_user_id: user.id,
                })
                .eq("id", existingVote.id)

            if (error) {
                console.log("Update vote failed:", error)
            }
        } else {
            const { error } = await supabase
                .from("caption_votes")
                .insert({
                    profile_id: user.id,
                    caption_id: captionId,
                    vote_value: value,
                    created_by_user_id: user.id,
                    modified_by_user_id: user.id,
                })

            if (error) {
                console.log("Insert vote failed:", error)
            }
        }

        if (viewMode === "flashcard") {
            const nextUnvotedIndex = findNextUnvotedIndex(
                captions,
                optimisticVotes,
                flashcardIndex
            )

            if (nextUnvotedIndex >= 0) {
                setFlashcardIndex(nextUnvotedIndex)
            } else if (hasMore && !loadingMore) {
                setPage((prev) => prev + 1)
            } else {
                setFlashcardIndex(-1)
            }
        }
    }

    const handleUpload = async () => {
        if (!file || !user) {
            alert("Please log in and choose an image first.")
            return
        }

        setUploadLoading(true)
        setUploadMessage("")
        setGeneratedCaptions([])

        try {
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData.session?.access_token
            if (!token) throw new Error("No active session found")

            const presignedRes = await fetch(
                "https://api.almostcrackd.ai/pipeline/generate-presigned-url",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ contentType: file.type }),
                }
            )

            const { presignedUrl, cdnUrl } = await presignedRes.json()

            await fetch(presignedUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            })

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

            const captionRes = await fetch(
                "https://api.almostcrackd.ai/pipeline/generate-captions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ imageId }),
                }
            )

            const captionData = await captionRes.json()
            const normalizedCaptions = Array.isArray(captionData) ? captionData : []

            setGeneratedCaptions(normalizedCaptions)
            setUploadMessage(
                normalizedCaptions.length > 0
                    ? `Done — ${normalizedCaptions.length} caption suggestion(s) generated.`
                    : "Image uploaded, but no captions were returned."
            )
        } catch (error) {
            console.log("Upload/generation failed:", error)
            setUploadMessage("Something went wrong while generating captions. Please try again.")
        } finally {
            setUploadLoading(false)
        }
    }

    return (
        <div className="home-page">
            <header className="home-header">
                <div>
                    <h1 className="home-title">The Humor Project</h1>
                </div>

                <div className="header-actions">
                    <a href="/protected" className="secondary-link">
                        Vote History
                    </a>
                    <button
                        type="button"
                        className="secondary-link"
                        onClick={() =>
                            setViewMode((prev) =>
                                prev === "feed" ? "flashcard" : "feed"
                            )
                        }
                    >
                        {viewMode === "feed" ? "Flashcard Mode" : "Feed Mode"}
                    </button>
                </div>
            </header>

            <AuthStatusSection user={user} onLogout={handleLogout} />

            {user && (
                <section className="upload-card">
                    <div>
                        <h2>Upload an image and generate captions</h2>
                        <p>Upload your own image and generate caption suggestions below.</p>
                    </div>

                    <div className="upload-controls">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />

                        <button
                            onClick={handleUpload}
                            disabled={uploadLoading}
                            className="primary-button"
                        >
                            {uploadLoading ? "Generating..." : "Upload & Generate"}
                        </button>
                    </div>

                    {uploadMessage ? (
                        <div className="info-message">
                            <p>{uploadMessage}</p>
                        </div>
                    ) : null}

                    {generatedCaptions.length > 0 && (
                        <div className="generated-results">
                            <h3>Generated Captions</h3>
                            <div className="generated-caption-list">
                                {generatedCaptions.map((caption: any, index: number) => (
                                    <div key={index} className="generated-caption-item">
                                        {caption.content || caption.text || `Caption ${index + 1}`}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            <section className="progress-card">
                <h2>Voting Progress</h2>
                <div className="history-summary">
                    <div className="summary-card">
                        <strong>{totalVotedCount}</strong>
                        <span>Voted</span>
                    </div>
                    <div className="summary-card">
                        <strong>{totalRemainingCount}</strong>
                        <span>Remaining</span>
                    </div>
                </div>

                <div className="progress-bar-track">
                    <div
                        className="progress-bar-fill"
                        style={{
                            width:
                                totalCaptionCount > 0
                                    ? `${(totalVotedCount / totalCaptionCount) * 100}%`
                                    : "0%",
                        }}
                    />
                </div>
            </section>

            {viewMode === "feed" ? (
                <section className="feed-section">
                    {initialLoading ? (
                        <article className="meme-card">
                            <p className="meme-caption">Loading memes...</p>
                        </article>
                    ) : captions.length === 0 ? (
                        <article className="meme-card">
                            <p className="meme-caption">No memes available right now.</p>
                        </article>
                    ) : (
                        captions.map((caption) => (
                            <article key={caption.id} className="meme-card">
                                <div className="meme-image-frame">
                                    {caption.image_url ? (
                                        <img
                                            src={caption.image_url}
                                            alt="meme"
                                            className="meme-image"
                                        />
                                    ) : (
                                        <span className="image-fallback">No image found</span>
                                    )}
                                </div>

                                <p className="meme-caption">{caption.content}</p>

                                {user ? (
                                    <div className="vote-row">
                                        <button
                                            onClick={() => handleVote(caption.id, 1)}
                                            className={`vote-pill ${
                                                userVotes[caption.id] === 1 ? "selected" : ""
                                            }`}
                                        >
                                            👍 Upvote
                                        </button>

                                        <button
                                            onClick={() => handleVote(caption.id, -1)}
                                            className={`vote-pill ${
                                                userVotes[caption.id] === -1 ? "selected" : ""
                                            }`}
                                        >
                                            👎 Downvote
                                        </button>
                                    </div>
                                ) : (
                                    <p className="login-note">Log in to vote on captions.</p>
                                )}
                            </article>
                        ))
                    )}
                </section>
            ) : (
                <section className="feed-section">
                    {!user ? (
                        <article className="meme-card">
                            <p className="meme-caption">Log in to vote on captions.</p>
                        </article>
                    ) : flashcardCaption ? (
                        <article className="meme-card flashcard-card">
                            <div className="meme-image-frame">
                                {flashcardCaption.image_url ? (
                                    <img
                                        src={flashcardCaption.image_url}
                                        alt="meme"
                                        className="meme-image"
                                    />
                                ) : (
                                    <span className="image-fallback">No image found</span>
                                )}
                            </div>

                            <p className="meme-caption">{flashcardCaption.content}</p>

                            <div className="vote-row">
                                <button
                                    onClick={() => handleVote(flashcardCaption.id, 1)}
                                    className={`vote-pill ${
                                        userVotes[flashcardCaption.id] === 1 ? "selected" : ""
                                    }`}
                                >
                                    👍 Upvote
                                </button>

                                <button
                                    onClick={() => handleVote(flashcardCaption.id, -1)}
                                    className={`vote-pill ${
                                        userVotes[flashcardCaption.id] === -1 ? "selected" : ""
                                    }`}
                                >
                                    👎 Downvote
                                </button>
                            </div>
                        </article>
                    ) : (
                        <article className="meme-card">
                            <p className="meme-caption">You’ve voted on all available memes.</p>
                        </article>
                    )}
                </section>
            )}

            {viewMode === "feed" && !initialLoading && (
                <section className="load-more-section">
                    {hasMore ? (
                        <button
                            onClick={() => setPage((prev) => prev + 1)}
                            disabled={loadingMore}
                            className="primary-button"
                        >
                            {loadingMore ? "Loading..." : "Load More"}
                        </button>
                    ) : (
                        <p className="end-note">You’ve reached the end of the current feed.</p>
                    )}
                </section>
            )}
        </div>
    )
}