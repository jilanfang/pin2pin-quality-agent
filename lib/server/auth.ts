import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RequestUserContext } from "@/lib/server/api";

export type ServerAuthState = RequestUserContext & {
  authEnabled: boolean;
  email: string | null;
};

export async function getServerAuthState(): Promise<ServerAuthState> {
  if (!hasSupabaseAuthEnv()) {
    return {
      authEnabled: false,
      userId: null,
      isAuthenticated: false,
      email: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    authEnabled: true,
    userId: user?.id ?? null,
    isAuthenticated: Boolean(user),
    email: user?.email ?? null,
  };
}

export function assertAuthenticated(
  auth: ServerAuthState
): asserts auth is ServerAuthState & { userId: string; isAuthenticated: true; authEnabled: true } {
  if (auth.authEnabled && !auth.isAuthenticated) {
    throw new Error("Authentication required");
  }
}
