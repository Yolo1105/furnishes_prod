/**
 * One-off: resize wide images and re-encode JPEG/PNG/WebP under public/images.
 * Run: npm run images:optimize
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "public", "images");
const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return;

  const buf = await fs.readFile(filePath);
  const before = buf.length;
  let pipeline = sharp(buf);
  const meta = await pipeline.metadata();

  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
    });
  }

  let out;
  if (ext === ".jpg" || ext === ".jpeg") {
    out = await pipeline
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } else if (ext === ".png") {
    out = await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
  } else {
    out = await pipeline.webp({ quality: 82 }).toBuffer();
  }

  if (out.length <= before) {
    await fs.writeFile(filePath, out);
    console.log(
      path.relative(path.join(__dirname, ".."), filePath),
      `${before} → ${out.length} bytes`,
    );
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else await optimizeFile(full);
  }
}

try {
  await fs.access(ROOT);
} catch {
  console.log("No public/images directory — nothing to do.");
  process.exit(0);
}

await walk(ROOT);
console.log("images:optimize finished.");
