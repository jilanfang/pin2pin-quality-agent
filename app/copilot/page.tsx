import React from "react";
import { redirect } from "next/navigation";

import { Copilot } from "@/components/copilot";
import { getServerAuthState } from "@/lib/server/auth";

export default async function CopilotPage() {
  const auth = await getServerAuthState();

  if (auth.authEnabled && !auth.isAuthenticated) {
    redirect("/login");
  }

  return <Copilot />;
}
