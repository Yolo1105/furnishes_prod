/**
 * Load and chunk markdown design docs from `config/design-docs/`.
 * Re-derived from legacy `lib/eva/rag/documents.ts`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** ~500 tokens ≈ ~2000 chars per chunk. Split by paragraphs then recombine. */
const TARGET_CHARS = 1800;

type DocChunk = {
  text: string;
  source: string;
  metadata?: Record<string, unknown>;
};

function designDocsDir(cwd = process.cwd()): string {
  return join(cwd, "config", "design-docs");
}

export function chunkText(content: string, source: string): DocChunk[] {
  const chunks: DocChunk[] = [];
  const paragraphs = content.split(/\n\n+/);
  let current = "";
  for (const paragraph of paragraphs) {
    if (
      current.length + paragraph.length > TARGET_CHARS &&
      current.length > 0
    ) {
      chunks.push({ text: current.trim(), source });
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push({ text: current.trim(), source });
  return chunks;
}

/**
 * Load all markdown files from config/design-docs and return chunked content.
 * Chunk indexes are per-source (stable for upsert).
 */
export function loadDesignDocChunks(cwd = process.cwd()): DocChunk[] {
  const chunks: DocChunk[] = [];
  try {
    const dir = designDocsDir(cwd);
    const files = readdirSync(dir).filter((name) => name.endsWith(".md"));
    for (const file of files) {
      const content = readFileSync(join(dir, file), "utf-8");
      chunks.push(...chunkText(content, file));
    }
  } catch {
    // Directory or files missing
  }
  return chunks;
}
