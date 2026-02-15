import Link from "next/link";

export default function Home() {
    return (
        <main style={{ padding: "20px" }}>
            <h1>Hello World</h1>

            <p>Supabase Data</p>

            <Link href="/list">View Supabase Data</Link>
        </main>
    );
}