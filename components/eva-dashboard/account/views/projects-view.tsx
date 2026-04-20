"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Heart,
  Image as ImageIcon,
  Calendar,
  Archive,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  Button,
  StatusBadge,
  RightInspector,
  Field,
  TextInput,
  Textarea,
  Select,
  useToast,
  EmptyState,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/mock-data";
import {
  PROJECT_ACCESS_COPY,
  PROJECT_COLLABORATION_DEFAULTS,
} from "@/lib/site/account/project-access-copy";
import type { Project, ProjectStatus } from "@/lib/site/account/types";
import { apiGet, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { STAGE_LABEL } from "@/lib/eva/design-workflow/stages";
import type { WorkflowStageId } from "@/lib/eva/design-workflow/stages";

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: "planning", label: "Planning" },
  { status: "sourcing", label: "Sourcing" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

type ApiProjectRow = {
  id: string;
  title: string;
  description: string;
  room: string;
  status: ProjectStatus;
  budgetCents: number;
  currency: string;
  coverHue: number;
  progress: number;
  workflowStage: WorkflowStageId;
  updatedAt: string;
  createdAt: string;
  stats: { conversations: number; shortlistItems: number; uploads: number };
};

function mapRowToProject(p: ApiProjectRow): Project {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    room: p.room,
    status: p.status,
    budgetCents: p.budgetCents,
    currency: p.currency,
    coverHue: p.coverHue,
    progress: p.progress,
    stats: p.stats,
    members: [],
    isShared: false,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
    workflowStage: p.workflowStage,
  };
}

