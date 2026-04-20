"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ArrangeCameraMode,
  ArrangeRoomShapeId,
  ArrangeSaveReadiness,
} from "@/types/arrange-room";
import type { FilmRow } from "@/types/furniture-session";
import {
  ARRANGE_SHAPE_PRESETS,
  type EnvPreset,
} from "@/components/eva-dashboard/account/image-gen/constants";
import type { StudioWorkspaceSnapshotV1 } from "@/lib/furniture-gen/studio-workspace-storage";
import { ARRANGE_MSG } from "@/lib/furniture-gen/arrange-room-messages";
import {
  canAddAnotherPiece,
  clampRoomMeters,
  humanPlacementMessage,
  ROOM_FULL_MESSAGE,
  validateRoomDimensions,
} from "@/lib/furniture-gen/room-arrange-planner";

export type UseArrangeRoomOptions = {
  glbCatalog: (FilmRow & { glbUrl: string })[];
  /** Applied once when provided (e.g. local workspace restore). */
  initialArrange?: StudioWorkspaceSnapshotV1["arrange"] | null;
};

type PlaceState = {
  placed: string[];
  failures: Record<string, string>;
  hints: Record<string, string>;
};

function recomputeHints(placed: string[]): Record<string, string> {
  const hints: Record<string, string> = {};
  placed.forEach((key, i) => {
    hints[key] = humanPlacementMessage(i, placed.length);
  });
  return hints;
}

