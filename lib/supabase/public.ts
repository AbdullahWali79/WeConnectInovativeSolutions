import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createSupabasePublicClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
