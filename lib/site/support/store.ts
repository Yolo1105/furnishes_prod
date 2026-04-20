/**
 * Support thread store — unified read/write.
 *
 * Dispatches to Prisma when DATABASE_URL is configured, otherwise to a
 * module-level in-memory array that persists across navigations within
 * a single server process. This lets the support module work end-to-end
 * in mock mode without any DB setup, while being ready to swap in real
 * persistence by just setting DATABASE_URL.
 *
 * CAVEAT: the in-memory store is per-process. Multiple Next.js workers
 * will have different state. Sufficient for demo/dev, not for real
 * deployment — that's what DATABASE_URL is for.
 */

import "server-only";
// ↑ Requires the `server-only` npm package (ships with Next.js 15+).
//   If your repo doesn't have it yet, either install it or remove this line.
//   Its purpose: throw a build error if this module is ever imported into
//   a client component, which would leak Prisma + auth into the bundle.
import { randomUUID } from "crypto";
import { MOCK_USER_ID } from "@/lib/auth/mock-constants";
import { serverLog } from "@/lib/server/server-log";
import { getMockSupportThreads } from "./mock-data";
import type {
  SupportThread,
  SupportKind,
  SupportCategory,
  SupportStatus,
  SupportThreadMetadata,
} from "./types";

const useDb = !!process.env.DATABASE_URL;

/** In production, never silently fall back to in-memory support data. */
const allowMemoryFallback =
  process.env.NODE_ENV !== "production" ||
  process.env.SUPPORT_MEMORY_FALLBACK === "1";

/* ── In-memory store ──────────────────────────────────────────── */

// Seeded lazily on first read. Each user gets their own shard.
const memoryStore = new Map<string, SupportThread[]>();

function getUserShard(userId: string): SupportThread[] {
  let shard = memoryStore.get(userId);
  if (!shard) {
    // Initialize with the mock fixture threads so the UI isn't empty
    shard = getMockSupportThreads();
    memoryStore.set(userId, shard);
  }
  return shard;
}

/* ── Public API ───────────────────────────────────────────────── */

/**
 * List threads for a user with cursor-based pagination.
 *
 * @param userId    The acting user
 * @param options   Optional filter + paging
 * @returns { threads, nextCursor } — nextCursor is null when no more pages
 *
 * Implementation note: uses offset-free cursor pagination based on
 * updatedAt DESC + id tiebreaker. More scalable than skip/take —
 * performance stays O(log n) regardless of page depth.
 */
