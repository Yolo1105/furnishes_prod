#!/usr/bin/env node
/**
 * Prefix Account stylesheet selectors under `.furnishes-account` without
 * changing declarations, @keyframes names, or values.
 *
 * Usage: node scripts/scope-account-css.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cssPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features/account/shell/account-studio.css",
);

const src = readFileSync(cssPath, "utf8");

function scopeSelector(raw) {
  const sel = raw.trim();
  if (!sel) return sel;
  if (/^(\d+%|from|to)$/i.test(sel)) return sel;
  if (sel === ":root" || sel === "html" || sel === "body") {
    return ".furnishes-account";
  }
  if (sel.startsWith(".furnishes-account")) return sel;
  return `.furnishes-account ${sel}`;
}

function scopeSelectorList(list) {
  return list
    .split(",")
    .map((part) => scopeSelector(part))
    .join(",");
}

/**
 * Walk CSS text, scoping rule selectors. Handles nested @media / @supports /
 * @document blocks. Leaves @keyframes interiors unscoped (from/to/%).
 */
function transform(input) {
  let i = 0;
  let out = "";
  let inKeyframes = false;
  let braceDepth = 0;
  let keyframesDepth = -1;

  while (i < input.length) {
    // Comments
    if (input.startsWith("/*", i)) {
      const end = input.indexOf("*/", i + 2);
      const chunk = end === -1 ? input.slice(i) : input.slice(i, end + 2);
      out += chunk;
      i += chunk.length;
      continue;
    }

    // At-rules
    if (input[i] === "@") {
      const nameMatch = input.slice(i).match(/^@([a-zA-Z-]+)/);
      const name = nameMatch?.[1]?.toLowerCase() ?? "";
      const isKeyframes = name === "keyframes" || name === "-webkit-keyframes";

      // Find opening `{` for block at-rules, or `;` for statements like @import
      let j = i;
      let depth = 0;
      let foundBlock = false;
      let foundStmt = false;
      while (j < input.length) {
        if (input.startsWith("/*", j)) {
          const end = input.indexOf("*/", j + 2);
          j = end === -1 ? input.length : end + 2;
          continue;
        }
        const ch = input[j];
        if (ch === "{") {
          foundBlock = true;
          break;
        }
        if (ch === ";" && depth === 0) {
          foundStmt = true;
          break;
        }
        j += 1;
      }

      if (foundStmt) {
        out += input.slice(i, j + 1);
        i = j + 1;
        continue;
      }

      if (!foundBlock) {
        out += input.slice(i);
        break;
      }

      // Emit at-rule header including `{`
      out += input.slice(i, j + 1);
      i = j + 1;

      if (isKeyframes) {
        inKeyframes = true;
        keyframesDepth = braceDepth + 1;
      }
      braceDepth += 1;
      continue;
    }

    // Closing brace
    if (input[i] === "}") {
      out += "}";
      braceDepth -= 1;
      if (inKeyframes && braceDepth < keyframesDepth) {
        inKeyframes = false;
        keyframesDepth = -1;
      }
      i += 1;
      continue;
    }

    // Inside keyframes: copy until next `}` at this level without scoping
    if (inKeyframes) {
      out += input[i];
      if (input[i] === "{") braceDepth += 1;
      i += 1;
      continue;
    }

    // Regular rule: read selector until `{`
    if (/[a-zA-Z_.*#[:[]/.test(input[i]) || input[i] === "-") {
      let j = i;
      while (j < input.length) {
        if (input.startsWith("/*", j)) {
          const end = input.indexOf("*/", j + 2);
          j = end === -1 ? input.length : end + 2;
          continue;
        }
        if (input[j] === "{") break;
        if (input[j] === "}") break;
        j += 1;
      }
      if (j >= input.length || input[j] !== "{") {
        out += input[i];
        i += 1;
        continue;
      }
      const selector = input.slice(i, j);
      out += scopeSelectorList(selector);
      out += "{";
      braceDepth += 1;
      i = j + 1;
      continue;
    }

    out += input[i];
    i += 1;
  }

  return out;
}

const result = transform(src);
writeFileSync(cssPath, result, "utf8");

const beforeUnscoped = (
  src.match(/^\.(app|stage|card|row|tab|content|meta)\b/gm) || []
).length;
const afterUnscoped = (
  result.match(/^\.(app|stage|card|row|tab|content|meta)\b/gm) || []
).length;
const scopedSamples = (
  result.match(/\.furnishes-account \.(app|stage|card|row|tab)\b/g) || []
).length;

console.log(
  `Scoped account CSS: bare .app/.stage/... headers ${beforeUnscoped} → ${afterUnscoped}; scoped samples ${scopedSamples}`,
);
