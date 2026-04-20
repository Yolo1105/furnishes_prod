import {
  ProjectApprovalTargetType,
  ProjectPacketDeliveryChannel,
  ProjectPacketKind,
  type ShortlistItemExternalLifecycle,
} from "@prisma/client";

/** Central limits for project summary + hub brief preview (avoid magic numbers in UI/builder). */
export const PROJECT_SUMMARY_LIMITS = {
  goalDescriptionMaxChars: 400,
  briefMaxEntriesSummary: 12,
  briefMaxValueLenSummary: 200,
  briefMaxEntriesUi: 6,
  briefMaxValueLenUi: 120,
  /** Shared cap for recommendation top slice and highlighted artifact list in `ProjectSummaryDto`. */
  summaryRankedItemCap: 8,
  maxShortlistRows: 16,
  /** Workflow + user open items combined (display cap). */
  maxCombinedOpenItems: 20,
  /** Handoff HTML shortlist rows (export layout). */
  handoffShortlistItemsMax: 12,
} as const;

/** Display-only slices for overview + hub (not API validation). */
export const PROJECT_SUMMARY_UI = {
  preferredDirectionMaxItems: 5,
  artifactDescriptionPreviewChars: 80,
  hubConversationsListMax: 12,
  hubWorkflowHistoryMax: 5,
} as const;

export const PROJECT_SUMMARY_MESSAGES = {
  unresolvedLayoutBlockers: "Layout or constraint gaps before confident picks",
  unresolvedNoPreferredRec: "No preferred direction selected yet",
  handoffReady:
    "Ready for handoff — workflow checks are clear and a preferred direction is set.",
  handoffReadyWithUserFollowUps:
    "You still have personal follow-ups listed below; export can include them.",
  handoffBlockedWorkflow:
    "Not ready for final handoff — resolve the workflow items below.",
  handoffBlockedNoPreferred:
    "Choose a preferred direction when you have saved recommendations, then address any remaining workflow gaps.",
} as const;

export const COMPARE_OPTION_LABELS = { a: "Option A", b: "Option B" } as const;

/**
 * User-visible strings shared across project summary UI (single source; avoid drift vs handoff tone).
 */
/** Shortlist row status — project execution (Phase 6A). */
export const PROJECT_SHORTLIST_STATUS_LABEL = {
  considering: "Considering",
  primary: "Primary",
  backup: "Backup",
  rejected: "Rejected",
} as const;

/** In-product “execution package” block (hub) — mirrors export, single source for labels. */
export const PROJECT_EXECUTION_PACKAGE_COPY = {
  eyebrow: "Chosen path — execution",
  intro:
    "What you’re moving toward next: preferred direction, shortlist roles, constraints, and what still needs attention.",
  preferredDirection: "Preferred direction",
  primaryShortlist: "Primary shortlist",
  backups: "Alternates / backups",
  constraints: "Accepted constraints",
  /** Workflow + user follow-ups (distinct from Phase 6C execution blockers). */
  workflowOpenItems: "Workflow gaps & checks",
  nextActions: "Next actions",
  emptyPreferred:
    "No preferred direction saved yet — set one in Edit decision or Compare.",
  hintNoPrimaryShortlist:
    "No primary shortlist row yet — mark one item as Primary in Account → project → Shortlist.",
  /** Comment thread label — distinct from project overview (`targetId = projectId`). */
  executionPackageReviewThreadLabel: "Execution package review",
} as const;

/**
 * Server + UI copy for `buildSubstitutionGuidance` — single source (no duplicated prose in components).
 */