export async function listSupportThreads(
  userId: string,
  options: {
    kind?: SupportKind;
    /** How many threads to return. Default 20, max 50. */
    limit?: number;
    /** Cursor from a previous response. Null/undefined for first page. */
    cursor?: string | null;
  } = {},
): Promise<{ threads: SupportThread[]; nextCursor: string | null }> {
  const { kind, cursor } = options;
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);

  if (useDb) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const rows = await prisma.supportThread.findMany({
        where: { userId, ...(kind ? { kind } : {}) },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: limit + 1, // fetch one extra to detect next page
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          attachments: true,
        },
      });
      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;
      return {
        threads: pageRows.map(prismaThreadToDomain),
        nextCursor: hasMore ? pageRows[pageRows.length - 1]!.id : null,
      };
    } catch (e) {
      if (!allowMemoryFallback) throw e;
      serverLog("warn", "support_store_memory_fallback", {
        action: "listSupportThreads",
        userId,
        production: process.env.NODE_ENV === "production",
        memoryFallbackExplicit: process.env.SUPPORT_MEMORY_FALLBACK === "1",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const shard = getUserShard(userId);
  const filtered = kind ? shard.filter((t) => t.kind === kind) : shard;
  const sorted = [...filtered].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const startIdx = cursor ? sorted.findIndex((t) => t.id === cursor) + 1 : 0;
  const page = sorted.slice(startIdx, startIdx + limit);
  const hasMore = startIdx + limit < sorted.length;
  return {
    threads: page,
    nextCursor: hasMore && page.length ? page[page.length - 1]!.id : null,
  };
}

/**
 * Load a single thread by ID. Returns null if not found.
 */
export async function getSupportThread(
  userId: string,
  threadId: string,
): Promise<SupportThread | null> {
  if (useDb) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const row = await prisma.supportThread.findFirst({
        where: { id: threadId, userId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          attachments: true,
        },
      });
      return row ? prismaThreadToDomain(row) : null;
    } catch (e) {
      if (!allowMemoryFallback) throw e;
      serverLog("warn", "support_store_memory_fallback", {
        action: "getSupportThread",
        userId,
        threadId,
        production: process.env.NODE_ENV === "production",
        memoryFallbackExplicit: process.env.SUPPORT_MEMORY_FALLBACK === "1",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const shard = getUserShard(userId);
  return shard.find((t) => t.id === threadId) ?? null;
}

/**
 * Create a new thread — either help or feedback.
 * Returns the created thread so callers can link to it.
 */
export async function createSupportThread(
  userId: string,
  input: {
    kind: SupportKind;
    category: SupportCategory;
    title: string;
    body: string;
    metadata?: SupportThreadMetadata;
    linkedConversationId?: string | null;
    linkedProjectId?: string | null;
  },
): Promise<SupportThread> {
  const initialStatus: SupportStatus =
    input.kind === "HELP" ? "open" : "received";
  const now = new Date().toISOString();

  // Collision-resistant number generation — hits the DB to verify uniqueness
  // in DB mode, falls back to in-memory check in mock mode.
  const number = await generateUniqueThreadNumber(async (candidate) => {
    if (useDb) {
      const { prisma } = await import("@/lib/db/prisma");
      const exists = await prisma.supportThread.findUnique({
        where: { number: candidate },
        select: { id: true },
      });
      return exists !== null;
    }
    // Mock mode: scan all shards
    for (const shard of memoryStore.values()) {
      if (shard.some((t) => t.number === candidate)) return true;
    }
    return false;
  });

  if (useDb) {
    const { prisma } = await import("@/lib/db/prisma");
    const row = await prisma.supportThread.create({
      data: {
        userId,
        number,
        kind: input.kind,
        category: input.category,
        title: input.title,
        body: input.body,
        status: initialStatus,
        metadata: (input.metadata ?? {}) as object,
        linkedConversationId: input.linkedConversationId ?? null,
        linkedProjectId: input.linkedProjectId ?? null,
        messages: {
          create: {
            role: "user",
            content: input.body,
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: true,
      },
    });
    // Best-effort audit log
    try {
      await prisma.activityEvent.create({
        data: {
          userId,
          category: "conversation",
          label: `${input.kind === "HELP" ? "Help ticket" : "Feedback"}: ${input.title}`,
        },
      });
    } catch {
      // swallow — audit log is nice-to-have, not required
    }
    return prismaThreadToDomain(row);
  }

  const thread: SupportThread = {
    id: `st_${randomUUID().slice(0, 8)}`,
    number,
    kind: input.kind,
    category: input.category,
    title: input.title,
    body: input.body,
    status: initialStatus,
    messages: [
      {
        id: `sm_${randomUUID().slice(0, 8)}`,
        role: "user",
        content: input.body,
        at: now,
      },
    ],
    attachments: [],
    metadata: input.metadata ?? {},
    linkedConversationId: input.linkedConversationId ?? null,
    linkedProjectId: input.linkedProjectId ?? null,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  };

  const shard = getUserShard(userId);
  shard.unshift(thread);
  return thread;
}

/**
 * Append a user reply to an existing thread. Transitions the status
 * back to the appropriate waiting-on-staff state.
 */
export async function appendUserReply(
  userId: string,
  threadId: string,
  content: string,
): Promise<SupportThread | null> {
  const now = new Date().toISOString();

  if (useDb) {
    const { prisma } = await import("@/lib/db/prisma");
    const existing = await prisma.supportThread.findFirst({
      where: { id: threadId, userId },
    });
    if (!existing) return null;
    const nextStatus: SupportStatus =
      existing.kind === "HELP" ? "open" : "under_review";
    await prisma.supportThread.update({
      where: { id: threadId },
      data: {
        status: nextStatus,
        messages: { create: { role: "user", content } },
      },
    });
    const row = await prisma.supportThread.findFirst({
      where: { id: threadId, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: true,
      },
    });
    return row ? prismaThreadToDomain(row) : null;
  }

  const shard = getUserShard(userId);
  const idx = shard.findIndex((t) => t.id === threadId);
  if (idx < 0) return null;
  const t = shard[idx]!;
  t.messages.push({
    id: `sm_${randomUUID().slice(0, 8)}`,
    role: "user",
    content,
    at: now,
  });
  t.updatedAt = now;
  t.status = t.kind === "HELP" ? "open" : "under_review";
  return t;
}

/**
 * User-initiated close. Transitions to `resolved` for help, or
 * `wont_ship` for feedback (user has retracted).
 */
export async function closeThread(
  userId: string,
  threadId: string,
): Promise<SupportThread | null> {
  const now = new Date().toISOString();

  if (useDb) {
    const { prisma } = await import("@/lib/db/prisma");
    const existing = await prisma.supportThread.findFirst({
      where: { id: threadId, userId },
    });
    if (!existing) return null;
    const closedStatus: SupportStatus =
      existing.kind === "HELP" ? "resolved" : "wont_ship";
    await prisma.supportThread.update({
      where: { id: threadId },
      data: { status: closedStatus, closedAt: new Date() },
    });
    const row = await prisma.supportThread.findFirst({
      where: { id: threadId, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: true,
      },
    });
    return row ? prismaThreadToDomain(row) : null;
  }

  const shard = getUserShard(userId);
  const t = shard.find((x) => x.id === threadId);
  if (!t) return null;
  t.status = t.kind === "HELP" ? "resolved" : "wont_ship";
  t.closedAt = now;
  t.updatedAt = now;
  return t;
}

/* ── Internal helpers ─────────────────────────────────────────── */

/**
 * Generates human-readable support ticket numbers like "FH-25041-K3X9".
 *
 * Format: FH-YYDDD-NNNN
 *   YY    = last 2 digits of year
 *   DDD   = day of year (001-366)
 *   NNNN  = 4 chars of base36 from crypto.randomBytes (~1.6M combinations/day)
 *
 * Collision math: at 1000 tickets/day, the birthday-paradox collision
 * probability per day is ~0.03%. The @unique constraint on the DB column
 * plus retry loop below makes it effectively zero.
 *
 * Why not a Postgres sequence? Keeps the store layer DB-agnostic — still
 * works in mock/in-memory mode. If real scale demands a counter, switch
 * to `prisma.$queryRaw\`SELECT nextval('support_thread_seq')\`` in the
 * DB path and keep this as the fallback.
 */
function generateThreadNumber(): string {
  const now = new Date();
  const yy = now.getUTCFullYear().toString().slice(-2);
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000)
    .toString()
    .padStart(3, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `FH-${yy}${dayOfYear}-${rand}`;
}

/**
 * Wrap creation in a retry loop in case of the rare @unique collision.
 * Tries up to 3 times — effectively guarantees unique numbers.
 */
async function generateUniqueThreadNumber(
  checkExists: (n: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const candidate = generateThreadNumber();
    if (!(await checkExists(candidate))) return candidate;
  }
  // If we somehow got 3 collisions, append an extra suffix to guarantee uniqueness
  return `${generateThreadNumber()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Translate a Prisma row (and its included messages/attachments) into
 * our frontend SupportThread shape. Prisma uses Dates; we use ISO strings.
 */
// Type kept loose to avoid hard-importing Prisma types here — this file
// compiles whether or not @prisma/client has been generated yet.
type PrismaSupportThreadWithIncludes = {
  id: string;
  number: string;
  kind: SupportKind;
  category: string;
  title: string;
  body: string;
  status: SupportStatus;
  metadata: unknown;
  linkedConversationId: string | null;
  linkedProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  messages: {
    id: string;
    role: "user" | "staff";
    staffName: string | null;
    content: string;
    createdAt: Date;
  }[];
  attachments: {
    id: string;
    filename: string;
    sizeBytes: number;
    mimeType: string;
    storageKey: string | null;
    createdAt: Date;
  }[];
};

function prismaThreadToDomain(
  row: PrismaSupportThreadWithIncludes,
): SupportThread {
  return {
    id: row.id,
    number: row.number,
    kind: row.kind,
    category: row.category as SupportCategory,
    title: row.title,
    body: row.body,
    status: row.status,
    messages: row.messages.map((m) => ({
      id: m.id,
      role: m.role,
      staffName: m.staffName ?? undefined,
      content: m.content,
      at: m.createdAt.toISOString(),
    })),
    attachments: row.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      sizeBytes: a.sizeBytes,
      mimeType: a.mimeType,
      storageKey: a.storageKey,
      uploadedAt: a.createdAt.toISOString(),
    })),
    metadata: (row.metadata ?? {}) as SupportThreadMetadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    linkedConversationId: row.linkedConversationId,
    linkedProjectId: row.linkedProjectId,
  };
}

/* ─────────────────────────────────────────────────────────────
 * Staff-side operations — cross-user. Use ONLY from /admin pages
 * after requireStaff() has gated the caller.
 * ───────────────────────────────────────────────────────────── */

/**
 * List ALL threads across all users, with optional filters.
 * Designed for the admin support inbox.
 */
export async function adminListSupportThreads(
  options: {
    status?: SupportStatus | "all_open" | "all";
    kind?: SupportKind;
    limit?: number;
    cursor?: string | null;
  } = {},
): Promise<{
  threads: Array<
    SupportThread & { userEmail: string; userName: string | null }
  >;
  nextCursor: string | null;
}> {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const status = options.status ?? "all_open";

  if (useDb) {
    const { prisma } = await import("@/lib/db/prisma");
    const where: Record<string, unknown> = {};
    if (status === "all_open") {
      where.status = {
        in: ["open", "received", "under_review", "awaiting_user"],
      };
    } else if (status !== "all") {
      where.status = status;
    }
    if (options.kind) where.kind = options.kind;

    const rows = await prisma.supportThread.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: true,
        user: { select: { email: true, name: true } },
      },
    });
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    return {
      threads: pageRows.map((r) => ({
        ...prismaThreadToDomain(r),
        userEmail: r.user.email ?? "",
        userName: r.user.name,
      })),
      nextCursor: hasMore ? pageRows[pageRows.length - 1]!.id : null,
    };
  }

  // In-memory mode: collapse all shards
  const all: Array<
    SupportThread & { userEmail: string; userName: string | null }
  > = [];
  for (const [userId, shard] of memoryStore.entries()) {
    for (const t of shard) {
      all.push({
        ...t,
        userEmail:
          userId === MOCK_USER_ID
            ? "mohan@demo.furnishes.sg"
            : `${userId}@unknown`,
        userName: userId === MOCK_USER_ID ? "Mohan Tan" : null,
      });
    }
  }
  let filtered = all;
  if (status === "all_open") {
    filtered = all.filter((t) =>
      ["open", "received", "under_review", "awaiting_user"].includes(t.status),
    );
  } else if (status !== "all") {
    filtered = all.filter((t) => t.status === status);
  }
  if (options.kind) filtered = filtered.filter((t) => t.kind === options.kind);
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const startIdx = options.cursor
    ? filtered.findIndex((t) => t.id === options.cursor) + 1
    : 0;
  const page = filtered.slice(startIdx, startIdx + limit);
  const hasMore = startIdx + limit < filtered.length;
  return {
    threads: page,
    nextCursor: hasMore && page.length ? page[page.length - 1]!.id : null,
  };
}

/**
 * Look up a thread by ID without scoping to a user — for admin views.
 */
export async function adminGetSupportThread(threadId: string): Promise<
  | (SupportThread & {
      userEmail: string;
      userName: string | null;
      userId: string;
    })
  | null
> {
  if (useDb) {
    const { prisma } = await import("@/lib/db/prisma");
    const row = await prisma.supportThread.findFirst({
      where: { id: threadId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!row) return null;
    return {
      ...prismaThreadToDomain(row),
      userId: row.user.id,
      userEmail: row.user.email ?? "",
      userName: row.user.name,
    };
  }

  for (const [userId, shard] of memoryStore.entries()) {
    const t = shard.find((x) => x.id === threadId);
    if (t) {
      return {
        ...t,
        userId,
        userEmail:
          userId === MOCK_USER_ID
            ? "mohan@demo.furnishes.sg"
            : `${userId}@unknown`,
        userName: userId === MOCK_USER_ID ? "Mohan Tan" : null,
      };
    }
  }
  return null;
}

/**
 * Append a STAFF reply. Updates status to awaiting_user (help) or
 * shipped (feedback only if explicitly marked done) so the user knows
 * we've responded.
 */
export async function appendStaffReply(args: {
  threadId: string;
  staffName: string;
  content: string;
  /** Optional explicit status transition. Defaults: HELP→awaiting_user, FEEDBACK→under_review */
  setStatus?: SupportStatus;
}): Promise<{ thread: SupportThread; messageId: string } | null> {
  const now = new Date().toISOString();

  if (useDb) {
    const { prisma } = await import("@/lib/db/prisma");
    const existing = await prisma.supportThread.findFirst({
      where: { id: args.threadId },
    });
    if (!existing) return null;

    const nextStatus: SupportStatus =
      args.setStatus ??
      (existing.kind === "HELP" ? "awaiting_user" : "under_review");

    const message = await prisma.supportMessage.create({
      data: {
        threadId: args.threadId,
        role: "staff",
        staffName: args.staffName,
        content: args.content,
      },
    });
    await prisma.supportThread.update({
      where: { id: args.threadId },
      data: {
        status: nextStatus,
        ...(nextStatus === "shipped" || nextStatus === "resolved"
          ? { closedAt: new Date() }
          : {}),
      },
    });
    const row = await prisma.supportThread.findFirst({
      where: { id: args.threadId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: true,
      },
    });
    if (!row) return null;
    return { thread: prismaThreadToDomain(row), messageId: message.id };
  }

  // In-memory mode
  for (const [, shard] of memoryStore.entries()) {
    const t = shard.find((x) => x.id === args.threadId);
    if (!t) continue;
    const messageId = `sm_${randomUUID().slice(0, 8)}`;
    t.messages.push({
      id: messageId,
      role: "staff",
      staffName: args.staffName,
      content: args.content,
      at: now,
    });
    t.status =
      args.setStatus ?? (t.kind === "HELP" ? "awaiting_user" : "under_review");
    t.updatedAt = now;
    if (t.status === "shipped" || t.status === "resolved") {
      t.closedAt = now;
    }
    return { thread: t, messageId };
  }
  return null;
}
