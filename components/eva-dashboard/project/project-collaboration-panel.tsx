"use client";

import { useState } from "react";
import { Users, Mail, Loader2, Eye, Pencil } from "lucide-react";
import {
  apiDelete,
  apiPatch,
  apiPost,
  API_ROUTES,
} from "@/lib/eva-dashboard/api";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import {
  Button,
  LinkButton,
  SectionCard,
  Eyebrow,
  useToast,
} from "@/components/eva-dashboard/account/shared";

type Props = {
  projectId: string;
  collaboration: NonNullable<ProjectDetailGetResponse["collaboration"]>;
  onRefresh: () => void;
};

export function ProjectCollaborationPanel({
  projectId,
  collaboration,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  async function sendInvite() {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    try {
      const res = await apiPost<{
        invitation: { id: string; email: string };
        token: string;
      }>(API_ROUTES.projectInvitations(projectId), { email: e, role });
      setEmail("");
      toast.success("Invitation created — accept link copied to clipboard.");
      onRefresh();
      if (typeof window !== "undefined" && res.token) {
        const url = `${window.location.origin}${accountPaths.projectInviteLanding}?token=${encodeURIComponent(res.token)}`;
        void navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch {
      toast.error("Could not send invitation");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string) {
    setBusy(true);
    try {
      await apiDelete(API_ROUTES.projectMember(projectId, memberId));
      toast.success("Removed collaborator");
      onRefresh();
    } catch {
      toast.error("Could not remove collaborator");
    } finally {
      setBusy(false);
    }
  }

  async function setMemberRole(memberId: string, next: "editor" | "viewer") {
    setBusy(true);
    try {
      await apiPatch(API_ROUTES.projectMember(projectId, memberId), {
        role: next,
      });
      toast.success("Role updated");
      onRefresh();
    } catch {
      toast.error("Could not update role");
    } finally {
      setBusy(false);
    }
  }

  const { isCanonicalOwner, members, pendingInvitations } = collaboration;

  return (
    <SectionCard padding="lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="text-primary h-4 w-4" />
          <Eyebrow>TEAM</Eyebrow>
        </div>
        <LinkButton
          href={accountPaths.projectReview(projectId)}
          variant="secondary"
          size="sm"
        >
          Review mode
        </LinkButton>
      </div>

      <ul className="space-y-2 text-sm">
        {members.map((m) => (
          <li
            key={m.id}
            className="border-border flex flex-wrap items-center justify-between gap-2 border-b border-dashed pb-2 last:border-0"
          >
            <div>
              <span className="text-foreground font-medium">
                {m.name || m.email || m.userId}
              </span>
              <span className="text-muted-foreground ml-2 text-xs">
                {m.role === "editor" ? (
                  <Pencil className="mr-0.5 inline h-3 w-3" />
                ) : (
                  <Eye className="mr-0.5 inline h-3 w-3" />
                )}
                {m.role}
              </span>
            </div>
            {isCanonicalOwner ? (
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || m.role === "editor"}
                  onClick={() => void setMemberRole(m.id, "editor")}
                >
                  Make editor
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || m.role === "viewer"}
                  onClick={() => void setMemberRole(m.id, "viewer")}
                >
                  Make viewer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void removeMember(m.id)}
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {pendingInvitations.length > 0 ? (
        <div className="mt-4">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
            Pending invites
          </p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            {pendingInvitations.map((p) => (
              <li key={p.id}>
                <Mail className="mr-1 inline h-3 w-3" />
                {p.email} · {p.role}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isCanonicalOwner ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
          <div className="min-w-[200px] flex-1">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase">
              Invite by email
            </label>
            <input
              type="email"
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <select
            className="border-input bg-background rounded-md border px-2 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button
            type="button"
            size="sm"
            disabled={busy || !email.trim()}
            onClick={() => void sendInvite()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-xs">
          Only the project owner can invite or remove collaborators.
        </p>
      )}
    </SectionCard>
  );
}
