import "server-only";

import { putObjectBuffer, publicUrlForStorageKey } from "@/lib/storage/r2";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_GLB_BYTES = 120 * 1024 * 1024;

function extFromUrl(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const dot = path.lastIndexOf(".");
    if (dot >= 0 && dot < path.length - 1) {
      const ext = path
        .slice(dot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (ext.length <= 8 && ext.length > 0) return ext;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

async function fetchWithLimit(
  url: string,
  maxBytes: number,
): Promise<
  | { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; error: string }
> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    return {
      ok: false,
      error: `Fetch failed ${res.status} for artifact`,
    };
  }
  const ct = res.headers.get("content-type")?.split(";")[0]?.trim() || "";
  const len = res.headers.get("content-length");
  if (len && Number(len) > maxBytes) {
    return { ok: false, error: "Artifact exceeds size limit" };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) {
    return { ok: false, error: "Artifact exceeds size limit" };
  }
  return { ok: true, buffer: buf, contentType: ct };
}

export type IngestResult =
  | { ok: true; storageKey: string; publicUrl: string | null }
  | { ok: false; error: string; skipped?: boolean };

/**
 * Download a provider URL and copy into R2 under `furniture-studio/<userId>/<pieceId>/...`.
 */
export async function ingestProviderUrlToR2(args: {
  userId: string;
  pieceId: string;
  sourceUrl: string;
  kind: "image" | "glb";
}): Promise<IngestResult> {
  const max = args.kind === "glb" ? MAX_GLB_BYTES : MAX_IMAGE_BYTES;
  const fallbackExt = args.kind === "glb" ? "glb" : "png";
  const ext = extFromUrl(args.sourceUrl, fallbackExt);
  const name = args.kind === "image" ? `preview.${ext}` : `model.${ext}`;
  const storageKey = `furniture-studio/${args.userId}/${args.pieceId}/${name}`;

  const fetched = await fetchWithLimit(args.sourceUrl, max);
  if (!fetched.ok) return fetched;

  let contentType = fetched.contentType;
  if (!contentType || contentType === "application/octet-stream") {
    contentType =
      args.kind === "glb"
        ? "model/gltf-binary"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "webp"
            ? "image/webp"
            : "image/png";
  }

  const put = await putObjectBuffer({
    storageKey,
    body: fetched.buffer,
    contentType,
  });
  if (!put.ok) {
    return { ok: false, error: put.error };
  }
  return {
    ok: true,
    storageKey,
    publicUrl: put.publicUrl ?? publicUrlForStorageKey(storageKey),
  };
}
