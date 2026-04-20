import { FalProvider } from "@/lib/furniture-gen/providers/fal";
import type { GenerationProvider } from "@/lib/furniture-gen/providers/interface";

export type ProviderName = "fal";

export function createProvider(
  name: ProviderName,
  apiKey?: string,
): GenerationProvider {
  switch (name) {
    case "fal":
      return new FalProvider(apiKey);
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown provider: ${exhaustive}`);
    }
  }
}

let _default: GenerationProvider | null = null;

export function defaultProvider(): GenerationProvider {
  if (!_default) {
    _default = createProvider("fal");
  }
  return _default;
}

export * from "@/lib/furniture-gen/providers/interface";
