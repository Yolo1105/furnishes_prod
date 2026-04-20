/**
 * Embeddings for RAG — OpenAI API or OpenRouter (same response shape).
 * Server-only; requires OPENAI_API_KEY and/or OPENROUTER_API_KEY.
 */
import { prisma } from "@/lib/eva/db";

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

function getEmbeddingConfig(): {
  url: string;
  headers: Record<string, string>;
  model: string;
} | null {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/embeddings",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      model: OPENAI_EMBEDDING_MODEL,
    };
  }
  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  if (orKey) {
    return {
      url: "https://openrouter.ai/api/v1/embeddings",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orKey}`,
      },
      model: OPENROUTER_EMBEDDING_MODEL,
    };
  }
  return null;
}

async function callEmbeddingAPI(text: string): Promise<number[]> {
  const cfg = getEmbeddingConfig();
  if (!cfg) {
    throw new Error(
      "OPENAI_API_KEY or OPENROUTER_API_KEY is required for embeddings",
    );
  }
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: cfg.headers,
    body: JSON.stringify({
      model: cfg.model,
      input: text.slice(0, 8000),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embeddings API: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0]!.embedding;
}

export async function embedText(text: string): Promise<number[]> {
  return callEmbeddingAPI(text);
}

export interface ChunkWithMeta {
  text: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export async function embedChunks(
  chunks: ChunkWithMeta[],
): Promise<Array<ChunkWithMeta & { embedding: number[] }>> {
  const out: Array<ChunkWithMeta & { embedding: number[] }> = [];
  for (const ch of chunks) {
    const embedding = await callEmbeddingAPI(ch.text);
    out.push({ ...ch, embedding });
  }
  return out;
}

/**
 * Embed chunks and store in DesignDoc table (replaces prior rows — caller may deleteMany first).
 */
export async function embedAndStore(chunks: ChunkWithMeta[]): Promise<void> {
  const embedded = await embedChunks(chunks);
  for (let i = 0; i < embedded.length; i++) {
    const ch = embedded[i]!;
    await prisma.designDoc.create({
      data: {
        source: ch.source,
        chunkIndex: i,
        content: ch.text,
        embedding: ch.embedding,
        metadata: ch.metadata
          ? JSON.parse(JSON.stringify(ch.metadata))
          : undefined,
      },
    });
  }
}
