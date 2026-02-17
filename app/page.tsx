import Link from "next/link";
import LoginButton from "@/components/LoginButton";

export default function Home() {
    return (
        <main style={{ padding: "20px" }}>
            <h1>Hello World</h1>

            <LoginButton />

            <p>
                <Link href="/list">View Supabase Data</Link>
            </p>
        </main>
    );
}
