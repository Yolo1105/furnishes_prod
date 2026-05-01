import { create } from "zustand";
import {
  createChatSlice,
  selectCanSend,
  selectAllKeywordsFilled,
  type ChatSlice,
} from "./chat-slice";
import { createUiFlagsSlice, type UiFlagsSlice } from "./ui-flags-slice";
import {
  createProjectsSlice,
  selectCurrentProject,
  type ProjectsSlice,
} from "./projects-slice";
import { createHistorySlice, type HistorySlice } from "./history-slice";
import {
  createCardPositionsSlice,
  type CardPositionsSlice,
} from "./card-positions-slice";
import {
  createFurnitureSlice,
  selectVisibleCount,
  selectPlaced,
  selectPlacedIds,
  type FurnitureSlice,
} from "./furniture-slice";
import { createWallsSlice, type WallsSlice } from "./walls-slice";
import { createSelectionSlice, type SelectionSlice } from "./selection-slice";
import { createTourSlice, type TourSlice } from "./tour-slice";
import {
  createRequirementsSlice,
  type RequirementsSlice,
} from "./requirements-slice";
import {
  createGenerationsSlice,
  type GenerationsSlice,
} from "./generations-slice";
import {
  createSceneSourceSlice,
  type SceneSourceSlice,
} from "./scene-source-slice";
import {
  createPreferencesSlice,
  type PreferencesSlice,
} from "./preferences-slice";
import {
  createSuggestionsSlice,
  type SuggestionsSlice,
} from "./suggestions-slice";
import { createStarredSlice, type StarredSlice } from "./starred-slice";
import { createProfileSlice, type ProfileSlice } from "./profile-slice";
import type { Store } from "./store-types";

export type { Store } from "./store-types";

export const useStore = create<Store>()((set, get, api) => ({
  ...createChatSlice(set, get, api),
  ...createUiFlagsSlice(set, get, api),
  ...createProjectsSlice(set, get, api),
  ...createHistorySlice(set, get, api),
  ...createCardPositionsSlice(set, get, api),
  ...createFurnitureSlice(set, get, api),
  ...createWallsSlice(set, get, api),
  ...createSelectionSlice(set, get, api),
  ...createTourSlice(set, get, api),
  ...createRequirementsSlice(set, get, api),
  ...createGenerationsSlice(set, get, api),
  ...createSceneSourceSlice(set, get, api),
  ...createPreferencesSlice(set, get, api),
  ...createSuggestionsSlice(set, get, api),
  ...createStarredSlice(set, get, api),
  ...createProfileSlice(set, get, api),
}));

export {
  selectCanSend,
  selectAllKeywordsFilled,
  selectCurrentProject,
  selectVisibleCount,
  selectPlaced,
  selectPlacedIds,
};