export const SUBSTITUTION_GUIDANCE_COPY = {
  impactUnavailable: (productName: string) =>
    `${productName} is marked unavailable — your primary execution path may be blocked until you substitute or re-pick.`,
  impactReplaced: (productName: string) =>
    `${productName} was replaced — confirm the substitute in your shortlist and re-check roles against constraints.`,
  impactRejected: (productName: string) =>
    `${productName} is rejected for this plan — remove or swap it so the chosen path stays coherent.`,
  stillValidDefault:
    "Room goals and constraints may still apply — only this line item’s fit is in question until you substitute.",
  mustRevisitPrimaryRole:
    "Confirm whether your primary shortlist role still matches the room plan.",
  mustRevisitRefreshRecs:
    "Re-run or refresh Recommendations with this project selected if rankings assumed an older direction.",
  honestNoSnapshot:
    "There isn’t a saved recommendations snapshot for this project yet — open Recommendations with this project active, run a batch, then add a substitute from real picks.",
  honestNoCandidates:
    "No other saved recommendation rows look eligible as a direct substitute from this snapshot — revisit Compare or capture a fresh recommendations run, then shortlist again.",
  honestHasCandidates:
    "Review the candidate rows below from your saved recommendations snapshot. If one fits, add or swap via Recommendations / shortlist; otherwise narrow direction in Compare first.",
  candidateNoteLine: (title: string, recommendationId: string) =>
    `[Substitute candidate] ${title} (${recommendationId}) — confirm in Recommendations before finalizing.`,
} as const;

/** Workspace hub — comment panel labels (aligned with `ProjectCommentTargetType` usage). */
export const PROJECT_WORKSPACE_HUB_COPY = {
  projectReviewThreadLabel: "Project review",
  shortlistReviewThreadLabel: "Shortlist review",
  blockerReviewThreadLabel: "Blocker thread",
} as const;

/** Phase 6C — client/server shared UI strings. */
export const PROJECT_EXECUTION_UI_COPY = {
  resolutionNotesFromPanel: "Marked resolved from project execution view.",
  changeImpactEyebrow: "CHANGE IMPACT",
  /** Combined path integrity + volatile change block (hub execution panel). */
  changeImpactPanelEyebrow: "Change impact & path integrity",
  changeImpactPanelIntro:
    "When your direction or shortlist shifts, this shows what stayed valid, what to revisit, and any substitutions already logged.",
  changeImpactSubstitutionLogHeading: "Recent substitutions / item events",
  changeImpactEvaluatedLabel: "Evaluated",
  changeImpactRefreshSnapshotCta: "Refresh execution snapshot",
  changeImpactRefreshSnapshotHint:
    "Use after you adjust shortlist, substitutes, or direction so readiness and timeline stay current.",
  changeImpactBaselineHint:
    "No fingerprint snapshot yet — keep saving decisions and shortlist; Eva tracks drift after the next execution sync.",
  changeImpactAffected: "What changed",
  /** Volatile list keyed `stillValid`. */
  changeImpactStillValid: "Still valid",
  changeImpactRevisit: "Revisit next",
  adaptationTip:
    "After direction or shortlist shifts, open Recommendations or Compare to refresh picks against your latest plan.",
  /** Amber strip when operational phase is `needs_substitution` (see `deriveOperationalExecutionPhase`). */
  changeImpactNeedsSubstitutionLead:
    "Primary shortlist item needs substitution",
  taskStart: "In progress",
  taskToDo: "To do",
  taskMarkDone: "Done",
  taskCancel: "Cancel",
  taskReopen: "Reopen",
  taskDelete: "Remove",
  taskEditNotes: "Notes",
  taskPriorityAria: "Task priority",
  taskSaveNotes: "Save",
  taskCancelEdit: "Close",
  taskShowClosed: "Show done & cancelled",
  taskHideClosed: "Hide done & cancelled",
  confirmDeleteTaskTitle: "Remove this task?",
  confirmDeleteTaskBody: "This removes it from execution tracking.",
} as const;

/** Logged to `Project.executionState.substitutionLog` when fingerprints drift. */
export const EXECUTION_SUBSTITUTION_LOG_MESSAGES = {
  decisionChanged:
    "Decision context or preferred direction changed — revalidate picks against constraints.",
  shortlistChanged:
    "Shortlist membership or roles changed — confirm primary/backup still match your plan.",
} as const;

/** Workspace hub — richer synthesis than “pulse” alone (Phase 6B). */
/** Recommendations tab — project-ranked list (Phase 6B). */
export const RECOMMENDATIONS_PROJECT_RANKING_COPY = {
  bannerTitle: "Ranked with your saved project context",
  bannerBody:
    'Order and "project fit" use constraints, preferred direction, files, and shortlist — see each card for why an item scored well.',
  noOverlapHint:
    "No specific overlap with saved signals — relative ordering still reflects fit within this batch.",
} as const;

