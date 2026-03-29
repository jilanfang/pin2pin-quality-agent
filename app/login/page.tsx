import React from "react";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth-panel";
import { getServerAuthState } from "@/lib/server/auth";

export default async function LoginPage() {
  const auth = await getServerAuthState();

  if (!auth.authEnabled) {
    redirect("/");
  }

  if (auth.isAuthenticated) {
    redirect("/");
  }

  return <AuthPanel />;
}
