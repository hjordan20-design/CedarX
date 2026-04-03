import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "../config.js";
import type { Database } from "./types.js";

let _client: SupabaseClient<Database> | null = null;

export function getDb(): SupabaseClient<Database> {
    if (!_client) {
        _client = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { persistSession: false },
        });
    }
    return _client;
}
