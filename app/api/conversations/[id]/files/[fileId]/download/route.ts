import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";

export const dynamic = "force-dynamic";

function resolveFetchUrl(storedUrl: string, requestUrl: string): string {
  const u = storedUrl.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const origin = new URL(requestUrl).origin;
  return u.startsWith("/") ? `${origin}${u}` : `${origin}/${u}`;
}

/**
 * Server-mediated download: streams the underlying asset so the browser does not
 * depend on third-party CORS for saving files. Fails honestly if the URL is gone or blocked.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: conversationId, fileId } = await params;
  const { error, status } = await requireConversationAccess(
    conversationId,
    req,
  );
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }

  const file = await prisma.file.findFirst({
    where: { id: fileId, conversationId },
  });
  if (!file) {
    return apiError(ErrorCodes.NOT_FOUND, "File not found", 404);
  }

  const target = file.url?.trim() ?? "";
  if (!target) {
    return apiError(
      ErrorCodes.NOT_FOUND,
      "This file has no storage location.",
      404,
    );
  }

  const fetchUrl = resolveFetchUrl(target, req.url);
  if (!fetchUrl) {
    return apiError(ErrorCodes.NOT_FOUND, "Invalid file URL", 404);
  }

  let upstream: Response;
  try {
    upstream = await fetch(fetchUrl, {
      redirect: "follow",
      headers: {
        Accept: "*/*",
      },
      cache: "no-store",
    });
  } catch (e) {
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error
        ? `Could not reach file: ${e.message}`
        : "Could not reach file storage.",
      502,
    );
  }

  if (!upstream.ok) {
    const hint =
      upstream.status === 403 || upstream.status === 401
        ? "Access denied — the link may be expired or private."
        : upstream.status === 404
          ? "File not found at storage."
          : `Upstream returned ${upstream.status}.`;
    const statusOut = upstream.status >= 500 ? 502 : 404;
    return apiError(
      upstream.status >= 500 ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.NOT_FOUND,
      hint,
      statusOut,
    );
  }

  const buf = await upstream.arrayBuffer();
  const contentType =
    upstream.headers.get("content-type") ??
    file.type ??
    "application/octet-stream";

  const safeName = file.filename.replace(/[\r\n"]/g, "_");
  const disp = `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`;

  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disp,
      "Cache-Control": "private, no-store",
    },
  });
}
