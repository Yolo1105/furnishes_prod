"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { useActiveProject } from "@/lib/eva-dashboard/contexts/active-project-context";
import { DEFAULT_NEW_PROJECT_ROOM_LABEL } from "@/lib/eva-dashboard/core/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * In-chatbot control: choose which design project scopes new chats and project-first surfaces.
 */
export function ActiveProjectSwitcher({ className }: { className?: string }) {
  const {
    activeProjectId,
    setActiveProjectId,
    projects,
    refreshProjects,
    creating,
    createProject,
  } = useActiveProject();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRoom, setNewRoom] = useState(DEFAULT_NEW_PROJECT_ROOM_LABEL);
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error("Enter a project title.");
      return;
    }
    setSubmitting(true);
    try {
      const p = await createProject({
        title,
        room: newRoom.trim() || DEFAULT_NEW_PROJECT_ROOM_LABEL,
        description: "",
      });
      if (p?.id) {
        setActiveProjectId(p.id);
        setNewTitle("");
        setShowCreate(false);
        toast.success("Project created and selected.");
      } else {
        toast.error("Could not create project. Try Account → Projects.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "border-border bg-card/80 flex flex-col gap-1.5 rounded-lg border px-2 py-2",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-[9px] font-semibold tracking-wide uppercase">
        <FolderKanban className="h-3 w-3" />
        Active project
      </div>
      <div className="flex items-center gap-2">
        <select
          id="eva-active-project"
          value={activeProjectId ?? ""}
          disabled={creating}
          onChange={(e) => {
            const v = e.target.value;
            setActiveProjectId(v === "" ? null : v);
          }}
          className="border-border bg-background text-foreground focus:ring-primary h-8 min-w-0 flex-1 rounded-md border px-2 text-xs outline-none focus:ring-1 disabled:opacity-60"
          aria-label="Active design project"
        >
          <option value="">No project (unscoped chats)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} · {p.room}
            </option>
          ))}
        </select>
        {creating ? (
          <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <button
            type="button"
            onClick={() => void refreshProjects()}
            className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] font-medium underline"
          >
            Refresh
          </button>
        )}
      </div>

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-primary flex items-center gap-1 text-[10px] font-semibold"
        >
          <Plus className="h-3 w-3" />
          New project
        </button>
      ) : (
        <div className="border-border space-y-2 rounded-md border p-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Project title"
            className="border-border bg-background w-full rounded border px-2 py-1 text-xs"
          />
          <input
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="Room label"
            className="border-border bg-background w-full rounded border px-2 py-1 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onCreate()}
              className="bg-primary text-primary-foreground flex-1 rounded py-1 text-[10px] font-semibold disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create & select"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-muted-foreground text-[10px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="text-muted-foreground text-[10px] leading-snug">
        New chats attach to the selected project. Switching project updates
        Files and other views to match — use the header control to assign an
        open chat if it belongs elsewhere.
      </p>
      <Link
        href="/account/projects"
        className="text-primary text-[10px] font-medium underline"
      >
        Full project hub in Account
      </Link>
    </div>
  );
}
