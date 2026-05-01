/**
 * Mock data layer.
 *
 * Every `getMock*` is a pure function returning realistic, typed demo data.
 * Pages consume these directly. When real backends land, swap these out for
 * Prisma reads — the view layer does not change.
 *
 * Data is deliberately varied (mixed statuses, plausible SG-context naming,
 * spread of timestamps) so populated states don't read as "lorem ipsum".
 */

import type {
  StyleProfile,
  UserPreference,
  Budget,
  ConversationSummary,
  DesignPlaybook,
  ShortlistItem,
  Project,
  Upload,
  UserProfile,
  NotificationPrefs,
  SessionRow,
  SecurityEvent,
  Invoice,
  ConsentRow,
  ActivityEvent,
  ConversationDetail,
  ConversationMessage,
  DesignPlaybookDetail,
  DesignPlaybookSection,
  ShortlistItemDetail,
} from "./types";
import { DEFAULT_NOTIFICATION_PREFS } from "./account-prisma-mappers";
import { PROJECT_COLLABORATION_DEFAULTS } from "./project-access-copy";
import { ALL_STYLE_PROFILES, getStyleArchetypes } from "./style-archetypes";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const minsAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

/* ── User ──────────────────────────────────────────────────────── */

export function getMockUser(): UserProfile {
  return {
    name: "Mohan Tan",
    email: "mohan@example.sg",
    emailVerified: true,
    phone: "+65 9123 4567",
    phoneVerified: false,
    image: null,
    locale: "en-SG",
    timeZone: "Asia/Singapore",
    homeType: "Condo",
    roomCount: 4,
    householdSize: 2,
    hasPets: true,
    hasKids: false,
    measurements: [
      {
        id: "m1",
        room: "Living room",
        widthCm: 450,
        heightCm: 380,
        ceilingCm: 280,
        doorwayCm: 90,
        notes: "Main entrance via doorway to the right",
      },
      {
        id: "m2",
        room: "Master bedroom",
        widthCm: 380,
        heightCm: 320,
        ceilingCm: 265,
        doorwayCm: 85,
      },
      {
        id: "m3",
        room: "Study",
        widthCm: 260,
        heightCm: 240,
        ceilingCm: 265,
        doorwayCm: 80,
      },
    ],
  };
}

/* ── Style Profile ─────────────────────────────────────────────── */

export {
  ALL_STYLE_PROFILES,
  getStyleArchetypes,
  type StyleArchetype,
} from "./style-archetypes";

export function getMockStyleArchetypes() {
  return getStyleArchetypes();
}

export function getMockStyleProfile(): StyleProfile {
  return { ...ALL_STYLE_PROFILES[2]!, takenAt: daysAgo(12) };
}

/* ── Preferences ───────────────────────────────────────────────── */

export function getMockPreferences(): UserPreference[] {
  return [
    {
      id: "p1",
      group: "style",
      field: "Primary direction",
      value: "Organic naturalist with artisan accents",
      confidence: 0.88,
      status: "confirmed",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(2),
    },
    {
      id: "p2",
      group: "style",
      field: "Avoid",
      value: "High-gloss lacquer, chrome",
      confidence: 0.72,
      status: "potential",
      sourceConversationId: "c3",
      sourceConversationTitle: "Study nook ideas",
      updatedAt: daysAgo(5),
    },
    {
      id: "p3",
      group: "room",
      field: "Primary room",
      value: "Living room (4.5m × 3.8m)",
      confidence: 0.95,
      status: "confirmed",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(2),
    },
    {
      id: "p4",
      group: "room",
      field: "Natural light",
      value: "East-facing, strong morning",
      confidence: 0.81,
      status: "confirmed",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(2),
    },
    {
      id: "p5",
      group: "budget",
      field: "Total range",
      value: "SGD 6,000 – 12,000",
      confidence: 0.9,
      status: "confirmed",
      sourceConversationId: "c2",
      sourceConversationTitle: "Budget planning",
      updatedAt: daysAgo(8),
    },
    {
      id: "p6",
      group: "budget",
      field: "Sofa ceiling",
      value: "SGD 4,500",
      confidence: 0.62,
      status: "potential",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(1),
    },
    {
      id: "p7",
      group: "materials",
      field: "Preferred woods",
      value: "Oak, walnut",
      confidence: 0.84,
      status: "confirmed",
      sourceConversationId: "c3",
      sourceConversationTitle: "Study nook ideas",
      updatedAt: daysAgo(5),
    },
    {
      id: "p8",
      group: "materials",
      field: "Upholstery",
      value: "Performance linen, bouclé",
      confidence: 0.77,
      status: "confirmed",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(3),
    },
    {
      id: "p9",
      group: "musthaves",
      field: "Pet-friendly",
      value: "Cat at home — stain-resistant fabric",
      confidence: 0.96,
      status: "confirmed",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(4),
    },
    {
      id: "p10",
      group: "musthaves",
      field: "Storage",
      value: "Concealed storage for cables",
      confidence: 0.58,
      status: "potential",
      sourceConversationId: "c3",
      sourceConversationTitle: "Study nook ideas",
      updatedAt: daysAgo(6),
    },
    {
      id: "p11",
      group: "dealbreakers",
      field: "Assembly",
      value: "Nothing requiring 2+ hours self-assembly",
      confidence: 0.68,
      status: "potential",
      sourceConversationId: "c1",
      sourceConversationTitle: "Living room refresh — Tampines",
      updatedAt: daysAgo(9),
    },
    {
      id: "p12",
      group: "dealbreakers",
      field: "Origin",
      value: "Avoid fast-furniture brands",
      confidence: 0.82,
      status: "confirmed",
      sourceConversationId: "c4",
      sourceConversationTitle: "Sustainability notes",
      updatedAt: daysAgo(11),
    },
  ];
}

