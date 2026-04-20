"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { LayoutGrid, Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import {
  Eyebrow,
  LinkButton,
  SectionCard,
} from "@/components/eva-dashboard/account/shared";
import {
  ARRANGE_SHAPE_PRESETS,
  ENVIRONMENT_TINT,
  envDreiPreset,
  type EnvPreset,
} from "@/components/eva-dashboard/account/image-gen/constants";
import { placementsForRoomScene } from "@/lib/eva/projects/map-project-saved-room";
import type { ProjectSavedRoomApiResponse } from "@/lib/eva/projects/saved-room-read-model";
import { accountImageGenArrangeResumeHref } from "@/lib/furniture-gen/save-studio-room-routes";
import { relativeTime } from "@/lib/site/account/mock-data";
import { cn } from "@/lib/utils";

const RoomFurnitureScene = dynamic(
  () => import("@/components/furniture-gen/room-furniture-scene"),
  {
    ssr: false,
    loading: () => (
      <div
        className="text-muted-foreground flex h-[220px] items-center justify-center text-sm"
        style={{ background: "var(--muted)" }}
      >
        Loading 3D preview…
      </div>
    ),
  },
);

function roomShapeLabel(shapeId: string): string {
  return ARRANGE_SHAPE_PRESETS.find((p) => p.id === shapeId)?.label ?? shapeId;
}

function envLabel(env: string): string {
  return env.charAt(0).toUpperCase() + env.slice(1);
}

function asEnvPreset(e: string): EnvPreset {
  const ok: EnvPreset[] = ["morning", "studio", "golden", "night", "clean"];
  return ok.includes(e as EnvPreset) ? (e as EnvPreset) : "morning";
}

export function ProjectSavedRoomPanel(props: {
  projectId: string;
  /** When set, loads that revision; otherwise latest for the project. */
  requestedSavedRoomId?: string | null;
}) {
  const [payload, setPayload] = useState<ProjectSavedRoomApiResponse | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const path = API_ROUTES.projectSavedRoom(props.projectId, {
      savedRoomId: props.requestedSavedRoomId?.trim() || undefined,
    });
    apiGet<ProjectSavedRoomApiResponse>(path)
      .then((d) => {
        if (!cancelled) setPayload(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load saved room");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.projectId, props.requestedSavedRoomId]);

  if (loading) {
    return (
      <SectionCard padding="lg" className="mb-5">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading room layout…
        </div>
      </SectionCard>
    );
  }

  if (loadError || !payload?.ok) {
    return (
      <SectionCard padding="lg" className="mb-5">
        <p className="text-destructive text-sm">{loadError ?? "Unavailable"}</p>
      </SectionCard>
    );
  }

  if (!payload.savedRoom) {
    return (
      <div className="mb-5 scroll-mt-24" id="eva-project-saved-room">
        <SectionCard padding="lg">
          <Eyebrow>LATEST ROOM LAYOUT</Eyebrow>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            No Eva Studio room is saved to this project yet. Arrange furniture
            in Eva Studio, then use &quot;Save to my project&quot; to attach a
            layout here.
          </p>
          <LinkButton
            href="/account/image-gen?tab=arrange"
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            Open Eva Studio
          </LinkButton>
        </SectionCard>
      </div>
    );
  }

  const sr = payload.savedRoom;
  const env = asEnvPreset(sr.environment);
  const tint = ENVIRONMENT_TINT[env];
  const scenePlacements = placementsForRoomScene(sr.pieces);
  const continueHref = accountImageGenArrangeResumeHref({
    projectId: props.projectId,
    savedRoomId: sr.savedRoomId,
  });
  const isLatestRevision =
    sr.revisionIndex === sr.totalRevisions && sr.totalRevisions > 0;

  return (
    <div className="mb-5 scroll-mt-24" id="eva-project-saved-room">
      <SectionCard padding="lg">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>
              <span className="inline-flex items-center gap-1.5">
                <LayoutGrid className="h-3 w-3" />
                {isLatestRevision ? "Latest room layout" : "Room layout"}
              </span>
            </Eyebrow>
            <p
              className="mt-1 font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {roomShapeLabel(sr.roomShapeId)} · {sr.widthM} × {sr.depthM} m ·{" "}
              {envLabel(sr.environment)}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
              Saved {relativeTime(sr.createdAt)} · {sr.pieces.length}{" "}
              {sr.pieces.length === 1 ? "piece" : "pieces"} placed
              {sr.totalRevisions > 1
                ? ` · Revision ${sr.revisionIndex} of ${sr.totalRevisions}`
                : null}
              . Each new save from Eva Studio adds a version; this project opens
              the newest by default.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <LinkButton
              href={continueHref}
              variant="secondary"
              size="sm"
              icon={<Pencil className="h-3 w-3" />}
            >
              Continue editing
            </LinkButton>
          </div>
        </div>

        {scenePlacements.length > 0 ? (
          <div
            className="border-border mb-4 h-[220px] w-full overflow-hidden border md:h-[260px]"
            style={{ background: "var(--muted)" }}
          >
            <RoomFurnitureScene
              widthM={sr.widthM}
              depthM={sr.depthM}
              lightingPreset={envDreiPreset(env)}
              placements={scenePlacements}
              floorColor={tint.floorA}
              wallColor={tint.wall}
            />
          </div>
        ) : (
          <div
            className="border-border text-muted-foreground mb-4 border px-3 py-6 text-center text-sm"
            style={{ background: "var(--muted)" }}
          >
            3D preview unavailable — no GLB URLs on placed pieces. You can still
            review placements below or continue editing in Eva Studio.
          </div>
        )}

        {sr.pieces.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {sr.pieces.map((p) => (
              <li
                key={`${sr.savedRoomId}-${p.pieceId}`}
                className={cn(
                  "border-border bg-muted/30 flex max-w-[200px] min-w-0 items-center gap-2 rounded-none border px-2 py-1.5",
                  !p.glbAvailable && "opacity-90",
                )}
              >
                <div className="border-border relative h-10 w-10 shrink-0 overflow-hidden rounded-none border bg-[var(--muted)]">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      sizes="40px"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center text-[9px]">
                      {p.glbAvailable ? "3D" : "—"}
                    </div>
                  )}
                </div>
                <span className="text-foreground line-clamp-2 min-w-0 text-[11px] leading-snug">
                  {p.title}
                  {!p.glbAvailable ? (
                    <span className="text-muted-foreground block text-[9px]">
                      GLB unavailable
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>
    </div>
  );
}
