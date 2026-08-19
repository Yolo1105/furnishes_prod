"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AccountShellUser = {
  email: string;
  displayName: string | null;
  imageUrl?: string | null;
};

const AccountShellUserContext = createContext<AccountShellUser | null>(null);

export function AccountShellUserProvider({
  user,
  children,
}: {
  user: AccountShellUser;
  children: ReactNode;
}) {
  return (
    <AccountShellUserContext.Provider value={user}>
      {children}
    </AccountShellUserContext.Provider>
  );
}

export function useAccountShellUser(): AccountShellUser {
  const user = useContext(AccountShellUserContext);
  if (!user) {
    throw new Error("useAccountShellUser must be used within AccountShell");
  }
  return user;
}