/* ── Budget ────────────────────────────────────────────────────── */

export function getMockBudget(): Budget {
  return {
    currency: "SGD",
    minCents: 600_000,
    maxCents: 1_200_000,
    rooms: [
      {
        id: "r1",
        room: "Living room",
        allocationCents: 420_000,
        percentage: 35,
      },
      {
        id: "r2",
        room: "Master bedroom",
        allocationCents: 300_000,
        percentage: 25,
      },
      { id: "r3", room: "Study", allocationCents: 180_000, percentage: 15 },
      { id: "r4", room: "Dining", allocationCents: 180_000, percentage: 15 },
      {
        id: "r5",
        room: "Styling reserve",
        allocationCents: 120_000,
        percentage: 10,
      },
    ],
  };
}

/* ── Conversations ─────────────────────────────────────────────── */

export function getMockConversations(): ConversationSummary[] {
  return [
    {
      id: "c1",
      title: "Living room refresh — Tampines",
      snippet:
        "You mentioned preferring a deeper olive over the sage. I've pulled three sofas that match…",
      messageCount: 42,
      inferredPreferenceCount: 7,
      status: "active",
      updatedAt: hoursAgo(3),
    },
    {
      id: "c2",
      title: "Budget planning",
      snippet:
        "Given your range of SGD 6–12k and the living room priority, I'd recommend reserving…",
      messageCount: 18,
      inferredPreferenceCount: 3,
      status: "active",
      updatedAt: daysAgo(2),
    },
    {
      id: "c3",
      title: "Study nook ideas",
      snippet:
        "A fluted oak panel behind the desk would echo the woods we discussed for…",
      messageCount: 31,
      inferredPreferenceCount: 5,
      status: "active",
      updatedAt: daysAgo(4),
    },
    {
      id: "c4",
      title: "Sustainability notes",
      snippet:
        "Here's how FSC certification compares to the Rainforest Alliance standard for…",
      messageCount: 9,
      inferredPreferenceCount: 2,
      status: "active",
      updatedAt: daysAgo(6),
    },
    {
      id: "c5",
      title: "Lighting for east-facing rooms",
      snippet:
        "Warm 2700K works well here, especially paired with the linen you're considering.",
      messageCount: 14,
      inferredPreferenceCount: 2,
      status: "active",
      updatedAt: daysAgo(9),
    },
    {
      id: "c6",
      title: "Wedding gift registry ideas",
      snippet:
        "For a close friend's housewarming, a small but considered piece tends to…",
      messageCount: 6,
      inferredPreferenceCount: 0,
      status: "active",
      updatedAt: daysAgo(14),
    },
    {
      id: "c7",
      title: "Kitchen pendant comparison",
      snippet:
        "The Gubi Semi vs Muuto Grain — let's compare diffusion patterns and…",
      messageCount: 11,
      inferredPreferenceCount: 1,
      status: "active",
      updatedAt: daysAgo(17),
    },
    {
      id: "c8",
      title: "Old apartment move-out checklist",
      snippet:
        "What to measure before the shift — doorways, lift cage, corridor turns.",
      messageCount: 7,
      inferredPreferenceCount: 0,
      status: "archived",
      updatedAt: daysAgo(45),
    },
    {
      id: "c9",
      title: "First brief: HDB 4-room",
      snippet:
        "Initial conversation about renovation goals and budget ceiling before Tampines…",
      messageCount: 22,
      inferredPreferenceCount: 4,
      status: "archived",
      updatedAt: daysAgo(68),
    },
    {
      id: "c10",
      title: "Shared with Sarah — mood board",
      snippet:
        "Collaborative thread. Sarah likes the deeper olive; you prefer the sage.",
      messageCount: 28,
      inferredPreferenceCount: 3,
      status: "shared",
      updatedAt: daysAgo(20),
    },
    {
      id: "c11",
      title: "Bed frame: platform vs. storage",
      snippet:
        "Ottoman storage at the foot adds 20cm. Platform is cleaner but loses storage.",
      messageCount: 15,
      inferredPreferenceCount: 2,
      status: "active",
      updatedAt: daysAgo(22),
    },
    {
      id: "c12",
      title: "Rug sizing for living room",
      snippet:
        "An 8×10 would anchor the sofa and chair; a 9×12 would bring the credenza in.",
      messageCount: 19,
      inferredPreferenceCount: 1,
      status: "active",
      updatedAt: daysAgo(28),
    },
  ];
}

