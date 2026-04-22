"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type CaptionRow = {
    id: string
    content: string
    image_id: string | null
    image_url?: string | null
}

export default function ListPage() {
    const [captions, setCaptions] = useState<CaptionRow[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [user, setUser] = useState<any>(null)
    const [userVotes, setUserVotes] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState("")
    const [totalCaptionCount, setTotalCaptionCount] = useState(0)

    const loadTotalCaptionCount = async () => {
        const { count, error } = await supabase
            .from("captions")
            .select("id", { count: "exact", head: true })

        if (error) {
            console.log("Failed to load caption count:", error)
            return
        }

        setTotalCaptionCount(count ?? 0)
    }

    const loadUserVotes = async (userId: string) => {
        const { data: votes, error } = await supabase
            .from("caption_votes")
            .select("caption_id, vote_value")
            .eq("profile_id", userId)

        if (error) {
            console.log("Failed to load votes:", error)
            setUserVotes({})
            return {}
        }

        const voteMap: Record<string, number> = {}
        votes?.forEach((vote: any) => {
            voteMap[vote.caption_id] = vote.vote_value
        })

        setUserVotes(voteMap)
        return voteMap
    }

    const attachImagesToCaptions = async (rows: CaptionRow[]) => {
        const imageIds = Array.from(
            new Set(rows.map((caption) => caption.image_id).filter(Boolean) as string[])
        )

        if (imageIds.length === 0) {
            return rows.map((caption) => ({
                ...caption,
                image_url: null,
            }))
        }

        const { data: images, error } = await supabase
            .from("images")
            .select("id, url")
            .in("id", imageIds)

        if (error) {
            console.log("Failed to load images:", error)
            return rows.map((caption) => ({
                ...caption,
                image_url: null,
            }))
        }

        const imageMap = new Map<string, string>()
        images?.forEach((img: any) => {
            imageMap.set(img.id, img.url)
        })

        return rows.map((caption) => ({
            ...caption,
            image_url: caption.image_id ? imageMap.get(caption.image_id) || null : null,
        }))
    }

    const loadNextUnvotedCaption = async (
        currentUser: any,
        votesOverride?: Record<string, number>
    ) => {
        if (!currentUser) {
            setCaptions([])
            setCurrentIndex(0)
            return
        }

        setLoading(true)

        try {
            const effectiveVotes = votesOverride ?? userVotes
            const votedCaptionIds = Object.keys(effectiveVotes)

            let query = supabase
                .from("captions")
                .select("id, content, image_id")
                .order("id", { ascending: true })
                .limit(1)

            if (votedCaptionIds.length > 0) {
                const formattedIds = votedCaptionIds.map((id) => `"${id}"`).join(",")
                query = query.not("id", "in", `(${formattedIds})`)
            }

            const { data: captionData, error: captionError } = await query

            if (captionError) {
                console.log("Failed to load next unvoted caption:", captionError)
                setCaptions([])
                setCurrentIndex(0)
                return
            }

            const rawCaptions = (captionData || []) as CaptionRow[]
            const merged = await attachImagesToCaptions(rawCaptions)

            setCaptions(merged)
            setCurrentIndex(0)
        } catch (error) {
            console.log("Failed to load next unvoted caption:", error)
            setCaptions([])
            setCurrentIndex(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)

            const {
                data: { user: currentUser },
            } = await supabase.auth.getUser()

            setUser(currentUser ?? null)

            await loadTotalCaptionCount()

            if (currentUser) {
                const voteMap = await loadUserVotes(currentUser.id)
                await loadNextUnvotedCaption(currentUser, voteMap)
            } else {
                setUserVotes({})
                setCaptions([])
                setCurrentIndex(0)
                setLoading(false)
            }
        }

        loadData()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const nextUser = session?.user ?? null
            setUser(nextUser)
            setStatusMessage("")

            if (nextUser) {
                const voteMap = await loadUserVotes(nextUser.id)
                await loadNextUnvotedCaption(nextUser, voteMap)
            } else {
                setUserVotes({})
                setCaptions([])
                setCurrentIndex(0)
                setLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const totalVotedCount = useMemo(() => {
        return Object.keys(userVotes).length
    }, [userVotes])

    const remainingCount = useMemo(() => {
        return Math.max(totalCaptionCount - totalVotedCount, 0)
    }, [totalCaptionCount, totalVotedCount])

    const currentCaption = captions[currentIndex] || null

    const saveVote = async (captionId: string, value: number) => {
        if (!user) {
            alert("You must be logged in to vote.")
            return
        }

        const previousValue = userVotes[captionId]
        const optimisticVotes = { ...userVotes, [captionId]: value }

        setUserVotes(optimisticVotes)
        setStatusMessage(value === 1 ? "Upvoted." : "Downvoted.")

        const { data: existingVote, error: fetchError } = await supabase
            .from("caption_votes")
            .select("id")
            .eq("profile_id", user.id)
            .eq("caption_id", captionId)
            .maybeSingle()

        if (fetchError) {
            console.log("Failed to check existing vote:", fetchError)
            setUserVotes((prev) => {
                const next = { ...prev }
                if (previousValue === undefined) {
                    delete next[captionId]
                } else {
                    next[captionId] = previousValue
                }
                return next
            })
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
                console.log("Failed to update vote:", error)
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
                console.log("Failed to insert vote:", error)
            }
        }

        await loadNextUnvotedCaption(user, optimisticVotes)
    }

    if (loading) {
        return (
            <div className="quickvote-page">
                <p>Loading quick vote mode...</p>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="quickvote-page">
                <h1>Quick Vote Mode</h1>
                <p>Log in from the home page to use quick voting.</p>
                <a href="/">Go to Home</a>
            </div>
        )
    }

    if (!currentCaption) {
        return (
            <div className="quickvote-page">
                <h1>Quick Vote Mode</h1>
                <p>You’ve voted on all available memes.</p>
                <a href="/">Back to main app</a>
            </div>
        )
    }

    return (
        <div className="quickvote-page">
            <div className="quickvote-header">
                <div>
                    <h1>Quick Vote Mode</h1>
                    <p className="quickvote-subtitle">
                        Faster, one-by-one voting based on Week 9 user feedback.
                    </p>
                </div>

                <div className="quickvote-links">
                    <a href="/">Main Feed</a>
                    <a href="/protected">Vote History</a>
                </div>
            </div>

            <div className="quickvote-progress-card">
                <p>
                    <strong>{remainingCount}</strong> meme{remainingCount === 1 ? "" : "s"} left to vote
                </p>
                <p>
                    Card {remainingCount > 0 ? 1 : 0} of {remainingCount > 0 ? 1 : 0}
                </p>
                {statusMessage ? <p>{statusMessage}</p> : null}
            </div>

            <div className="quickvote-card">
                <div className="quickvote-image-frame">
                    {currentCaption.image_url ? (
                        <img
                            src={currentCaption.image_url}
                            alt="Meme"
                            className="quickvote-image"
                        />
                    ) : (
                        <div className="quickvote-image-fallback">No image found</div>
                    )}
                </div>

                <p className="quickvote-caption">{currentCaption.content}</p>

                <div className="quickvote-actions">
                    <button
                        onClick={() => saveVote(currentCaption.id, 1)}
                        className={`vote-button ${
                            userVotes[currentCaption.id] === 1 ? "selected" : ""
                        }`}
                    >
                        👍 Funny
                    </button>
                    <button
                        onClick={() => saveVote(currentCaption.id, -1)}
                        className={`vote-button ${
                            userVotes[currentCaption.id] === -1 ? "selected" : ""
                        }`}
                    >
                        👎 Not funny
                    </button>
                </div>
            </div>
        </div>
    )
}