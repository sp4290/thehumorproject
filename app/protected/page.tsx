'use client'

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Protected() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });
    }, []);

    if (!user) {
        return <h1>Protected Page: You are Logged in!</h1>;
    }

    return <h1>Welcome {user.email}</h1>;
}
