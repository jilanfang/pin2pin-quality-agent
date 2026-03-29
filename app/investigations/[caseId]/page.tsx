import React from "react";
import { redirect } from "next/navigation";

import { Workspace } from "@/components/workspace";
import { getServerAuthState } from "@/lib/server/auth";

export default async function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const auth = await getServerAuthState();

  if (auth.authEnabled && !auth.isAuthenticated) {
    redirect("/login");
  }

  const { caseId } = await params;

  return <Workspace initialCaseId={caseId} />;
}
