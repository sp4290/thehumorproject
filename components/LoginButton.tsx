'use client'

import { supabase } from '@/lib/supabase'

export default function LoginButton() {
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
        <div className="mb-4 space-x-2">
            <button
                onClick={login}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Login with Google
            </button>

            <button
                onClick={logout}
                className="bg-gray-500 text-white px-4 py-2 rounded"
            >
                Logout
            </button>
        </div>
    )
}
