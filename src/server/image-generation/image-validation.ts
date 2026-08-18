function looksLikePng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function looksLikeJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function looksLikeWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export function validateGeneratedImageBytes(
  bytes: Uint8Array,
  mimeType: string,
): { ok: true; mimeType: string } | { ok: false; message: string } {
  const max = 8 * 1024 * 1024;
  if (bytes.byteLength === 0 || bytes.byteLength > max) {
    return { ok: false, message: "Generated image size is invalid." };
  }
  if (mimeType === "image/png" && looksLikePng(bytes)) {
    return { ok: true, mimeType };
  }
  if (mimeType === "image/jpeg" && looksLikeJpeg(bytes)) {
    return { ok: true, mimeType };
  }
  if (mimeType === "image/webp" && looksLikeWebp(bytes)) {
    return { ok: true, mimeType };
  }
  if (looksLikePng(bytes)) return { ok: true, mimeType: "image/png" };
  if (looksLikeJpeg(bytes)) return { ok: true, mimeType: "image/jpeg" };
  if (looksLikeWebp(bytes)) return { ok: true, mimeType: "image/webp" };
  return { ok: false, message: "Generated image signature is invalid." };
}
