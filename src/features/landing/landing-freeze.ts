import { LANDING_INTRO_SEEN_KEY } from "./landing-intro";

export const LANDING_FREEZE_KEY = "furnishes-landing-freeze-v3";
export const LANDING_FREEZE_STYLE_ID = "furnishes-landing-freeze-style";

const MAX_BYTES = 3_500_000;

/** Same stops as `--landing-stage-wash` — the live hero sits on this, not black. */
const STAGE_WASH: ReadonlyArray<readonly [number, string]> = [
  [0, "#e83200"],
  [0.08, "#ed3f00"],
  [0.16, "#f34d00"],
  [0.24, "#f95c00"],
  [0.32, "#fe6a02"],
  [0.38, "#ff7806"],
  [0.44, "#ff8a10"],
  [0.5, "#ff9c18"],
  [0.56, "#fda838"],
  [0.62, "#fab45c"],
  [0.68, "#f6c485"],
  [0.74, "#f2d2a6"],
  [0.84, "#ffeddf"],
  [1, "#ffeddf"],
];

/**
 * Runs before hydration. Injects a <style> in <head> — never mutates <html>
 * attributes, or React will report a hydration mismatch.
 * Overlay is the last house+wash frame, not a solid fill.
 */
export const LANDING_FREEZE_BOOT_SCRIPT = `(function(){
  try {
    if (location.pathname !== "/") return;
    // Only after this tab has already seen the intro (sessionStorage).
    if (sessionStorage.getItem("${LANDING_INTRO_SEEN_KEY}") !== "1") return;
    var data = sessionStorage.getItem("${LANDING_FREEZE_KEY}");
    if (!data || data.indexOf("data:image") !== 0) return;
    if (document.getElementById("${LANDING_FREEZE_STYLE_ID}")) return;
    var css = 'html::before{content:"";position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:url(' + JSON.stringify(data) + ') center / cover no-repeat;}';
    var style = document.createElement("style");
    style.id = "${LANDING_FREEZE_STYLE_ID}";
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {}
})();`;

export function freezePixelIsHouseContent(r: number, g: number, b: number) {
  if (r + g + b < 45) return false;
  const orangeDist = Math.abs(r - 232) + Math.abs(g - 50) + Math.abs(b - 0);
  if (orangeDist < 70) return false;
  return true;
}

function snapshotLooksLikeHouse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const samples = 36;
  let house = 0;
  let black = 0;
  for (let i = 0; i < samples; i++) {
    const x = Math.floor(((i * 97) % 80) * 0.01 * (width - 1));
    const y = Math.floor(((i * 53) % 80) * 0.01 * (height - 1));
    const pixel = ctx.getImageData(Math.max(0, x), Math.max(0, y), 1, 1).data;
    const r = pixel[0] ?? 0;
    const g = pixel[1] ?? 0;
    const b = pixel[2] ?? 0;
    if (r + g + b < 45) {
      black += 1;
      continue;
    }
    if (freezePixelIsHouseContent(r, g, b)) house += 1;
  }
  return house >= 8 && black < samples * 0.25;
}

export function drawLandingStageWash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  for (const [stop, color] of STAGE_WASH) {
    gradient.addColorStop(stop, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function saveLandingFreezeFromCanvas(canvas: HTMLCanvasElement) {
  if (typeof sessionStorage === "undefined") return;
  if (canvas.width < 8 || canvas.height < 8) return;
  try {
    const maxW = 1280;
    const scale = canvas.width > maxW ? maxW / canvas.width : 1;
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));
    const snap = document.createElement("canvas");
    snap.width = w;
    snap.height = h;
    const ctx = snap.getContext("2d");
    if (!ctx) return;
    drawLandingStageWash(ctx, w, h);
    ctx.drawImage(canvas, 0, 0, w, h);
    if (!snapshotLooksLikeHouse(ctx, w, h)) return;
    const url = snap.toDataURL("image/jpeg", 0.62);
    if (!url.startsWith("data:image") || url.length > MAX_BYTES) return;
    sessionStorage.setItem(LANDING_FREEZE_KEY, url);
  } catch {
    /* quota, tainted canvas, private mode */
  }
}

export function clearLandingFreezePaint() {
  if (typeof document === "undefined") return;
  document.getElementById(LANDING_FREEZE_STYLE_ID)?.remove();
}
