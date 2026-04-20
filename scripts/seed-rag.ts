/**
 * Seed RAG: read markdown from config/design-docs, chunk, embed, store in DesignDoc.
 * Requires DATABASE_URL + OPENAI_API_KEY or OPENROUTER_API_KEY.
 *
 * Opt-in (costs OpenAI embedding usage): `SEED_RAG=1 npm run db:seed:rag`
 */
import { loadDesignDocChunks } from "../lib/eva/rag/documents";
import { embedAndStore } from "../lib/eva/rag/embeddings";
import { prisma } from "../lib/eva/db";

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
  await prisma.designDoc.deleteMany({});
  await embedAndStore(chunks);
  console.log(`Seeded ${chunks.length} design doc chunks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
