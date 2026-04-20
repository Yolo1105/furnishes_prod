"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  FolderKanban,
  MessageSquare,
  Calendar,
  Archive,
  ClipboardCopy,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  StatusBadge,
  Button,
  LinkButton,
  SegmentedFilter,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/mock-data";
import { PROJECT_ACCESS_COPY } from "@/lib/site/account/project-access-copy";
import { formatSGD } from "@/lib/site/money";
import { apiGet, apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { useOptionalSession } from "@/components/eva-dashboard/account/session-context";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import { WorkflowStageUserSummary } from "@/components/eva-dashboard/project/workflow-stage-user-summary";
import { stageDisplayLabel } from "@/lib/eva/design-workflow/stages";
import { PROJECT_SUMMARY_COPY } from "@/lib/eva/projects/summary-constants";
import { ProjectSavedRoomPanel } from "@/components/eva-dashboard/project/project-saved-room-panel";
import { ProjectDetailShortlistPanel } from "@/components/eva-dashboard/account/views/project-detail-shortlist-panel";
import { ProjectExecutionPanel } from "@/components/eva-dashboard/account/views/project-execution-panel";
import { ProjectExternalExecutionSection } from "@/components/eva-dashboard/account/views/project-external-execution-section";
import { ProjectCollaborationPanel } from "@/components/eva-dashboard/project/project-collaboration-panel";

type Tab =
  | "overview"
  | "execution"
  | "shortlist"
  | "conversations"
  | "uploads"
  | "team"
  | "access";

export function ProjectDetailView({ id }: { id: string }) {
  const [detail, setDetail] = useState<ProjectDetailGetResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [archiving, setArchiving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const session = useOptionalSession();
  const searchParams = useSearchParams();
  const fromStudioToastRef = useRef(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "shortlist") setTab("shortlist");
    else if (t === "execution") setTab("execution");
    else if (t === "team") setTab("team");
  }, [searchParams]);

  const refreshDetail = useCallback(() => {
    void apiGet<ProjectDetailGetResponse>(
      API_ROUTES.project(id, { includeSummary: true }),
    )
      .then((d) => {
        setDetail(d);
        setLoadError(null);
      })
      .catch(() => setLoadError("Failed to load project"));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    apiGet<ProjectDetailGetResponse>(
      API_ROUTES.project(id, { includeSummary: true }),
    )
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load project");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (searchParams.get("fromStudio") !== "1") return;
    if (!detail) return;
    if (fromStudioToastRef.current) return;
    fromStudioToastRef.current = true;
    toast.success("Your room layout from Eva Studio is shown below.");
    requestAnimationFrame(() => {
      document
        .getElementById("eva-project-saved-room")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams, detail, toast]);

  const project = detail
    ? {
        id: detail.project.id,
        title: detail.project.title,
        description: detail.project.description,
        room: detail.project.room,
        status: detail.project
          .status as import("@/lib/site/account/types").ProjectStatus,
        budgetCents: detail.project.budgetCents,
        currency: detail.project.currency,
        coverHue: detail.project.coverHue,
        progress: detail.project.progress,
        stats: {
          conversations: detail.conversations.length,
          shortlistItems: detail.shortlistItems.length,
          uploads: detail.aggregates.fileCount,
        },
        updatedAt: detail.project.updatedAt,
        createdAt: detail.project.createdAt,
        workflowStage: detail.project.workflowStage,
      }
    : null;

  const conversations = detail?.conversations ?? [];
  const shortlist = detail?.shortlistItems ?? [];
  const recentFiles = detail?.recentFiles ?? [];

  const executionTabCount = detail?.summary
    ? detail.summary.execution.activeBlockers.length +
      detail.summary.execution.openTasks.length
    : undefined;

  const teamTabCount = detail?.collaboration
    ? detail.collaboration.members.length +
      detail.collaboration.pendingInvitations.length
    : undefined;

  const owner = session
    ? {
        id: session.user.id,
        name: session.user.name,
        initials: session.user.initials,
      }
    : { id: "owner", name: "You", initials: "YO" };

  async function copyProjectLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function archiveProject() {
    if (
      !confirm(
        "Archive this project? It will move out of your active list; you can still open it from archived projects later.",
      )
    ) {
      return;
    }
    setArchiving(true);
    try {
      await apiPatch(API_ROUTES.project(id), { status: "archived" });
      toast.success("Project archived");
      router.push(accountPaths.projects);
    } catch {
      toast.error("Could not archive project");
    } finally {
      setArchiving(false);
    }
  }

  if (loadError && !detail) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <h1
          className="text-2xl font-[var(--font-manrope)]"
          style={{ color: "var(--foreground)" }}
        >
          Project not found
        </h1>
        <LinkButton
          href={accountPaths.projects}
          variant="secondary"
          className="mt-6"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back to projects
        </LinkButton>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <p className="text-muted-foreground text-sm">Loading project…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        breadcrumbs={[
          {
            icon: FolderKanban,
            label: "Projects",
            href: accountPaths.projects,
          },
          { label: project.title },
        ]}
        title={project.title}
        subtitle={
          <span>
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {project.room}
            </span>
            <span className="mx-2 opacity-40">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {relativeTime(project.createdAt)}
            </span>
          </span>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={project.status}>
              {project.status.replace(/_/g, " ")}
            </StatusBadge>
          </div>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void copyProjectLink()}
              icon={<ClipboardCopy className="h-3.5 w-3.5" />}
            >
              Copy link
            </Button>
            <Button
              variant="ghost"
              disabled={archiving}
              onClick={() => void archiveProject()}
              icon={<Archive className="h-3.5 w-3.5" />}
            >
              {archiving ? "Archiving…" : "Archive"}
            </Button>
          </>
        }
      />

      <PreviewBanner />

      <WorkflowStageUserSummary
        stage={project.workflowStage}
        className="bg-muted/20 mb-5 max-w-3xl p-4"
      />

      <p
        className="font-body mb-5 max-w-3xl text-sm leading-relaxed"
        style={{ color: "var(--foreground)" }}
      >
        {project.description}
      </p>

      {/* Hero strip with project accent color */}
      <SectionCard padding="lg" className="mb-5 overflow-hidden">
        <div
          className="mb-5 h-1 w-full"
          style={{
            background: `linear-gradient(90deg, oklch(0.78 0.14 ${project.coverHue}), oklch(0.58 0.16 ${project.coverHue}))`,
          }}
        />

        {/* Progress */}
        <div className="mt-5">
          <div
            className="mb-1 flex items-baseline justify-between text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>Progress</span>
            <span
              className="tabular-nums"
              style={{ color: "var(--foreground)" }}
            >
              {project.progress}%
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${project.progress}%`,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Budget" value={formatSGD(project.budgetCents)} />
        <Stat
          label="Conversations"
          value={project.stats.conversations.toString()}
        />
        <Stat
          label="Shortlisted"
          value={project.stats.shortlistItems.toString()}
        />
        <Stat label="Uploads" value={project.stats.uploads.toString()} />
      </div>

      <ProjectSavedRoomPanel
        projectId={id}
        requestedSavedRoomId={searchParams.get("savedRoom")}
      />

      {/* Tabs */}
      <div className="mb-4">
        <SegmentedFilter
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            {
              value: "execution",
              label: "Execution",
              count: executionTabCount,
            },
            { value: "shortlist", label: "Shortlist", count: shortlist.length },
            {
              value: "conversations",
              label: "Conversations",
              count: conversations.length,
            },
            {
              value: "uploads",
              label: "Uploads",
              count: recentFiles.length,
            },
            { value: "team", label: "Team", count: teamTabCount },
            { value: "access", label: "Access" },
          ]}
        />
      </div>

      {/* Tab content */}
      {tab === "execution" && detail?.summary && (
        <div className="space-y-5">
          <ProjectExternalExecutionSection
            projectId={id}
            summary={detail.summary}
            activeConversationId={detail.project.activeConversationId}
            onRefresh={refreshDetail}
          />
          <ProjectExecutionPanel
            projectId={id}
            summary={detail.summary}
            onRefresh={refreshDetail}
          />
        </div>
      )}
      {tab === "execution" && !detail?.summary && (
        <SectionCard padding="lg">
          <p className="text-muted-foreground text-sm">
            Execution data is loading…
          </p>
        </SectionCard>
      )}

      {tab === "team" && detail?.collaboration && (
        <ProjectCollaborationPanel
          projectId={id}
          collaboration={detail.collaboration}
          onRefresh={refreshDetail}
        />
      )}
      {tab === "team" && !detail?.collaboration && (
        <SectionCard padding="lg">
          <p className="text-muted-foreground text-sm">Team data is loading…</p>
        </SectionCard>
      )}

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <SectionCard padding="lg">
            <Eyebrow>WORKFLOW HISTORY</Eyebrow>
            <ul className="mt-4 space-y-3">
              {(detail?.workflowHistory ?? []).length === 0 ? (
                <li className="text-muted-foreground text-sm">
                  No transitions yet — chat in this project to advance stages.
                </li>
              ) : (
                (detail?.workflowHistory ?? []).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span style={{ color: "var(--foreground)" }}>
                      → {stageDisplayLabel(e.toStage)}
                      {e.reason ? ` — ${e.reason}` : ""}{" "}
                      <span className="text-muted-foreground text-[10px]">
                        ({e.trigger})
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-xs tabular-nums"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {relativeTime(e.createdAt)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </SectionCard>
          <SectionCard padding="lg">
            <Eyebrow>OWNER</Eyebrow>
            <ul className="mt-3 space-y-2">
              <li
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-semibold"
                  style={{
                    background: "var(--muted)",
                    borderColor: "var(--border)",
                  }}
                >
                  {owner.initials}
                </span>
                {owner.name}
              </li>
            </ul>
            <p
              className="mt-3 text-xs leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {PROJECT_ACCESS_COPY.overviewOwnerFootnote}
            </p>
          </SectionCard>
        </div>
      )}

      {tab === "shortlist" && (
        <SectionCard padding="lg">
          <Eyebrow>PROJECT SHORTLIST</Eyebrow>
          <p
            className="mt-2 text-xs leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Items saved from recommendations for execution — set a primary
            option, add alternates, and capture procurement notes.
          </p>
          <div className="mt-4">
            <ProjectDetailShortlistPanel
              projectId={id}
              items={shortlist}
              onChanged={refreshDetail}
            />
          </div>
        </SectionCard>
      )}

      {tab === "conversations" && (
        <SectionCard padding="none">
          <ul className="divide-border divide-y">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={accountPaths.conversation(c.id)}
                  className="block p-4 transition-colors hover:opacity-80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        {c.title}
                      </div>
                      <div
                        className="mt-1 truncate text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {c.messageCount} messages
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-[10px] tabular-nums"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {relativeTime(c.updatedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {tab === "uploads" && (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {recentFiles.length === 0 ? (
            <p
              className="text-muted-foreground text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No files uploaded in chats for this project yet.
            </p>
          ) : null}
          {recentFiles.map((u) => (
            <Link
              key={u.id}
              href={accountPaths.conversation(u.conversationId)}
              className="block overflow-hidden border transition-opacity hover:opacity-90"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="bg-muted/40 w-full"
                style={{
                  aspectRatio: "4 / 3",
                }}
              />
              <div className="p-3">
                <div
                  className="truncate text-xs font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {u.filename}
                </div>
                <p
                  className="mt-1 text-[11px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {relativeTime(u.createdAt)} · {PROJECT_SUMMARY_COPY.openChat}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "access" && (
        <SectionCard padding="lg">
          <Eyebrow>ACCESS</Eyebrow>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            {PROJECT_ACCESS_COPY.accessTabIntro}
          </p>
          <ul className="mt-6 space-y-3">
            <li
              className="flex items-center gap-3 border px-3 py-2.5"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-semibold"
                style={{
                  background: "var(--muted)",
                  borderColor: "var(--border)",
                }}
              >
                {owner.initials}
              </span>
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {owner.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Owner
                </div>
              </div>
            </li>
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="border p-4"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="text-[10px] font-semibold tracking-[0.18em] uppercase"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </div>
      <div
        className="mt-1.5 text-2xl font-[var(--font-manrope)] tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </div>
    </div>
  );
}
