import React from "react";
import { redirect } from "next/navigation";

import { Overview } from "@/components/overview";
import { getServerAuthState } from "@/lib/server/auth";

export default async function WorkspacePage() {
  const auth = await getServerAuthState();

  if (auth.authEnabled && !auth.isAuthenticated) {
    redirect("/login");
  }

  return <Overview />;
}
