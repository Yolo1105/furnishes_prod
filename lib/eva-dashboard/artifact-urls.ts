/** Resolve same-origin paths to absolute URLs for img/fetch (client only). */
export function absoluteArtifactUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") {
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }
  return url;
}