/* ── Playbooks ─────────────────────────────────────────────────── */

export function getMockPlaybooks(): DesignPlaybook[] {
  return [
    {
      id: "pb1",
      title: "Small HDB living room — 10 moves",
      summary:
        "Proportions, layering, and storage tricks that feel generous in ~12 m².",
      author: "eva",
      tags: ["HDB", "Small spaces", "Living room"],
      coverHue: 28,
      updatedAt: daysAgo(3),
    },
    {
      id: "pb2",
      title: "East-facing morning-light styling",
      summary:
        "How to dress a room that gets strong light before 10 a.m. and cool shadow after.",
      author: "eva",
      tags: ["Lighting", "Styling"],
      coverHue: 42,
      updatedAt: daysAgo(5),
    },
    {
      id: "pb3",
      title: "Pet-friendly upholstery cheat sheet",
      summary:
        "Bouclé looks great and survives cats — but only these three weaves.",
      author: "user",
      tags: ["Fabrics", "Pets"],
      coverHue: 18,
      updatedAt: daysAgo(8),
    },
    {
      id: "pb4",
      title: "Condo entryway rituals",
      summary:
        "The 60 cm between front door and corridor is your most useful moment.",
      author: "eva",
      tags: ["Entryway", "Condo"],
      coverHue: 54,
      updatedAt: daysAgo(11),
    },
    {
      id: "pb5",
      title: "Budget split for first-time owners",
      summary: "Where to invest, where to save, where to defer until year two.",
      author: "eva",
      tags: ["Budget", "Planning"],
      coverHue: 8,
      updatedAt: daysAgo(14),
    },
    {
      id: "pb6",
      title: "Reading corner mood notes",
      summary:
        "Personal notes from our Saturday brainstorm about the study window.",
      author: "user",
      tags: ["Study", "Notes"],
      coverHue: 68,
      updatedAt: daysAgo(22),
    },
  ];
}

/* ── Shortlist ─────────────────────────────────────────────────── */

