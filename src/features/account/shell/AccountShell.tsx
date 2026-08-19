import type { ReactNode } from "react";
import { AccountShellClient } from "./AccountShellClient";

type AccountShellProps = {
  user: {
    email: string;
    displayName: string | null;
    imageUrl?: string | null;
  };
  children: ReactNode;
  className?: string;
  commerceEnabled: boolean;
};

/**
 * Server Account shell: session user + route children.
 * Children are painted (no longer discarded).
 */
export function AccountShell({
  user,
  children,
  className,
  commerceEnabled,
}: AccountShellProps) {
  return (
    <AccountShellClient
      user={user}
      commerceEnabled={commerceEnabled}
      {...(className !== undefined ? { className } : {})}
    >
      {children}
    </AccountShellClient>
  );
}
