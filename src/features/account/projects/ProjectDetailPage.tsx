"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import type { ProjectDetail } from "@/server/projects/service";

function statusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "planning") return "Planning";
  if (normalized === "archived") return "Archived";
  if (normalized === "sourcing") return "Sourcing";
  return status;
}

function personLabel(displayName: string | null, email: string): string {
  return displayName?.trim() || email;
}

/**
 * Route-owned project detail — studio inspector/efield patterns, real project APIs.
 */
export function ProjectDetailPage({
  initialProject,
}: {
  initialProject: ProjectDetail;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialProject.name);
  const [summary, setSummary] = useState(initialProject.summary ?? "");
  const [brief, setBrief] = useState(initialProject.brief ?? "");
  const [status, setStatus] = useState(initialProject.status);
  const [comments, setComments] = useState(initialProject.comments);
  const [approvals, setApprovals] = useState(initialProject.approvals);
  const [commentDraft, setCommentDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const canEdit = initialProject.role !== "viewer";
  const canDelete = initialProject.role === "owner";

  useEffect(() => {
    setName(initialProject.name);
    setSummary(initialProject.summary ?? "");
    setBrief(initialProject.brief ?? "");
    setStatus(initialProject.status);
    setComments(initialProject.comments);
    setApprovals(initialProject.approvals);
  }, [initialProject]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function handleSave() {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      await accountRequest(`/api/account/projects/${initialProject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          summary,
          brief,
          status,
        }),
      });
      flash("Saved ✓");
      router.refresh();
    } catch {
      flash("Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canDelete || saving) return;
    setSaving(true);
    try {
      await accountRequest(`/api/account/projects/${initialProject.id}`, {
        method: "DELETE",
      });
      router.push("/account/projects");
      router.refresh();
    } catch {
      flash("Could not delete");
      setSaving(false);
    }
  }

  async function handleComment() {
    const body = commentDraft.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      await accountRequest(
        `/api/account/projects/${initialProject.id}/comments`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setCommentDraft("");
      flash("Saved ✓");
      router.refresh();
    } catch {
      flash("Could not comment");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproval(next: "approved" | "rejected" | "pending") {
    if (saving) return;
    setSaving(true);
    try {
      await accountRequest(
        `/api/account/projects/${initialProject.id}/approvals`,
        { method: "POST", body: JSON.stringify({ status: next }) },
      );
      flash("Saved ✓");
      router.refresh();
    } catch {
      flash("Could not update approval");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Project"
        title={name || initialProject.name}
        subtitle={
          summary.trim() ||
          "Each project keeps its preferences, chats, files, and progress together."
        }
        actions={
          <>
            {canEdit ? (
              <button
                type="button"
                className="wf-btn"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                Save changes
              </button>
            ) : null}
            <Link className="wf-btn ghost" href="/account/projects">
              Close
            </Link>
          </>
        }
      />

      <div className="wf-conn">
        <div className="wf-efields">
          <label className="wf-efield">
            <span className="wf-efield__l">Name</span>
            <input
              className="wf-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="wf-efield">
            <span className="wf-efield__l">Summary</span>
            <input
              className="wf-input"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="wf-efield">
            <span className="wf-efield__l">Brief</span>
            <input
              className="wf-input"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="wf-efield">
            <span className="wf-efield__l">Status</span>
            <input
              className="wf-input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={!canEdit}
            />
          </label>
        </div>

        <div className="wf-field" style={{ marginTop: 18 }}>
          <span className="wf-field__lbl">Status</span>
          <span className="wf-field__val">{statusLabel(status)}</span>
        </div>
        <div className="wf-field">
          <span className="wf-field__lbl">Your role</span>
          <span className="wf-field__val">{initialProject.role}</span>
        </div>

        <p className="wf-sec__lbl" style={{ marginTop: 28 }}>
          Collaborators
        </p>
        <div className="wf-list">
          {initialProject.members.length === 0 ? (
            <p className="wf-row__p">No collaborators yet.</p>
          ) : (
            initialProject.members.map((member) => (
              <div className="wf-row" key={member.userId}>
                <div className="wf-row__main">
                  <span className="wf-row__t">
                    {personLabel(member.displayName, member.email)}
                  </span>
                  <span className="wf-row__p">{member.role}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="wf-sec__lbl" style={{ marginTop: 28 }}>
          Comments
        </p>
        <div className="wf-efields" style={{ marginBottom: 12 }}>
          <label className="wf-efield">
            <span className="wf-efield__l">Add a comment</span>
            <input
              className="wf-input"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Leave a note for collaborators…"
            />
          </label>
          <div>
            <button
              type="button"
              className="wf-btn"
              onClick={() => void handleComment()}
              disabled={saving || !commentDraft.trim()}
            >
              Post comment
            </button>
          </div>
        </div>
        <div className="wf-list">
          {comments.length === 0 ? (
            <p className="wf-row__p">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div className="wf-row" key={comment.id}>
                <div className="wf-row__main">
                  <span className="wf-row__t">
                    {personLabel(comment.displayName, comment.email)}
                  </span>
                  <span className="wf-row__p">{comment.body}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="wf-sec__lbl" style={{ marginTop: 28 }}>
          Approvals
        </p>
        <div className="wf-choice" style={{ marginBottom: 12 }}>
          <span
            className="on"
            role="button"
            tabIndex={0}
            onClick={() => void handleApproval("approved")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void handleApproval("approved");
              }
            }}
          >
            Approve
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => void handleApproval("rejected")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void handleApproval("rejected");
              }
            }}
          >
            Reject
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => void handleApproval("pending")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void handleApproval("pending");
              }
            }}
          >
            Pending
          </span>
        </div>
        <div className="wf-list">
          {approvals.length === 0 ? (
            <p className="wf-row__p">No approvals recorded yet.</p>
          ) : (
            approvals.map((approval) => (
              <div className="wf-row" key={approval.id}>
                <div className="wf-row__main">
                  <span className="wf-row__t">
                    {personLabel(approval.displayName, approval.email)}
                  </span>
                  <span className="wf-row__p">
                    {approval.status}
                    {approval.note ? ` · ${approval.note}` : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="wf-sec__lbl" style={{ marginTop: 28 }}>
          Timeline
        </p>
        <div className="wf-list">
          {initialProject.timeline.length === 0 ? (
            <p className="wf-row__p">No timeline events yet.</p>
          ) : (
            initialProject.timeline.map((event) => (
              <div className="wf-row" key={event.id}>
                <div className="wf-row__main">
                  <span className="wf-row__t">{event.summary}</span>
                  <span className="wf-row__p">{event.kind}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {canDelete ? (
          <div style={{ marginTop: 28 }}>
            <button
              type="button"
              className="wf-btn ghost"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              Delete project
            </button>
          </div>
        ) : null}
      </div>

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
