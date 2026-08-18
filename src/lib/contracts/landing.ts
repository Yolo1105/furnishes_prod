export type LandingDestination =
  | "home"
  | "work"
  | "work-archviz"
  | "work-film"
  | "work-realtime"
  | "work-concept"
  | "work-animation"
  | "capabilities"
  | "studio"
  | "studio-process"
  | "studio-clients"
  | "studio-careers"
  | "studio-press"
  | "journal"
  | "contact"
  | "quiz"
  | "login";

export type WaitlistResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "duplicate" | "unavailable";
    };
