/** True when the app shell (header, footer, right nav) should be hidden — quiz flows and nested routes. */
export function isStyleExplorerPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  return (
    pathname === "/style" ||
    pathname.startsWith("/style/") ||
    pathname === "/quiz" ||
    pathname.startsWith("/quiz/") ||
    pathname === "/budget" ||
    pathname.startsWith("/budget/")
  );
}
