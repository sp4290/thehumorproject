'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Protected() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkUser = async () => {
            const { data } = await supabase.auth.getUser()

            if (!data.user) {
                router.push("/")
                return
            }

            setUser(data.user)
            setLoading(false)
        }

        checkUser()
    }, [])

    if (loading) return <p className="p-10 text-center">Loading...</p>

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-semibold">
                Welcome {user.email}
            </h1>
        </div>
    )
}