"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Edit3,
  Loader2,
  AlertCircle,
  FileText,
  ImageIcon,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/eva-dashboard/ui/badge";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import { ActiveProjectContextBanner } from "@/components/eva-dashboard/project/active-project-context-banner";
import { ProjectChatPicker } from "@/components/eva-dashboard/project/project-chat-picker";
import type {
  ConversationArtifact,
  ConversationArtifactKind,
} from "@/lib/eva-dashboard/conversation-output-types";
import { absoluteArtifactUrl } from "@/lib/eva-dashboard/artifact-urls";
import { artifactKindLabel } from "@/lib/eva-dashboard/artifact-metadata";
import { toast } from "sonner";

export type { ConversationArtifact };

interface FilesViewProps {
  onEditInChat?: (payload: {
    artifactId: string;
    title: string;
    conversationId: string;
  }) => void;
}

type FilterId = "all" | ConversationArtifactKind;

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "floorplan", label: "Floorplans" },
  { id: "pdf", label: "PDF" },
  { id: "document", label: "Documents" },
  { id: "other", label: "Other" },
];

function matchesFilter(f: ConversationArtifact, filter: FilterId): boolean {
  if (filter === "all") return true;
  return f.fileType === filter;
}

async function downloadArtifactFile(artifact: ConversationArtifact) {
  if (!artifact.downloadable || !artifact.downloadUrl) {
    toast.error("This file cannot be downloaded.");
    return;
  }
  const url = absoluteArtifactUrl(artifact.downloadUrl);
  try {
    const res = await fetch(url, {
      credentials: "include",
      mode: "same-origin",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const msg =
        err && typeof err === "object" && err !== null && "error" in err
          ? String(
              (err as { error?: { message?: string } }).error?.message ??
                res.status,
            )
          : String(res.status);
      throw new Error(msg);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = artifact.title || "download";
    a.click();
    URL.revokeObjectURL(objectUrl);
    toast.success("Download started");
  } catch {
    toast.error(
      "Download failed. The file may be missing, expired, or no longer accessible.",
    );
  }
}

function ArtifactThumbnail({ file }: { file: ConversationArtifact }) {
  const [imgErr, setImgErr] = useState(false);
  if (file.fileType === "image" && !imgErr) {
    return (
      <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={absoluteArtifactUrl(file.previewUrl)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgErr(true)}
        />
      </div>
    );
  }
  return (
    <div className="border-border bg-muted flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border">
      {file.fileType === "pdf" ? (
        <FileText className="text-muted-foreground h-10 w-10" />
      ) : file.fileType === "floorplan" ? (
        <Shapes className="text-muted-foreground h-10 w-10" />
      ) : (
        <ImageIcon className="text-muted-foreground h-10 w-10 opacity-50" />
      )}
      <span className="text-muted-foreground px-2 text-center text-[10px] font-medium">
        {imgErr ? "Preview unavailable" : artifactKindLabel(file.fileType)}
      </span>
    </div>
  );
}

function ArtifactPreviewLarge({ file }: { file: ConversationArtifact }) {
  const [imgErr, setImgErr] = useState(false);
  if (file.fileType === "image" && !imgErr) {
    return (
      <div className="bg-muted flex max-h-[420px] min-h-[240px] w-full items-center justify-center overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={absoluteArtifactUrl(file.previewUrl)}
          alt=""
          className="max-h-[420px] w-full object-contain"
          onError={() => setImgErr(true)}
        />
      </div>
    );
  }
  return (
    <div className="border-border bg-muted flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-12 text-center">
      <FileText className="text-muted-foreground h-14 w-14 opacity-40" />
      <p className="text-foreground text-sm font-medium">
        {artifactKindLabel(file.fileType)} preview
      </p>
      <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
        {file.fileType === "image" && imgErr
          ? "This image could not be loaded. It may have been removed or the link is invalid."
          : "Inline preview is not available for this file type. Use Download if available, or open the link in a new tab."}
      </p>
      {file.previewUrl.trim().length > 0 &&
        (file.previewUrl.startsWith("http://") ||
          file.previewUrl.startsWith("https://")) && (
          <a
            href={file.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs font-medium underline"
          >
            Open original link
          </a>
        )}
      {file.previewUrl.trim().length > 0 &&
        !file.previewUrl.startsWith("http") && (
          <a
            href={absoluteArtifactUrl(file.previewUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs font-medium underline"
          >
            Open in new tab
          </a>
        )}
    </div>
  );
}

export function FilesView({ onEditInChat }: FilesViewProps) {
  const { conversationId } = useCurrentConversation();
  const activeProjectCtx = useActiveProjectOptional();
  const projectId = activeProjectCtx?.activeProjectId ?? null;
  const projectScope = Boolean(projectId);

  const [selected, setSelected] = useState<ConversationArtifact | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [artifacts, setArtifacts] = useState<ConversationArtifact[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setSelected(null);
  }, [conversationId, projectId]);

  useEffect(() => {
    if (projectScope && projectId) {
      setLoadState("loading");
      setFetchError(null);
      apiGet<ConversationArtifact[]>(API_ROUTES.projectFiles(projectId))
        .then((list) => {
          setArtifacts(Array.isArray(list) ? list : []);
          setLoadState("success");
        })
        .catch((e: unknown) => {
          setFetchError(
            e instanceof Error ? e.message : "Could not load files",
          );
          setArtifacts([]);
          setLoadState("error");
        });
      return;
    }
    if (!conversationId) {
      setLoadState("success");
      setArtifacts([]);
      setFetchError(null);
      return;
    }
    setLoadState("loading");
    setFetchError(null);
    apiGet<ConversationArtifact[]>(API_ROUTES.conversationFiles(conversationId))
      .then((list) => {
        setArtifacts(Array.isArray(list) ? list : []);
        setLoadState("success");
      })
      .catch((e: unknown) => {
        setFetchError(e instanceof Error ? e.message : "Could not load files");
        setArtifacts([]);
        setLoadState("error");
      });
  }, [conversationId, projectId, projectScope, retryKey]);

  const filtered =
    filter === "all"
      ? artifacts
      : artifacts.filter((f) => matchesFilter(f, filter));

  if (!projectScope && !conversationId) {
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-10 text-center">
        <p className="text-muted-foreground max-w-md text-sm">
          Select an{" "}
          <span className="text-foreground font-medium">active project</span> in
          the sidebar to see all files across its chats, or open a conversation
          to list files for that chat only.
        </p>
        <ProjectChatPicker className="border-border w-full max-w-md rounded-lg border p-4 text-left" />
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <AlertCircle className="text-destructive h-8 w-8" />
        <p className="text-foreground text-sm">{fetchError}</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="space-y-2">
        <ActiveProjectContextBanner />
        <h1 className="text-foreground text-base font-semibold">Files</h1>
        <p className="text-muted-foreground text-sm">
          {projectScope
            ? "No files in this project’s chats yet. Upload in chat or generate assets."
            : "No files are attached to this conversation yet. Upload images in chat or generate assets to see them here."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ActiveProjectContextBanner />
      {!selected ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-foreground mb-1 text-base font-semibold">
                Files
              </h1>
              <p className="text-muted-foreground text-xs">
                {projectScope
                  ? "All artifacts from chats in your active project."
                  : "Artifacts for this conversation only."}
              </p>
            </div>
            <span className="text-muted-foreground text-xs font-medium">
              {artifacts.length} file{artifacts.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                  filter === f.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No files match this filter.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {filtered.map((file) => (
                <button
                  type="button"
                  key={file.id}
                  onClick={() => setSelected(file)}
                  className="border-border bg-card hover:border-primary hover:shadow-primary/5 group cursor-pointer overflow-hidden rounded-xl border text-left transition-all hover:shadow-lg"
                >
                  <ArtifactThumbnail file={file} />
                  <div className="p-4">
                    <div className="text-foreground group-hover:text-primary mb-1 text-sm font-semibold transition-colors">
                      {file.title}
                    </div>
                    <div className="text-muted-foreground mb-2 line-clamp-2 text-[11px]">
                      {file.description}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {projectScope && (
                        <Badge variant="secondary" className="text-[9px]">
                          Chat …{file.conversationId.slice(-6)}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px]">
                        {artifactKindLabel(file.fileType)}
                      </Badge>
                      {file.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-muted-foreground bg-muted rounded px-2 py-0.5 text-[9px] font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {new Date(file.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="border-border bg-card text-muted-foreground hover:bg-muted mb-5 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors"
          >
            ← Back to files
          </button>
          <ArtifactPreviewLarge file={selected} />
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-foreground text-xl font-semibold">
                {selected.title}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {selected.description}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {artifactKindLabel(selected.fileType)}
                </Badge>
                {selected.mimeType && (
                  <Badge variant="secondary" className="text-[10px]">
                    {selected.mimeType}
                  </Badge>
                )}
                {selected.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {selected.downloadable ? (
                <button
                  type="button"
                  onClick={() => downloadArtifactFile(selected)}
                  className="border-border bg-card text-muted-foreground hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              ) : (
                <span className="text-muted-foreground self-center text-xs">
                  Download unavailable
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  onEditInChat?.({
                    artifactId: selected.id,
                    title: selected.title,
                    conversationId: selected.conversationId,
                  })
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg border-none px-4 py-2 text-xs font-semibold transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit in chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
