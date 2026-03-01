'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function LoginButton() {
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user)
        })

        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            supabase.auth.getUser().then(({ data }) => {
                setUser(data.user)
            })
        })

        return () => {
            listener.subscription.unsubscribe()
        }
    }, [])

    const login = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    const logout = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    return (
        <div className="flex gap-4">
            {!user ? (
                <button
                    onClick={login}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Login with Google
                </button>
            ) : (
                <button
                    onClick={logout}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                    Logout
                </button>
            )}
        </div>
    )
}