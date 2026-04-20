import type { Question } from "./types";
import { STYLE_QUESTIONS } from "./style-questions";
import { BUDGET_QUESTIONS } from "./budget-questions";
import { ROOM_QUESTIONS } from "./room-questions";

export const ALL_QUESTIONS: Question[] = [
  ...STYLE_QUESTIONS,
  ...BUDGET_QUESTIONS,
  ...ROOM_QUESTIONS,
];
