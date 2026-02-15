import { supabase } from "@/lib/supabase";

export default async function ListPage() {
    const { data, error } = await supabase
        .from("images")
        .select("*")
        .limit(10);

    if (error) {
        return <div>Error loading data</div>;
    }

    return (
        <main style={{ padding: "20px" }}>
            <h1>Supabase Data</h1>

            <ul>
                {data?.map((row: any) => (
                    <li key={row.id} style={{ marginBottom: "20px" }}>
                        <img
                            src={row.url}
                            alt="image"
                            width="200"
                        />
                        <p>ID: {row.id}</p>
                    </li>
                ))}
            </ul>
        </main>
    );
}