export function accountDisplayParts(
  displayName: string | null | undefined,
  email: string,
): { full: string; first: string; av: string } {
  const full =
    (displayName && displayName.trim()) ||
    (email ? email.split("@")[0] : "") ||
    "there";
  const first = full.trim().split(/\s+/)[0] || "there";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const av =
    parts.length >= 2
      ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
      : (parts[0] || "F").slice(0, 1).toUpperCase();
  return { full, first, av };
}
