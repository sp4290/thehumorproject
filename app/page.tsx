import Link from "next/link";

export default function Home() {
    return (
        <main>
            <h1>Hello World</h1>

            <p>
                Go to the data list page:
            </p>

            <Link href="/list">View Supabase Data</Link>
        </main>
    );
}