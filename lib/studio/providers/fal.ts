/**
 * fal.ai provider implementations.
 *
 * One file, all adapters. Each adapter wraps a specific fal.ai endpoint
 * and conforms to ImageGenerator or MeshGenerator from ./interface.
 *
 * License landscape (read before changing providers):
 *   - Hunyuan3D 2.1: Tencent Community License. EXCLUDES EU/UK/SK.
 *     1M MAU requires separate license from Tencent.
 *   - TRELLIS: MIT (drop-in replacement, no territory limits)
 *   - TripoSR: MIT (preview-tier, <1s, no PBR)
 *   - Step1X-3D: Apache-2.0 (specialty — stylized textures)
 *   - Meshy: proprietary (cleanest topology, slowest, most expensive)
 *   - Flux Schnell: fal.ai's terms, standard commercial use
 *
 * Env vars consumed:
 *   FAL_KEY or FAL_API_KEY — the fal.ai API key (required for real calls)
 *   MESH_PREVIEW_PROVIDER  — default "triposr"
 *   MESH_HERO_PROVIDER     — default "hunyuan3d" (set to "trellis" for EU compliance)
 *
 * If the key is missing, every adapter throws "FAL_API_KEY not configured"
 * — the orchestrator catches this and emits an `error` SSE event so the
 * chat surface shows a friendly "service offline" message instead of a
 * raw fetch failure.
 */

import "server-only";

import type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageGenerator,
  MeshGenerationConfig,
  MeshGenerationResult,
  MeshGenerator,
} from "./interface";

// ----------------------------------------------------------------------
// fal.ai client setup
// ----------------------------------------------------------------------

// Accept either FAL_API_KEY or FAL_KEY (fal.ai's own setup docs use the
// short form; we accept both so users following the official docs don't
// silently fail).
const FAL_API_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
const FAL_BASE_URL = "https://fal.run";

if (!FAL_API_KEY && process.env.NODE_ENV !== "test") {
  console.warn(
    "[providers/fal] FAL_API_KEY not set — generation calls will fail until configured.",
  );
}

/** Shape returned by fal.ai endpoints. Different endpoints fill in
 *  different subsets — we read whatever the specific call produces. */
type FalGenerationResponse = {
  images?: Array<{ url: string; width: number; height: number }>;
  model_mesh?: { url: string; file_size?: number };
  mesh?: { url: string };
  pbr_model?: { url: string };
  seed?: number;
};

/** Single-shot synchronous fal.ai call. fal.run is the synchronous
 *  endpoint — it blocks until the job completes (or times out at the
 *  fal.ai side). We use this for both image + mesh because the studio
 *  flow needs the result inline; the SSE streaming happens at our
 *  layer (orchestrator yields events between these calls), not at
 *  fal.ai's. */