/** How we describe fitScore in Recommendations — avoids sounding like a generic 0–100 product rating. */
export const RECOMMENDATIONS_FIT_SCORE_COPY = {
  eyebrow: "Alignment with your project",
  caption:
    "Derived from saved constraints, direction, files, and shortlist continuity — relative to this batch.",
} as const;

export const PROJECT_INTELLIGENCE_SYNTHESIS_COPY = {
  eyebrow: "Project intelligence",
  directionHeading: "Emerging direction",
  whyHeading: "Why it’s leading",
  nextHeading: "Strongest next action",
  workflowHint: "Workflow guidance",
  whatChangedRecentlyHeading: "What changed recently",
  openSignalsHeading: "Open workflow signals",
  executionBlockersHeading: "Execution blockers",
  noPreferredDirection:
    "No preferred direction saved yet — when you’ve narrowed options, set one in Compare or Edit decision so Eva can align picks and ranking.",
  addSignalsHint:
    "Add accepted constraints, star key files, or mark a primary shortlist row to strengthen signals.",
} as const;

/** Canonical approval target for handoff/export gate (Phase 6D) — matches Prisma `ProjectApprovalTargetType`. */
export const PROJECT_APPROVAL_HANDOFF_EXPORT_TARGET = {
  targetType: "handoff_export" as const,
  targetId: "",
};

/** Human labels for milestone approvals — used in summary, next-best-action, and hub UI. */
export const PROJECT_APPROVAL_MILESTONE_LABEL: Record<
  ProjectApprovalTargetType,
  string
> = {
  preferred_direction: "Preferred direction",
  shortlist: "Shortlist",
  execution_package: "Execution package",
  handoff_export: "Handoff / export",
};

/** Phase 7 — human-readable audit `label` fragments for `recordProjectEvent` (timeline + notifications). */
export const PROJECT_EVENT_AUDIT_LABEL = {
  shortlistRowRefreshed: (productName: string) =>
    `Shortlist row refreshed: ${productName}`,
  shortlistItemAdded: (productName: string) =>
    `Added to shortlist: ${productName}`,
  shortlistItemRemoved: (productName: string) =>
    `Removed from shortlist: ${productName}`,
  itemExternalLifecycleChange: (
    productName: string,
    previous: string,
    next: string,
  ) => `${productName}: ${previous} → ${next}`,
  packetHandoffRecorded: (kind: string, channel: string) =>
    `Handoff / packet sent (${kind}, ${channel})`,
} as const;

/** Phase 7 — in-app notification titles (body is always the timeline `label`). */
export const PROJECT_IN_APP_NOTIFICATION_COPY = {
  categoryProject: "project",
  approvalRequested: "Approval requested",
  approvalGranted: "Approval granted",
  approvalRejected: "Approval rejected",
  newReviewComment: "New review comment",
  commentResolved: "Comment resolved",
  blockerResolved: "Blocker resolved",
  preferredDirectionUpdated: "Preferred direction updated",
  executionPackageUpdated: "Execution package updated",
  handoffRecorded: "Handoff recorded",
  itemStatusUpdated: "Item status updated",
  substitutionRecorded: "Substitution recorded",
  projectUpdateFallback: "Project update",
} as const;

/** Phase 7 — procurement / external lifecycle (per shortlist row). */
export const SHORTLIST_EXTERNAL_LIFECYCLE_LABEL: Record<
  ShortlistItemExternalLifecycle,
  string
> = {
  proposed: "Proposed",
  shortlisted: "Shortlisted",
  approved: "Approved",
  sourcing: "Sourcing",
  quoted: "Quoted",
  ordered: "Ordered",
  delivered: "Delivered",
  unavailable: "Unavailable",
  replaced: "Replaced",
  rejected: "Rejected",
};

/** Select option order — matches `ShortlistItemExternalLifecycle` in schema. */
export const SHORTLIST_EXTERNAL_LIFECYCLE_SELECT_ORDER: readonly ShortlistItemExternalLifecycle[] =
  [
    "proposed",
    "shortlisted",
    "approved",
    "sourcing",
    "quoted",
    "ordered",
    "delivered",
    "unavailable",
    "replaced",
    "rejected",
  ];

