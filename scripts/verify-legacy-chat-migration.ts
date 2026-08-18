/**
 * Verify a previously planned legacy chat migration against DATABASE_URL.
 *
 *   pnpm verify:legacy-chat-migration -- --fixture <path>
 */

import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { verifyLegacyChatMigration } from "../src/server/migration/legacy-chat-apply";
import { buildLegacyChatMigrationPlan } from "../src/server/migration/legacy-chat-plan";
import {
  loadLegacyChatSnapshotFromDatabase,
  loadLegacyChatSnapshotFromFixture,
} from "../src/server/migration/legacy-chat-load";

function readOption(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixtureOpt = readOption(args, "--fixture");
  const defaultFixture = resolve(
    "src/server/migration/fixtures/legacy-chat-fixture.json",
  );
  const legacyUrl = process.env.LEGACY_DATABASE_URL?.trim() || null;
  const targetUrl = process.env.DATABASE_URL?.trim() || null;

  if (!targetUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const snapshot = fixtureOpt
    ? await loadLegacyChatSnapshotFromFixture(resolve(fixtureOpt))
    : legacyUrl
      ? await loadLegacyChatSnapshotFromDatabase({
          legacyDatabaseUrl: legacyUrl,
          targetDatabaseUrl: targetUrl,
        })
      : await loadLegacyChatSnapshotFromFixture(defaultFixture);

  const plan = buildLegacyChatMigrationPlan(snapshot);
  const prisma = new PrismaClient();
  try {
    const result = await verifyLegacyChatMigration(prisma, plan);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
