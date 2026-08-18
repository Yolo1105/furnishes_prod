import { useStore } from "@studio/store";

/**
 * Align scene slices with the current project immediately on switch.
 * Persistence hydrate may follow asynchronously; this prevents the
 * Reference 2D view from flashing the blank CAD grid while the demo
 * apartment GLB is still seeding.
 */
export function resetSceneForCurrentProject() {
  const s = useStore.getState();
  const currentProjectId = s.currentProjectId;
  const project = s.projects.find((p) => p.id === currentProjectId);
  const isBlankScene = !!project?.blankScene;

  if (isBlankScene) {
    useStore.setState({
      sceneSource: "room-director",
      roomMeta: null,
      cadDraft: null,
      walls: [],
      openings: [],
      currentStyleBible: null,
      originalScene: null,
      referenceImageUrl: null,
      furniture: [],
      seeded: false,
      apartmentRoot: null,
      apartmentCenter: null,
      selectedId: null,
      referencePreviewImageUrl: null,
      mainViewMode: "3d",
    } as never);
    useStore.getState().applyCadDraft();
  } else {
    useStore.setState({
      sceneSource: "viewer",
      roomMeta: null,
      cadDraft: null,
      walls: [],
      openings: [],
      currentStyleBible: null,
      originalScene: null,
      referenceImageUrl: null,
      furniture: [],
      seeded: false,
      apartmentRoot: null,
      apartmentCenter: null,
      mainViewMode: "3d",
      selectedId: null,
      referencePreviewImageUrl: null,
    } as never);
  }

  s.resetRequirements();
}
