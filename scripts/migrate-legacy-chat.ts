/**
 * Selective legacy chat/memory importer.
 *
 * Dry-run is the default. Pass --apply to write into DATABASE_URL.
 *
 * Sources (first match wins):
 *   --fixture <path>           JSON snapshot (CI / local)
 *   LEGACY_DATABASE_URL        live legacy Postgres via raw SQL
 *
 * Usage:
 *   pnpm migrate:legacy-chat:dry-run
 *   pnpm migrate:legacy-chat:dry-run -- --fixture src/server/migration/fixtures/legacy-chat-fixture.json
 *   pnpm migrate:legacy-chat:apply -- --fixture <path>
 */

import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { applyLegacyChatMigrationPlan } from "../src/server/migration/legacy-chat-apply";
import {
  buildLegacyChatMigrationPlan,
  formatLegacyChatMigrationReport,
} from "../src/server/migration/legacy-chat-plan";
import {
  loadLegacyChatSnapshotFromDatabase,
  loadLegacyChatSnapshotFromFixture,
} from "../src/server/migration/legacy-chat-load";

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function readOption(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = hasFlag(args, "--apply");
  const fixtureOpt = readOption(args, "--fixture");
  const defaultFixture = resolve(
    "src/server/migration/fixtures/legacy-chat-fixture.json",
  );

  const legacyUrl = process.env.LEGACY_DATABASE_URL?.trim() || null;
  const targetUrl = process.env.DATABASE_URL?.trim() || null;

  const snapshot = fixtureOpt
    ? await loadLegacyChatSnapshotFromFixture(resolve(fixtureOpt))
    : legacyUrl && targetUrl
      ? await loadLegacyChatSnapshotFromDatabase({
          legacyDatabaseUrl: legacyUrl,
          targetDatabaseUrl: targetUrl,
        })
      : await loadLegacyChatSnapshotFromFixture(defaultFixture);

  const plan = buildLegacyChatMigrationPlan(snapshot);
  console.log(formatLegacyChatMigrationReport(plan));

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to write.");
    return;
  }

  if (!targetUrl) {
    throw new Error("DATABASE_URL is required for --apply.");
  }

  if (plan.conflicts.some((row) => row.code === "user_unmatched")) {
    throw new Error(
      "Refusing to apply while unmatched users remain. Resolve conflicts first.",
    );
  }

  const prisma = new PrismaClient();
  try {
    const result = await applyLegacyChatMigrationPlan(prisma, plan);
    console.log("\nApply result:");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
