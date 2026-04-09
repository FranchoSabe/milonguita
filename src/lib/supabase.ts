import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (!_supabase && supabaseUrl && supabaseAnonKey) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  if (!_supabase) {
    // Return a dummy client during build/prerender — it won't be called
    // because all pages are "use client" and data fetches happen in useEffect
    _supabase = createClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }
  return _supabase;
})();
