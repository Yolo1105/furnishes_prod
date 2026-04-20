import { isAuthMarketingSplitPath } from "@/lib/site/auth-marketing-paths";
import { isStyleExplorerPath } from "@/lib/style-explorer-route";

/**
 * When true, the Furnishes workspace rail (`SidebarProvider` + fixed rail/panel) may mount
 * for signed-in marketing pages. Disabled on style explorer, quiz, and auth split routes.
 */
export function isMarketingWorkspaceRailEnabled(
  pathname: string | null,
): boolean {
  if (!pathname) return false;
  if (isStyleExplorerPath(pathname)) return false;
  if (isAuthMarketingSplitPath(pathname)) return false;
  return true;
}