export const PROJECT_PACKET_KIND_SELECT_ORDER: readonly ProjectPacketKind[] = [
  ProjectPacketKind.project_summary,
  ProjectPacketKind.approval_review,
  ProjectPacketKind.execution_package,
];

/** Default packet kind when opening the workspace send panel (execution-focused). */
export const DEFAULT_PROJECT_PACKET_KIND_FOR_SEND =
  ProjectPacketKind.execution_package;

export const PROJECT_PACKET_KIND_LABEL: Record<ProjectPacketKind, string> = {
  project_summary: "Project summary",
  approval_review: "Approval / review",
  execution_package: "Execution package",
};

export const PROJECT_PACKET_DELIVERY_CHANNEL_SELECT_ORDER: readonly ProjectPacketDeliveryChannel[] =
  [
    ProjectPacketDeliveryChannel.recorded_download,
    ProjectPacketDeliveryChannel.email,
    ProjectPacketDeliveryChannel.link_share,
  ];

export const PROJECT_PACKET_DELIVERY_CHANNEL_LABEL: Record<
  ProjectPacketDeliveryChannel,
  string
> = {
  recorded_download: "Recorded download",
  email: "Email (log only)",
  link_share: "Link share (log only)",
};

/** API/JSON may return plain strings — map when known, else raw. */
export function projectPacketKindDisplay(kind: string): string {
  return PROJECT_PACKET_KIND_LABEL[kind as ProjectPacketKind] ?? kind;
}

export function projectPacketChannelDisplay(channel: string): string {
  return (
    PROJECT_PACKET_DELIVERY_CHANNEL_LABEL[
      channel as ProjectPacketDeliveryChannel
    ] ?? channel
  );
}

/** Phase 7 — account / project UX copy (inbox, handoff, substitution). */
export const PHASE_7_UI_COPY = {
  /** Sidebar + main workspace view — short label distinct from account “Project activity” card. */
  workspaceActivityNavLabel: "Activity",
  workspaceActivityPageTitle: "Activity",
  workspaceActivityPageSubtitle:
    "Unread first — mark as read when handled. Open a project to jump back into the workspace.",
  notificationsInboxTitle: "Project activity",
  notificationsInboxSubtitle:
    "In-app updates from approvals, comments, blockers, handoffs, and procurement changes.",
  notificationsPageSubtitleInbox:
    "Project activity in your account — open a project or adjust delivery in Channels & preferences.",
  notificationsPageSubtitlePrefs:
    "Pick the categories you want, by channel. Transactional emails are required for account safety.",
  notificationsPrefsTab: "Channels & preferences",
  notificationsInboxTab: "Inbox",
  notificationsLoading: "Loading…",
  notificationsLoadError: "Could not load notifications",
  notificationsEmpty: "You’re caught up — no project notifications yet.",
  notificationsMarkRead: "Mark read",
  notificationsPatchError: "Could not update notification",
  notificationsOpenProject: "Open project",
  notificationsReadSuffix: "Read",
  notificationsProjectPrefix: "Project",
  packetWorkspaceAuditEyebrow: "Packet send & audit",
  packetWorkspaceAuditIntro:
    "Record a real handoff or export event for this project. Each send stores a snapshot for timeline and compliance.",
  packetWorkspaceSendHistoryHeading: "Send history",
  packetWorkspaceSendEmpty: "No sends recorded yet.",
  packetWorkspaceResendHint:
    "Re-send by recording another packet when your project state changes. Each entry is immutable audit history.",
  packetWorkspaceRecordSendCta: "Record send",
  packetWorkspaceSendSuccessToast: "Handoff packet recorded",
  packetWorkspaceSendErrorToast: "Could not record packet send",
  externalExecutionEyebrow: "External execution",
  operationalPhaseLabel: "Operational phase",
  substitutionEyebrow: "Substitution & procurement",
  substitutionIntro:
    "Address unavailable or replaced items so your execution path stays accurate.",
  substitutionItemsHeading: "Items needing attention",
  ctaReviewShortlist: "Review shortlist",
  ctaProjectChat: "Open project chat",
  ctaTeamReview: "Open team review",
  packetSendEyebrow: "Send / record handoff",
  packetSendIntro:
    "Record a real handoff for vendors or collaborators. This saves what was sent and appears in project history.",
  packetKindLabel: "Packet type",
  packetChannelLabel: "Delivery",
  packetRecipientLabel: "Recipient email (optional)",
  packetSubmit: "Record handoff",
  packetSubmitBusy: "Recording…",
  packetSuccess: "Handoff recorded — you can download the latest export below.",
  packetDownloadHandoff: "Download handoff (HTML)",
  packetRecentHeading: "Recent recorded sends",
  packetRecordError: "Could not record handoff",
  packetRecipientPlaceholder: "name@company.com",
  shortlistProcurementLabel: "Procurement",
  shortlistDesignRoleLabel: "Design role",
  shortlistOpenDetail: "Open shortlist detail",
  shortlistToastProcurementUpdated: "Procurement state updated",
  shortlistNotesLabel: "Notes (execution / procurement)",
  /** Guided substitution when procurement state forces a replan (hub shortlist). */
  substitutionFlowEyebrow: "Substitution & next step",
  substitutionFlowBody:
    "This item no longer fits the plan as-is. Refresh picks in Recommendations (same project selected) or revisit Compare if your direction should change — then update roles or substitutes so execution stays honest.",
  substitutionOpenRecommendationsCta: "Open recommendations",
  substitutionCandidateStrongest: "Closest fit (from saved run)",
  substitutionCandidateBudget: "Budget-friendlier pick",
  substitutionCandidateAlt: "Alternate in batch",
  substitutionRecordCandidateNoteCta: "Add note on row",
  substitutionHonestNextLabel: "What to do next",
  substitutionAfterSubstitutesPrefix: "After substitutes, use ",
  substitutionAfterSubstitutesSuffix:
    " so readiness and timeline stay aligned.",
} as const;

