/**
 * Heritage landing block: same layout pattern as furnishes_v2 Services accordion,
 * copy adapted for studio history and craft lineage.
 */

export const HERITAGE_HEADING = "Heritage";
export const HERITAGE_WE = "we";
/** Text after accent “we” (leading space); mirrors “we provide” on Services. */
export const HERITAGE_HEADING_REST = " preserve";

export const HERITAGE_TAGLINE =
  "From workshop roots to full interiors, craft, clarity, and lasting materials stay at the center of how we work.\n\nWe still sketch with real samples, watch light move through a room, and choose finishes that feel honest in the hand. Our process stays quiet and deliberate: clear plans, steady partners, and spaces built to live well long after the first reveal.";

/** Bracketed link label in `HeritageSection`; same pattern as `BracketedSectionLabel` elsewhere. */
export const HERITAGE_CTA_LABEL = "START YOUR PROJECT";

export const HERITAGE_ACCORDION_ITEMS: {
  title: string;
  tag: string;
  body: string;
}[] = [
  {
    title: "Workshop beginnings",
    tag: "ORIGINS",
    body: "What began as a small workshop grew through joinery, samples, and clients who valued care over volume. That early habit of listening to materials, light, and daily use still shapes how we plan each project today.",
  },
  {
    title: "First signature spaces",
    tag: "MILESTONES",
    body: "Early residential and studio projects set our language of honest materials, clear plans, and rooms built to age well with daily life.",
  },
  {
    title: "Craft & collaborators",
    tag: "MAKERS",
    body: "We deepened ties with local makers and suppliers so bespoke details and trusted fabrication stay central to every brief.",
  },
  {
    title: "Broader commissions",
    tag: "GROWTH",
    body: "Larger renovations and mixed use work stretched our process while keeping the same bar for light, proportion, and finish.",
  },
  {
    title: "Today & next chapters",
    tag: "LEGACY",
    body: "The studio now balances new builds and careful renewals, carrying forward a heritage of clarity, warmth, and buildable design.",
  },
];