export function getMockShortlist(): ShortlistItem[] {
  return [
    {
      id: "s1",
      productId: "prd-maren",
      productName: "Maren 3-seater sofa — olive linen",
      productCategory: "Sofas & Sectionals",
      priceCents: 389_900,
      currency: "SGD",
      projectId: "pr1",
      projectName: "Living room — Tampines condo",
      coverHue: 80,
      createdAt: daysAgo(2),
    },
    {
      id: "s2",
      productId: "prd-oda",
      productName: "Oda lounge chair — bouclé",
      productCategory: "Armchairs",
      priceCents: 149_000,
      currency: "SGD",
      projectId: "pr1",
      projectName: "Living room — Tampines condo",
      coverHue: 30,
      createdAt: daysAgo(3),
    },
    {
      id: "s3",
      productId: "prd-halden",
      productName: "Halden coffee table — oak",
      productCategory: "Tables",
      priceCents: 89_900,
      currency: "SGD",
      projectId: "pr1",
      projectName: "Living room — Tampines condo",
      coverHue: 40,
      createdAt: daysAgo(5),
    },
    {
      id: "s4",
      productId: "prd-tova-rug",
      productName: "Tova rug 200×300 — ivory",
      productCategory: "Decor",
      priceCents: 78_000,
      currency: "SGD",
      projectId: "pr1",
      projectName: "Living room — Tampines condo",
      coverHue: 50,
      createdAt: daysAgo(7),
    },
    {
      id: "s5",
      productId: "prd-lume",
      productName: "Lume floor lamp — brass",
      productCategory: "Lighting",
      priceCents: 62_900,
      currency: "SGD",
      projectId: "pr1",
      projectName: "Living room — Tampines condo",
      coverHue: 44,
      createdAt: daysAgo(9),
    },
    {
      id: "s6",
      productId: "prd-varde",
      productName: "Värde desk — walnut",
      productCategory: "Tables",
      priceCents: 112_000,
      currency: "SGD",
      projectId: "pr2",
      projectName: "Study nook",
      coverHue: 22,
      createdAt: daysAgo(4),
    },
    {
      id: "s7",
      productId: "prd-hult",
      productName: "Hult task chair — ash",
      productCategory: "Armchairs",
      priceCents: 84_000,
      currency: "SGD",
      projectId: "pr2",
      projectName: "Study nook",
      coverHue: 12,
      createdAt: daysAgo(6),
    },
    {
      id: "s8",
      productId: "prd-folio",
      productName: "Folio wall shelf — oak",
      productCategory: "Decor",
      priceCents: 34_900,
      currency: "SGD",
      projectId: "pr2",
      projectName: "Study nook",
      coverHue: 38,
      createdAt: daysAgo(10),
    },
    {
      id: "s9",
      productId: "prd-eden",
      productName: "Eden bed frame — ash",
      productCategory: "Sofas & Sectionals",
      priceCents: 198_000,
      currency: "SGD",
      projectId: "pr3",
      projectName: "Master bedroom",
      coverHue: 18,
      createdAt: daysAgo(12),
    },
    {
      id: "s10",
      productId: "prd-soma",
      productName: "Soma pendant — opal glass",
      productCategory: "Lighting",
      priceCents: 43_000,
      currency: "SGD",
      projectId: "pr3",
      projectName: "Master bedroom",
      coverHue: 58,
      createdAt: daysAgo(15),
    },
    {
      id: "s11",
      productId: "prd-kin",
      productName: "Kin ceramic vase set",
      productCategory: "Decor",
      priceCents: 18_900,
      currency: "SGD",
      projectId: null,
      projectName: null,
      coverHue: 24,
      createdAt: daysAgo(20),
    },
    {
      id: "s12",
      productId: "prd-ora",
      productName: "Ora table mirror — brass",
      productCategory: "Decor",
      priceCents: 29_000,
      currency: "SGD",
      projectId: null,
      projectName: null,
      coverHue: 46,
      createdAt: daysAgo(24),
    },
  ];
}

/* ── Projects ──────────────────────────────────────────────────── */

