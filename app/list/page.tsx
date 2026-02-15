import { supabase } from "@/lib/supabase";

export default async function ListPage() {
    const { data, error } = await supabase
        .from("images")   // change if table differs
        .select("*")
        .limit(20);

    if (error) {
        return <div>Error loading data</div>;
    }

    return (
        <main>
            <h1>Supabase Data</h1>

            <ul>
                {data?.map((row: any) => (
                    <li key={row.id}>
                        {JSON.stringify(row)}
                    </li>
                ))}
            </ul>
        </main>
    );
}