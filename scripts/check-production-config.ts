/**
 * Validate a production env file before deploying, using the same checks the
 * app runs at boot (src/server/ops/preflight.ts) plus a summary of which
 * capability layer each provider is on (see docs/DEPLOYMENT.md).
 *
 * Usage: pnpm check:prod-config [path]   (default .env.production)
 *        Falls back to the current process env when the file is absent.
 *
 * Exits non-zero when any fatal issue is found.
 */

import { readFileSync } from "node:fs";

import {
  capabilityFlagSnapshot,
  collectPreflightIssues,
} from "../src/server/ops/preflight";
import { registeredEnvKeys } from "../src/server/env";

/** Minimal KEY=VALUE parser — no dependency, no interpolation. */
function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnv(path: string): {
  env: NodeJS.ProcessEnv;
  source: string;
} {
  try {
    const parsed = parseEnvFile(readFileSync(path, "utf8"));
    return { env: parsed as NodeJS.ProcessEnv, source: path };
  } catch {
    return { env: { ...process.env }, source: "process env" };
  }
}

function has(env: NodeJS.ProcessEnv, key: string): boolean {
  return Boolean((env[key] ?? "").trim());
}

function providerReadiness(env: NodeJS.ProcessEnv): Array<[string, string]> {
  const storage = (env.STORAGE_PROVIDER ?? "local").trim() || "local";
  const chat = (env.CHAT_PROVIDER ?? "local").trim() || "local";
  const image =
    (env.IMAGE_GENERATION_PROVIDER ?? "disabled").trim() || "disabled";
  return [
    ["login", has(env, "SMTP_HOST") ? "smtp mail" : "LOG-ONLY MAIL"],
    ["uploads", storage === "s3" ? "s3" : "local (single instance)"],
    ["chat", chat === "openai" ? "openai" : "local stub replies"],
    ["image gen", image],
    [
      "rag corpus",
      env.CHAT_RAG_ENABLED === "1" ? "enabled (seed required)" : "off",
    ],
    [
      "commerce",
      env.COMMERCE_ENABLED === "1"
        ? `open · payments ${(env.COMMERCE_PAYMENT_PROVIDER ?? "disabled").trim() || "disabled"}`
        : "off (storefront hidden)",
    ],
  ];
}

function main(): void {
  const path = process.argv[2] ?? ".env.production";
  const { env, source } = loadEnv(path);
  // Preflight relaxes the SMTP/https/storage rules when NEXT_PUBLIC_E2E=1 or
  // NODE_ENV=test so E2E can boot a production build locally. This script grades
  // a real deployment, so neither may leak in from the caller's shell.
  const checked: NodeJS.ProcessEnv = {
    ...env,
    NODE_ENV: "production",
    NEXT_PUBLIC_E2E: "",
  };

  const issues = collectPreflightIssues(checked);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warn");

  console.info(`[check:prod-config] source: ${source}`);
  for (const [layer, state] of providerReadiness(checked)) {
    console.info(`  ${layer.padEnd(12)} ${state}`);
  }
  console.info(
    `[check:prod-config] flags: ${JSON.stringify(capabilityFlagSnapshot(checked))}`,
  );
  console.info(
    "[check:prod-config] numeric env knobs: see .env.example and src/server/env.test.ts" +
      (registeredEnvKeys().length
        ? ` (registered this process: ${registeredEnvKeys().join(", ")})`
        : ""),
  );

  for (const warning of warnings) {
    console.warn(`  warn  ${warning.code}: ${warning.message}`);
  }
  for (const error of errors) {
    console.error(`  ERROR ${error.code}: ${error.message}`);
  }

  if (errors.length > 0) {
    console.error(
      `[check:prod-config] ${errors.length} fatal issue(s) — this env would fail boot.`,
    );
    process.exit(1);
  }
  console.info("[check:prod-config] no fatal issues.");
}

main();
