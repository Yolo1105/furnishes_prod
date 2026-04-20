import { fal } from "@fal-ai/client";
import type {
  GenerationProvider,
  ImageToMeshParams,
  LlmCompleteParams,
  TextToImageParams,
} from "@/lib/furniture-gen/providers/interface";
import { ProviderError } from "@/lib/furniture-gen/providers/interface";
import { withRetry } from "@/lib/furniture-gen/utils/retry";

export class FalProvider implements GenerationProvider {
  readonly name = "fal";
  private configured = false;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.FAL_KEY;
    if (key) {
      fal.config({ credentials: key });
      this.configured = true;
    }
  }

  private ensureConfigured() {
    if (!this.configured && !process.env.FAL_KEY) {
      throw new ProviderError({
        message: "FAL_KEY is not set. Add it to .env.local.",
        code: 401,
        provider: this.name,
        stage: "unknown",
        retryable: false,
      });
    }
  }

  private translateError(
    err: unknown,
    stage: "llm" | "image" | "mesh",
  ): ProviderError {
    const base = err instanceof Error ? err : new Error(String(err));
    const msg = base.message ?? "";
    const match = msg.match(/\b(\d{3})\b/);
    const code = match ? Number(match[1]) : 0;
    const retryable = code === 429 || code >= 500 || /timeout|econn/i.test(msg);
    return new ProviderError({
      message: `[fal:${stage}] ${msg || "request failed"}`,
      code,
      provider: this.name,
      stage,
      retryable,
      cause: err,
    });
  }

  async complete(params: LlmCompleteParams): Promise<string> {
    this.ensureConfigured();
    const model = params.model ?? "anthropic/claude-3.5-sonnet";

    try {
      const result = await withRetry(
        () =>
          fal.subscribe("fal-ai/any-llm", {
            input: {
              model,
              system_prompt: params.system,
              prompt: params.user,
              ...(params.temperature !== undefined
                ? { temperature: params.temperature }
                : {}),
            },
          }),
        { maxAttempts: 3, initialDelayMs: 2000 },
      );

      const out = (result.data as { output?: string })?.output?.trim() ?? "";
      if (!out) {
        throw new ProviderError({
          message: "LLM returned empty output.",
          provider: this.name,
          stage: "llm",
          retryable: false,
        });
      }
      return out;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw this.translateError(err, "llm");
    }
  }

  async textToImage(params: TextToImageParams): Promise<{ url: string }> {
    this.ensureConfigured();
    const endpoint =
      params.quality === "high"
        ? "fal-ai/flux-pro/v1.1"
        : params.quality === "balanced"
          ? "fal-ai/flux/dev"
          : "fal-ai/flux/schnell";

    const steps =
      params.steps ??
      (params.quality === "high" ? 28 : params.quality === "balanced" ? 20 : 4);

    try {
      const result = await withRetry(
        () =>
          fal.subscribe(endpoint, {
            input: {
              prompt: params.prompt,
              image_size: params.size ?? "square_hd",
              num_inference_steps: steps,
              num_images: 1,
              enable_safety_checker: false,
            },
          }),
        { maxAttempts: 3, initialDelayMs: 2000 },
      );

      const images = (result.data as { images?: Array<{ url: string }> })
        ?.images;
      const url = images?.[0]?.url;
      if (!url) {
        throw new ProviderError({
          message: "Image generation returned no image URL.",
          provider: this.name,
          stage: "image",
          retryable: false,
        });
      }
      return { url };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw this.translateError(err, "image");
    }
  }

  async imageToMesh(params: ImageToMeshParams): Promise<{ url: string }> {
    this.ensureConfigured();
    const meshModel = params.meshModel ?? "hunyuan3d";
    const quality = params.quality ?? "balanced";

    try {
      switch (meshModel) {
        case "triposr":
          return await this.meshTriposr(params.imageUrl);
        case "meshy":
          return await this.meshMeshy(params.imageUrl, quality);
        case "stable3d":
          return await this.meshTrellis(params.imageUrl, quality);
        case "hunyuan3d":
        default:
          return await this.meshHunyuan(
            params.imageUrl,
            params.textured ?? true,
            quality,
          );
      }
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw this.translateError(err, "mesh");
    }
  }

  /** TripoSR — fast feed-forward mesh (no textures). */
  private async meshTriposr(imageUrl: string): Promise<{ url: string }> {
    const endpoint = "fal-ai/triposr";
    const result = await withRetry(
      () =>
        fal.subscribe(endpoint, {
          input: { image_url: imageUrl },
        }),
      { maxAttempts: 2, initialDelayMs: 5000, maxDelayMs: 15000 },
    );
    const data = result.data as {
      model_mesh?: { url?: string };
      model_url?: string;
    };
    const url = data.model_mesh?.url ?? data.model_url;
    if (!url) {
      throw new ProviderError({
        message: `3D generation returned no GLB URL from ${endpoint}.`,
        provider: this.name,
        stage: "mesh",
        retryable: false,
      });
    }
    return { url };
  }

  /** Hunyuan3D v2 — textured GLB; quality maps to steps + octree resolution. */
  private async meshHunyuan(
    imageUrl: string,
    textured: boolean,
    quality: "fast" | "balanced" | "high",
  ): Promise<{ url: string }> {
    const endpoint = "fal-ai/hunyuan3d/v2";
    const { num_inference_steps, octree_resolution } =
      quality === "fast"
        ? { num_inference_steps: 36, octree_resolution: 224 }
        : quality === "high"
          ? { num_inference_steps: 58, octree_resolution: 320 }
          : { num_inference_steps: 48, octree_resolution: 256 };

    const result = await withRetry(
      () =>
        fal.subscribe(endpoint, {
          input: {
            input_image_url: imageUrl,
            textured_mesh: textured,
            num_inference_steps,
            octree_resolution,
          },
        }),
      { maxAttempts: 2, initialDelayMs: 5000, maxDelayMs: 15000 },
    );

    const data = result.data as { model_mesh?: { url?: string } };
    const url = data.model_mesh?.url;
    if (!url) {
      throw new ProviderError({
        message: `3D generation returned no GLB URL from ${endpoint}.`,
        provider: this.name,
        stage: "mesh",
        retryable: false,
      });
    }
    return { url };
  }

  /** Meshy v6 — production textures (long-running). */
  private async meshMeshy(
    imageUrl: string,
    quality: "fast" | "balanced" | "high",
  ): Promise<{ url: string }> {
    const endpoint = "fal-ai/meshy/v6/image-to-3d";
    const target_polycount =
      quality === "fast" ? 22_000 : quality === "high" ? 48_000 : 30_000;

    const result = await withRetry(
      () =>
        fal.subscribe(endpoint, {
          input: {
            image_url: imageUrl,
            target_polycount,
            should_texture: true,
            enable_safety_checker: false,
          },
        }),
      { maxAttempts: 2, initialDelayMs: 8000, maxDelayMs: 20000 },
    );

    const data = result.data as {
      model_glb?: { url?: string };
      model_urls?: { glb?: { url?: string } };
    };
    const url = data.model_glb?.url ?? data.model_urls?.glb?.url;
    if (!url) {
      throw new ProviderError({
        message: `3D generation returned no GLB URL from ${endpoint}.`,
        provider: this.name,
        stage: "mesh",
        retryable: false,
      });
    }
    return { url };
  }

  /**
   * Trellis on Fal — used for the “Stable3D” Studio option (single-image 3D, non-Hunyuan).
   */
  private async meshTrellis(
    imageUrl: string,
    quality: "fast" | "balanced" | "high",
  ): Promise<{ url: string }> {
    const endpoint = "fal-ai/trellis";
    const texture_size: "512" | "1024" | "2048" =
      quality === "fast" ? "512" : quality === "high" ? "2048" : "1024";
    const slat_sampling_steps =
      quality === "fast" ? 10 : quality === "high" ? 14 : 12;

    const result = await withRetry(
      () =>
        fal.subscribe(endpoint, {
          input: {
            image_url: imageUrl,
            texture_size,
            slat_sampling_steps,
            ss_sampling_steps: slat_sampling_steps,
          },
        }),
      { maxAttempts: 2, initialDelayMs: 5000, maxDelayMs: 15000 },
    );

    const data = result.data as { model_mesh?: { url?: string } };
    const url = data.model_mesh?.url;
    if (!url) {
      throw new ProviderError({
        message: `3D generation returned no GLB URL from ${endpoint}.`,
        provider: this.name,
        stage: "mesh",
        retryable: false,
      });
    }
    return { url };
  }
}
