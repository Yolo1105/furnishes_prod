import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { envInt } from "@/server/env";

const ROOT = join(__dirname, "../..");

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walkTsFiles(path, acc);
    } else if (
      /\.(ts|tsx|mjs)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts")
    ) {
      acc.push(path);
    }
  }
  return acc;
}

function keysFromEnvHelpers(source: string): string[] {
  const keys = new Set<string>();
  const re = /\b(?:envInt|envMs|envBool)\(\s*"([A-Z][A-Z0-9_]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    keys.add(match[1]!);
  }
  return [...keys];
}

function exampleKeys(contents: string): Set<string> {
  const keys = new Set<string>();
  for (const line of contents.split("\n")) {
    const match = /^(?:#\s*)?([A-Z][A-Z0-9_]+)=/.exec(line.trim());
    if (match) keys.add(match[1]!);
  }
  return keys;
}

describe("env helpers", () => {
  it("treats blank envInt values as unset (use fallback)", () => {
    expect(envInt("AUTH_LOGIN_MAX_ATTEMPTS", 10, {})).toBe(10);
    expect(
      envInt("AUTH_LOGIN_MAX_ATTEMPTS", 10, { AUTH_LOGIN_MAX_ATTEMPTS: "" }),
    ).toBe(10);
    expect(
      envInt("AUTH_LOGIN_MAX_ATTEMPTS", 10, { AUTH_LOGIN_MAX_ATTEMPTS: "0" }),
    ).toBe(0);
  });

  it("documents every envInt/envMs/envBool key in .env.example", () => {
    const documented = exampleKeys(
      readFileSync(join(ROOT, ".env.example"), "utf8"),
    );
    const used = new Set<string>();
    for (const file of walkTsFiles(join(ROOT, "src"))) {
      for (const key of keysFromEnvHelpers(readFileSync(file, "utf8"))) {
        used.add(key);
      }
    }
    const missing = [...used].filter((key) => !documented.has(key)).sort();
    expect(missing).toEqual([]);
  });
});
