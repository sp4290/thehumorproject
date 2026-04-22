"use client"

import LoginButton from "@/components/LoginButton"

type Props = {
    user: any
    onLogout: () => void
}

export default function AuthStatusSection({ user, onLogout }: Props) {
    const displayName =
        user?.user_metadata?.username ||
        user?.user_metadata?.full_name ||
        user?.email ||
        null

    return (
        <section className="auth-status-card">
            <div>
                <h2 className="auth-status-title">Account</h2>
                {user ? (
                    <p className="auth-status-text">
                        Welcome, {displayName}
                    </p>
                ) : (
                    <p className="auth-status-text">
                        You are currently logged out.
                    </p>
                )}
            </div>

            <div className="auth-status-actions">
                {user ? (
                    <button
                        type="button"
                        className="secondary-link"
                        onClick={onLogout}
                    >
                        Log Out
                    </button>
                ) : (
                    <div className="auth-login-slot">
                        <LoginButton />
                    </div>
                )}
            </div>
        </section>
    )
}