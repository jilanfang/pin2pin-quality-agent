import React from "react";
import { redirect } from "next/navigation";

import { getServerAuthState } from "@/lib/server/auth";

import { InvestigationsIndex } from "@/components/investigations-index";

export default async function InvestigationsPage() {
  const auth = await getServerAuthState();

  if (auth.authEnabled && !auth.isAuthenticated) {
    redirect("/login");
  }

  return <InvestigationsIndex />;
}
