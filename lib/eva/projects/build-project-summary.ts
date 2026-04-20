import type {
  PrismaClient,
  ProjectBlockerStatus,
  ProjectExecutionLifecycle,
  ProjectExecutionTaskPriority,
  ProjectExecutionTaskStatus,
  ShortlistItemExternalLifecycle,
  ProjectShortlistStatus,
} from "@prisma/client";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import { evaluateProjectWorkflow } from "@/lib/eva/design-workflow/evaluate";
import { deriveWorkflowMilestone } from "@/lib/eva/projects/workflow-milestones";
import {
  listProjectArtifacts,
  orderArtifactsFavoritesFirst,
} from "@/lib/eva/projects/list-project-artifacts";
import {
  parseDecisionContext,
  parseRecommendationsSnapshot,
  type ProjectDecisionContext,
} from "@/lib/eva/projects/decision-schemas";
import type { ConversationArtifact } from "@/lib/eva-dashboard/conversation-output-types";
import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";
import type { WorkflowMilestone } from "@/lib/eva/projects/workflow-milestones";
import { parseBriefSnapshotEntries } from "@/lib/eva/projects/brief-snapshot";
import {
  PROJECT_APPROVAL_HANDOFF_EXPORT_TARGET,
  PROJECT_APPROVAL_MILESTONE_LABEL,
  PROJECT_SUMMARY_LIMITS,
  PROJECT_SUMMARY_MESSAGES,
  projectCollaborationOpenCommentsNextBestPrefix,
} from "@/lib/eva/projects/summary-constants";
import {
  deriveOperationalExecutionPhase,
  type OperationalExecutionPhase,
} from "@/lib/eva/projects/operational-rollup";
import {
  deriveExecutionReadiness,
  type ExecutionReadiness,
} from "@/lib/eva/projects/execution-readiness";
import { INTELLIGENCE_LIMITS } from "@/lib/eva/intelligence/intelligence-constants";
import { buildProjectIntelligenceSignals } from "@/lib/eva/intelligence/project-intelligence-context";
import { refineWorkflowEvaluationWithIntelligence } from "@/lib/eva/intelligence/workflow-intelligence";
import { parseProjectExecutionState } from "@/lib/eva/projects/execution-state-schema";
import {
  buildVolatileChangeImpact,
  computeExecutionFingerprints,
  deriveNextBestAction,
  derivePathIntegrity,
  recommendedExecutionLifecycle,
  type PathIntegrityResult,
} from "@/lib/eva/projects/execution-orchestration";
import {
  buildSubstitutionGuidance,
  shortlistNeedsSubstitutionGuidance,
  type SubstitutionGuidanceDto,
} from "@/lib/eva/projects/substitution-guidance";

export type ShortlistSummaryRow = {
  id: string;
  productName: string;
  productCategory: string;
  priceCents: number;
  currency: string;
  rationale: string | null;
  summary: string | null;
  reasonSelected: string | null;
  notes: string | null;
  status: ProjectShortlistStatus;
  /** Phase 7 — procurement / real-world execution state. */
  externalLifecycle: ShortlistItemExternalLifecycle;
  sourceConversationId: string | null;
  sourceRecommendationId: string | null;
  updatedAt: string;
};

export type ProjectExecutionPackage = {
  title: string;
  room: string;
  preferredDirectionLabel: string | null;
  shortlistByStatus: {
    primary: ShortlistSummaryRow[];
    backup: ShortlistSummaryRow[];
    considering: ShortlistSummaryRow[];
    rejected: ShortlistSummaryRow[];
  };
  acceptedConstraints: string[];
  highlightedArtifacts: Array<{ id: string; title: string; fileType: string }>;
  /** Workflow + user follow-ups (not the same as persisted execution blockers). */
  workflowOpenItems: string[];
  nextStep: string;
};

