"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

type ProjectListItem = {
  id: string;
  name: string;
  summary: string | null;
  status: string;
  role: string;
  updatedAt: string;
};

type Filter = "Active" | "Archived";

function statusBadge(status: string): { label: string; variant: string } {
  const normalized = status.toLowerCase();
  if (normalized === "planning") return { label: "Planning", variant: "" };
  if (normalized === "archived") return { label: "Archived", variant: "mut" };
  return { label: "Sourcing", variant: "on" };
}

function progressFor(status: string): number {
  const normalized = status.toLowerCase();
  if (normalized === "planning") return 35;
  if (normalized === "archived") return 100;
  return 62;
}

/**
 * Route-owned Projects list — studio list rows, real project APIs.
 */
export function ProjectsPage({
  initialItems,
}: {
  initialItems: ProjectListItem[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("Active");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(false);

  const counts = useMemo(() => {
    const archived = initialItems.filter(
      (i) => i.status.toLowerCase() === "archived",
    ).length;
    return {
      Active: initialItems.length - archived,
      Archived: archived,
    };
  }, [initialItems]);

  const rows = useMemo(() => {
    return initialItems.filter((item) => {
      const archived = item.status.toLowerCase() === "archived";
      return filter === "Archived" ? archived : !archived;
    });
  }, [filter, initialItems]);

  async function handleNewProject() {
    if (creating) return;
    setCreating(true);
    try {
      const created = await accountRequest<{ id: string }>(
        "/api/account/projects",
        {
          method: "POST",
          body: JSON.stringify({ name: "New project" }),
        },
      );
      setToast(true);
      setTimeout(() => setToast(false), 1500);
      router.push(`/account/projects/${created.id}`);
      router.refresh();
    } catch {
      setCreating(false);
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Design Work"
        title="Projects"
        subtitle="Each project keeps its preferences, chats, files, and progress together."
        actions={
          <button
            type="button"
            className="wf-btn"
            onClick={handleNewProject}
            disabled={creating}
          >
            + New project
          </button>
        }
      />
      <div className="wf-tools">
        {(["Active", "Archived"] as const).map((chip) => (
          <button
            key={chip}
            type="button"
            className={filter === chip ? "wf-chip on" : "wf-chip"}
            onClick={() => setFilter(chip)}
          >
            {chip}
            <span className="ct">{counts[chip]}</span>
          </button>
        ))}
      </div>
      {rows.length > 0 ? (
        <div className="wf-list">
          {rows.map((project) => {
            const badge = statusBadge(project.status);
            const progress = progressFor(project.status);
            return (
              <Link
                key={project.id}
                href={`/account/projects/${project.id}`}
                className="wf-row wf-row--link"
              >
                <div className="wf-row__main">
                  <div className="wf-row__top">
                    <span className="wf-row__t">{project.name}</span>
                    <span
                      className={
                        badge.variant
                          ? `wf-badge wf-badge--${badge.variant}`
                          : "wf-badge"
                      }
                    >
                      {badge.label}
                    </span>
                  </div>
                  <span className="wf-row__p">
                    {project.summary ?? `${project.role} · updated recently`}
                  </span>
                </div>
                <div className="wf-row__aside">
                  <div className="wf-track">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                  <span className="wf-num">{progress}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="wf-blank">
          <p className="wf-blank__t">
            {filter === "Archived" ? "No archived projects" : "No projects yet"}
          </p>
          <p className="wf-blank__p">
            {filter === "Archived"
              ? "Archive a project when you’re done sourcing."
              : "Start a project to keep chats, files, and progress together."}
          </p>
        </div>
      )}
      <div className={`wf-toast${toast ? " show" : ""}`}>Saved ✓</div>
    </AccountWireFrame>
  );
}
