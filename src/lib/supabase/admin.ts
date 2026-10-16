import { createClient } from "@supabase/supabase-js";

// Admin client menggunakan service_role key — bypass RLS, hanya dipakai di server
// JANGAN expose ke browser/client components
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey === "[SENSITIVE]") {
    serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan API key Supabase wajib diset di environment."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