function buildExecutionPackage(input: {
  title: string;
  room: string;
  preferredDirectionLabel: string | null;
  shortlist: ShortlistSummaryRow[];
  acceptedConstraints: string[];
  highlightedArtifacts: Array<{ id: string; title: string; fileType: string }>;
  unresolved: string[];
  nextStep: string;
}): ProjectExecutionPackage {
  const pick = (st: ShortlistSummaryRow["status"]) =>
    input.shortlist.filter((x) => x.status === st);
  return {
    title: input.title,
    room: input.room,
    preferredDirectionLabel: input.preferredDirectionLabel,
    shortlistByStatus: {
      primary: pick("primary"),
      backup: pick("backup"),
      considering: pick("considering"),
      rejected: pick("rejected"),
    },
    acceptedConstraints: input.acceptedConstraints,
    highlightedArtifacts: input.highlightedArtifacts,
    workflowOpenItems: input.unresolved,
    nextStep: input.nextStep,
  };
}

export type ProjectSummaryDto = {
  projectId: string;
  title: string;
  room: string;
  roomType: string | null;
  goalSummary: string;
  briefLines: { key: string; value: string }[];
  workflowStage: string;
  workflowEvaluation: WorkflowEvaluation;
  milestone: WorkflowMilestone;
  preferredDirection: {
    label: string;
    notes?: string;
    items: Array<{
      id: string;
      title: string;
      category: string;
      reasonWhyItFits: string;
    }>;
    updatedAt?: string;
  } | null;
  decisionNotes: string | null;
  acceptedConstraints: string[];
  comparisonCandidates: Array<{
    id: string;
    label: string;
    items: Array<{
      id: string;
      title: string;
      category: string;
      reasonWhyItFits: string;
    }>;
  }>;
  recommendations: {
    hasSnapshot: boolean;
    snapshotConversationId: string | null;
    snapshotCapturedAt: string | null;
    topItems: Array<{
      id: string;
      title: string;
      category: string;
      reasonWhyItFits: string;
      estimatedPrice: number | null;
    }>;
  };
  shortlist: ShortlistSummaryRow[];
  artifacts: {
    all: ConversationArtifact[];
    highlighted: ConversationArtifact[];
    /** Recent files in project (excluding highlighted), newest first — hub/overview. */
    recentSample: ConversationArtifact[];
  };
  studio: {
    id: string;
    createdAt: string;
    placementCount: number;
  } | null;
  /** Workflow / Eva-derived gaps (missing fields, layout, direction). */
  unresolvedSystem: string[];
  /** User-entered follow-ups from decision context. */
  unresolvedUser: string[];
  /** Combined de-duplicated list for display and export. */
  unresolved: string[];
  handoffReadiness: {
    ready: boolean;
    headline: string;
    subline?: string;
  };
  nextStep: string;
  /** Full parsed decision context for PATCH merge from the client. */
  decisionContext: ProjectDecisionContext | null;
  stats: {
    conversationCount: number;
    fileCount: number;
    shortlistCount: number;
  };
  /** Derived from project data — not a separate persisted field. */
  executionReadiness: ExecutionReadiness;
  /** Aggregated “chosen path” for execution / handoff. */
  executionPackage: ProjectExecutionPackage;
  /** Grounded synthesis — avoids duplicating `nextStep`, `milestone`, or `preferredDirection`. */
  projectInsights: {
    whatChangedRecently: string | null;
    primaryBlockers: string[];
  };
  /** Phase 6C — execution orchestration (tasks, blockers, integrity, next action). */
  execution: ProjectExecutionViewDto;
  /** Strongest actionable step — prefers execution orchestration over raw workflow copy. */
  nextBestAction: string;
  /** Phase 6D — review / approval gates for shared projects. */
  collaboration: {
    unresolvedCommentCount: number;
    handoffApprovalStatus: string | null;
    handoffClearForExport: boolean;
    /** True when any milestone approval row is still `pending`. */
    hasPendingApprovals: boolean;
    milestoneApprovals: Array<{
      targetType: string;
      targetId: string;
      status: string;
      decidedAt: string | null;
      decidedByUserId: string | null;
      note: string | null;
    }>;
  };
  /** Phase 6C — per-row substitute hints from the saved recommendations snapshot (no fabricated SKUs). */
  substitutionGuidanceByShortlistItemId: Record<
    string,
    SubstitutionGuidanceDto
  >;
  /** Phase 7 — procurement / external execution (derived from shortlist lifecycle + gates). */
  externalExecution: {
    phase: OperationalExecutionPhase;
    hints: string[];
    lifecycleCounts: Partial<Record<ShortlistItemExternalLifecycle, number>>;
  };
  /** Recent recorded packet sends (handoff audit). */
  recentPacketSends: Array<{
    id: string;
    kind: string;
    channel: string;
    sentAt: string;
  }>;
};

