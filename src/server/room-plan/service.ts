/**
 * Room Plan CRUD + readiness. Flag CHAT_ROOM_PLAN_ENABLED.
 */

import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { getConfirmedPreferenceMap } from "@/server/preferences/preference-service";
import { assertRowQuota, maxRoomPlansPerUser } from "@/server/quota";
import { allocate } from "./budget-allocator";
import {
  computeReadiness,
  coreDecidedRatio,
  type ReadinessResult,
} from "./readiness";
import { formatRoomPlanPromptBlock } from "./room-plan-prompt";

const PRIORITIES = new Set(["core", "secondary", "accent"]);
const STATUSES = new Set(["needed", "considering", "decided", "purchased"]);

export function isChatRoomPlanEnabled(): boolean {
  return process.env.CHAT_ROOM_PLAN_ENABLED === "1";
}

function isRoomPlanOrderCtaEnabled(): boolean {
  return process.env.ROOM_PLAN_ORDER_CTA_ENABLED === "1";
}

type RoomPlanItemDto = {
  id: string;
  label: string;
  category: string;
  priority: string;
  status: string;
  budgetCents: number | null;
  actualCents: number | null;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  recommendationId: string | null;
  inspirationItemId: string | null;
  notes: string | null;
  sortOrder: number;
  updatedAt: string;
};

export type RoomPlanDto = {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  budgetCapCents: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: RoomPlanItemDto[];
  readiness: ReadinessResult;
  orderCtaEnabled: boolean;
  remainingBudgetCents: number | null;
};

