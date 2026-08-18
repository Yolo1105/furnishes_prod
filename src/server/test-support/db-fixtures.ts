/**
 * Per-file database fixtures for integration tests.
 *
 * Integration tests must not share the seeded `owner@example.com` row. Several
 * per-user quotas are DB-backed and count rows rather than calls:
 *
 * - `chat-rate-limit.ts` allows 20 user messages per rolling 60 seconds
 * - `image-generation-rate-limit.ts` allows 20 per UTC day and 2 concurrent
 *
 * Vitest runs test files in parallel forks against one database, so files that
 * act as the same user pool their traffic into those counters and trip each
 * other's limits — and because the windows are wall-clock, consecutive suite
 * runs within the same minute accumulate too. Giving each file its own user
 * makes the counters per-file and the suite order-independent.
 *
 * Tests that assert on quota boundaries additionally need a user nobody else
 * writes to, since a concurrent create invalidates a count read moments before.
 */

import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";

type TestUser = { id: string; email: string };

/**
 * Not a real credential. These fixtures never sign in; `verifyPassword`
 * returns false for this value rather than throwing, so an accidental login
 * attempt fails closed.
 */
const UNUSABLE_PASSWORD_HASH = "scrypt$16384$8$1$fixture$fixture";

/**
 * Creates a user owned by the calling test file. `label` only aids debugging
 * when inspecting leftover rows; uniqueness comes from the uuid.
 */
export async function createTestUser(
  label: string,
  data: {
    memoryEnabled?: boolean;
    activeAssistantId?: string;
    displayName?: string;
  } = {},
): Promise<TestUser> {
  const user = await prisma.user.create({
    data: {
      email: `${label}-${randomUUID()}@fixture.test`,
      passwordHash: UNUSABLE_PASSWORD_HASH,
      emailVerifiedAt: new Date(),
      ...data,
    },
    select: { id: true, email: true },
  });
  return user;
}

export async function createTestProject(
  ownerId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  return prisma.project.create({
    data: { ownerId, name, status: "planning" },
    select: { id: true, name: true },
  });
}

/**
 * Removes fixture users and everything cascading from them, so repeated local
 * runs do not accumulate rows. Safe to call with ids that no longer exist.
 */
export async function deleteTestUsers(...userIds: string[]): Promise<void> {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return;
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
