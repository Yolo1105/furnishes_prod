#!/usr/bin/env node
// Vercel + Next 16.3 Turbopack has been 500ing every route. Use webpack there.
import { spawnSync } from "node:child_process";

const extra = process.env.VERCEL === "1" ? ["--webpack"] : [];
const result = spawnSync("pnpm", ["exec", "next", "build", ...extra], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
