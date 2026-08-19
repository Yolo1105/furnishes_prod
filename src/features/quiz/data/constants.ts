/** Shared layout/spacing constants for the design quiz. */

export const QUIZ_PAD_X = "clamp(28px, 3vw, 40px)";

export const STYLE_TILE_GRADIENTS = {
  minimal: ["#EFE9E1", "#C9BBA8", "#9C8E82"],
  maximalist: ["#8C3A1B", "#B33D0E", "#4A2214"],
  organic: ["#8A9E7A", "#6B7355", "#3E4630"],
  industrial: ["#7A7A88", "#4A4A58", "#2D2D3B"],
  artisan: ["#D9B98C", "#B09470", "#7A5E3E"],
};

export const FLOW_META_DEFS = {
  style: {
    label: "STYLE",
    longLabel: "STYLE DISCOVERY",
    sub: "Instinct, texture, light",
  },
  budget: {
    label: "BUDGET",
    longLabel: "BUDGET",
    sub: "What you'll spend, where it matters",
  },
  room: { label: "ROOM", longLabel: "ROOM DETAILS", sub: "The space itself" },
};

export const INTRO_COPY = {
  style: {
    ghost: "MOOD",
    eyebrow: "DESIGN QUIZ",
    title: "WHAT KIND OF SPACE ARE YOU?",
    body: "Textures, light, and instinct. Fourteen questions to surface the look and feel that fits you. No wrong answers.",
    flows: [{ label: "STYLE", sub: "14 questions" }],
    footer: "STYLE DISCOVERY · 5 POSSIBLE PROFILES",
  },
  budget: {
    ghost: "PLAN",
    eyebrow: "BUDGET PLANNER",
    title: "PLAN WHAT YOU'LL SPEND",
    body: "Tell us how you shop and what matters most. Get a guided range or lock in a number you already have in mind.",
    flows: [
      { label: "ENTRY", sub: "1 step" },
      { label: "GUIDED", sub: "up to 6" },
      { label: "PRIORITIES", sub: "2 steps" },
    ],
    footer: "BUDGET FLOW · RANGE OR STATED AMOUNT",
  },
  room: {
    ghost: "BRIEF",
    eyebrow: "ROOM PLANNER",
    title: "TELL US ABOUT THE ROOM",
    body: "The household, the light, the floor, the furniture list. Ten questions to turn your space into a working brief.",
    flows: [{ label: "ROOM", sub: "10 questions" }],
    footer: "ROOM DETAILS · A COMPLETE BRIEF",
  },
  resume: {
    ghost: "HOLD",
    eyebrow: "INTERIOR STYLE QUIZ",
    title: "PICK UP WHERE YOU LEFT OFF?",
    body: "Your last session is still on this device. Continue the same path, or choose a new one and start fresh.",
    flows: [],
    footer: "PROGRESS KEPT · NOTHING WAS LOST",
  },
  full: {
    ghost: "SPACE",
    eyebrow: "INTERIOR STYLE QUIZ",
    title: "WHAT KIND OF SPACE ARE YOU?",
    body: "Three flows. No right answers. A full portrait of your style, your budget, and your room, drawn in material, light, and instinct.",
    flows: [
      { label: "STYLE", sub: "14 questions" },
      { label: "BUDGET", sub: "6 to 8 questions" },
      { label: "ROOM", sub: "10 questions" },
    ],
    footer: "3 FLOWS · 30+ QUESTIONS · 5 POSSIBLE STYLE PROFILES",
  },
};

export const MODE_OPTIONS = [
  {
    id: "full",
    label: "THE FULL QUIZ",
    sub: "Style + budget + room · 30+ questions",
  },
  { id: "style", label: "STYLE ONLY", sub: "Find your profile · 14 questions" },
  {
    id: "budget",
    label: "BUDGET ONLY",
    sub: "Plan your spend · 3–9 questions",
  },
  { id: "room", label: "ROOM ONLY", sub: "Brief your space · 10 questions" },
];

export const QUIZ_SAVE_KEY = "furnishes-quiz-save";
