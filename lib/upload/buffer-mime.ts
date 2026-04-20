/** Whether the file extension plausibly matches the declared MIME type. */
export function filenameConsistentWithMime(
  filename: string,
  mime: string,
): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const m = mime.toLowerCase();
  if (ext === "jpg" || ext === "jpeg")
    return m === "image/jpeg" || m === "image/jpg";
  if (ext === "png") return m === "image/png";
  if (ext === "webp") return m === "image/webp";
  if (ext === "heic" || ext === "heif")
    return m === "image/heic" || m === "image/heif";
  if (ext === "pdf") return m === "application/pdf";
  return false;
}

/**
 * Best-effort MIME validation from file header bytes (do not trust Content-Type alone).
 */
export function mimeMatchesDeclaredContent(
  buffer: Buffer,
  declaredMime: string,
): { ok: true } | { ok: false; reason: string } {
  if (buffer.length < 12) {
    return { ok: false, reason: "File too small" };
  }

  const d = declaredMime.toLowerCase();

  if (d === "image/jpeg" || d === "image/jpg") {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { ok: true };
    }
    return { ok: false, reason: "JPEG magic bytes mismatch" };
  }

  if (d === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((b, i) => buffer[i] === b)) return { ok: true };
    return { ok: false, reason: "PNG magic bytes mismatch" };
  }

  if (d === "image/webp") {
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { ok: true };
    }
    return { ok: false, reason: "WebP magic bytes mismatch" };
  }

  if (d === "image/heic" || d === "image/heif") {
    const brand = buffer.subarray(4, 12).toString("ascii");
    if (
      brand.includes("ftyp") &&
      (brand.includes("heic") ||
        brand.includes("heix") ||
        brand.includes("mif1"))
    ) {
      return { ok: true };
    }
    if (
      buffer.length >= 12 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    ) {
      return { ok: true };
    }
    return { ok: false, reason: "HEIC/HEIF signature not recognized" };
  }

  if (d === "application/pdf") {
    if (buffer.subarray(0, 5).toString() === "%PDF-") return { ok: true };
    return { ok: false, reason: "PDF magic bytes mismatch" };
  }

  return { ok: false, reason: `No content sniff rule for ${declaredMime}` };
}
