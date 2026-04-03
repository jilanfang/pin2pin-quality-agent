import React from "react";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth-panel";
import { getRegisterConfig, getServerAuthState } from "@/lib/server/auth";

export default async function LoginPage() {
  const auth = await getServerAuthState();
  const registerConfig = getRegisterConfig();

  if (!auth.authEnabled) {
    redirect("/");
  }

  if (auth.isAuthenticated) {
    redirect("/");
  }

  return (
    <AuthPanel
      allowSelfRegister={registerConfig.allowSelfRegister}
      requiresInvite={registerConfig.inviteCodes.length > 0}
    />
  );
}
