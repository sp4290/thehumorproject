import { supabase } from "../../lib/supabase";

export default async function Page() {
    const { data } = await supabase
        .from("images")
        .select("*")
        .limit(5);

    return (
        <main style={{ padding: "20px" }}>
            <h1>Supabase Data</h1>

            {data?.map((item: any) => (
                <div key={item.id} style={{ marginBottom: 40 }}>
                    <img src={item.url} width="300" />
                    <p>{item.image_description}</p>
                </div>
            ))}
        </main>
    );
}
