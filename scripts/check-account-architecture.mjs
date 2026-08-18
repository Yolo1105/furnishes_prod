#!/usr/bin/env node
/**
 * Architecture guard: Account must stay route-owned React.
 * Fails on prototype reintroduction, forbidden DOM HTML sinks, and null-only pages.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(import.meta.url), "..", "..");
const bannedDir = join(
  repoRoot,
  "src",
  "features",
  "account",
  "studio-prototype",
);
const scanRoots = [
  join(repoRoot, "src", "features", "account"),
  join(repoRoot, "src", "app", "(account)"),
  join(repoRoot, "src", "server", "account"),
  join(repoRoot, "src", "server", "conversations"),
  join(repoRoot, "src", "server", "preferences"),
  join(repoRoot, "src", "server", "projects"),
  join(repoRoot, "src", "server", "uploads"),
  join(repoRoot, "src", "server", "inspiration"),
  join(repoRoot, "src", "server", "image-generation"),
  join(repoRoot, "src", "server", "commerce"),
  join(repoRoot, "src", "lib", "eva"),
];

const bannedNames = [
  "FurnishesAccountStudio",
  "AccountStudioHost",
  "AccountStudioOwnedPage",
  "studio-prototype",
];

const bannedSnippets = [
  "dangerouslySetInnerHTML",
  "BODY_HTML",
  "@ts-nocheck",
  ".innerHTML",
  "insertAdjacentHTML",
  "void children",
];

const bannedLegacyReintroductions = [
  {
    snippet: 'from "@/lib/eva/playbook',
    message: "legacy playbook imports",
  },
  {
    snippet: 'from "@/components/eva-dashboard',
    message: "legacy Eva dashboard imports",
  },
  {
    snippet: "guest-session",
    message: "guest-session logic",
  },
  {
    snippet: "conversation-share",
    message: "conversation share/export routes",
  },
  {
    snippet: "autoConfirmHighConfidence",
    message: "auto-confirmed extraction writes",
  },
  {
    snippet: "promptTextFromClient",
    message: "arbitrary assistant prompts from client",
  },
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Ported playground is a known exception (see docs/ARCHITECTURE.md Phase 15).
      if (name === "playground" && dir.endsWith(`${sep}canvas`)) {
        continue;
      }
      out.push(...walk(full));
      continue;
    } else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function isNullOnlyAccountPage(text, rel) {
  if (
    !/src\/app\/\(account\)\/account\/.*\/page\.tsx$/.test(rel) &&
    !/src\/app\/\(account\)\/account\/page\.tsx$/.test(rel)
  ) {
    return false;
  }
  // Strip comments and strings roughly, then look for only `return null`
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  if (!/\breturn\s+null\s*;/.test(stripped)) return false;
  // If the file returns any JSX element, allow it.
  if (/return\s*\([\s\S]*?</.test(stripped) || /return\s+</.test(stripped)) {
    return false;
  }
  return true;
}

const failures = [];

if (existsSync(bannedDir)) {
  failures.push(
    `Forbidden directory still present: ${relative(repoRoot, bannedDir).replaceAll("\\", "/")}`,
  );
}

const files = scanRoots.flatMap((root) => walk(root));

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const rel = relative(repoRoot, file).replaceAll("\\", "/");
  for (const name of bannedNames) {
    if (text.includes(name)) {
      failures.push(`${rel}: mentions banned symbol ${name}`);
    }
  }
  for (const snippet of bannedSnippets) {
    if (text.includes(snippet)) {
      failures.push(`${rel}: contains banned pattern ${snippet}`);
    }
  }
  for (const banned of bannedLegacyReintroductions) {
    if (text.includes(banned.snippet)) {
      failures.push(`${rel}: reintroduces ${banned.message}`);
    }
  }
  if (isNullOnlyAccountPage(text, rel)) {
    failures.push(`${rel}: Account page returns null only`);
  }
}

if (failures.length > 0) {
  console.error("Account architecture guard FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Account architecture guard OK (${files.length} production .ts/.tsx files scanned).`,
);