export function ProjectsView() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newProjectDraft, setNewProjectDraft] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (sessionStatus === "loading") return;
    if (sessionStatus !== "authenticated") {
      setProjects([]);
      setLoadError(null);
      return;
    }
    try {
      const data = await apiGet<{ projects: ApiProjectRow[] }>(
        API_ROUTES.projects,
      );
      setProjects((data.projects ?? []).map(mapRowToProject));
      setLoadError(null);
    } catch {
      setLoadError("Could not load projects. Sign in and try again.");
      setProjects([]);
    }
  }, [sessionStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byStatus = useMemo(() => {
    const map: Record<ProjectStatus, Project[]> = {
      planning: [],
      sourcing: [],
      in_progress: [],
      done: [],
      archived: [],
    };
    projects.forEach((p) => map[p.status].push(p));
    return map;
  }, [projects]);

  const openNew = () => {
    const draft: Project = {
      id: `new-${Date.now()}`,
      title: "New project",
      description: "",
      room: "Living room",
      status: "planning",
      budgetCents: 0,
      currency: "SGD",
      coverHue: Math.floor(Math.random() * 360),
      progress: 0,
      stats: { conversations: 0, shortlistItems: 0, uploads: 0 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setNewProjectDraft(draft);
  };

  const saveProject = async (p: Project) => {
    if (sessionStatus !== "authenticated") return;
    try {
      const data = await apiPost<{ project: { id: string } }>(
        API_ROUTES.projects,
        {
          title: p.title,
          room: p.room,
          description: p.description,
        },
      );
      toast.success("Project created");
      setNewProjectDraft(null);
      await refresh();
      router.push(`/account/projects/${data.project.id}`);
    } catch {
      toast.error("Could not create project");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1520px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="PROJECTS"
        title="Design projects"
        subtitle="Each project is one design effort — brief, chats, files, recommendations, and workflow progress stay together."
        actions={
          <Button
            variant="primary"
            onClick={openNew}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            New project
          </Button>
        }
      />

      <PreviewBanner />

      {loadError ? (
        <p className="text-muted-foreground mb-4 text-sm">{loadError}</p>
      ) : null}

      {projects.length === 0 && !loadError ? (
        <EmptyState
          icon={Plus}
          title="No projects yet"
          body="Group your design work into a renovation or room so chats, files, and recommendations stay organized."
          cta={
            <Button
              variant="primary"
              onClick={openNew}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              Create first project
            </Button>
          }
        />
      ) : null}

      {projects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                label={col.label}
                status={col.status}
                items={byStatus[col.status]}
              />
            ))}
          </div>

          {/* Archived */}
          {byStatus.archived.length > 0 && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase transition-colors"
              >
                <Archive className="h-3 w-3" />
                Archived ({byStatus.archived.length}){" "}
                {showArchived ? "— hide" : "— show"}
              </button>
              {showArchived && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {byStatus.archived.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      href={`/account/projects/${p.id}`}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      <RightInspector
        open={newProjectDraft !== null}
        onClose={() => setNewProjectDraft(null)}
        eyebrow="NEW PROJECT"
        title={newProjectDraft?.title ?? ""}
        width="460px"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewProjectDraft(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => newProjectDraft && saveProject(newProjectDraft)}
            >
              Save
            </Button>
          </div>
        }
      >
        {newProjectDraft && (
          <ProjectForm value={newProjectDraft} onChange={setNewProjectDraft} />
        )}
      </RightInspector>
    </div>
  );
}

function KanbanColumn({
  label,
  status,
  items,
}: {
  label: string;
  status: ProjectStatus;
  items: Project[];
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-border bg-muted/40 mb-3 flex items-center justify-between border px-3 py-2">
        <Eyebrow>{label}</Eyebrow>
        <span className="text-muted-foreground text-xs font-medium tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="border-border text-muted-foreground border border-dashed px-3 py-8 text-center text-xs">
            Nothing{" "}
            {status === "planning"
              ? "in planning"
              : `in ${label.toLowerCase()}`}
          </div>
        ) : (
          items.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              href={`/account/projects/${p.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  href,
  onClick,
  compact,
}: {
  project: Project;
  href?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  const className =
    "border-border bg-card hover:border-primary/40 group w-full overflow-hidden border text-left transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]";

  const inner = (
    <>
      {!compact && (
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, oklch(0.78 0.14 ${project.coverHue}), oklch(0.58 0.16 ${project.coverHue}))`,
          }}
        />
      )}

      <div className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="text-foreground font-display line-clamp-2 text-sm leading-tight font-[var(--font-manrope)] tracking-tight">
            {project.title}
          </h4>
          {project.isShared && <StatusBadge variant="shared" />}
        </div>

        <div className="text-muted-foreground mb-1 text-[11px]">
          {project.room}
        </div>
        {project.workflowStage ? (
          <div className="text-primary mb-2 text-[10px] font-medium">
            Workflow:{" "}
            {STAGE_LABEL[project.workflowStage as WorkflowStageId] ??
              project.workflowStage}
          </div>
        ) : null}

        {!compact && (
          <>
            <div className="bg-muted mb-3 h-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${project.progress}%` }}
              />
            </div>

            <div className="text-muted-foreground mb-3 flex items-center gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {project.stats.conversations}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {project.stats.shortlistItems}
              </span>
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {project.stats.uploads}
              </span>
            </div>
          </>
        )}

        <div
          className={`border-border flex items-center border-t pt-2 ${project.members.length > 0 ? "justify-between" : "justify-end"}`}
        >
          {project.members.length > 0 ? (
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 3).map((m) => (
                <span
                  key={m.id}
                  title={m.name}
                  className="bg-muted text-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[8px] font-semibold"
                  style={{ borderColor: "var(--border)" }}
                >
                  {m.initials}
                </span>
              ))}
            </div>
          ) : null}
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {relativeTime(project.updatedAt)}
          </span>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function ProjectForm({
  value,
  onChange,
}: {
  value: Project;
  onChange: (p: Project) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Title" htmlFor="title" required>
        <TextInput
          id="title"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>

      <Field label="Description" htmlFor="desc">
        <Textarea
          id="desc"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Room" htmlFor="room">
          <TextInput
            id="room"
            value={value.room}
            onChange={(e) => onChange({ ...value, room: e.target.value })}
          />
        </Field>

        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={value.status}
            onChange={(e) =>
              onChange({ ...value, status: e.target.value as ProjectStatus })
            }
          >
            <option value="planning">Planning</option>
            <option value="sourcing">Sourcing</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>

      <Field label="Budget (SGD)" htmlFor="budget">
        <TextInput
          id="budget"
          type="number"
          value={value.budgetCents / 100}
          onChange={(e) =>
            onChange({ ...value, budgetCents: Number(e.target.value) * 100 })
          }
        />
      </Field>

      <div>
        <label className="text-muted-foreground mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase">
          Progress
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={value.progress}
            onChange={(e) =>
              onChange({ ...value, progress: Number(e.target.value) })
            }
            className="accent-primary h-2 flex-1"
          />
          <span className="text-foreground w-10 text-right text-sm tabular-nums">
            {value.progress}%
          </span>
        </div>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        {PROJECT_ACCESS_COPY.newProjectFormNotice}
      </p>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Calendar className="h-3 w-3" />
        Created {relativeTime(value.createdAt)} · Updated{" "}
        {relativeTime(value.updatedAt)}
      </div>
    </div>
  );
}