export function useArrangeRoom({
  glbCatalog,
  initialArrange,
}: UseArrangeRoomOptions) {
  const catalogKeys = useMemo(() => glbCatalog.map((r) => r.key), [glbCatalog]);
  const catalogSig = catalogKeys.join("|");

  const [roomShapeId, setRoomShapeId] = useState(
    () => ARRANGE_SHAPE_PRESETS[0]!.id,
  );
  const [widthStr, setWidthStr] = useState(
    () => `${ARRANGE_SHAPE_PRESETS[0]!.w} m`,
  );
  const [depthStr, setDepthStr] = useState(
    () => `${ARRANGE_SHAPE_PRESETS[0]!.d} m`,
  );
  const [environment, setEnvironment] = useState<EnvPreset>("morning");

  const [placeState, setPlaceState] = useState<PlaceState>({
    placed: [],
    failures: {},
    hints: {},
  });

  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  const [cameraMode, setCameraMode] = useState<ArrangeCameraMode>("orbit");
  const [cameraResetNonce, setCameraResetNonce] = useState(0);

  const dim = validateRoomDimensions(widthStr, depthStr);
  const roomWidthM = dim.isValid ? dim.widthM : clampRoomMeters(dim.widthM);
  const roomDepthM = dim.isValid ? dim.depthM : clampRoomMeters(dim.depthM);

  const catalogKeySet = useMemo(() => new Set(catalogKeys), [catalogKeys]);

  const layoutHydratedRef = useRef(false);
  useEffect(() => {
    if (!initialArrange || layoutHydratedRef.current) return;
    layoutHydratedRef.current = true;
    const rawShape = initialArrange.roomShapeId;
    const nextShape: ArrangeRoomShapeId = ARRANGE_SHAPE_PRESETS.some(
      (p) => p.id === rawShape,
    )
      ? (rawShape as ArrangeRoomShapeId)
      : ARRANGE_SHAPE_PRESETS[0]!.id;
    setRoomShapeId(nextShape);
    setWidthStr(initialArrange.roomWidthStr);
    setDepthStr(initialArrange.roomDepthStr);
    setEnvironment(initialArrange.environment);
    setCameraMode(initialArrange.cameraMode);
  }, [initialArrange]);

  const placementRestoreRef = useRef(false);
  useEffect(() => {
    if (!initialArrange || placementRestoreRef.current) return;
    if (catalogKeys.length === 0) return;
    placementRestoreRef.current = true;
    const placed = initialArrange.placedPieceKeys.filter((k) =>
      catalogKeySet.has(k),
    );
    setPlaceState({
      placed,
      failures: {},
      hints: recomputeHints(placed),
    });
    setSelectedPieceId(
      initialArrange.selectedPieceId &&
        catalogKeySet.has(initialArrange.selectedPieceId)
        ? initialArrange.selectedPieceId
        : (placed[0] ?? null),
    );
  }, [initialArrange, catalogKeys.length, catalogKeySet]);

  useEffect(() => {
    setPlaceState((prev) => {
      const placed = prev.placed.filter((k) => catalogKeySet.has(k));
      const failures = Object.fromEntries(
        Object.entries(prev.failures).filter(([k]) => catalogKeySet.has(k)),
      );
      return {
        placed,
        failures,
        hints: recomputeHints(placed),
      };
    });
    setSelectedPieceId((sel) => (sel && catalogKeySet.has(sel) ? sel : null));
  }, [catalogSig]);

  const tryPlacePiece = useCallback(
    (key: string): { ok: true } | { ok: false; reason: string } => {
      if (!catalogKeySet.has(key)) {
        return { ok: false, reason: ARRANGE_MSG.pieceUnavailable };
      }
      let result: { ok: true } | { ok: false; reason: string } = {
        ok: false,
        reason: "",
      };
      setPlaceState((prev) => {
        if (prev.placed.includes(key)) {
          result = { ok: true };
          return prev;
        }
        if (!dim.isValid) {
          result = {
            ok: false,
            reason: ARRANGE_MSG.fixDimensionsBeforePlace,
          };
          return prev;
        }
        if (!canAddAnotherPiece(roomWidthM, prev.placed.length)) {
          const msg = ROOM_FULL_MESSAGE;
          result = { ok: false, reason: msg };
          return {
            ...prev,
            failures: { ...prev.failures, [key]: msg },
          };
        }
        const nextPlaced = [...prev.placed, key];
        const failures = { ...prev.failures };
        delete failures[key];
        result = { ok: true };
        return {
          placed: nextPlaced,
          failures,
          hints: recomputeHints(nextPlaced),
        };
      });
      return result;
    },
    [catalogKeySet, dim.isValid, roomWidthM],
  );

  const removePiece = useCallback((key: string) => {
    setPlaceState((prev) => {
      const nextPlaced = prev.placed.filter((k) => k !== key);
      const failures = { ...prev.failures };
      delete failures[key];
      return {
        placed: nextPlaced,
        failures,
        hints: recomputeHints(nextPlaced),
      };
    });
  }, []);

  const togglePlacePiece = useCallback(
    (key: string) => {
      setSelectedPieceId(key);
      setPlaceState((prev) => {
        if (prev.placed.includes(key)) {
          const nextPlaced = prev.placed.filter((k) => k !== key);
          const failures = { ...prev.failures };
          delete failures[key];
          return {
            placed: nextPlaced,
            failures,
            hints: recomputeHints(nextPlaced),
          };
        }
        if (!dim.isValid) return prev;
        if (!canAddAnotherPiece(roomWidthM, prev.placed.length)) {
          return {
            ...prev,
            failures: { ...prev.failures, [key]: ROOM_FULL_MESSAGE },
          };
        }
        const nextPlaced = [...prev.placed, key];
        const failures = { ...prev.failures };
        delete failures[key];
        return {
          placed: nextPlaced,
          failures,
          hints: recomputeHints(nextPlaced),
        };
      });
    },
    [dim.isValid, roomWidthM],
  );

  const autoPlaceAll = useCallback(() => {
    if (!dim.isValid) return;
    setPlaceState((prev) => {
      const nextPlaced = [...prev.placed];
      const failures: Record<string, string> = { ...prev.failures };
      for (const key of catalogKeys) {
        if (nextPlaced.includes(key)) continue;
        if (!canAddAnotherPiece(roomWidthM, nextPlaced.length)) {
          failures[key] = ROOM_FULL_MESSAGE;
          continue;
        }
        delete failures[key];
        nextPlaced.push(key);
      }
      return {
        placed: nextPlaced,
        failures,
        hints: recomputeHints(nextPlaced),
      };
    });
  }, [dim.isValid, catalogKeys, roomWidthM]);

  const resetLayout = useCallback(() => {
    setPlaceState({ placed: [], failures: {}, hints: {} });
  }, []);

  const placeSelectedPiece = useCallback(() => {
    if (!selectedPieceId) return;
    void tryPlacePiece(selectedPieceId);
  }, [selectedPieceId, tryPlacePiece]);

  const removeSelectedPiece = useCallback(() => {
    if (!selectedPieceId) return;
    setPlaceState((prev) => {
      if (!prev.placed.includes(selectedPieceId)) return prev;
      const nextPlaced = prev.placed.filter((k) => k !== selectedPieceId);
      const failures = { ...prev.failures };
      delete failures[selectedPieceId];
      return {
        placed: nextPlaced,
        failures,
        hints: recomputeHints(nextPlaced),
      };
    });
  }, [selectedPieceId]);

  const resetCamera = useCallback(() => {
    setCameraResetNonce((n) => n + 1);
  }, []);

  const applyShapePreset = useCallback(
    (id: (typeof ARRANGE_SHAPE_PRESETS)[number]["id"]) => {
      const p = ARRANGE_SHAPE_PRESETS.find((x) => x.id === id);
      if (!p) return;
      setRoomShapeId(p.id);
      setWidthStr(`${p.w} m`);
      setDepthStr(`${p.d} m`);
    },
    [],
  );

  const enterFromGenerate = useCallback(
    (carryKey: string | undefined) => {
      setCameraMode("orbit");
      if (!carryKey || !catalogKeySet.has(carryKey)) {
        setSelectedPieceId(catalogKeys[0] ?? null);
        return { placed: false as const, reason: null as string | null };
      }
      setSelectedPieceId(carryKey);
      const r = tryPlacePiece(carryKey);
      if (r.ok) {
        return { placed: true as const, reason: null as string | null };
      }
      return { placed: false as const, reason: r.reason };
    },
    [catalogKeySet, catalogKeys, tryPlacePiece],
  );

  /** Restore a layout from a saved project room (URL handoff). Keys must exist in `glbCatalog`. */
  const applySavedProjectLayout = useCallback(
    (args: {
      roomShapeId: string;
      roomWidthM: number;
      roomDepthM: number;
      environment: EnvPreset;
      placedKeysInOrder: string[];
    }) => {
      const nextShape: ArrangeRoomShapeId = ARRANGE_SHAPE_PRESETS.some(
        (p) => p.id === args.roomShapeId,
      )
        ? (args.roomShapeId as ArrangeRoomShapeId)
        : ARRANGE_SHAPE_PRESETS[0]!.id;
      setRoomShapeId(nextShape);
      setWidthStr(`${args.roomWidthM} m`);
      setDepthStr(`${args.roomDepthM} m`);
      setEnvironment(args.environment);
      setCameraMode("orbit");
      const placed = args.placedKeysInOrder.filter((k) => catalogKeySet.has(k));
      setPlaceState({
        placed,
        failures: {},
        hints: recomputeHints(placed),
      });
      setSelectedPieceId(placed[0] ?? null);
    },
    [catalogKeySet],
  );

  const unplacedPieceIds = useMemo(
    () => catalogKeys.filter((k) => !placeState.placed.includes(k)),
    [catalogKeys, placeState.placed],
  );

  const roomWarnings = useMemo(() => {
    const w: { id: string; message: string }[] = [];
    if (!dim.isValid) {
      if (dim.widthError) w.push({ id: "w", message: dim.widthError });
      if (dim.depthError) w.push({ id: "d", message: dim.depthError });
    }
    return w;
  }, [dim]);

  const saveReadiness: ArrangeSaveReadiness = useMemo(() => {
    if (!dim.isValid) {
      return {
        canSave: false,
        reasonIfBlocked: ARRANGE_MSG.saveInvalidDimensions,
      };
    }
    if (placeState.placed.length === 0) {
      return {
        canSave: false,
        reasonIfBlocked: ARRANGE_MSG.saveNeedPlaced,
      };
    }
    return { canSave: true, reasonIfBlocked: null };
  }, [dim.isValid, placeState.placed.length]);

  const placements = useMemo(
    () =>
      placeState.placed
        .map((key) => {
          const row = glbCatalog.find((r) => r.key === key);
          return row ? { key, glbUrl: row.glbUrl } : null;
        })
        .filter((x): x is { key: string; glbUrl: string } => x !== null),
    [placeState.placed, glbCatalog],
  );

  return {
    roomShapeId,
    setRoomShapeId,
    roomWidthStr: widthStr,
    setRoomWidthStr: setWidthStr,
    roomDepthStr: depthStr,
    setRoomDepthStr: setDepthStr,
    roomDimensionValidation: dim,
    roomWidthM,
    roomDepthM,
    environment,
    setEnvironment,
    placedPieceIds: placeState.placed,
    placementFailures: placeState.failures,
    pieceHints: placeState.hints,
    selectedPieceId,
    setSelectedPieceId,
    unplacedPieceIds,
    placements,
    cameraMode,
    setCameraMode,
    cameraResetNonce,
    roomWarnings,
    saveReadiness,
    applyShapePreset,
    tryPlacePiece,
    togglePlacePiece,
    removePiece,
    autoPlaceAll,
    resetLayout,
    placeSelectedPiece,
    removeSelectedPiece,
    resetCamera,
    enterFromGenerate,
    applySavedProjectLayout,
  };
}

export type ArrangeRoomController = ReturnType<typeof useArrangeRoom>;
