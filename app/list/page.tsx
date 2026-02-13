import { supabase } from "../../lib/supabase";

export default async function ListPage() {
    const { data } = await supabase
        .from("images")
        .select("*")
        .limit(5);

    return (
        <div>
            <h1>Supabase Data</h1>
            <ul>
                {data?.map((item) => (
                    <li key={item.id}>
                        <img src={item.url} width="200" />
                        <p>{item.image_description}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