export type ProjectExecutionTaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectExecutionTaskStatus;
  priority: ProjectExecutionTaskPriority;
  linkedBlockerId: string | null;
  linkedShortlistItemId: string | null;
  linkedConstraintLabel: string | null;
  sourceRecommendationId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectExecutionBlockerDto = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectBlockerStatus;
  notes: string | null;
  resolutionSuggestion: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  linkedConstraintKey: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectExecutionViewDto = {
  lifecycle: ProjectExecutionLifecycle;
  recommendedLifecycle: ProjectExecutionLifecycle;
  notes: string | null;
  tasks: ProjectExecutionTaskDto[];
  /** Subset of `tasks` — single derived list for UI and export (avoid re-filtering). */
  openTasks: ProjectExecutionTaskDto[];
  blockers: ProjectExecutionBlockerDto[];
  activeBlockers: ProjectExecutionBlockerDto[];
  substitutionLog: Array<{
    at: string;
    kind: string;
    summary: string;
  }>;
  blockerResolutionHistory: Array<{
    blockerId: string;
    resolvedAt: string;
    summary: string;
  }>;
  changeImpact: {
    evaluatedAt: string;
    volatile: ReturnType<typeof buildVolatileChangeImpact>;
  } | null;
  pathIntegrity: { result: PathIntegrityResult; reasons: string[] };
  readinessChecks: Record<string, boolean>;
};

export type BuildProjectSummaryOptions = {
  /** When set (e.g. from GET /api/projects/[id]), avoids a second workflow evaluation pass. */
  workflowEvaluation?: WorkflowEvaluation;
};

