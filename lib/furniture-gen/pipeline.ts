import { defaultProvider } from "@/lib/furniture-gen/providers";
import type { GenerationProvider } from "@/lib/furniture-gen/providers/interface";
import { ProviderError } from "@/lib/furniture-gen/providers/interface";
import type { GenerateOptions, Progress } from "@/types/generation";

export type { GenerateOptions, Progress } from "@/types/generation";

const EXPANSION_SYSTEM = `Rewrite the user's furniture description into a precise, compact studio-photo prompt for an image generator.

CRITICAL rules (every output MUST satisfy all of these, appended at the end):
- full object clearly visible, entire piece centered in frame
- isolated on a solid pure white background
- three-quarter view showing front, one side, and part of the top
- uniform soft even lighting with minimal shadows, no cast shadows
- flat simple textures with no gradients, no intricate patterns
- all parts distinct and non-overlapping
- no transparency, no reflections, no glass
- high contrast between object and background
- no text, no watermark, no people, no logo

Output ONLY the final prompt — no preamble, no quotes, no explanations.`;

export async function* generate(
  userInput: string,
  provider: GenerationProvider = defaultProvider(),
  opts: GenerateOptions = {},
): AsyncGenerator<Progress> {
  try {
    yield { stage: "expanding", message: "Understanding your description..." };

    let expanded: string;
    try {
      expanded = await provider.complete({
        system: EXPANSION_SYSTEM,
        user: userInput,
      });
    } catch {
      expanded = fallbackTemplate(userInput);
    }

    yield { stage: "expanding", message: "Generating 2D image..." };

    const imageResult = await provider.textToImage({
      prompt: expanded,
      size: "square_hd",
      quality: opts.imageQuality ?? "balanced",
    });
    const imageUrl = imageResult.url;

    yield { stage: "image_ready", imageUrl };

    const meshQuality = opts.meshQuality ?? "balanced";
    const meshModel = opts.meshModel ?? "hunyuan3d";
    const meshMsg =
      meshModel === "meshy"
        ? "Building 3D with Meshy (often several minutes)..."
        : meshModel === "triposr"
          ? "Building 3D with TripoSR (fast, ~5–15s)..."
          : meshModel === "stable3d"
            ? "Building 3D with Trellis (~20–90s)..."
            : meshQuality === "fast"
              ? "Building 3D model (lighter settings, ~20–45s)..."
              : meshQuality === "high"
                ? "Building 3D model (high quality, ~45–90s)..."
                : "Building 3D model (~30–60s)...";
    yield { stage: "meshing", message: meshMsg };

    const meshResult = await provider.imageToMesh({
      imageUrl,
      textured: true,
      quality: meshQuality,
      meshModel: opts.meshModel ?? "hunyuan3d",
    });

    yield { stage: "done", imageUrl, glbUrl: meshResult.url };
  } catch (err) {
    const message =
      err instanceof ProviderError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    yield { stage: "error", message };
  }
}

function fallbackTemplate(userInput: string): string {
  return (
    `studio product photograph of ${userInput}, ` +
    "full object clearly visible, entire piece centered in frame, " +
    "isolated on a solid pure white background, three-quarter view, " +
    "uniform soft even lighting with minimal shadows, flat simple textures, " +
    "all parts distinct and non-overlapping, no transparency, no reflections, " +
    "high contrast between object and background, no text"
  );
}
