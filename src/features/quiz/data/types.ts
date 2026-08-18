/** Shared quiz domain types. */

export type QuizStyleKey =
  "minimal" | "maximalist" | "organic" | "industrial" | "artisan";

export type QuizMode = "full" | "style" | "budget" | "room";

export type StyleTally = Record<QuizStyleKey, number>;

export type RankedStyle = {
  key: string;
  score: number;
  pct: number;
};

type StyleOption = {
  id: string;
  label: string;
  style?: QuizStyleKey;
  sublabel?: string;
};

export type StyleProfile = {
  name: string;
  tagline: string;
  description: string;
  palette: string[];
  keywords: string[];
};

/** Pragmatic question shape — fields vary by layout/type. */
export type QuizQuestion = {
  id: string;
  flow?: string;
  section?: string;
  type: string;
  layout?: string;
  bg?: string;
  accent?: string;
  question?: string;
  subtext?: string;
  optional?: boolean;
  autoAdvance?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options?: StyleOption[];
  imageOptions?: StyleOption[];
  paletteCards?: Array<{
    id: string;
    name?: string;
    style?: QuizStyleKey;
    [key: string]: unknown;
  }>;
  binaryPairs?: unknown[];
  lifeRealityGroups?: unknown[];
  categories?: Array<{ id: string; label: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type QuizAnswers = Record<string, unknown>;
