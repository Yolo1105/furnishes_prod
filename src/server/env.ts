const REGISTRY = new Map<string, { kind: string; fallback: unknown }>();

export function registeredEnvKeys(): string[] {
  return [...REGISTRY.keys()].sort();
}

function read(
  name: string,
  source: NodeJS.Dict<string | undefined> = process.env,
): string | undefined {
  const raw = source[name];
  return raw == null ? undefined : String(raw);
}

export function envInt(
  name: string,
  fallback: number,
  source: NodeJS.Dict<string | undefined> = process.env,
): number {
  REGISTRY.set(name, { kind: "int", fallback });
  const text = read(name, source);
  if (text == null || text.trim() === "") {
    return fallback;
  }
  const raw = Number(text);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

/** Milliseconds / timeouts — zero and negatives fall back. */
export function envMs(
  name: string,
  fallback: number,
  source: NodeJS.Dict<string | undefined> = process.env,
): number {
  REGISTRY.set(name, { kind: "ms", fallback });
  const raw = Number(read(name, source) ?? String(fallback));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

export function envBool(
  name: string,
  fallback = false,
  source: NodeJS.Dict<string | undefined> = process.env,
): boolean {
  REGISTRY.set(name, { kind: "bool", fallback });
  const raw = read(name, source)?.trim();
  if (raw == null || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}