function mapItem(row: {
  id: string;
  label: string;
  category: string;
  priority: string;
  status: string;
  budgetCents: number | null;
  actualCents: number | null;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  recommendationId: string | null;
  inspirationItemId: string | null;
  notes: string | null;
  sortOrder: number;
  updatedAt: Date;
}): RoomPlanItemDto {
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    priority: row.priority,
    status: row.status,
    budgetCents: row.budgetCents,
    actualCents: row.actualCents,
    widthCm: row.widthCm,
    depthCm: row.depthCm,
    heightCm: row.heightCm,
    recommendationId: row.recommendationId,
    inspirationItemId: row.inspirationItemId,
    notes: row.notes,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

type PlanWithItems = {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  budgetCapCents: number | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<Parameters<typeof mapItem>[0]>;
};

function buildDtoFrom(
  plan: PlanWithItems,
  prefs: Awaited<ReturnType<typeof getConfirmedPreferenceMap>>,
): RoomPlanDto {
  const readiness = computeReadiness({
    plan: {
      budgetCapCents: plan.budgetCapCents,
      items: plan.items.map((item) => ({
        label: item.label,
        priority: item.priority,
        status: item.status,
        budgetCents: item.budgetCents,
        actualCents: item.actualCents,
      })),
    },
    styleConfirmed: Boolean(prefs.style?.trim()),
    colorConfirmed: Boolean(prefs.color?.trim()),
  });

  const allocated = plan.items.reduce(
    (sum, item) => sum + Math.max(0, item.actualCents ?? item.budgetCents ?? 0),
    0,
  );
  const remainingBudgetCents =
    plan.budgetCapCents != null
      ? Math.max(0, plan.budgetCapCents - allocated)
      : null;

  return {
    id: plan.id,
    userId: plan.userId,
    projectId: plan.projectId,
    name: plan.name,
    budgetCapCents: plan.budgetCapCents,
    currency: plan.currency,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    items: plan.items.map(mapItem),
    readiness,
    orderCtaEnabled: isRoomPlanOrderCtaEnabled(),
    remainingBudgetCents,
  };
}

async function buildDto(
  planId: string,
  userId: string,
): Promise<RoomPlanDto | null> {
  const [plan, prefs] = await Promise.all([
    prisma.roomPlan.findFirst({
      where: { id: planId, userId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    getConfirmedPreferenceMap(userId),
  ]);
  if (!plan) return null;
  return buildDtoFrom(plan, prefs);
}

async function userCanUseProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return Boolean(project);
}

export async function listRoomPlans(input: {
  userId: string;
  projectId?: string | null;
}): Promise<ServiceResult<{ plans: RoomPlanDto[] }, "disabled">> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");

  const [rows, prefs] = await Promise.all([
    prisma.roomPlan.findMany({
      where: {
        userId: input.userId,
        ...(input.projectId ? { projectId: input.projectId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    getConfirmedPreferenceMap(input.userId),
  ]);
  const plans = rows.map((row) => buildDtoFrom(row, prefs));
  return ok({ plans });
}

export async function getRoomPlan(input: {
  userId: string;
  roomPlanId: string;
}): Promise<ServiceResult<{ plan: RoomPlanDto }, "disabled" | "not_found">> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");
  const plan = await buildDto(input.roomPlanId, input.userId);
  if (!plan) return err("not_found", "Room plan not found.");
  return ok({ plan });
}

export async function createRoomPlan(input: {
  userId: string;
  name: string;
  projectId?: string | null;
  budgetCapCents?: number | null;
  currency?: string;
  roomType?: string | null;
  seedItems?: Array<{
    label: string;
    category: string;
    priority?: string;
  }>;
}): Promise<
  ServiceResult<
    { plan: RoomPlanDto },
    "disabled" | "validation" | "forbidden" | "rate_limited"
  >
> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");
  const name = input.name.trim();
  if (!name) return err("validation", "Name is required.");

  const quota = await assertRowQuota(
    () => prisma.roomPlan.count({ where: { userId: input.userId } }),
    maxRoomPlansPerUser(),
    "room plans",
  );
  if (!quota.ok) return quota;

  if (input.projectId) {
    const allowed = await userCanUseProject(input.userId, input.projectId);
    if (!allowed) return err("forbidden", "Project not found.");
  }

  const created = await prisma.roomPlan.create({
    data: {
      userId: input.userId,
      projectId: input.projectId ?? null,
      name,
      budgetCapCents: input.budgetCapCents ?? null,
      currency: input.currency?.trim() || "SGD",
      ...(input.seedItems?.length
        ? {
            items: {
              create: input.seedItems.map((item, index) => ({
                label: item.label.trim(),
                category: item.category.trim() || "general",
                priority: PRIORITIES.has(item.priority ?? "")
                  ? (item.priority as string)
                  : "core",
                sortOrder: index,
              })),
            },
          }
        : {}),
    },
  });

  if (input.budgetCapCents && input.budgetCapCents > 0) {
    const withItems = await prisma.roomPlanItem.findMany({
      where: { roomPlanId: created.id },
    });
    const allocation = allocate(
      input.roomType ?? null,
      input.budgetCapCents,
      withItems.map((item) => ({
        id: item.id,
        category: item.category,
        priority: item.priority,
        budgetCents: item.budgetCents,
      })),
    );
    for (const suggestion of allocation.suggestions) {
      await prisma.roomPlanItem.update({
        where: { id: suggestion.id },
        data: { budgetCents: suggestion.budgetCents },
      });
    }
  }

  const plan = await buildDto(created.id, input.userId);
  if (!plan) return err("validation", "Failed to load created plan.");
  return ok({ plan });
}

export async function updateRoomPlan(input: {
  userId: string;
  roomPlanId: string;
  name?: string;
  budgetCapCents?: number | null;
  currency?: string;
}): Promise<
  ServiceResult<{ plan: RoomPlanDto }, "disabled" | "not_found" | "validation">
> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");
  const existing = await prisma.roomPlan.findFirst({
    where: { id: input.roomPlanId, userId: input.userId },
    select: { id: true },
  });
  if (!existing) return err("not_found", "Room plan not found.");

  if (input.name !== undefined && !input.name.trim()) {
    return err("validation", "Name is required.");
  }

  await prisma.roomPlan.update({
    where: { id: input.roomPlanId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.budgetCapCents !== undefined
        ? { budgetCapCents: input.budgetCapCents }
        : {}),
      ...(input.currency !== undefined
        ? { currency: input.currency.trim() || "SGD" }
        : {}),
    },
  });

  const plan = await buildDto(input.roomPlanId, input.userId);
  if (!plan) return err("not_found", "Room plan not found.");
  return ok({ plan });
}

export async function addRoomPlanItem(input: {
  userId: string;
  roomPlanId: string;
  label: string;
  category: string;
  priority?: string;
  status?: string;
  budgetCents?: number | null;
  recommendationId?: string | null;
  inspirationItemId?: string | null;
  notes?: string | null;
}): Promise<
  ServiceResult<{ plan: RoomPlanDto }, "disabled" | "not_found" | "validation">
> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");
  const planRow = await prisma.roomPlan.findFirst({
    where: { id: input.roomPlanId, userId: input.userId },
    select: { id: true },
  });
  if (!planRow) return err("not_found", "Room plan not found.");

  const label = input.label.trim();
  const category = input.category.trim();
  if (!label || !category) {
    return err("validation", "Label and category are required.");
  }
  const priority = input.priority?.trim() || "core";
  const status = input.status?.trim() || "needed";
  if (!PRIORITIES.has(priority) || !STATUSES.has(status)) {
    return err("validation", "Invalid priority or status.");
  }

  const maxSort = await prisma.roomPlanItem.aggregate({
    where: { roomPlanId: input.roomPlanId },
    _max: { sortOrder: true },
  });

  await prisma.roomPlanItem.create({
    data: {
      roomPlanId: input.roomPlanId,
      label,
      category,
      priority,
      status,
      budgetCents: input.budgetCents ?? null,
      recommendationId: input.recommendationId ?? null,
      inspirationItemId: input.inspirationItemId ?? null,
      notes: input.notes?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const plan = await buildDto(input.roomPlanId, input.userId);
  if (!plan) return err("not_found", "Room plan not found.");
  return ok({ plan });
}

export async function updateRoomPlanItem(input: {
  userId: string;
  roomPlanId: string;
  itemId: string;
  label?: string;
  category?: string;
  priority?: string;
  status?: string;
  budgetCents?: number | null;
  actualCents?: number | null;
  notes?: string | null;
}): Promise<
  ServiceResult<{ plan: RoomPlanDto }, "disabled" | "not_found" | "validation">
> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");
  const item = await prisma.roomPlanItem.findFirst({
    where: {
      id: input.itemId,
      roomPlanId: input.roomPlanId,
      plan: { userId: input.userId },
    },
    select: { id: true },
  });
  if (!item) return err("not_found", "Item not found.");

  if (input.priority !== undefined && !PRIORITIES.has(input.priority)) {
    return err("validation", "Invalid priority.");
  }
  if (input.status !== undefined && !STATUSES.has(input.status)) {
    return err("validation", "Invalid status.");
  }

  await prisma.roomPlanItem.update({
    where: { id: input.itemId },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.category !== undefined
        ? { category: input.category.trim() }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.budgetCents !== undefined
        ? { budgetCents: input.budgetCents }
        : {}),
      ...(input.actualCents !== undefined
        ? { actualCents: input.actualCents }
        : {}),
      ...(input.notes !== undefined
        ? { notes: input.notes?.trim() || null }
        : {}),
    },
  });

  const plan = await buildDto(input.roomPlanId, input.userId);
  if (!plan) return err("not_found", "Room plan not found.");
  return ok({ plan });
}

export async function saveRecommendationToRoomPlan(input: {
  userId: string;
  roomPlanId: string;
  recommendationId: string;
  conversationId: string;
}): Promise<
  ServiceResult<{ plan: RoomPlanDto }, "disabled" | "not_found" | "validation">
> {
  if (!isChatRoomPlanEnabled()) return err("disabled", "Room plans are off.");

  const [planRow, recommendation] = await Promise.all([
    prisma.roomPlan.findFirst({
      where: { id: input.roomPlanId, userId: input.userId },
      select: { id: true },
    }),
    prisma.designRecommendation.findFirst({
      where: {
        OR: [
          { id: input.recommendationId },
          { stableId: input.recommendationId },
        ],
        conversationId: input.conversationId,
        conversation: { userId: input.userId },
      },
      select: { id: true, stableId: true, payload: true, status: true },
    }),
  ]);
  if (!planRow) return err("not_found", "Room plan not found.");
  if (!recommendation) return err("not_found", "Recommendation not found.");

  const payload = (recommendation.payload ?? {}) as Record<string, unknown>;
  const label =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Recommendation";
  const category =
    typeof payload.category === "string" && payload.category.trim()
      ? payload.category.trim()
      : "general";

  await prisma.designRecommendation.update({
    where: { id: recommendation.id },
    data: { status: "saved" },
  });

  return addRoomPlanItem({
    userId: input.userId,
    roomPlanId: input.roomPlanId,
    label,
    category,
    priority: "core",
    status: "considering",
    recommendationId: recommendation.stableId,
  });
}

/** Resolve a plan for chat prompt / workflow (project-scoped preferred). */
export async function resolveRoomPlanForConversation(input: {
  userId: string;
  projectId: string | null;
}): Promise<RoomPlanDto | null> {
  if (!isChatRoomPlanEnabled()) return null;
  const row = await prisma.roomPlan.findFirst({
    where: {
      userId: input.userId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!row) return null;
  return buildDto(row.id, input.userId);
}

export function roomPlanPromptBlockFromDto(plan: RoomPlanDto): string {
  return formatRoomPlanPromptBlock({
    name: plan.name,
    currency: plan.currency,
    budgetCapCents: plan.budgetCapCents,
    items: plan.items,
    readiness: plan.readiness,
  });
}

export function roomPlanWorkflowStats(plan: RoomPlanDto | null): {
  coreItemCount: number;
  decidedCount: number;
  coreDecidedRatio: number;
} | null {
  if (!plan) return null;
  const core = plan.items.filter((item) => item.priority === "core");
  const decided = core.filter(
    (item) => item.status === "decided" || item.status === "purchased",
  );
  return {
    coreItemCount: core.length,
    decidedCount: decided.length,
    coreDecidedRatio: coreDecidedRatio(
      plan.items.map((item) => ({
        label: item.label,
        priority: item.priority,
        status: item.status,
        budgetCents: item.budgetCents,
        actualCents: item.actualCents,
      })),
    ),
  };
}