/** Phase 7 — operational rollup hints (derived phase; not duplicated in UI components). */
export const PROJECT_OPERATIONAL_ROLLUP_COPY = {
  handoffApprovalPending:
    "One or more milestone approvals are still pending for this project.",
  activeBlockers: "Active execution blockers need resolution.",
  primaryUnavailable:
    "A primary item is unavailable — substitution or a new pick is required.",
  substitutionConfirm:
    "A substitution was recorded — confirm the replacement in execution.",
  partiallyDelivered:
    "Some items are delivered; others are still moving through procurement.",
  orderedTrackDelivery: "At least one item is ordered — track delivery.",
  sourcingActive: "Sourcing is active for one or more items.",
} as const;

/** User-facing strings for collaboration gates (summary, export, synthesis) — single source to avoid drift. */
export const PROJECT_COLLABORATION_COPY = {
  exportBlockedUntilReady:
    "Export blocked until open review comments are resolved and no milestone approvals are still pending.",
  nextBestActionPendingHandoffPrefix: "Handoff package awaiting approval — ",
  synthesisHandoffAwaitingApproval:
    "One or more milestone approvals are still pending for the team.",
  collaborationSectionEyebrow: "Collaboration",
} as const;

/** Prepended to `nextBestAction` when there are unresolved review comments. */
export function projectCollaborationOpenCommentsNextBestPrefix(
  count: number,
): string {
  return `${count} open review comment(s) to resolve — `;
}

/** Collaboration blurb in project intelligence synthesis (distinct tone from `nextBestAction` prefix). */
export function projectCollaborationSynthesisOpenCommentsLine(
  count: number,
): string {
  return `${count} open review comment(s) — resolve before treating the plan as final.`;
}

export const PROJECT_SUMMARY_COPY = {
  compareDisabledTitle:
    "Save a recommendations run first (open Recommendations with this project)",
  narrativeSnapshotIntro:
    "Where you stand on direction, constraints, and what still needs attention — tied to your saved project state.",
  openItemsWorkflow: "From workflow & Eva checks",
  openItemsUser: "Your follow-ups",
  openChat: "Open chat",
  keyProjectFilesIntro:
    "Starred files surface first; recent uploads show the latest activity in this project. Starred items are emphasized in handoff export.",
  starredHighlightedHeading: "Starred & highlighted",
  recentInProjectHeading: "Recent in project",
  noStarredFilesHint:
    "No starred files yet — mark favorites in Edit decision below to highlight them here and in handoff.",
} as const;
