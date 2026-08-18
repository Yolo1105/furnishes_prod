import { getOwnedUpload, readUploadBytes } from "@/server/uploads/service";
import { jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ uploadId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { uploadId } = await params;
  const upload = await getOwnedUpload(session.user.id, uploadId);
  if (!upload) {
    return jsonError(404, "not_found", "Upload not found.");
  }
  const bytes = await readUploadBytes(upload.storageKey);
  const safe = upload.filename.replace(/[\r\n"]/g, "").slice(0, 200);
  const encoded = encodeURIComponent(safe);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": upload.mimeType,
      "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
      "content-length": String(bytes.byteLength),
    },
  });
}