export function getMockProjects(): Project[] {
  return [
    {
      id: "pr1",
      title: "Living room — Tampines condo",
      description:
        "Warm, organic refresh anchored on an olive sofa and oak coffee table.",
      room: "Living room",
      status: "sourcing",
      budgetCents: 420_000,
      currency: "SGD",
      coverHue: 80,
      progress: 55,
      stats: { conversations: 4, shortlistItems: 5, uploads: 6 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: hoursAgo(4),
      createdAt: daysAgo(22),
    },
    {
      id: "pr2",
      title: "Study nook",
      description: "Compact corner for focused work and evening reading.",
      room: "Study",
      status: "planning",
      budgetCents: 180_000,
      currency: "SGD",
      coverHue: 22,
      progress: 25,
      stats: { conversations: 2, shortlistItems: 3, uploads: 2 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: daysAgo(3),
      createdAt: daysAgo(14),
    },
    {
      id: "pr3",
      title: "Master bedroom",
      description:
        "Calm, low-light retreat. Ash frame, soft linen, opal pendant.",
      room: "Master bedroom",
      status: "in_progress",
      budgetCents: 300_000,
      currency: "SGD",
      coverHue: 210,
      progress: 78,
      stats: { conversations: 3, shortlistItems: 2, uploads: 3 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: daysAgo(1),
      createdAt: daysAgo(35),
    },
    {
      id: "pr4",
      title: "Dining — oak slab table",
      description: "Centerpiece for 6. Matching bench + 4 chairs.",
      room: "Dining",
      status: "done",
      budgetCents: 180_000,
      currency: "SGD",
      coverHue: 36,
      progress: 100,
      stats: { conversations: 2, shortlistItems: 4, uploads: 2 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: daysAgo(40),
      createdAt: daysAgo(90),
    },
    {
      id: "pr5",
      title: "Old apartment move-out",
      description: "Archived after handover.",
      room: "Whole home",
      status: "archived",
      budgetCents: 0,
      currency: "SGD",
      coverHue: 0,
      progress: 100,
      stats: { conversations: 2, shortlistItems: 0, uploads: 1 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: daysAgo(70),
      createdAt: daysAgo(180),
    },
    {
      id: "pr6",
      title: "Entryway details",
      description: "Bench, console, mirror, shoe storage.",
      room: "Entryway",
      status: "planning",
      budgetCents: 80_000,
      currency: "SGD",
      coverHue: 54,
      progress: 10,
      stats: { conversations: 1, shortlistItems: 0, uploads: 0 },
      ...PROJECT_COLLABORATION_DEFAULTS,
      updatedAt: daysAgo(6),
      createdAt: daysAgo(8),
    },
  ];
}

/* ── Uploads ───────────────────────────────────────────────────── */

export function getMockUploads(): Upload[] {
  const mk = (
    i: number,
    room: string,
    w: number,
    h: number,
    hue: number,
    analysis: string,
    conv?: string,
    proj?: string,
  ): Upload => ({
    id: `u${i}`,
    filename: `IMG_${1000 + i}.jpg`,
    room,
    width: w,
    height: h,
    coverHue: hue,
    analysis,
    linkedConversationId: conv,
    linkedConversationTitle: conv ? `Conversation ${conv}` : undefined,
    projectId: proj,
    uploadedAt: daysAgo(i),
  });
  return [
    mk(
      1,
      "Living room",
      1200,
      1600,
      80,
      "East-facing, strong morning light. Walls read warm-neutral; floor has a slight pink undertone that'll conflict with cooler fabrics.",
    ),
    mk(
      2,
      "Living room",
      1600,
      1067,
      85,
      "Low-angle view. Confirms the sofa must not exceed 2.1 m to clear the window sightline.",
    ),
    mk(
      3,
      "Study",
      1200,
      1200,
      22,
      "Corner has ~4 cm deviation — a wall-mounted desk will need a spacer.",
    ),
    mk(
      4,
      "Living room",
      1600,
      2133,
      72,
      "Evening light reference. Warmer cast than morning by ~300K; worth testing rug samples at dusk.",
    ),
    mk(
      5,
      "Master bedroom",
      1200,
      1800,
      210,
      "Overhead is single dome light — position a task lamp at 1.4 m bedside.",
    ),
    mk(
      6,
      "Living room",
      1600,
      900,
      92,
      "Full-wall shot showing the TV console gap (1.8 m). Usable for low sideboards only.",
    ),
    mk(
      7,
      "Study",
      1067,
      1600,
      28,
      "Bookshelf reference — existing unit is MDF with veneer lift at the corners.",
    ),
    mk(
      8,
      "Entryway",
      1200,
      1600,
      54,
      "Shoe pile hints at 4–5 pairs in daily rotation — plan for at least 2 tiers of open storage.",
    ),
    mk(
      9,
      "Master bedroom",
      1600,
      1200,
      200,
      "Bed head wall is load-bearing; drill anchors rated for 20 kg+ available.",
    ),
  ];
}

export function getMockUploadById(id: string): Upload | null {
  return getMockUploads().find((u) => u.id === id) ?? null;
}

/* ── Notifications ─────────────────────────────────────────────── */

export function getMockNotificationPrefs(): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS };
}

/* ── Security ──────────────────────────────────────────────────── */

export function getMockSessions(): SessionRow[] {
  return [
    {
      id: "ses1",
      deviceLabel: "MacBook Pro (M2)",
      browser: "Chrome 131 · macOS",
      ip: "103.252.***.***",
      city: "Singapore",
      country: "SG",
      lastActive: minsAgo(2),
      current: true,
    },
    {
      id: "ses2",
      deviceLabel: "iPhone 15",
      browser: "Safari 17 · iOS",
      ip: "116.14.***.***",
      city: "Singapore",
      country: "SG",
      lastActive: hoursAgo(8),
      current: false,
    },
    {
      id: "ses3",
      deviceLabel: "iPad Air",
      browser: "Safari 17 · iPadOS",
      ip: "116.14.***.***",
      city: "Singapore",
      country: "SG",
      lastActive: daysAgo(3),
      current: false,
    },
    {
      id: "ses4",
      deviceLabel: "Work laptop",
      browser: "Edge 131 · Windows 11",
      ip: "203.116.***.***",
      city: "Singapore",
      country: "SG",
      lastActive: daysAgo(7),
      current: false,
    },
  ];
}

export function getMockSecurityEvents(): SecurityEvent[] {
  return [
    {
      id: "se1",
      kind: "sign-in",
      ok: true,
      description: "Sign-in from MacBook Pro",
      city: "Singapore",
      country: "SG",
      at: minsAgo(2),
    },
    {
      id: "se2",
      kind: "new-device",
      ok: true,
      description: "New device recognized: iPad Air",
      city: "Singapore",
      country: "SG",
      at: daysAgo(3),
    },
    {
      id: "se3",
      kind: "password-change",
      ok: true,
      description: "Password changed",
      city: "Singapore",
      country: "SG",
      at: daysAgo(14),
    },
    {
      id: "se4",
      kind: "sign-in",
      ok: false,
      description: "Failed sign-in attempt",
      city: "Kuala Lumpur",
      country: "MY",
      at: daysAgo(18),
    },
    {
      id: "se5",
      kind: "sign-in",
      ok: true,
      description: "Sign-in from Work laptop",
      city: "Singapore",
      country: "SG",
      at: daysAgo(21),
    },
    {
      id: "se6",
      kind: "2fa-enabled",
      ok: true,
      description: "Two-factor authentication enabled",
      city: "Singapore",
      country: "SG",
      at: daysAgo(30),
    },
  ];
}

/* ── Billing ───────────────────────────────────────────────────── */

export function getMockInvoices(): Invoice[] {
  return [
    {
      id: "inv1",
      number: "FUR-2026-0419",
      description: "Studio Pro — April 2026",
      amountCents: 2_900,
      currency: "SGD",
      status: "paid",
      issuedAt: daysAgo(12),
    },
    {
      id: "inv2",
      number: "FUR-2026-0319",
      description: "Studio Pro — March 2026",
      amountCents: 2_900,
      currency: "SGD",
      status: "paid",
      issuedAt: daysAgo(43),
    },
    {
      id: "inv3",
      number: "FUR-2026-0219",
      description: "Studio Pro — February 2026",
      amountCents: 2_900,
      currency: "SGD",
      status: "paid",
      issuedAt: daysAgo(71),
    },
    {
      id: "inv4",
      number: "FUR-2026-0119",
      description: "Studio Pro — January 2026 (prorated)",
      amountCents: 1_450,
      currency: "SGD",
      status: "paid",
      issuedAt: daysAgo(101),
    },
  ];
}

/* ── Privacy / Consent ─────────────────────────────────────────── */

export function getMockConsentLog(): ConsentRow[] {
  return [
    {
      id: "cn1",
      kind: "Product updates (email)",
      grantedAt: daysAgo(101),
      source: "Sign-up",
      active: true,
    },
    {
      id: "cn2",
      kind: "Marketing emails",
      grantedAt: daysAgo(101),
      source: "Sign-up",
      active: false,
    },
    {
      id: "cn3",
      kind: "Analytics cookies",
      grantedAt: daysAgo(101),
      source: "Cookie banner",
      active: true,
    },
    {
      id: "cn4",
      kind: "Personalization",
      grantedAt: daysAgo(70),
      source: "Settings update",
      active: true,
    },
    {
      id: "cn5",
      kind: "Third-party data sharing",
      grantedAt: daysAgo(101),
      source: "Sign-up",
      active: false,
    },
  ];
}

/* ── Activity log ──────────────────────────────────────────────── */

export function getMockActivity(): ActivityEvent[] {
  return [
    {
      id: "a1",
      category: "sign-in",
      label: "Signed in from MacBook Pro",
      at: minsAgo(2),
    },
    {
      id: "a2",
      category: "conversation",
      label: "New message in 'Living room refresh — Tampines'",
      description: "Eva refined your sofa shortlist",
      at: hoursAgo(3),
      href: "/account/conversations",
    },
    {
      id: "a3",
      category: "shortlist",
      label: "Added 2 items to shortlist",
      description: "Halden coffee table, Tova rug",
      at: hoursAgo(6),
      href: "/account/shortlist",
    },
    {
      id: "a4",
      category: "preferences",
      label: "Confirmed preference",
      description: "Pet-friendly upholstery",
      at: hoursAgo(7),
      href: "/account/preferences",
    },
    {
      id: "a5",
      category: "upload",
      label: "Uploaded 2 room photos",
      description: "Living room · east-facing, dusk",
      at: daysAgo(1),
      href: "/account/uploads",
    },
    {
      id: "a6",
      category: "project",
      label: "Project 'Master bedroom' updated",
      description: "Moved to in-progress",
      at: daysAgo(1),
      href: "/account/projects",
    },
    {
      id: "a7",
      category: "profile",
      label: "Updated home type",
      description: "Set to Condo",
      at: daysAgo(2),
      href: "/account/profile",
    },
    {
      id: "a8",
      category: "security",
      label: "Signed out session 'Work laptop'",
      at: daysAgo(3),
      href: "/account/security",
    },
    {
      id: "a9",
      category: "conversation",
      label: "Archived 'Old apartment move-out checklist'",
      at: daysAgo(4),
      href: "/account/conversations",
    },
    {
      id: "a10",
      category: "billing",
      label: "Invoice FUR-2026-0419 paid",
      description: "Studio Pro — April 2026",
      at: daysAgo(12),
      href: "/account/billing",
    },
    {
      id: "a11",
      category: "preferences",
      label: "Eva learned: preferred woods",
      description: "Oak, walnut — 84% confidence",
      at: daysAgo(5),
      href: "/account/preferences",
    },
    {
      id: "a12",
      category: "project",
      label: "Invited Sarah to 'Living room — Tampines'",
      description: "Shared with read/write access",
      at: daysAgo(6),
      href: "/account/projects",
    },
    {
      id: "a13",
      category: "shortlist",
      label: "Moved item to 'Master bedroom'",
      description: "Eden bed frame — ash",
      at: daysAgo(7),
    },
    {
      id: "a14",
      category: "upload",
      label: "Uploaded 3 room photos",
      description: "Study corner + bookshelf",
      at: daysAgo(8),
    },
    {
      id: "a15",
      category: "security",
      label: "New device recognized",
      description: "iPad Air — Singapore",
      at: daysAgo(3),
    },
  ];
}

/* ── Counts helper ─────────────────────────────────────────────── */

export function getMockCounts() {
  return {
    conversations: getMockConversations().filter((c) => c.status !== "archived")
      .length,
    shortlist: getMockShortlist().length,
    projects: getMockProjects().filter((p) => p.status !== "archived").length,
    uploads: getMockUploads().length,
    orders: 0,
  };
}

/* Date display helpers — prefer `@/lib/site/account/formatters` in new code */
export { relativeTime, shortDateSG } from "./formatters";

/* ─────────────────────────────────────────────────────────────
 * Detail-route lookup helpers (/account/<section>/[id])
 * ───────────────────────────────────────────────────────────── */

export function getMockConversationById(id: string): ConversationDetail | null {
  const base = getMockConversations().find((c) => c.id === id);
  if (!base) return null;
  const messages: ConversationMessage[] = [
    {
      id: "m1",
      role: "user",
      content:
        "Looking for a sofa for my new place in Tampines. Must be low-slung and fit a 3m wall. Budget around SGD 3.5k.",
      at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    },
    {
      id: "m2",
      role: "eva",
      content:
        "At 3m you've got room for a 240cm three-seater plus an end table, or a full 260cm with just a floor lamp. Given your Naturalist profile, I'd lean toward natural-linen upholstery with exposed wood legs. Want me to pull a few?",
      at: new Date(Date.now() - 6 * 86_400_000 + 3 * 60_000).toISOString(),
      learnedPreferenceLabel: "Prefers low-slung silhouettes",
    },
    {
      id: "m3",
      role: "user",
      content: "Yes. Keep it under 3.2k, no synthetic fabrics.",
      at: new Date(Date.now() - 6 * 86_400_000 + 5 * 60_000).toISOString(),
      learnedPreferenceLabel: "Deal-breaker: synthetic fabrics",
    },
    {
      id: "m4",
      role: "eva",
      content:
        "Got it. Pulled 4 candidates. Top pick: Aarde 240 — boucle linen blend, solid oak base, SGD 2,980. Three alternatives in your shortlist.",
      at: new Date(Date.now() - 6 * 86_400_000 + 8 * 60_000).toISOString(),
    },
    {
      id: "m5",
      role: "user",
      content: "Love the Aarde. What rugs would anchor it?",
      at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      id: "m6",
      role: "eva",
      content:
        "For a 240cm sofa on a 3m wall, aim for a 200×300 rug so at least the front legs sit on it. With your earth palette: undyed wool, flatweave, nothing too plush. I'll flag three.",
      at: new Date(Date.now() - 2 * 86_400_000 + 4 * 60_000).toISOString(),
    },
  ];
  return {
    ...base,
    messages,
    projectId: "p1",
    projectName: "Tampines Condo — Living Room",
    sharedWith: [
      { id: "u2", name: "Priya K.", initials: "PK" },
      { id: "u3", name: "Daniel L.", initials: "DL" },
    ],
    tags: ["living-room", "sofa", "rug", "naturalist"],
  };
}

export function getMockProjectById(id: string): Project | null {
  return getMockProjects().find((p) => p.id === id) ?? null;
}

export function getMockPlaybookById(id: string): DesignPlaybookDetail | null {
  const base = getMockPlaybooks().find((p) => p.id === id);
  if (!base) return null;
  const sections: DesignPlaybookSection[] = [
    {
      id: "s1",
      heading: "The premise",
      body: "Every room is a conversation between mass, light, and air. Before any piece lands, you're deciding how much of each to let in. A Naturalist room errs toward air and soft mass: low sofas, knee-high tables, tall windows. The eye travels unobstructed from floor to ceiling to the space beyond.",
    },
    {
      id: "s2",
      heading: "Anchoring the floor",
      body: "Start with a rug you could sleep on. Wool flatweave for durability, 200×300cm for a typical HDB or condo living room (most important: front legs of the sofa sit on it — anything smaller reads adrift). Undyed or vegetable-dyed; synthetic dyes disturb the palette.",
      accent: ["#DDD5C4", "#B09470"],
    },
    {
      id: "s3",
      heading: "The low-slung rule",
      body: "Seat height under 42cm. Back height under 75cm. This keeps sight-lines open, makes ceilings feel taller, and puts you closer to the plants and objects you've invested in placing at floor level. A common mistake: buying a high-backed sofa 'for comfort' then discovering the room feels chopped in half.",
    },
    {
      id: "s4",
      heading: "Living matter",
      body: "At least three plants per living space. One statement (olive, fig, yucca), one trailing (pothos, philodendron), one textural (fern, rubber). Group them, don't scatter — a plant corner reads as intentional, one-plant-per-room reads as forgotten.",
    },
    {
      id: "s5",
      heading: "Light as material",
      body: "Three sources per room, none overhead. A floor lamp by the sofa, a table lamp on the sideboard, a small directional reading lamp. Dimmable. Warm bulbs only (2700K or lower). The single overhead pendant you inherited from the developer is almost always the wrong light.",
      accent: ["#D9C9A3", "#F5F0E6"],
    },
    {
      id: "s6",
      heading: "What to avoid",
      body: "Anything that arrived in a box with assembly instructions longer than four pages. Glossy finishes (gloss pretends to be something it isn't). Fake plants. Anything labeled 'Scandinavian' that isn't from Scandinavia. Throw pillows in even numbers — odd numbers feel inhabited.",
    },
  ];
  return { ...base, sections, relatedIds: [], estReadMinutes: 8 };
}

export function getMockShortlistItemById(
  id: string,
): ShortlistItemDetail | null {
  const base = getMockShortlist().find((s) => s.id === id);
  if (!base) return null;
  return {
    ...base,
    description:
      "A low-slung three-seater in a boucle linen blend over a solid-oak plinth. Cushions are down-wrapped feather with a foam core for shape retention. Back cushions use a looser fill so they settle into the linen with use.",
    materials: [
      "Boucle linen (78% linen, 22% cotton)",
      "Solid oak",
      "Feather-wrap cushions",
    ],
    dimensionsCm: { widthCm: 240, depthCm: 92, heightCm: 74 },
    rationale:
      "Your profile reads Naturalist with a lean toward texture and earth tones. This piece sits at 74cm back height (you flagged low-slung as a must), uses no synthetic upholstery (your stated deal-breaker), and the oak plinth picks up the undyed wool rug you saved last week. Budget-wise it lands at SGD 2,980, comfortable inside your Living Room allocation.",
    relatedItemIds: [],
  };
}
