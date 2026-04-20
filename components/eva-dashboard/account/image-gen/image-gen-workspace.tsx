"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  LayoutGrid,
  Loader2,
  Plus,
  View,
  X,
  ArrowRight,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-react";
import {
  ARRANGE_MSG,
  formatSaveProjectSuccessToast,
} from "@/lib/furniture-gen/arrange-room-messages";
import {
  FURNITURE_GENERATE_PATH,
  FURNITURE_PIECES_PATH,
} from "@/lib/furniture-gen/routes";
import {
  SAVE_STUDIO_ROOM_PATH,
  accountProjectDetailHrefAfterStudioSave,
} from "@/lib/furniture-gen/save-studio-room-routes";
import { API_ROUTES } from "@/lib/eva-dashboard/api";
import type { ProjectSavedRoomApiResponse } from "@/lib/eva/projects/saved-room-read-model";
import { buildSaveStudioRoomPayload } from "@/lib/furniture-gen/build-save-studio-payload";
import type { SaveStudioRoomResponse } from "@/lib/furniture-gen/save-studio-room-contract";
import {
  buildSnapshot,
  loadStudioWorkspace,
  normalizeFilmRow,
  saveStudioWorkspace,
} from "@/lib/furniture-gen/studio-workspace-storage";
import type { StudioPieceListItem } from "@/lib/furniture-gen/studio-piece-api";
import { meshModelFromPieceQuality } from "@/lib/furniture-gen/studio-piece-api";
import { downloadFromUrl } from "@/components/eva-dashboard/account/image-gen/studio-download";
import { ImageGenGenerateCenterSettings } from "@/components/eva-dashboard/account/image-gen/image-gen-generate-center-settings";
import { ImageGenLeftPanel } from "@/components/eva-dashboard/account/image-gen/image-gen-left-panel";
import { ImageGenPageLayout } from "@/components/eva-dashboard/account/image-gen/image-gen-page-layout";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/eva-dashboard/account/shared";
import {
  Button,
  Card,
  Separator,
  StudioBottomActionStrip,
  StudioHeroPanel,
  StudioTopChrome,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import {
  deriveGenerateOptions,
  pickPrimaryModel,
} from "@/lib/furniture-gen/derive-options";
import type { Progress } from "@/types/generation";
import type { FilmRow, PipelinePhase } from "@/types/furniture-session";
import {
  ARRANGE_SHAPE_PRESETS,
  MODEL_META,
  ENVIRONMENT_TINT,
  envDreiPreset,
  type EnvPreset,
  type ModelId,
  type QualityTier,
  type StudioTab,
} from "./constants";
import { useArrangeRoom } from "./use-arrange-room";
import { HeroChairSvg, FilmstripThumbSvg } from "./furniture-svgs";
import {
  StudioSaveRoomDialog,
  useSyncProjectPickerOnOpen,
} from "./studio-save-room-dialog";
import { useActiveProject } from "@/lib/eva-dashboard/contexts/active-project-context";
import { StudioWorkspaceSnapshotProvider } from "@/lib/eva-dashboard/contexts/studio-workspace-snapshot-context";
import { buildStudioSnapshotFromWorkspace } from "@/lib/eva/studio/build-studio-snapshot";

const GlbViewer = dynamic(
  () => import("@/components/furniture-gen/glb-viewer"),
  { ssr: false },
);

const RoomFurnitureScene = dynamic(
  () => import("@/components/furniture-gen/room-furniture-scene"),
  { ssr: false },
);

export type ImageGenWorkspaceProps = {
  /** From `/account/image-gen?tab=arrange` when deep-linking. */
  initialTab?: StudioTab;
};

function normalizeEnvPreset(e: string): EnvPreset {
  const ok: EnvPreset[] = ["morning", "studio", "golden", "night", "clean"];
  return ok.includes(e as EnvPreset) ? (e as EnvPreset) : "morning";
}

export function ImageGenWorkspace({
  initialTab = "generate",
}: ImageGenWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProjectId, activeProject, projects, refreshProjects } =
    useActiveProject();

  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<QualityTier>("balanced");
  const [models, setModels] = useState<Set<ModelId>>(
    () => new Set<ModelId>(["hunyuan3d"]),
  );
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [filmRows, setFilmRows] = useState<FilmRow[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [streamHint, setStreamHint] = useState("");
  const [hydrateDone, setHydrateDone] = useState(false);
  const [initialArrange, setInitialArrange] = useState<
    | import("@/lib/furniture-gen/studio-workspace-storage").StudioWorkspaceSnapshotV1["arrange"]
    | null
  >(null);
  const [recentPieces, setRecentPieces] = useState<StudioPieceListItem[]>([]);
  const lineageForNextRunRef = useRef<"fresh" | "variation">("variation");

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTargetProjectId, setSaveTargetProjectId] = useState<string | null>(
    null,
  );
  const [saveSubmitting, setSaveSubmitting] = useState(false);

  const resumeUrlHandledRef = useRef(false);
  const [resumePayload, setResumePayload] = useState<null | {
    orderedPieceIdsWithGlb: string[];
    roomShapeId: string;
    widthM: number;
    depthM: number;
    environment: string;
  }>(null);

  useSyncProjectPickerOnOpen(
    saveDialogOpen,
    activeProjectId,
    projects,
    setSaveTargetProjectId,
  );
  /** Mock canvas tool — resets when switching Generate ↔ Arrange. */
  const [canvasTool, setCanvasTool] = useState(0);

  /** Last completed output — keeps hero stable while a new run is in flight (see Solo inspect UX). */
  const lastSuccessRef = useRef<{ imageUrl: string; glbUrl: string } | null>(
    null,
  );
  const [viewerEpoch, setViewerEpoch] = useState(0);

  useEffect(() => {
    setCanvasTool(0);
  }, [tab]);

  useEffect(() => {
    const w = loadStudioWorkspace();
    if (w) {
      setTab(w.tab);
      setPrompt(w.prompt);
      setQuality(w.quality);
      setModels(new Set(w.models));
      setFilmRows(w.filmRows.map(normalizeFilmRow));
      setActiveKey(w.activeKey);
      setInitialArrange(w.arrange);
    }
    setHydrateDone(true);
  }, []);

  useEffect(() => {
    if (!hydrateDone) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${FURNITURE_PIECES_PATH}?limit=12`);
        if (!res.ok) return;
        const data = (await res.json()) as { pieces?: StudioPieceListItem[] };
        if (!cancelled && data.pieces) setRecentPieces(data.pieces);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateDone]);

  const glbCatalog = useMemo(
    () =>
      filmRows.filter(
        (r): r is FilmRow & { glbUrl: string } =>
          r.status === "done" && Boolean(r.glbUrl),
      ),
    [filmRows],
  );

  const arrange = useArrangeRoom({ glbCatalog, initialArrange });

  useEffect(() => {
    if (!hydrateDone) return;
    if (resumeUrlHandledRef.current) return;
    const projectId = searchParams.get("projectId")?.trim();
    const savedRoomId = searchParams.get("savedRoom")?.trim();
    if (!projectId || !savedRoomId) return;
    resumeUrlHandledRef.current = true;

    void (async () => {
      try {
        const res = await fetch(
          API_ROUTES.projectSavedRoom(projectId, { savedRoomId }),
        );
        const data = (await res.json()) as ProjectSavedRoomApiResponse;
        if (!res.ok || !data.ok || !data.savedRoom) {
          toast.error("Could not open saved room from project.");
          router.replace("/account/image-gen?tab=arrange");
          return;
        }
        const sr = data.savedRoom;
        const orderedPieceIdsWithGlb = [...sr.pieces]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .filter((p) => p.glbUrl)
          .map((p) => p.pieceId);

        if (orderedPieceIdsWithGlb.length === 0) {
          toast.info(
            "This saved layout has no 3D files to resume. Generate pieces, then arrange.",
          );
          router.replace("/account/image-gen?tab=arrange");
          return;
        }

        setFilmRows((prev) => {
          const seen = new Set(
            prev.filter((r) => r.pieceId).map((r) => r.pieceId!),
          );
          const extra: FilmRow[] = [];
          let badgeBase = prev.length;
          for (const p of [...sr.pieces].sort(
            (a, b) => a.orderIndex - b.orderIndex,
          )) {
            if (!p.glbUrl) continue;
            if (seen.has(p.pieceId)) continue;
            badgeBase += 1;
            seen.add(p.pieceId);
            extra.push({
              key: `saved-piece-${p.pieceId}`,
              badge: badgeBase,
              model: "hunyuan3d",
              status: "done",
              variant: 1,
              imageUrl: p.imageUrl ?? undefined,
              glbUrl: p.glbUrl,
              pieceId: p.pieceId,
              pieceTitle: p.title,
            });
          }
          return extra.length ? [...prev, ...extra] : prev;
        });

        setTab("arrange");
        setResumePayload({
          orderedPieceIdsWithGlb,
          roomShapeId: sr.roomShapeId,
          widthM: sr.widthM,
          depthM: sr.depthM,
          environment: sr.environment,
        });
        router.replace("/account/image-gen?tab=arrange");
      } catch {
        toast.error("Could not open saved room from project.");
        router.replace("/account/image-gen?tab=arrange");
      }
    })();
  }, [hydrateDone, searchParams, router, toast]);

  useEffect(() => {
    if (!resumePayload) return;
    const keys = resumePayload.orderedPieceIdsWithGlb
      .map((pid) => glbCatalog.find((r) => r.pieceId === pid && r.glbUrl)?.key)
      .filter((k): k is string => Boolean(k));
    if (keys.length !== resumePayload.orderedPieceIdsWithGlb.length) return;

    arrange.applySavedProjectLayout({
      roomShapeId: resumePayload.roomShapeId,
      roomWidthM: resumePayload.widthM,
      roomDepthM: resumePayload.depthM,
      environment: normalizeEnvPreset(resumePayload.environment),
      placedKeysInOrder: keys,
    });
    setResumePayload(null);
    toast.success("Room layout loaded from your project.");
  }, [resumePayload, glbCatalog, arrange, toast]);

  useEffect(() => {
    if (!hydrateDone) return;
    const t = window.setTimeout(() => {
      saveStudioWorkspace(
        buildSnapshot({
          tab,
          prompt,
          quality,
          models,
          activeKey,
          filmRows,
          arrange: {
            roomShapeId: arrange.roomShapeId,
            roomWidthStr: arrange.roomWidthStr,
            roomDepthStr: arrange.roomDepthStr,
            environment: arrange.environment,
            placedPieceKeys: arrange.placedPieceIds,
            cameraMode: arrange.cameraMode,
            selectedPieceId: arrange.selectedPieceId,
          },
        }),
      );
    }, 500);
    return () => window.clearTimeout(t);
  }, [
    hydrateDone,
    tab,
    prompt,
    quality,
    models,
    activeKey,
    filmRows,
    arrange.roomShapeId,
    arrange.roomWidthStr,
    arrange.roomDepthStr,
    arrange.environment,
    arrange.placedPieceIds,
    arrange.cameraMode,
    arrange.selectedPieceId,
  ]);

  const roomLightingPreset = useMemo(
    () => envDreiPreset(arrange.environment),
    [arrange.environment],
  );
  const roomFloorColor = ENVIRONMENT_TINT[arrange.environment].floorA;
  const roomWallColor = ENVIRONMENT_TINT[arrange.environment].wall;

  const selectedModels = useMemo(() => Array.from(models), [models]);

  const modelsHint = useMemo(() => {
    const n = selectedModels.length;
    const total = selectedModels.reduce((s, id) => s + MODEL_META[id].cost, 0);
    const primary = pickPrimaryModel(models);
    if (n === 1) {
      return `Mesh path follows ${MODEL_META[primary].name}. One generation per click · ~$${total.toFixed(3)}.`;
    }
    return `${n} models selected — primary ${MODEL_META[primary].name} (checkbox order) · ~$${total.toFixed(3)} per run.`;
  }, [selectedModels, models]);

  const placedCount = arrange.placedPieceIds.length;

  const resolveCarryKeyForArrange = useCallback(() => {
    const fromActive = filmRows.find(
      (r) => r.key === activeKey && r.status === "done" && r.glbUrl,
    );
    if (fromActive) return fromActive.key;
    const lastDone = [...filmRows]
      .reverse()
      .find((r) => r.status === "done" && r.glbUrl);
    return lastDone?.key;
  }, [filmRows, activeKey]);

  const goToArrangeWithHandoff = useCallback(() => {
    setTab("arrange");
    const key = resolveCarryKeyForArrange();
    const { placed, reason } = arrange.enterFromGenerate(key);
    if (!placed && reason) {
      toast.info(reason);
    }
  }, [arrange, resolveCarryKeyForArrange, toast]);

  const refreshRecentPieces = useCallback(async () => {
    try {
      const res = await fetch(`${FURNITURE_PIECES_PATH}?limit=12`);
      if (!res.ok) return;
      const data = (await res.json()) as { pieces?: StudioPieceListItem[] };
      if (data.pieces) setRecentPieces(data.pieces);
    } catch {
      /* ignore */
    }
  }, []);

  const runGeneration = useCallback(async () => {
    if (running) return;
    if (!prompt.trim()) {
      setPhase("idle");
      toast.info("Add a prompt first.");
      return;
    }
    if (models.size === 0) return;

    const lineageMode = lineageForNextRunRef.current;
    lineageForNextRunRef.current = "variation";

    const opts = deriveGenerateOptions(quality, models);
    const primaryModel = pickPrimaryModel(models);
    const runKey = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const anchorRow =
      filmRows.find((r) => r.key === activeKey && r.status === "done") ??
      [...filmRows].reverse().find((r) => r.status === "done");

    let sourcePieceId: string | undefined;
    if (lineageMode === "variation") {
      sourcePieceId = anchorRow?.pieceId ?? undefined;
    }

    const variantFlag = sourcePieceId ? 1 : 0;

    let assignedBadge = 1;
    setFilmRows((prev) => {
      const maxBadge = prev.reduce((m, r) => Math.max(m, r.badge), 0);
      assignedBadge = maxBadge + 1;
      return [
        ...prev,
        {
          key: runKey,
          badge: assignedBadge,
          model: primaryModel,
          status: "generating" as const,
          variant: variantFlag,
          sourcePieceId: sourcePieceId ?? null,
        },
      ];
    });

    setActiveKey(runKey);
    setRunning(true);
    setStreamHint("");
    setPhase("running-1");

    const patchRow = (patch: Partial<FilmRow>) => {
      setFilmRows((prev) =>
        prev.map((r) => (r.key === runKey ? { ...r, ...patch } : r)),
      );
    };

    let sawDone = false;

    try {
      const res = await fetch(FURNITURE_GENERATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          ...opts,
          qualityTier: quality,
          sourcePieceId: sourcePieceId ?? null,
        }),
      });

      if (!res.ok) {
        let msg = res.statusText;
        try {
          const j = (await res.json()) as { message?: string };
          if (typeof j?.message === "string") msg = j.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      if (!res.body) throw new Error("Empty response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;

          let evt: Progress;
          try {
            evt = JSON.parse(line.slice(6)) as Progress;
          } catch {
            continue;
          }

          switch (evt.stage) {
            case "expanding":
              setPhase("running-1");
              if (evt.message) setStreamHint(evt.message);
              break;
            case "image_ready":
              setPhase("running-2");
              patchRow({ imageUrl: evt.imageUrl });
              setStreamHint("Reference image ready — building your 3D draft…");
              break;
            case "meshing":
              setPhase("running-3");
              if (evt.message) setStreamHint(evt.message);
              break;
            case "done":
              sawDone = true;
              setPhase("done");
              lastSuccessRef.current = {
                imageUrl: evt.imageUrl,
                glbUrl: evt.glbUrl,
              };
              patchRow({
                status: "done",
                imageUrl: evt.imageUrl,
                glbUrl: evt.glbUrl,
                providerImageUrl: evt.imageUrl,
                providerGlbUrl: evt.glbUrl,
                promptSnapshot: prompt.trim().slice(0, 500),
              });
              setStreamHint("");
              break;
            case "artifact_ready":
              lastSuccessRef.current = {
                imageUrl: evt.imageUrl,
                glbUrl: evt.glbUrl,
              };
              patchRow({
                pieceId: evt.pieceId,
                imageUrl: evt.imageUrl,
                glbUrl: evt.glbUrl,
                providerImageUrl: evt.providerImageUrl,
                providerGlbUrl: evt.providerGlbUrl,
                storedImageUrl: evt.imageUrl,
                storedGlbUrl: evt.glbUrl,
                sourcePieceId: evt.sourcePieceId,
                pieceTitle: evt.title,
              });
              break;
            case "error":
              throw new Error(evt.message);
            default:
              break;
          }
        }
      }

      if (!sawDone) {
        throw new Error("Stream ended before completion");
      }
      void refreshRecentPieces();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message);
      patchRow({ status: "error", errorMessage: message });
      setPhase("idle");
    } finally {
      setRunning(false);
    }
  }, [
    running,
    prompt,
    models,
    quality,
    toast,
    filmRows,
    activeKey,
    refreshRecentPieces,
  ]);

  const setPipelineIdle = useCallback(() => {
    setPhase("idle");
  }, []);

  const clearPrompt = useCallback(() => {
    setPrompt("");
    setPipelineIdle();
  }, [setPipelineIdle]);

  const selectThumb = useCallback((row: FilmRow) => {
    if (row.status === "generating") return;
    setActiveKey(row.key);
  }, []);

  const toggleModel = useCallback((id: ModelId) => {
    setModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onPromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void runGeneration();
    }
  };

  const missingPieceIdsForSave = useMemo(() => {
    return arrange.placedPieceIds.some((key) => {
      const row = glbCatalog.find((r) => r.key === key);
      return !row?.pieceId;
    });
  }, [arrange.placedPieceIds, glbCatalog]);

  const arrangeShapeLabel = useMemo(() => {
    return (
      ARRANGE_SHAPE_PRESETS.find((p) => p.id === arrange.roomShapeId)?.label ??
      arrange.roomShapeId
    );
  }, [arrange.roomShapeId]);

  const studioSnapshotForChat = useMemo(
    () =>
      buildStudioSnapshotFromWorkspace({
        activeProjectId,
        activeProjectTitle: activeProject?.title ?? null,
        tab,
        prompt,
        filmRows,
        activeFilmKey: activeKey,
        arrangeRoomShapeLabel: arrangeShapeLabel,
        roomWidthStr: arrange.roomWidthStr,
        roomDepthStr: arrange.roomDepthStr,
        placedPieceKeys: arrange.placedPieceIds,
        selectedPieceId: arrange.selectedPieceId,
        environmentLabel: arrange.environment,
        lastUserActions: [
          `Tab: ${tab}`,
          filmRows.length > 0
            ? `${filmRows.length} generation result(s)`
            : "No generations yet",
          running ? "Pipeline active" : "Pipeline idle",
        ],
      }),
    [
      activeProjectId,
      activeProject?.title,
      tab,
      prompt,
      filmRows,
      activeKey,
      arrangeShapeLabel,
      arrange.roomWidthStr,
      arrange.roomDepthStr,
      arrange.placedPieceIds,
      arrange.selectedPieceId,
      arrange.environment,
      running,
      filmRows.length,
    ],
  );

  const openSaveDialog = useCallback(() => {
    if (!arrange.saveReadiness.canSave) {
      toast.info(
        arrange.saveReadiness.reasonIfBlocked ?? ARRANGE_MSG.saveToastFallback,
      );
      return;
    }
    if (missingPieceIdsForSave) {
      toast.error(ARRANGE_MSG.saveOpenMissingPieceIds);
      return;
    }
    void refreshProjects();
    setSaveDialogOpen(true);
  }, [arrange.saveReadiness, missingPieceIdsForSave, refreshProjects, toast]);

  const confirmSaveToProject = useCallback(async () => {
    if (!saveTargetProjectId) {
      toast.error(ARRANGE_MSG.saveChooseProject);
      return;
    }
    if (!arrange.saveReadiness.canSave || missingPieceIdsForSave) {
      return;
    }

    const built = buildSaveStudioRoomPayload({
      projectId: saveTargetProjectId,
      roomShapeId: arrange.roomShapeId,
      widthM: arrange.roomWidthM,
      depthM: arrange.roomDepthM,
      environment: arrange.environment,
      placedKeysInOrder: arrange.placedPieceIds,
      glbCatalog,
    });

    if (!built.ok) {
      toast.error(built.error);
      return;
    }

    setSaveSubmitting(true);
    try {
      const res = await fetch(SAVE_STUDIO_ROOM_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.body),
      });

      const raw = (await res.json()) as
        | SaveStudioRoomResponse
        | { ok?: false; error?: string; message?: string };

      if (!res.ok) {
        const msg =
          typeof raw === "object" && raw && "error" in raw
            ? String((raw as { error?: string }).error ?? "")
            : "";
        const fallback =
          typeof raw === "object" && raw && "message" in raw
            ? String((raw as { message?: string }).message ?? "")
            : "";
        toast.error(msg || fallback || ARRANGE_MSG.saveGenericFailure);
        return;
      }

      if (
        raw &&
        typeof raw === "object" &&
        "ok" in raw &&
        raw.ok === true &&
        "placementCount" in raw
      ) {
        const title =
          projects.find((p) => p.id === saveTargetProjectId)?.title ??
          "Project";
        toast.success(formatSaveProjectSuccessToast(raw.placementCount, title));
        setSaveDialogOpen(false);
        router.push(
          accountProjectDetailHrefAfterStudioSave(
            saveTargetProjectId,
            raw.saveId,
          ),
        );
      } else {
        toast.error(ARRANGE_MSG.saveUnexpectedResponse);
      }
    } catch {
      toast.error(ARRANGE_MSG.saveNetworkError);
    } finally {
      setSaveSubmitting(false);
    }
  }, [
    arrange.placedPieceIds,
    arrange.roomDepthM,
    arrange.roomShapeId,
    arrange.roomWidthM,
    arrange.environment,
    arrange.saveReadiness.canSave,
    glbCatalog,
    missingPieceIdsForSave,
    projects,
    router,
    saveTargetProjectId,
    toast,
  ]);

  const removeFilmRowFromSession = useCallback(
    (key: string) => {
      arrange.removePiece(key);
      setFilmRows((prev) => {
        const next = prev.filter((r) => r.key !== key);
        setActiveKey((ak) => {
          if (ak !== key) return ak;
          const last = [...next].reverse().find((r) => r.status === "done");
          return last?.key ?? "";
        });
        return next;
      });
    },
    [arrange],
  );

  const addRecentPieceToSession = useCallback(
    (p: StudioPieceListItem) => {
      const existing = filmRows.find((r) => r.pieceId === p.id);
      if (existing) {
        setActiveKey(existing.key);
        toast.info("Already in this session.");
        return;
      }
      const maxBadge = filmRows.reduce((m, r) => Math.max(m, r.badge), 0);
      const img = p.storedImageUrl ?? p.providerImageUrl ?? undefined;
      const glb = p.storedGlbUrl ?? p.providerGlbUrl ?? undefined;
      if (!img || !glb) {
        toast.error("This piece has no downloadable assets yet.");
        return;
      }
      const row: FilmRow = {
        key: p.id,
        badge: maxBadge + 1,
        model: meshModelFromPieceQuality(p.quality),
        status: "done",
        variant: p.sourcePieceId ? 1 : 0,
        pieceId: p.id,
        imageUrl: img,
        glbUrl: glb,
        providerImageUrl: p.providerImageUrl ?? undefined,
        providerGlbUrl: p.providerGlbUrl ?? undefined,
        storedImageUrl: p.storedImageUrl ?? undefined,
        storedGlbUrl: p.storedGlbUrl ?? undefined,
        sourcePieceId: p.sourcePieceId,
        pieceTitle: p.title,
        promptSnapshot: p.prompt.slice(0, 500),
      };
      setFilmRows((prev) => [...prev, row]);
      setActiveKey(row.key);
      toast.success("Added to your session.");
    },
    [filmRows, toast],
  );

  const displayRow = useMemo(() => {
    if (activeKey) {
      const hit = filmRows.find((r) => r.key === activeKey);
      if (hit) return hit;
    }
    const gen = filmRows.find((r) => r.status === "generating");
    if (gen) return gen;
    for (let i = filmRows.length - 1; i >= 0; i--) {
      const r = filmRows[i]!;
      if (r.status === "done") return r;
    }
    return undefined;
  }, [filmRows, activeKey]);

  const activeGenRow = useMemo(
    () => (activeKey ? filmRows.find((r) => r.key === activeKey) : undefined),
    [filmRows, activeKey],
  );

  const { hero2dUrl, hero3dUrl } = useMemo(() => {
    const prior = lastSuccessRef.current;
    if (!running) {
      return {
        hero2dUrl: displayRow?.imageUrl,
        hero3dUrl: displayRow?.glbUrl,
      };
    }
    const genRow = activeGenRow;
    if (genRow?.status === "generating" && prior) {
      return {
        hero2dUrl: prior.imageUrl,
        hero3dUrl: prior.glbUrl,
      };
    }
    if (genRow?.status === "generating" && !prior) {
      return {
        hero2dUrl: genRow.imageUrl,
        hero3dUrl: genRow.glbUrl,
      };
    }
    return {
      hero2dUrl: displayRow?.imageUrl,
      hero3dUrl: displayRow?.glbUrl,
    };
  }, [running, displayRow, activeGenRow]);

  const progressLabel = useMemo(() => {
    if (!running) return "";
    if (phase === "running-1")
      return "Step 1 of 3 — understanding your description";
    if (phase === "running-2") return "Step 2 of 3 — reference image";
    if (phase === "running-3") return "Step 3 of 3 — 3D draft";
    return streamHint;
  }, [running, phase, streamHint]);

  const hasCompletedRow = useMemo(
    () => filmRows.some((r) => r.status === "done"),
    [filmRows],
  );

  const showHeroMarketing =
    tab === "generate" && !running && filmRows.length === 0;
  const showFirstRunBusy =
    tab === "generate" &&
    running &&
    !hasCompletedRow &&
    !activeGenRow?.imageUrl;

  /** Floating hint while a new run streams and an earlier result is already in the strip. */
  const showRerunUpdatingOverlay =
    tab === "generate" && running && hasCompletedRow;

  return (
    <StudioWorkspaceSnapshotProvider studioSnapshot={studioSnapshotForChat}>
      <ImageGenPageLayout
        leftPanel={
          <ImageGenLeftPanel
            tab={tab}
            onTabChange={setTab}
            generateTabHelp="Describe furniture, pick quality and models, then regenerate."
            arrangeTabHelp="Pick a room shape, place pieces, and use Eva on the right to chat."
            prompt={prompt}
            onPromptChange={setPrompt}
            onPromptKeyDown={onPromptKeyDown}
            onClearPrompt={clearPrompt}
            onRunGeneration={runGeneration}
            running={running}
            hasCompletedRow={hasCompletedRow}
            recentPieces={recentPieces}
            onAddRecentPiece={addRecentPieceToSession}
            arrange={arrange}
            glbCatalog={glbCatalog}
            onRequestFreshGenerate={() => {
              lineageForNextRunRef.current = "fresh";
              setTab("generate");
            }}
            onOpenSaveDialog={openSaveDialog}
          />
        }
        centerPanel={
          <StudioHeroPanel>
            <StudioTopChrome>
              <div className="min-w-0">
                <span className="font-ui text-[13px] font-medium">
                  {tab === "generate" ? "Inspect" : "Room preview"}
                </span>
                <span className="text-muted-foreground font-body ml-2 text-[12px]">
                  {tab === "generate"
                    ? "Reference image and 3D draft"
                    : `· ${arrange.roomWidthStr} × ${arrange.roomDepthStr} · ${placedCount} placed · ${glbCatalog.length} piece${glbCatalog.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-0.5">
                {tab === "generate" ? (
                  ["Orbit", "Pan", "Zoom", "Wire"].map((label, i) => (
                    <Button
                      key={label}
                      type="button"
                      variant={canvasTool === i ? "default" : "ghost"}
                      size="sm"
                      title={label}
                      onClick={() => setCanvasTool(i)}
                      className="font-ui rounded-none px-2 py-1.5 text-[10px] font-medium"
                    >
                      {label}
                    </Button>
                  ))
                ) : (
                  <>
                    <Button
                      type="button"
                      variant={
                        arrange.cameraMode === "orbit" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => arrange.setCameraMode("orbit")}
                      className="font-ui rounded-none px-2 py-1.5 text-[10px] font-medium"
                    >
                      Orbit
                    </Button>
                    <Button
                      type="button"
                      variant={
                        arrange.cameraMode === "topDown" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => arrange.setCameraMode("topDown")}
                      className="font-ui gap-1 rounded-none px-2 py-1.5 text-[10px] font-medium"
                    >
                      <View className="h-3 w-3" />
                      Top-down
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="Reset camera to this view"
                      onClick={() => arrange.resetCamera()}
                      className="font-ui gap-1 rounded-none px-2 py-1.5 text-[10px] font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset camera
                    </Button>
                  </>
                )}
              </div>
            </StudioTopChrome>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {tab === "generate" ? (
                <>
                  <div className="border-border max-h-[min(42vh,400px)] min-h-0 shrink-0 overflow-x-hidden overflow-y-auto border-b px-4 py-4">
                    <ImageGenGenerateCenterSettings
                      running={running}
                      onPromptChange={setPrompt}
                      quality={quality}
                      onQualityChange={setQuality}
                      models={models}
                      onToggleModel={toggleModel}
                      modelsHint={modelsHint}
                      progressLabel={progressLabel}
                      streamHint={streamHint}
                      hasCompletedRow={hasCompletedRow}
                    />
                  </div>
                  <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.28]"
                      style={{
                        backgroundImage: `linear-gradient(var(--eva-studio-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--eva-studio-grid-line) 1px, transparent 1px)`,
                        backgroundSize: "24px 24px",
                      }}
                    />

                    <div className="border-border bg-muted/25 relative grid min-h-0 w-full grid-cols-1 border-b lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch">
                      <div className="border-border bg-muted/25 flex min-h-[min(12rem,28dvh)] flex-col lg:min-h-0 lg:border-r">
                        <div className="border-border bg-card/90 border-b px-3 py-2">
                          <span className="font-ui text-[10px] font-medium tracking-[0.14em] uppercase">
                            Reference image
                          </span>
                        </div>
                        <div className="relative flex min-h-[10rem] flex-1 items-center justify-center p-3 md:p-4">
                          {hero2dUrl ? (
                            <div className="relative h-[min(32dvh,280px)] w-full max-w-[420px]">
                              <Image
                                src={hero2dUrl}
                                alt=""
                                fill
                                className="rounded-none object-contain shadow-[var(--eva-studio-media-shadow)]"
                                sizes="(max-width: 1024px) 100vw, 420px"
                              />
                            </div>
                          ) : (
                            <div className="text-muted-foreground font-body max-w-xs text-center text-[12px]">
                              {showFirstRunBusy ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="text-primary h-4 w-4 animate-spin" />
                                  Creating reference…
                                </span>
                              ) : (
                                "Your studio render appears here."
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-muted/25 flex min-h-[min(12rem,28dvh)] flex-col lg:min-h-0">
                        <div className="border-border bg-card/90 border-b px-3 py-2">
                          <span className="font-ui text-[10px] font-medium tracking-[0.14em] uppercase">
                            Generated 3D draft
                          </span>
                        </div>
                        <div className="relative flex min-h-[10rem] flex-1 items-center justify-center p-2">
                          {hero3dUrl ? (
                            <div
                              key={`${hero3dUrl}-${viewerEpoch}`}
                              className="h-[min(34dvh,300px)] w-full max-w-[520px]"
                            >
                              <GlbViewer glbUrl={hero3dUrl} />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3 px-4 text-center">
                              {showHeroMarketing ? (
                                <>
                                  <HeroChairSvg className="max-h-[180px] w-full max-w-[280px] [filter:var(--eva-studio-svg-lift)]" />
                                  <div className="max-w-md space-y-2">
                                    <p className="font-ui text-[14px] font-medium">
                                      How it works
                                    </p>
                                    <ol className="text-muted-foreground font-body list-decimal space-y-1.5 pl-5 text-left text-[12px] leading-relaxed">
                                      <li>
                                        Describe a piece of furniture in plain
                                        language.
                                      </li>
                                      <li>
                                        We create a{" "}
                                        <span className="text-foreground font-medium">
                                          reference image
                                        </span>{" "}
                                        for reconstruction.
                                      </li>
                                      <li>
                                        Inspect the{" "}
                                        <span className="text-foreground font-medium">
                                          generated 3D draft
                                        </span>{" "}
                                        — orbit to review.
                                      </li>
                                    </ol>
                                  </div>
                                </>
                              ) : running ? (
                                <span className="text-muted-foreground font-body inline-flex items-center gap-2 text-[12px]">
                                  <Loader2 className="text-primary h-4 w-4 animate-spin" />
                                  Building mesh from reference…
                                </span>
                              ) : (
                                <p className="text-muted-foreground font-body text-[12px]">
                                  No 3D draft for the selected result.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {showRerunUpdatingOverlay ? (
                      <div className="pointer-events-none sticky bottom-3 z-10 mt-3 flex justify-center px-4">
                        <Card className="bg-card/95 flex max-w-md items-center gap-2 border px-3 py-2 shadow-[var(--eva-studio-overlay-shadow)] backdrop-blur-sm">
                          <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
                          <span className="font-ui text-[12px] leading-snug">
                            {streamHint || "Updating your draft…"}
                          </span>
                        </Card>
                      </div>
                    ) : null}
                  </div>

                  <StudioBottomActionStrip>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-ui text-[11px] font-medium">
                        Results
                      </span>
                      <span className="text-muted-foreground font-body text-[11px]">
                        {filmRows.filter((r) => r.status === "done").length} /
                        session
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {filmRows.map((row) => (
                        <Button
                          key={row.key}
                          type="button"
                          variant="outline"
                          disabled={row.status === "generating"}
                          onClick={() => selectThumb(row)}
                          className={cn(
                            "relative h-16 w-16 shrink-0 overflow-hidden rounded-none p-0",
                            activeKey === row.key
                              ? "border-primary ring-primary/25 ring-2"
                              : "hover:border-primary/40",
                            row.status === "generating" && "opacity-50",
                            row.status === "error" && "border-destructive/50",
                          )}
                        >
                          {row.imageUrl ? (
                            <Image
                              src={row.imageUrl}
                              alt=""
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <FilmstripThumbSvg variant={row.variant} />
                          )}
                          <span className="font-ui pointer-events-none absolute bottom-0.5 left-0.5 rounded-none bg-[var(--eva-studio-thumb-badge-bg)] px-1 text-[7px] text-[var(--eva-studio-thumb-badge-fg)]">
                            {MODEL_META[row.model].tag}
                          </span>
                          <span className="font-ui pointer-events-none absolute right-0.5 bottom-0.5 rounded-none bg-[var(--eva-studio-thumb-badge-bg)] px-1 text-[7px] text-[var(--eva-studio-thumb-badge-fg)]">
                            {String(row.badge).padStart(2, "0")}
                          </span>
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void runGeneration()}
                        disabled={running}
                        className="text-muted-foreground hover:border-primary hover:text-primary h-16 w-16 shrink-0 flex-col gap-0 border-dashed py-1"
                        title="New variation"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="font-ui mt-1 text-[9px]">New</span>
                      </Button>
                    </div>
                    {displayRow?.status === "done" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-[10px]"
                          disabled={!displayRow.imageUrl}
                          onClick={() => {
                            const u =
                              displayRow.storedImageUrl ?? displayRow.imageUrl;
                            if (u) {
                              void downloadFromUrl(
                                u,
                                `eva-studio-${displayRow.badge}-image.png`,
                              );
                            }
                          }}
                        >
                          <Download className="h-3 w-3" />
                          Image
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-[10px]"
                          disabled={!displayRow.glbUrl}
                          onClick={() => {
                            const u =
                              displayRow.storedGlbUrl ?? displayRow.glbUrl;
                            if (u) {
                              void downloadFromUrl(
                                u,
                                `eva-studio-${displayRow.badge}.glb`,
                              );
                            }
                          }}
                        >
                          <Download className="h-3 w-3" />
                          GLB
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8 gap-1 text-[10px]"
                          onClick={() =>
                            removeFilmRowFromSession(displayRow.key)
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    ) : null}
                    <div className="border-border mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!hero3dUrl}
                        onClick={() => setViewerEpoch((n) => n + 1)}
                        className="text-muted-foreground hover:text-foreground font-ui h-auto gap-1.5 px-2 py-1 text-[11px] font-medium"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset view
                      </Button>
                      <Separator orientation="vertical" className="h-4" />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void runGeneration()}
                        disabled={running}
                        className="text-muted-foreground hover:text-foreground font-ui h-auto gap-1.5 px-2 py-1 text-[11px] font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New variation
                      </Button>
                      <Separator orientation="vertical" className="h-4" />
                      <Button
                        type="button"
                        size="sm"
                        onClick={goToArrangeWithHandoff}
                        className="gap-1.5 text-[11px] tracking-normal normal-case"
                      >
                        Try in a room
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </StudioBottomActionStrip>
                </>
              ) : (
                <>
                  <div className="relative min-h-[min(200px,28dvh)] w-full min-w-0 flex-1 overflow-hidden">
                    {glbCatalog.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                        <LayoutGrid className="text-muted-foreground h-10 w-10 opacity-50" />
                        <p className="font-ui text-[13px] font-medium">
                          {ARRANGE_MSG.arrangeNoCatalogTitle}
                        </p>
                        <p className="text-muted-foreground max-w-xs text-[12px]">
                          {ARRANGE_MSG.arrangeNoCatalogBody}
                        </p>
                      </div>
                    ) : (
                      <RoomFurnitureScene
                        widthM={arrange.roomWidthM}
                        depthM={arrange.roomDepthM}
                        lightingPreset={roomLightingPreset}
                        placements={arrange.placements}
                        floorColor={roomFloorColor}
                        wallColor={roomWallColor}
                        cameraMode={arrange.cameraMode}
                        cameraResetNonce={arrange.cameraResetNonce}
                      />
                    )}
                    {glbCatalog.length > 0 &&
                    arrange.placements.length === 0 ? (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--eva-studio-canvas-scrim)] p-6 text-center backdrop-blur-[2px]">
                        <p className="font-ui text-[13px] font-medium">
                          {ARRANGE_MSG.arrangeEmptyFloorTitle}
                        </p>
                        <p className="text-muted-foreground max-w-xs text-[12px]">
                          {ARRANGE_MSG.arrangeEmptyFloorBody}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <StudioBottomActionStrip>
                    <span className="text-muted-foreground font-ui text-[11px]">
                      Drag to orbit · scroll to zoom · camera controls above
                    </span>
                  </StudioBottomActionStrip>
                </>
              )}
            </div>
          </StudioHeroPanel>
        }
      />

      <StudioSaveRoomDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        projectId={saveTargetProjectId}
        onProjectIdChange={setSaveTargetProjectId}
        projects={projects}
        shapeLabel={arrangeShapeLabel}
        widthLabel={arrange.roomWidthStr}
        depthLabel={arrange.roomDepthStr}
        environmentLabel={arrange.environment}
        placedCount={placedCount}
        unplacedCount={arrange.unplacedPieceIds.length}
        onConfirm={confirmSaveToProject}
        submitting={saveSubmitting}
        canSubmit={
          !missingPieceIdsForSave &&
          Boolean(saveTargetProjectId) &&
          arrange.saveReadiness.canSave
        }
        blockReason={
          missingPieceIdsForSave ? ARRANGE_MSG.savePieceIdBlockHint : null
        }
      />
    </StudioWorkspaceSnapshotProvider>
  );
}
