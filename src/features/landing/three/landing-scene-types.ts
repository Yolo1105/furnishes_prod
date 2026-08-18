export type LandingHeroSceneHandle = {
  dispose: () => void;
  setPaused: (paused: boolean) => void;
  focusRoom: (roomIndex: number) => void;
  showOverview: () => void;
  renderOnce: () => void;
};

export type LandingLoaderPhase =
  "run" | "breath" | "exit" | "hold" | "wipe" | "gone";

export type LandingLoaderSceneHandle = {
  releaseRenderer: () => void;
  dispose: () => void;
};
