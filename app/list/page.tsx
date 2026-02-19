"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ListPage() {
    const [captions, setCaptions] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const loadData = async () => {
            const { data: captionData } = await supabase
                .from("captions")
                .select("*")
                .limit(10)

            const { data: userData } = await supabase.auth.getUser()

            setCaptions(captionData || [])
            setUser(userData.user)
        }

        loadData()
    }, [])

    const handleVote = async (captionId: string, value: number) => {
        if (!user) {
            alert("You must be logged in to vote")
            return
        }

        const now = new Date().toISOString()

        const { data, error } = await supabase
            .from("caption_votes")
            .insert({
                profile_id: user.id,
                caption_id: captionId,
                vote_value: value,
                created_datetime_utc: now,
                modified_datetime_utc: now,
            })
            .select("*")

        if (error) {
            console.log("Insert failed:", error)
            alert("Vote failed")
        } else {
            alert("Vote recorded!")
        }
    }


    return (
        <div className="p-8">
            {captions.map((caption) => (
                <div key={caption.id} className="border p-4 mb-4">
                    <p>{caption.text}</p>

                    {user ? (
                        <div className="mt-2 space-x-2">
                            <button
                                onClick={() => handleVote(caption.caption_id, 1)}
                                className="bg-green-500 text-white px-3 py-1 rounded"
                            >
                                👍
                            </button>

                            <button
                                onClick={() => handleVote(caption.caption_id, -1)}
                                className="bg-red-500 text-white px-3 py-1 rounded"
                            >
                                👎
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-2">
                            Log in to vote
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}
