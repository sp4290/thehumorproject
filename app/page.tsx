"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import LoginButton from "@/components/LoginButton"

export default function Home() {
    const [captions, setCaptions] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)

    // Load captions
    const loadCaptions = async () => {
        const { data, error } = await supabase
            .from("captions")
            .select("*")

        if (error) console.error(error)

        setCaptions(data || [])
    }

    // Load user session
    const loadUser = async () => {
        const { data } = await supabase.auth.getUser()
        setUser(data.user)
    }

    useEffect(() => {
        loadCaptions()
        loadUser()

        // 🔥 Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            loadUser()
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const handleVote = async (captionId: string, value: number) => {
        if (!user) {
            alert("You must be logged in to vote")
            return
        }

        const now = new Date().toISOString()

        const { error } = await supabase
            .from("caption_votes")
            .insert([
                {
                    profile_id: user.id,
                    caption_id: captionId,
                    vote_value: value,
                    created_datetime_utc: now,
                    modified_datetime_utc: now,
                },
            ])

        if (error) {
            console.log("Insert failed:", error)
            alert("Vote failed")
        } else {
            alert("Vote recorded!")
        }
    }

    return (
        <div className="p-8">
            <LoginButton />

            <p className="mb-4 font-semibold">
                {user ? "Logged in" : "Not logged in"}
            </p>

            {captions.map((caption) => (
                <div key={caption.id} className="border p-4 mb-4 rounded">
                    <p>{caption.text}</p>

                    {user ? (
                        <div className="mt-3 space-x-2">
                            <button
                                onClick={() => handleVote(caption.id, 1)}
                                className="bg-green-500 text-white px-3 py-1 rounded"
                            >
                                👍 Upvote
                            </button>

                            <button
                                onClick={() => handleVote(caption.id, -1)}
                                className="bg-red-500 text-white px-3 py-1 rounded"
                            >
                                👎 Downvote
                            </button>
                        </div>
                    ) : (
                        <p className="text-gray-500 mt-2">
                            Log in to vote
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}
