import { routes } from "@/lib/contracts";
import type { LandingDestination, LandingSectionId } from "./landing-types";
import { setLandingScrollTarget } from "./landing-damped-scroll";

export const landingWorkItems = [
  { label: "Archviz", destination: "work-archviz" },
  { label: "Film & cinematics", destination: "work-film" },
  { label: "Real-time", destination: "work-realtime" },
  { label: "Product", destination: "work" },
  { label: "Concept", destination: "work-concept" },
  { label: "Animation", destination: "work-animation" },
] as const satisfies ReadonlyArray<{
  label: string;
  destination: LandingDestination;
}>;

export const landingStudioItems = [
  { label: "About", destination: "studio" },
  { label: "Journal", destination: "journal", tag: "[ new ]" },
  { label: "Process", destination: "studio-process" },
  { label: "Clients", destination: "studio-clients" },
  { label: "Careers", destination: "studio-careers" },
  { label: "Press", destination: "studio-press" },
] as const satisfies ReadonlyArray<{
  label: string;
  destination: LandingDestination;
  tag?: string;
}>;

export const landingNavItems = [
  { ix: "[01]", label: "Home", destination: "home", active: true },
  { ix: "[02]", label: "Work", destination: "work", active: false },
  {
    ix: "[03]",
    label: "Capabilities",
    destination: "capabilities",
    active: false,
  },
  { ix: "[04]", label: "Studio", destination: "studio", active: false },
  { ix: "[05]", label: "Journal", destination: "journal", active: false },
  { ix: "[06]", label: "Contact", destination: "contact", active: false },
  { ix: "[07]", label: "Quiz", destination: "quiz", active: false },
] as const satisfies ReadonlyArray<{
  ix: string;
  label: string;
  destination: LandingDestination;
  active: boolean;
}>;

/** Left rail + room index: each item owns a group of section anchors. */
export const landingSideNav = [
  {
    id: "home",
    label: "Home",
    desc: "Start here: the furnished house overview.",
    group: ["home"] as const,
  },
  {
    id: "about",
    label: "About",
    desc: "Who we are and how we work.",
    group: ["about"] as const,
  },
  {
    id: "experience",
    label: "Experience",
    desc: "Design that feels natural to live in.",
    group: ["experience"] as const,
  },
  {
    id: "studio",
    label: "Studio",
    desc: "We build the image before it's built.",
    group: ["studio", "about-intro"] as const,
  },
  {
    id: "about-projects",
    label: "Work",
    desc: "Projects, teams, journal, and how to reach us.",
    group: [
      "about-projects",
      "about-teams",
      "about-blog",
      "heritage",
      "waitlist",
      "contact",
    ] as const,
  },
] as const;

/** Explicit destination → in-page section or route. Never derived from labels. */
const destinationTargets: Record<
  LandingDestination,
  | { kind: "scroll"; sectionId: LandingSectionId }
  | { kind: "route"; href: string }
> = {
  home: { kind: "scroll", sectionId: "home" },
  work: { kind: "scroll", sectionId: "about-projects" },
  "work-archviz": { kind: "scroll", sectionId: "about-projects" },
  "work-film": { kind: "scroll", sectionId: "about-projects" },
  "work-realtime": { kind: "scroll", sectionId: "about-projects" },
  "work-concept": { kind: "scroll", sectionId: "about-projects" },
  "work-animation": { kind: "scroll", sectionId: "about-projects" },
  capabilities: { kind: "scroll", sectionId: "experience" },
  studio: { kind: "scroll", sectionId: "studio" },
  "studio-process": { kind: "scroll", sectionId: "studio" },
  "studio-clients": { kind: "scroll", sectionId: "about-teams" },
  "studio-careers": { kind: "scroll", sectionId: "studio" },
  "studio-press": { kind: "scroll", sectionId: "about-projects" },
  journal: { kind: "scroll", sectionId: "about-blog" },
  contact: { kind: "scroll", sectionId: "contact" },
  quiz: { kind: "route", href: routes.quiz },
  login: { kind: "route", href: "/login" },
};

export function isLandingDestination(
  value: string,
): value is LandingDestination {
  return value in destinationTargets;
}

export function resolveLandingDestination(destination: LandingDestination) {
  return destinationTargets[destination];
}

/**
 * Section jumps share the same damped target as wheel scrolling, so side-nav
 * clicks and free scroll feel like one motion system.
 */
function scrollLandingToY(targetY: number) {
  const startY = window.scrollY || 0;
  if (Math.abs(targetY - startY) < 2) return;
  setLandingScrollTarget(targetY);
}

/** Section scroll used by side nav, index, menu, and wordmark. */
export function scrollToLandingSection(
  sectionId: LandingSectionId,
  root?: ParentNode | null,
) {
  if (sectionId === "home") {
    scrollLandingToY(0);
    return;
  }

  const scope = root ?? document;
  const element = scope.querySelector(`#${CSS.escape(sectionId)}`);

  if (!element) return;

  scrollLandingToY(element.getBoundingClientRect().top + window.scrollY);
}
