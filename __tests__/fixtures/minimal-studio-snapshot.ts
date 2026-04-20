/** Shared valid `StudioSnapshotPayload` shape for request/schema tests. */
export const minimalStudioSnapshotFixture = {
  activeProjectId: "proj_1",
  projectTitle: "Living room refresh",
  room: { roomType: "Rectangle", width: "4 m", length: "5 m" },
  designIntent: {
    prompt: "Warm minimal sofa",
    styleTags: ["minimal"],
    constraints: [],
  },
  scene: {
    placedItems: ["Sofa A"],
    materials: [],
    colors: [],
  },
  assets: {
    referenceImages: [{ id: "a1", url: "https://example.com/a.png" }],
    generatedImages: [],
  },
  lastUserActions: ["Tab: generate"],
} as const;
