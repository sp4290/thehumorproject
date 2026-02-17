'use client'

import { supabase } from '@/lib/supabase'

export default function LoginButton() {
    const login = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    return <button onClick={login}>Login with Google</button>
}

