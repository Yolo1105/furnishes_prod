import { describe, it, expect } from "vitest";
import {
  buildSavedRoomView,
  mapPieceUrls,
  mapPlacementToPieceView,
  placementsForRoomScene,
} from "@/lib/eva/projects/map-project-saved-room";

describe("mapPieceUrls", () => {
  it("prefers stored URLs over provider", () => {
    expect(
      mapPieceUrls({
        id: "a",
        title: "t",
        storedImageUrl: " https://img ",
        providerImageUrl: "https://p",
        storedGlbUrl: "https://g",
        providerGlbUrl: null,
      }).glbUrl,
    ).toBe("https://g");
    expect(
      mapPieceUrls({
        id: "a",
        title: "t",
        storedImageUrl: null,
        providerImageUrl: "https://pi",
        storedGlbUrl: null,
        providerGlbUrl: "https://pg",
      }).imageUrl,
    ).toBe("https://pi");
  });

  it("marks missing assets without throwing", () => {
    const u = mapPieceUrls({
      id: "a",
      title: "t",
      storedImageUrl: null,
      providerImageUrl: "  ",
      storedGlbUrl: null,
      providerGlbUrl: null,
    });
    expect(u.glbAvailable).toBe(false);
    expect(u.imageAvailable).toBe(false);
    expect(u.glbUrl).toBe(null);
    expect(u.imageUrl).toBe(null);
  });
});

describe("placementsForRoomScene", () => {
  it("drops pieces without GLB so one bad asset does not break the scene list", () => {
    const out = placementsForRoomScene([
      {
        pieceId: "a",
        title: "A",
        orderIndex: 0,
        position: { x: 0, z: 0, rotationY: 0 },
        imageUrl: null,
        glbUrl: null,
        glbAvailable: false,
        imageAvailable: false,
      },
      {
        pieceId: "b",
        title: "B",
        orderIndex: 1,
        position: { x: 1, z: 1, rotationY: 0 },
        imageUrl: null,
        glbUrl: "https://glb",
        glbAvailable: true,
        imageAvailable: false,
      },
    ]);
    expect(out).toEqual([{ key: "b", glbUrl: "https://glb" }]);
  });
});

describe("buildSavedRoomView", () => {
  it("computes revision indices and maps placements", () => {
    const t0 = new Date("2025-01-01T00:00:00.000Z");
    const v = buildSavedRoomView({
      save: {
        id: "save-b",
        projectId: "p1",
        roomShapeId: "wide",
        widthM: 5,
        depthM: 3,
        environment: "morning",
        source: "eva_studio",
        createdAt: t0,
        updatedAt: t0,
        placements: [
          {
            orderIndex: 0,
            positionX: 0,
            positionZ: 0,
            rotationY: 0,
            piece: {
              id: "piece-1",
              title: "Chair",
              storedImageUrl: null,
              providerImageUrl: null,
              storedGlbUrl: "https://g",
              providerGlbUrl: null,
            },
          },
        ],
      },
      orderedSaveIds: ["save-a", "save-b"],
    });
    expect(v.savedRoomId).toBe("save-b");
    expect(v.revisionIndex).toBe(2);
    expect(v.totalRevisions).toBe(2);
    expect(v.pieces[0]?.pieceId).toBe("piece-1");
    expect(v.pieces[0]?.glbUrl).toBe("https://g");
  });
});

describe("mapPlacementToPieceView", () => {
  it("maps placement row to SavedRoomPieceView", () => {
    const p = mapPlacementToPieceView({
      orderIndex: 0,
      positionX: 1,
      positionZ: 2,
      rotationY: 0.5,
      piece: {
        id: "x",
        title: "T",
        storedImageUrl: null,
        providerImageUrl: null,
        storedGlbUrl: null,
        providerGlbUrl: "https://g",
      },
    });
    expect(p.position).toEqual({ x: 1, z: 2, rotationY: 0.5 });
    expect(p.glbUrl).toBe("https://g");
  });
});
