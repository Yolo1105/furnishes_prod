#!/usr/bin/env node
// Cross-platform E2E runner: prepares an isolated Postgres DB, seeds auth users,
// builds with NEXT_PUBLIC_E2E=1, then runs Playwright.

import { spawnSync } from "node:child_process";
import { e2eEnv } from "../e2e/env.mjs";

const env = e2eEnv(process.env);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("pnpm", ["exec", "prisma", "generate"]);
// Reset keeps E2E deterministic without depending on leftover local rows.
run("pnpm", ["exec", "prisma", "migrate", "reset", "--force", "--skip-seed"]);
run("pnpm", ["exec", "prisma", "db", "seed"]);
run("pnpm", ["exec", "next", "build"]);
run("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)]);
