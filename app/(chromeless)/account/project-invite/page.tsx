"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { LinkButton } from "@/components/eva-dashboard/account/shared";

function InviteAcceptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Missing token. Use the link from your invitation email.");
      return;
    }
    setStatus("working");
    void apiPost<{ ok: boolean; projectId: string }>(
      API_ROUTES.projectInvitationAccept,
      { token },
    )
      .then((r) => {
        setProjectId(r.projectId);
        setStatus("ok");
        router.replace(accountPaths.project(r.projectId));
      })
      .catch(() => {
        setStatus("err");
        setMessage(
          "Could not accept invitation. You must be signed in with the invited email.",
        );
      });
  }, [token, router]);

  if (status === "working") {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Joining project…</p>
      </div>
    );
  }

  if (status === "err") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <p className="text-foreground text-sm">{message}</p>
        <LinkButton href={accountPaths.projects} variant="secondary">
          Back to projects
        </LinkButton>
      </div>
    );
  }

  if (status === "ok" && projectId) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Redirecting to project…
      </div>
    );
  }

  return null;
}

export default function ProjectInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-8 text-center text-sm">
          Loading…
        </div>
      }
    >
      <InviteAcceptInner />
    </Suspense>
  );
}
