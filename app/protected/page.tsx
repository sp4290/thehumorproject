"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import AuthStatusSection from "@/components/AuthStatusSection"

type VoteRow = {
    id: string
    caption_id: string
    vote_value: number
    created_datetime_utc?: string | null
    modified_datetime_utc?: string | null
}

type CaptionRow = {
    id: string
    content: string
    image_id: string | null
    image_url?: string | null
}

type VoteHistoryItem = VoteRow & {
    caption?: CaptionRow | null
}

const PAGE_SIZE = 20

export default function Protected() {
    const [user, setUser] = useState<any>(null)
    const [authResolved, setAuthResolved] = useState(false)

    const [history, setHistory] = useState<VoteHistoryItem[]>([])
    const [page, setPage] = useState(0)
    const [initialHistoryLoading, setInitialHistoryLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [totalVoteCount, setTotalVoteCount] = useState(0)

    const attachImagesToHistoryItems = async (items: VoteHistoryItem[]) => {
        const captionsWithIds = items
            .map((item) => item.caption)
            .filter(Boolean) as CaptionRow[]

        const imageIds = Array.from(
            new Set(
                captionsWithIds
                    .map((caption) => caption.image_id)
                    .filter(Boolean) as string[]
            )
        )

        if (imageIds.length === 0) {
            return items.map((item) => ({
                ...item,
                caption: item.caption
                    ? {
                        ...item.caption,
                        image_url: null,
                    }
                    : null,
            }))
        }

        const { data: images, error } = await supabase
            .from("images")
            .select("id, url")
            .in("id", imageIds)

        if (error) {
            console.log("Failed to load images for vote history:", error)
            return items.map((item) => ({
                ...item,
                caption: item.caption
                    ? {
                        ...item.caption,
                        image_url: null,
                    }
                    : null,
            }))
        }

        const imageMap = new Map<string, string>()
        images?.forEach((img: any) => {
            imageMap.set(img.id, img.url)
        })

        return items.map((item) => ({
            ...item,
            caption: item.caption
                ? {
                    ...item.caption,
                    image_url: item.caption.image_id
                        ? imageMap.get(item.caption.image_id) || null
                        : null,
                }
                : null,
        }))
    }

    const loadTotalVoteCount = async (userId: string) => {
        const { count, error } = await supabase
            .from("caption_votes")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", userId)

        if (error) {
            console.log("Failed to load total vote count:", error)
            setTotalVoteCount(0)
            return
        }

        setTotalVoteCount(count ?? 0)
    }

    const loadVoteHistoryPage = async (userId: string, targetPage: number) => {
        if (targetPage === 0) {
            setInitialHistoryLoading(true)
        } else {
            setLoadingMore(true)
        }

        try {
            const from = targetPage * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const { data: votes, error: votesError } = await supabase
                .from("caption_votes")
                .select("id, caption_id, vote_value, created_datetime_utc, modified_datetime_utc")
                .eq("profile_id", userId)
                .order("modified_datetime_utc", { ascending: false })
                .range(from, to)

            if (votesError) {
                console.log("Failed to load vote history:", votesError)
                if (targetPage === 0) {
                    setHistory([])
                }
                setHasMore(false)
                return
            }

            const voteRows = (votes || []) as VoteRow[]
            const captionIds = Array.from(new Set(voteRows.map((vote) => vote.caption_id)))

            let captionMap = new Map<string, CaptionRow>()

            if (captionIds.length > 0) {
                const { data: captions, error: captionsError } = await supabase
                    .from("captions")
                    .select("id, content, image_id")
                    .in("id", captionIds)

                if (captionsError) {
                    console.log("Failed to load captions for vote history:", captionsError)
                } else {
                    const captionRows = (captions || []) as CaptionRow[]
                    captionMap = new Map(
                        captionRows.map((caption) => [
                            caption.id,
                            { ...caption, image_url: null },
                        ])
                    )
                }
            }

            const mergedHistory: VoteHistoryItem[] = voteRows.map((vote) => ({
                ...vote,
                caption: captionMap.get(vote.caption_id) || null,
            }))

            const withImages = await attachImagesToHistoryItems(mergedHistory)

            setHistory((prev) => {
                if (targetPage === 0) {
                    return withImages
                }

                const existingIds = new Set(prev.map((item) => item.id))
                const nextItems = withImages.filter((item) => !existingIds.has(item.id))
                return [...prev, ...nextItems]
            })

            setHasMore(voteRows.length === PAGE_SIZE)
        } catch (error) {
            console.log("Unexpected vote history load failure:", error)
            if (targetPage === 0) {
                setHistory([])
            }
            setHasMore(false)
        } finally {
            if (targetPage === 0) {
                setInitialHistoryLoading(false)
            } else {
                setLoadingMore(false)
            }
        }
    }

    const resetHistoryState = () => {
        setHistory([])
        setPage(0)
        setHasMore(true)
        setTotalVoteCount(0)
        setInitialHistoryLoading(false)
    }

    useEffect(() => {
        const initUser = async () => {
            const { data, error } = await supabase.auth.getUser()

            if (error) {
                console.log("Failed to get user:", error)
                setUser(null)
                setAuthResolved(true)
                resetHistoryState()
                return
            }

            const currentUser = data.user ?? null
            setUser(currentUser)
            setAuthResolved(true)
        }

        initUser()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user ?? null
            setUser(nextUser)
            setAuthResolved(true)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        if (!authResolved) return

        if (!user) {
            resetHistoryState()
            return
        }

        setPage(0)

        const loadInitialHistory = async () => {
            await loadTotalVoteCount(user.id)
            await loadVoteHistoryPage(user.id, 0)
        }

        loadInitialHistory()
    }, [authResolved, user])

    useEffect(() => {
        if (!user) return
        if (page === 0) return

        loadVoteHistoryPage(user.id, page)
    }, [page, user])

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.log("Logout failed:", error)
        }
    }

    const loadedUpvotes = useMemo(
        () => history.filter((item) => item.vote_value === 1).length,
        [history]
    )

    const loadedDownvotes = useMemo(
        () => history.filter((item) => item.vote_value === -1).length,
        [history]
    )

    return (
        <div className="protected-page">
            <header className="home-header">
                <div>
                    <h1 className="home-title">The Humor Project</h1>
                </div>

                <div className="header-actions">
                    <a href="/" className="secondary-link">
                        Continue to Voting
                    </a>
                </div>
            </header>

            <AuthStatusSection user={user} onLogout={handleLogout} />

            {!authResolved ? (
                <section className="progress-card">
                    <h2>Vote History</h2>
                    <p>Loading your account...</p>
                </section>
            ) : !user ? (
                <section className="progress-card">
                    <h2>Vote History</h2>
                    <p>Please log in to view your vote history.</p>
                </section>
            ) : (
                <>
                    <section className="progress-card">
                        <h2>Vote History</h2>
                        <p>Review your past upvotes and downvotes below.</p>
                    </section>

                    <div className="history-summary">
                        <div className="summary-card">
                            <strong>{totalVoteCount}</strong>
                            <span>Total votes</span>
                        </div>
                        <div className="summary-card">
                            <strong>{loadedUpvotes}</strong>
                            <span>Loaded upvotes</span>
                        </div>
                        <div className="summary-card">
                            <strong>{loadedDownvotes}</strong>
                            <span>Loaded downvotes</span>
                        </div>
                    </div>

                    {initialHistoryLoading ? (
                        <div className="empty-history">
                            <p>Loading vote history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="empty-history">
                            <p>You have not voted yet.</p>
                            <a href="/" className="secondary-link">
                                Continue to Voting
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="history-grid">
                                {history.map((item) => (
                                    <article key={item.id} className="history-card">
                                        {item.caption?.image_url ? (
                                            <img
                                                src={item.caption.image_url}
                                                alt="Voted meme"
                                                className="history-image"
                                            />
                                        ) : (
                                            <div className="history-image">No image found</div>
                                        )}

                                        <p className="history-caption">
                                            {item.caption?.content || "Caption not found"}
                                        </p>

                                        <p className="history-vote">
                                            Vote:{" "}
                                            <strong>
                                                {item.vote_value === 1 ? "👍 Upvote" : "👎 Downvote"}
                                            </strong>
                                        </p>

                                        {item.modified_datetime_utc ? (
                                            <p className="history-time">
                                                Last updated:{" "}
                                                {new Date(item.modified_datetime_utc).toLocaleString()}
                                            </p>
                                        ) : null}
                                    </article>
                                ))}
                            </div>

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
                                    <p className="end-note">
                                        You’ve reached the end of your vote history.
                                    </p>
                                )}
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    )
}