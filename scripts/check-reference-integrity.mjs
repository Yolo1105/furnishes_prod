#!/usr/bin/env node
// Verify that every frozen reference source matches its manifest hash.
//
// Line endings are normalized (CRLF/CR -> LF) before hashing so the check
// passes identically on every operating system.

import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(import.meta.url), "..", "..");
const sourcesRoot = resolve(repoRoot, "reference");
const SOURCES = ["landing", "account"];

function normalizedLfHash(filePath) {
  const raw = readFileSync(filePath);
  const lf = raw.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return createHash("sha256").update(lf, "utf8").digest("hex");
}

function listVersions() {
  if (!existsSync(sourcesRoot)) return [];
  return readdirSync(sourcesRoot)
    .filter((name) => statSync(join(sourcesRoot, name)).isDirectory())
    .sort();
}

const versions = listVersions();
const failures = [];

if (versions.length === 0) {
  console.error(
    "check-reference-integrity: no reference version directories found.",
  );
  process.exit(1);
}

for (const version of versions) {
  const versionDir = join(sourcesRoot, version);
  const manifestPath = join(versionDir, "source-manifest.json");
  if (!existsSync(manifestPath)) {
    failures.push(`[${version}] missing source-manifest.json`);
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const name of SOURCES) {
    const entry = manifest.sources?.[name];
    const filePath = join(versionDir, `${name}.jsx`);
    if (!entry) {
      failures.push(`[${version}] manifest has no entry for ${name}`);
      continue;
    }
    if (!existsSync(filePath)) {
      failures.push(`[${version}] missing source file ${name}.jsx`);
      continue;
    }
    const actual = normalizedLfHash(filePath);
    if (actual !== entry.sha256) {
      failures.push(
        `[${version}] ${name}.jsx hash mismatch: expected ${entry.sha256}, got ${actual}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Reference integrity check FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(
  `Reference integrity OK (${versions.length} version(s), ${SOURCES.join(", ")}).`,
);
