import {
  createUpload,
  listUploads,
  MAX_UPLOAD_BYTES,
} from "@/server/uploads/service";
import {
  fromServiceResult,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/server/http";
import { prisma } from "@/server/db";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return jsonOk({ items: await listUploads(session.user.id) });
}

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES * 1.1) {
    return jsonError(413, "validation", "Maximum upload size is 5 MB.", {
      file: "Maximum upload size is 5 MB.",
    });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "validation", "Missing file.", {
      file: "Choose a file to upload.",
    });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const projectIdRaw = form.get("projectId");
  const projectId =
    typeof projectIdRaw === "string" && projectIdRaw.length > 0
      ? projectIdRaw
      : null;

  const result = await createUpload(session.user.id, {
    filename: file.name || "upload.bin",
    mimeType: file.type || "application/octet-stream",
    bytes,
    projectId,
  });

  if (!result.ok) {
    return fromServiceResult(result);
  }

  const upload = await prisma.upload.findUniqueOrThrow({
    where: { id: result.value.id },
    include: { project: { select: { name: true } } },
  });

  return jsonOk({
    id: upload.id,
    filename: upload.filename,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    status: upload.status,
    projectName: upload.project?.name ?? null,
    createdAt: upload.createdAt.toISOString(),
  });
}