export async function buildProjectSummary(
  db: PrismaClient,
  projectId: string,
  opts?: BuildProjectSummaryOptions,
): Promise<ProjectSummaryDto | null> {
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      shortlistItems: {
        orderBy: { createdAt: "desc" },
        take: PROJECT_SUMMARY_LIMITS.maxShortlistRows,
      },
      executionTasks: {
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 48,
      },
      executionBlockers: {
        orderBy: { updatedAt: "desc" },
        take: 48,
      },
    },
  });
  if (!p) return null;

  let prefs: Record<string, string> = {};
  let messageCount = 0;
  if (p.activeConversationId) {
    prefs = await getPreferencesAsRecord(db, p.activeConversationId);
    messageCount = await db.message.count({
      where: { conversationId: p.activeConversationId },
    });
  }

  const decision = parseDecisionContext(p.decisionContext);
  const snap = parseRecommendationsSnapshot(p.recommendationsSnapshot);

  const preferredDirection = decision?.preferredPath
    ? {
        label: decision.preferredPath.label,
        notes: decision.preferredPath.notes,
        updatedAt: decision.preferredPath.updatedAt,
        items: decision.preferredPath.items.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          reasonWhyItFits: i.reasonWhyItFits,
        })),
      }
    : null;

  const topFromSnap =
    snap?.items
      ?.slice(0, PROJECT_SUMMARY_LIMITS.summaryRankedItemCap)
      .map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        reasonWhyItFits: i.reasonWhyItFits,
        estimatedPrice: i.estimatedPrice ?? null,
      })) ?? [];

  const convoCount = await db.conversation.count({ where: { projectId } });
  const artifacts = await listProjectArtifacts(db, projectId);
  const favIds = new Set(decision?.favoriteArtifactIds ?? []);
  const highlighted = orderArtifactsFavoritesFirst(
    artifacts,
    favIds,
    PROJECT_SUMMARY_LIMITS.summaryRankedItemCap,
  );

  const highlightedIds = new Set(highlighted.map((h) => h.id));
  const recentSample = [...artifacts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((a) => !highlightedIds.has(a.id))
    .slice(0, PROJECT_SUMMARY_LIMITS.summaryRankedItemCap);

  const studio = await db.projectStudioRoomSave.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      _count: { select: { placements: true } },
    },
  });

  const shortlistRows: ShortlistSummaryRow[] = p.shortlistItems.map((s) => ({
    id: s.id,
    productName: s.productName,
    productCategory: s.productCategory,
    priceCents: s.priceCents,
    currency: s.currency,
    rationale: s.rationale ?? null,
    summary: s.summary ?? null,
    reasonSelected: s.reasonSelected ?? null,
    notes: s.notes ?? null,
    status: s.status,
    externalLifecycle: s.externalLifecycle,
    sourceConversationId: s.sourceConversationId ?? null,
    sourceRecommendationId: s.sourceRecommendationId ?? null,
    updatedAt: s.updatedAt.toISOString(),
  }));

  const highlightedArtifacts = highlighted.map((a) => ({
    id: a.id,
    title: a.title,
    fileType: a.fileType,
  }));

  const shortlistPrimaryNames = shortlistRows
    .filter((r) => r.status === "primary")
    .map((r) => r.productName.trim())
    .filter(Boolean);

  const wfSignals = buildProjectIntelligenceSignals({
    decision,
    highlightedArtifacts,
    shortlistPrimaryNames,
  });

  const unresolvedUser = wfSignals.supplementaryOpenItems;

  const rawWorkflowEvaluation =
    opts?.workflowEvaluation ??
    evaluateProjectWorkflow({
      workflowStage: p.workflowStage,
      project: {
        title: p.title,
        room: p.room,
        description: p.description,
        budgetCents: p.budgetCents,
        briefSnapshot: p.briefSnapshot,
        workflowSatisfied: p.workflowSatisfied,
      },
      preferences: prefs,
      messageCount,
      userMessage: "",
    });

  const workflowEvaluation = refineWorkflowEvaluationWithIntelligence(
    rawWorkflowEvaluation,
    wfSignals,
    { userMessage: "" },
  );

  const milestone = deriveWorkflowMilestone({
    stage: p.workflowStage,
    evaluation: workflowEvaluation,
  });

  const recentWorkflowEvents = await db.projectWorkflowEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: INTELLIGENCE_LIMITS.recentWorkflowEventsTake,
  });

  const unresolvedSystem: string[] = [...workflowEvaluation.missingFieldList];
  if (workflowEvaluation.hasRecommendationBlockers) {
    unresolvedSystem.push(PROJECT_SUMMARY_MESSAGES.unresolvedLayoutBlockers);
  }
  if (!preferredDirection && p.workflowStage === "recommendation_generation") {
    unresolvedSystem.push(PROJECT_SUMMARY_MESSAGES.unresolvedNoPreferredRec);
  }

  const unresolved = [
    ...new Set([...unresolvedSystem, ...unresolvedUser]),
  ].slice(0, PROJECT_SUMMARY_LIMITS.maxCombinedOpenItems);

  const systemClear =
    workflowEvaluation.missingFieldList.length === 0 &&
    !workflowEvaluation.hasRecommendationBlockers &&
    !(!preferredDirection && p.workflowStage === "recommendation_generation");

  const handoffReady = Boolean(preferredDirection) && systemClear;

  let handoffHeadline: string;
  let handoffSubline: string | undefined;
  if (handoffReady) {
    handoffHeadline = PROJECT_SUMMARY_MESSAGES.handoffReady;
    handoffSubline =
      unresolvedUser.length > 0
        ? PROJECT_SUMMARY_MESSAGES.handoffReadyWithUserFollowUps
        : undefined;
  } else if (!preferredDirection) {
    handoffHeadline = PROJECT_SUMMARY_MESSAGES.handoffBlockedNoPreferred;
    handoffSubline =
      unresolvedSystem.length > 0
        ? unresolvedSystem.slice(0, 4).join(" · ")
        : undefined;
  } else {
    handoffHeadline = PROJECT_SUMMARY_MESSAGES.handoffBlockedWorkflow;
    handoffSubline = unresolvedSystem.length
      ? unresolvedSystem.slice(0, 4).join(" · ")
      : undefined;
  }

  const hasPrimaryShortlist = shortlistRows.some((r) => r.status === "primary");

  const executionPackage = buildExecutionPackage({
    title: p.title,
    room: p.room,
    preferredDirectionLabel: preferredDirection?.label ?? null,
    shortlist: shortlistRows,
    acceptedConstraints: decision?.acceptedConstraints ?? [],
    highlightedArtifacts,
    unresolved,
    nextStep: workflowEvaluation.evaRecommendsNext,
  });

  const whatChangedRecently =
    recentWorkflowEvents.length === 0
      ? null
      : recentWorkflowEvents
          .map((e) => {
            const from = e.fromStage ? `${e.fromStage} → ` : "";
            return `${from}${e.toStage}${e.reason ? ` (${e.reason})` : ""}`;
          })
          .join(" · ");

  const projectInsights = {
    whatChangedRecently,
    primaryBlockers: unresolved.slice(
      0,
      INTELLIGENCE_LIMITS.projectInsightsBlockersMax,
    ),
  };

  const storedExecution = parseProjectExecutionState(p.executionState);
  const fingerprints = computeExecutionFingerprints({
    decision,
    shortlistRows,
  });
  const volatileImpact = buildVolatileChangeImpact({
    stored: storedExecution,
    fingerprints,
  });
  const hadPrior =
    Boolean(storedExecution.fingerprints?.decision) &&
    Boolean(storedExecution.fingerprints?.shortlist);
  const changeRequiresRevisit =
    hadPrior &&
    (volatileImpact.decisionFingerprintChanged ||
      volatileImpact.shortlistFingerprintChanged);

  const substitutionGuidanceByShortlistItemId: Record<
    string,
    SubstitutionGuidanceDto
  > = {};
  for (const r of shortlistRows) {
    if (!shortlistNeedsSubstitutionGuidance(r.externalLifecycle)) continue;
    substitutionGuidanceByShortlistItemId[r.id] = buildSubstitutionGuidance({
      row: {
        id: r.id,
        productName: r.productName,
        productCategory: r.productCategory,
        priceCents: r.priceCents,
        externalLifecycle: r.externalLifecycle,
        sourceRecommendationId: r.sourceRecommendationId,
        status: r.status,
      },
      snapshotItems: snap?.items ?? [],
    });
  }

  const blockerDtos: ProjectExecutionBlockerDto[] = p.executionBlockers.map(
    (b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      status: b.status,
      notes: b.notes,
      resolutionSuggestion: b.resolutionSuggestion,
      resolutionNotes: b.resolutionNotes,
      resolvedAt: b.resolvedAt?.toISOString() ?? null,
      linkedConstraintKey: b.linkedConstraintKey,
      source: b.source,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }),
  );

  const activeExecBlockers = blockerDtos.filter((b) => b.status === "active");

  const pathIntegrityResult = derivePathIntegrity({
    handoffReady,
    hasPreferredDirection: Boolean(preferredDirection),
    hasPrimaryShortlist,
    acceptedConstraints: decision?.acceptedConstraints ?? [],
    activeBlockerCount: activeExecBlockers.length,
    openUnresolvedCount: unresolved.length,
    changeRequiresRevisit,
    workflowStage: p.workflowStage,
  });

  const taskDtos: ProjectExecutionTaskDto[] = p.executionTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    linkedBlockerId: t.linkedBlockerId,
    linkedShortlistItemId: t.linkedShortlistItemId,
    linkedConstraintLabel: t.linkedConstraintLabel,
    sourceRecommendationId: t.sourceRecommendationId,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const openExecTasks = taskDtos.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  );

  const [unresolvedCommentCount, approvalRows, recentPacketSends] =
    await Promise.all([
      db.projectComment.count({
        where: { projectId, resolvedAt: null },
      }),
      db.projectApproval.findMany({
        where: { projectId },
        select: {
          targetType: true,
          targetId: true,
          status: true,
          decidedAt: true,
          decidedByUserId: true,
          note: true,
        },
      }),
      db.projectPacketSend.findMany({
        where: { projectId },
        orderBy: { sentAt: "desc" },
        take: 12,
        select: { id: true, kind: true, channel: true, sentAt: true },
      }),
    ]);

  const handoffApp = approvalRows.find(
    (a) =>
      a.targetType === PROJECT_APPROVAL_HANDOFF_EXPORT_TARGET.targetType &&
      a.targetId === PROJECT_APPROVAL_HANDOFF_EXPORT_TARGET.targetId,
  );

  const pendingApprovals = approvalRows.filter((a) => a.status === "pending");
  const hasPendingApprovals = pendingApprovals.length > 0;
  const collaborationBlocksPromotion =
    unresolvedCommentCount > 0 || hasPendingApprovals;

  const executionReadiness = deriveExecutionReadiness({
    projectStatus: p.status,
    workflowStage: p.workflowStage,
    handoffReady,
    shortlistCount: shortlistRows.length,
    hasPrimaryShortlist,
    hasPreferredDirection: Boolean(preferredDirection),
    recommendationsHasSnapshot: Boolean(snap && snap.items.length > 0),
    collaborationBlocksPromotion,
  });

  let nextBestAction = deriveNextBestAction({
    integrity: pathIntegrityResult.result,
    workflowNextStep: workflowEvaluation.evaRecommendsNext,
    activeBlockerTitles: activeExecBlockers.map((b) => b.title),
    openTaskCount: openExecTasks.length,
    hasPrimaryShortlist,
    hasPreferredDirection: Boolean(preferredDirection),
    executionLifecycle: p.executionLifecycle,
    handoffReady,
  });

  if (unresolvedCommentCount > 0) {
    nextBestAction = `${projectCollaborationOpenCommentsNextBestPrefix(unresolvedCommentCount)}${nextBestAction}`;
  }
  if (hasPendingApprovals) {
    const labels = [
      ...new Set(
        pendingApprovals.map(
          (a) => PROJECT_APPROVAL_MILESTONE_LABEL[a.targetType] ?? a.targetType,
        ),
      ),
    ].join(", ");
    nextBestAction = `Approvals pending (${labels}) — ${nextBestAction}`;
  }

  const handoffClearForExport =
    unresolvedCommentCount === 0 && !hasPendingApprovals;

  const recommendedLifecycle = recommendedExecutionLifecycle({
    integrity: pathIntegrityResult.result,
    activeBlockerCount: activeExecBlockers.length,
    handoffReady,
  });

  const lifecycleCounts = shortlistRows.reduce<
    Partial<Record<ShortlistItemExternalLifecycle, number>>
  >((acc, r) => {
    acc[r.externalLifecycle] = (acc[r.externalLifecycle] ?? 0) + 1;
    return acc;
  }, {});

  const externalExecution = deriveOperationalExecutionPhase({
    hasPendingHandoffApproval: hasPendingApprovals,
    hasActiveExecutionBlockers: activeExecBlockers.length > 0,
    primaryItems: shortlistRows
      .filter((r) => r.status === "primary")
      .map((r) => ({ externalLifecycle: r.externalLifecycle })),
    allItems: shortlistRows.map((r) => ({
      externalLifecycle: r.externalLifecycle,
    })),
  });

  const execution: ProjectExecutionViewDto = {
    lifecycle: p.executionLifecycle,
    recommendedLifecycle,
    notes: p.executionNotes ?? null,
    tasks: taskDtos,
    openTasks: openExecTasks,
    blockers: blockerDtos,
    activeBlockers: activeExecBlockers,
    substitutionLog: storedExecution.substitutionLog ?? [],
    blockerResolutionHistory: storedExecution.blockerResolutionHistory ?? [],
    changeImpact: {
      evaluatedAt: new Date().toISOString(),
      volatile: volatileImpact,
    },
    pathIntegrity: pathIntegrityResult,
    readinessChecks: {
      fingerprintsAligned: !changeRequiresRevisit,
      hasPrimaryShortlist,
      hasPreferredDirection: Boolean(preferredDirection),
      handoffReady,
      noActiveExecutionBlockers: activeExecBlockers.length === 0,
    },
  };

  return {
    projectId: p.id,
    title: p.title,
    room: p.room,
    roomType: p.roomType,
    goalSummary:
      p.description
        .trim()
        .slice(0, PROJECT_SUMMARY_LIMITS.goalDescriptionMaxChars) +
      (p.description.length > PROJECT_SUMMARY_LIMITS.goalDescriptionMaxChars
        ? "…"
        : ""),
    briefLines: parseBriefSnapshotEntries(p.briefSnapshot),
    workflowStage: p.workflowStage,
    workflowEvaluation,
    milestone,
    preferredDirection,
    decisionNotes: decision?.decisionNotes ?? null,
    acceptedConstraints: decision?.acceptedConstraints ?? [],
    comparisonCandidates:
      decision?.comparisonCandidates?.map((c) => ({
        id: c.id,
        label: c.label,
        items: c.items.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          reasonWhyItFits: i.reasonWhyItFits,
        })),
      })) ?? [],
    recommendations: {
      hasSnapshot: Boolean(snap && snap.items.length > 0),
      snapshotConversationId: snap?.conversationId ?? null,
      snapshotCapturedAt: snap?.capturedAt ?? null,
      topItems: topFromSnap,
    },
    shortlist: shortlistRows,
    artifacts: { all: artifacts, highlighted, recentSample },
    studio: studio
      ? {
          id: studio.id,
          createdAt: studio.createdAt.toISOString(),
          placementCount: studio._count.placements,
        }
      : null,
    unresolvedSystem,
    unresolvedUser,
    unresolved,
    handoffReadiness: {
      ready: handoffReady,
      headline: handoffHeadline,
      subline: handoffSubline,
    },
    nextStep: workflowEvaluation.evaRecommendsNext,
    nextBestAction,
    decisionContext: decision,
    stats: {
      conversationCount: convoCount,
      fileCount: artifacts.length,
      shortlistCount: shortlistRows.length,
    },
    executionReadiness,
    executionPackage,
    projectInsights,
    execution,
    collaboration: {
      unresolvedCommentCount,
      handoffApprovalStatus: handoffApp?.status ?? null,
      handoffClearForExport,
      hasPendingApprovals,
      milestoneApprovals: approvalRows.map((a) => ({
        targetType: a.targetType,
        targetId: a.targetId,
        status: a.status,
        decidedAt: a.decidedAt?.toISOString() ?? null,
        decidedByUserId: a.decidedByUserId ?? null,
        note: a.note ?? null,
      })),
    },
    substitutionGuidanceByShortlistItemId,
    externalExecution: {
      phase: externalExecution.phase,
      hints: externalExecution.hints,
      lifecycleCounts,
    },
    recentPacketSends: recentPacketSends.map((s) => ({
      id: s.id,
      kind: s.kind,
      channel: s.channel,
      sentAt: s.sentAt.toISOString(),
    })),
  };
}
