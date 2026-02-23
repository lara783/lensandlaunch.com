import { createBrowserClient } from "@supabase/ssr";

// Types for this project are in lib/supabase/types.ts
// We don't pass the generic to avoid type inference conflicts with partial schema
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
