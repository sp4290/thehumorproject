"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import LoginButton from "@/components/LoginButton"

export default function Home() {
    const [captions, setCaptions] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [userVotes, setUserVotes] = useState<Record<string, number>>({})

    useEffect(() => {
        const loadData = async () => {
            const { data } = await supabase.from("captions").select("*")
            setCaptions(data || [])

            const { data: userData } = await supabase.auth.getUser()
            setUser(userData.user)
        }

        loadData()
    }, [])

    const handleVote = async (captionId: string, value: number) => {
        if (!user) return

        // 🔥 Update UI immediately
        setUserVotes((prev) => ({
            ...prev,
            [captionId]: value,
        }))

        const now = new Date().toISOString()

        await supabase
            .from("caption_votes")
            .upsert(
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

    return (
        <div className="p-8">
            <LoginButton />

            <p className="mb-4 font-semibold">
                {user ? "Logged in" : "Not logged in"}
            </p>

            {captions.map((caption) => (
                <div key={caption.id} className="border p-4 mb-4 rounded">
                    <p>{caption.content}</p>

                    {user && (
                        <div className="mt-3 flex gap-3">
                            <button
                                onClick={() => handleVote(caption.id, 1)}
                                style={{
                                    backgroundColor:
                                        userVotes[caption.id] === 1 ? "#16a34a" : "#e5e7eb",
                                    color: userVotes[caption.id] === 1 ? "white" : "black",
                                }}
                                className="px-4 py-2 rounded border"
                            >
                                👍 Upvote
                            </button>

                            <button
                                onClick={() => handleVote(caption.id, -1)}
                                style={{
                                    backgroundColor:
                                        userVotes[caption.id] === -1 ? "#dc2626" : "#e5e7eb",
                                    color: userVotes[caption.id] === -1 ? "white" : "black",
                                }}
                                className="px-4 py-2 rounded border"
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