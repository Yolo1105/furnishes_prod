import { API_ROUTES } from "@/lib/eva-dashboard/api/client";
import { CHAT_IMAGE_UPLOAD_MIME_TYPES } from "@/lib/upload/chat-image-mime-types";
import {
  UPLOAD_MAX_BYTES,
  uploadMaxSizeMegabytes,
} from "@/lib/upload/upload-limits";

const ALLOWED_IMAGE_MIME_TYPES = new Set<string>(CHAT_IMAGE_UPLOAD_MIME_TYPES);

export type StudioChatImageUploadFailureReason =
  | "unsupported_type"
  | "too_large"
  | "sign_failed"
  | "put_failed"
  | "confirm_failed"
  | "network";

export type StudioChatImageUploadResult =
  | {
      ok: true;
      url: string;
      storageKey: string;
      fileRecordId: string;
      mimeType: string;
      filename: string;
    }
  | {
      ok: false;
      reason: StudioChatImageUploadFailureReason;
      message: string;
    };

type SignResponse = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string | null;
  expiresAt: number;
};

type ConfirmResponse = {
  id: string;
  url: string;
  filename: string;
  storageKey: string;
};

async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<
  { ok: true; data: T } | { ok: false; status: number; message: string }
> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : response.statusText;
    return { ok: false, status: response.status, message };
  }
  return { ok: true, data: json as T };
}

/**
 * Upload a chat image via presigned PUT + confirm, scoped to a conversation.
 */
export async function uploadStudioChatImageArtifact(args: {
  conversationId: string;
  file: File;
  signal?: AbortSignal;
}): Promise<StudioChatImageUploadResult> {
  const { conversationId, file, signal } = args;
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      reason: "unsupported_type",
      message: "Use a JPEG, PNG, WebP, or HEIC image.",
    };
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      reason: "too_large",
      message: `Image must be ${uploadMaxSizeMegabytes()}MB or smaller.`,
    };
  }

  const filename =
    file.name.trim().length > 0
      ? file.name
      : `upload.${mimeType.split("/")[1] ?? "jpg"}`;

  const signed = await postJson<SignResponse>(
    API_ROUTES.uploadsSign,
    {
      prefix: "uploads",
      filename,
      mimeType,
      sizeBytes: file.size,
      conversationId,
    },
    signal,
  );
  if (!signed.ok) {
    return {
      ok: false,
      reason: "sign_failed",
      message: signed.message,
    };
  }

  let putResponse: Response;
  try {
    putResponse = await fetch(signed.data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": mimeType },
      signal,
    });
  } catch {
    return {
      ok: false,
      reason: "network",
      message: "Could not upload to storage.",
    };
  }
  if (!putResponse.ok) {
    return {
      ok: false,
      reason: "put_failed",
      message: "Upload to storage failed.",
    };
  }

  const confirmed = await postJson<ConfirmResponse>(
    API_ROUTES.uploadsConfirm,
    {
      storageKey: signed.data.storageKey,
      conversationId,
      filename,
    },
    signal,
  );
  if (!confirmed.ok) {
    return {
      ok: false,
      reason: "confirm_failed",
      message: confirmed.message,
    };
  }

  return {
    ok: true,
    url: confirmed.data.url,
    storageKey: confirmed.data.storageKey,
    fileRecordId: confirmed.data.id,
    mimeType,
    filename: confirmed.data.filename,
  };
}
