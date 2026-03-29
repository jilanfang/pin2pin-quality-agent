"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAuthEnv } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseAuthEnv();
  return createBrowserClient(url, publishableKey);
}