async function callFalSync<T = FalGenerationResponse>(
  endpoint: string,
  payload: unknown,
): Promise<T> {
  if (!FAL_API_KEY) {
    throw new Error("FAL_API_KEY not configured");
  }

  const response = await fetch(`${FAL_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    // Truncate the upstream error so we don't blow out our error
    // payload when fal.ai returns a multi-KB stack trace. The
    // friendly-error mapper later strips the rest.
    throw new Error(
      `fal.ai ${endpoint} returned ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  return response.json() as Promise<T>;
}

// ======================================================================
// Text-to-image: Flux Schnell
// ======================================================================

export class FluxSchnellGenerator implements ImageGenerator {
  readonly name = "fal-ai/flux/schnell";

  async generate(
    config: ImageGenerationConfig,
  ): Promise<ImageGenerationResult> {
    const payload = {
      prompt: config.prompt,
      image_size: imageSizeToFalFormat(
        config.image_size ?? 1024,
        config.aspect ?? "square",
      ),
      // 4 inference steps is Flux Schnell's design point — it's a
      // distilled model that converges fast. More steps don't improve
      // quality and cost more.
      num_inference_steps: 4,
      num_images: 1,
      seed: config.seed ?? Math.floor(Math.random() * 1_000_000),
      enable_safety_checker: true,
    };

    const start = Date.now();
    const response = await callFalSync("fal-ai/flux/schnell", payload);
    const duration = Date.now() - start;

    const img = response.images?.[0];
    if (!img) {
      throw new Error("Flux returned no images");
    }

    console.log(`[flux/schnell] generated in ${duration}ms`);
    return {
      url: img.url,
      width: img.width,
      height: img.height,
      seed: response.seed ?? 0,
    };
  }
}

/** Translate our typed aspect ratio to fal.ai's named-preset format.
 *  fal.ai doesn't accept arbitrary widths/heights for Flux — only
 *  these named sizes. Anything else falls back to square_hd. */
function imageSizeToFalFormat(
  _size: 512 | 1024 | 2048,
  aspect: ImageGenerationConfig["aspect"],
): string {
  if (aspect === "landscape_4_3") return "landscape_4_3";
  if (aspect === "landscape_16_9") return "landscape_16_9";
  if (aspect === "portrait_4_3") return "portrait_4_3";
  return "square_hd";
}

// ======================================================================
// Image-to-3D: Hunyuan3D 2.1
// ======================================================================
// Best quality at hero tier, but Tencent license excludes EU/UK/SK.
// For those regions, set MESH_HERO_PROVIDER=trellis.

export class Hunyuan3DGenerator implements MeshGenerator {
  readonly name = "fal-ai/hunyuan3d/v2";
  readonly license = "tencent" as const;
  readonly supports_pbr = true;

  async generate(config: MeshGenerationConfig): Promise<MeshGenerationResult> {
    const tuning = this.getTuningForTier(config.tier);

    const payload = {
      input_image_url: config.image_url,
      num_inference_steps: tuning.num_inference_steps,
      guidance_scale: 5.0,
      octree_resolution: tuning.octree_resolution,
      textured_mesh: true,
      seed: config.seed ?? Math.floor(Math.random() * 1_000_000),
    };

    const start = Date.now();
    const response = await callFalSync("fal-ai/hunyuan3d/v2", payload);
    const duration = Date.now() - start;

    const glbUrl = response.model_mesh?.url ?? response.mesh?.url ?? null;
    if (!glbUrl) {
      throw new Error("Hunyuan3D returned no mesh URL");
    }

    return {
      glb_url: glbUrl,
      provider: this.name,
      duration_ms: duration,
      seed: response.seed,
    };
  }

  /** Tier → tuning mapping. Octree resolution drives detail; inference
   *  steps drive quality. Numbers are calibrated against the studio's
   *  rendering envelope (we don't want 5M-face meshes blowing up the
   *  R3F pipeline). */
  private getTuningForTier(tier: MeshGenerationConfig["tier"]): {
    num_inference_steps: number;
    octree_resolution: number;
  } {
    switch (tier) {
      case "preview":
        return { num_inference_steps: 5, octree_resolution: 256 };
      case "balanced":
        return { num_inference_steps: 10, octree_resolution: 384 };
      case "hero":
        return { num_inference_steps: 15, octree_resolution: 512 };
    }
  }
}

// ======================================================================
// Image-to-3D: TRELLIS (MIT license, drop-in for Hunyuan3D)
// ======================================================================
// Use this in EU/UK/SK deployments. Quality is comparable to Hunyuan3D
// for most furniture categories; slightly different topology.

export class TrellisGenerator implements MeshGenerator {
  readonly name = "fal-ai/trellis";
  readonly license = "mit" as const;
  readonly supports_pbr = true;

  async generate(config: MeshGenerationConfig): Promise<MeshGenerationResult> {
    const tuning = this.getTuningForTier(config.tier);

    const payload = {
      image_url: config.image_url,
      ss_guidance_strength: 7.5,
      ss_sampling_steps: tuning.sampling_steps,
      slat_guidance_strength: 3.0,
      slat_sampling_steps: tuning.sampling_steps,
      mesh_simplify: tuning.simplify,
      texture_size: tuning.texture_size,
      seed: config.seed ?? Math.floor(Math.random() * 1_000_000),
    };

    const start = Date.now();
    const response = await callFalSync("fal-ai/trellis", payload);
    const duration = Date.now() - start;

    const glbUrl = response.model_mesh?.url ?? response.mesh?.url ?? null;
    if (!glbUrl) {
      throw new Error("TRELLIS returned no mesh URL");
    }

    return {
      glb_url: glbUrl,
      provider: this.name,
      duration_ms: duration,
      seed: response.seed,
    };
  }

  private getTuningForTier(tier: MeshGenerationConfig["tier"]) {
    switch (tier) {
      case "preview":
        return { sampling_steps: 8, simplify: 0.97, texture_size: 512 };
      case "balanced":
        return { sampling_steps: 12, simplify: 0.95, texture_size: 1024 };
      case "hero":
        return { sampling_steps: 20, simplify: 0.9, texture_size: 1024 };
    }
  }
}

// ======================================================================
// Image-to-3D: TripoSR (MIT, <1s preview)
// ======================================================================
// The "see something fast" path. Topology is rough, no PBR — but
// generation completes in under a second, perfect for the streaming
// placeholder-mesh pattern.

export class TripoSRGenerator implements MeshGenerator {
  readonly name = "fal-ai/triposr";
  readonly license = "mit" as const;
  readonly supports_pbr = false;

  async generate(config: MeshGenerationConfig): Promise<MeshGenerationResult> {
    const payload = {
      image_url: config.image_url,
      output_format: "glb",
      do_remove_background: true,
      foreground_ratio: 0.85,
      mc_resolution: 256,
    };

    const start = Date.now();
    const response = await callFalSync("fal-ai/triposr", payload);
    const duration = Date.now() - start;

    const glbUrl = response.model_mesh?.url ?? response.mesh?.url ?? null;
    if (!glbUrl) {
      throw new Error("TripoSR returned no mesh URL");
    }

    return {
      glb_url: glbUrl,
      provider: this.name,
      duration_ms: duration,
    };
  }
}

// ======================================================================
// Image-to-3D: Meshy (proprietary, high-quality topology)
// ======================================================================
// Cleanest topology for retopo-aware downstream pipelines, but slowest
// and most expensive. Use for hero-tier when topology cleanliness
// matters more than detail.

export class MeshyGenerator implements MeshGenerator {
  readonly name = "fal-ai/meshy-v4";
  readonly license = "proprietary" as const;
  readonly supports_pbr = true;

  async generate(config: MeshGenerationConfig): Promise<MeshGenerationResult> {
    const payload: Record<string, unknown> = {
      image_url: config.image_url,
      ai_model: "meshy-4",
      topology: "triangle",
      target_polycount:
        config.max_faces && config.max_faces > 0 ? config.max_faces : 15000,
      should_texture: true,
      enable_pbr: true,
    };
    if (typeof config.seed === "number") payload.seed = config.seed;

    const start = Date.now();
    const response = await callFalSync("fal-ai/meshy/image-to-3d", payload);
    const duration = Date.now() - start;

    const glbUrl =
      response.pbr_model?.url ??
      response.model_mesh?.url ??
      response.mesh?.url ??
      null;
    if (!glbUrl) {
      throw new Error("Meshy returned no mesh URL");
    }

    return {
      glb_url: glbUrl,
      provider: this.name,
      duration_ms: duration,
    };
  }
}

// ======================================================================
// Image-to-3D: Step1X-3D (Apache-2.0, stylized textures)
// ======================================================================
// Specialty model — produces stylized rather than photoreal output.
// Useful for the "Japandi minimalist" / "anime-style" prompts where
// realism would feel wrong.

export class Step1X3DGenerator implements MeshGenerator {
  readonly name = "fal-ai/step1x-3d";
  readonly license = "apache" as const;
  readonly supports_pbr = false;

  async generate(config: MeshGenerationConfig): Promise<MeshGenerationResult> {
    const payload = {
      image_url: config.image_url,
      guidance_scale: 7.5,
      num_inference_steps: config.tier === "hero" ? 50 : 25,
      seed: config.seed ?? Math.floor(Math.random() * 1_000_000),
    };

    const start = Date.now();
    const response = await callFalSync("fal-ai/step1x-3d", payload);
    const duration = Date.now() - start;

    const glbUrl = response.model_mesh?.url ?? response.mesh?.url ?? null;
    if (!glbUrl) {
      throw new Error("Step1X-3D returned no mesh URL");
    }

    return {
      glb_url: glbUrl,
      provider: this.name,
      duration_ms: duration,
      seed: response.seed,
    };
  }
}

// ======================================================================
// Provider registry
// ======================================================================

export type MeshProviderName =
  | "hunyuan3d"
  | "trellis"
  | "triposr"
  | "step1x3d"
  | "meshy";

/** Construct a mesh generator instance from its registry name. The
 *  switch is exhaustive over MeshProviderName so adding a new provider
 *  here forces a compile-time update. */
export function getMeshGenerator(name: MeshProviderName): MeshGenerator {
  switch (name) {
    case "hunyuan3d":
      return new Hunyuan3DGenerator();
    case "trellis":
      return new TrellisGenerator();
    case "triposr":
      return new TripoSRGenerator();
    case "step1x3d":
      return new Step1X3DGenerator();
    case "meshy":
      return new MeshyGenerator();
  }
}

export function getImageGenerator(name: "flux-schnell"): ImageGenerator {
  switch (name) {
    case "flux-schnell":
      return new FluxSchnellGenerator();
  }
}
