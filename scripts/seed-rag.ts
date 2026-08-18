/**
 * Seed RAG: chunk config/design-docs, embed, upsert DesignDoc rows.
 * Opt-in: SEED_RAG=1 pnpm db:seed:rag
 *
 * Re-derived from legacy `scripts/seed-rag.ts`.
 */

import { prisma } from "../src/server/db";
import { loadDesignDocChunks } from "../src/server/rag/documents";
import { embedText } from "../src/server/rag/embeddings";
import { invalidateRagCache } from "../src/server/rag/retriever";

async function main() {
  if (process.env.SEED_RAG !== "1") {
    console.log(
      "[seed-rag] Skipping — set SEED_RAG=1 to embed design docs (OpenAI API usage).",
    );
    return;
  }

  const chunks = loadDesignDocChunks();
  if (chunks.length === 0) {
    console.log("No markdown chunks found in config/design-docs. Skipping.");
    return;
  }

  const perSourceIndex = new Map<string, number>();
  let upserted = 0;
  for (const chunk of chunks) {
    const nextIndex = perSourceIndex.get(chunk.source) ?? 0;
    perSourceIndex.set(chunk.source, nextIndex + 1);
    const embedding = await embedText(chunk.text);
    const base = {
      content: chunk.text,
      embedding,
    };
    const withMeta = chunk.metadata
      ? {
          ...base,
          metadata: JSON.parse(JSON.stringify(chunk.metadata)) as object,
        }
      : base;
    await prisma.designDoc.upsert({
      where: {
        source_chunkIndex: {
          source: chunk.source,
          chunkIndex: nextIndex,
        },
      },
      create: {
        source: chunk.source,
        chunkIndex: nextIndex,
        ...withMeta,
      },
      update: withMeta,
    });
    upserted += 1;
    console.log(`[seed-rag] upserted ${chunk.source}#${nextIndex}`);
  }

  invalidateRagCache();
  console.log(`[seed-rag] Seeded ${upserted} design doc chunks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
