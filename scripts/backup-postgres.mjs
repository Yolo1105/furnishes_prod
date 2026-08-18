#!/usr/bin/env node
/**
 * Dump the local compose Postgres database to backups/.
 *
 * Usage:
 *   pnpm db:backup
 *   pnpm db:backup -- --db furnishes_e2e
 *
 * Requires Docker Compose postgres to be running.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const dbName = argValue("--db") ?? "furnishes";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve("backups");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${dbName}-${stamp}.sql`);

const dump = spawnSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "pg_dump",
    "-U",
    "furnishes",
    "--no-owner",
    "--no-acl",
    dbName,
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

if (dump.error) {
  console.error(dump.error);
  process.exit(1);
}
if (dump.status !== 0) {
  console.error(dump.stderr || "pg_dump failed");
  process.exit(dump.status ?? 1);
}

writeFileSync(outFile, dump.stdout, "utf8");
console.info(`[db:backup] wrote ${outFile} (${dump.stdout.length} bytes)`);
