"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { RightSidebar } from "@/components/site/right-sidebar";
import { isStyleExplorerPath } from "@/lib/style-explorer-route";

export type RightNavContextValue = {
  isSidebarOpen: boolean;
  isNavExpanded: boolean;
  activeSection: string;
  toggleJourneyMenu: () => void;
  onNavIconClick: (item: string) => void;
};

const RightNavContext = createContext<RightNavContextValue | null>(null);

export function useRightNav() {
  const ctx = useContext(RightNavContext);
  if (!ctx) {
    throw new Error("useRightNav must be used within RightNavProvider");
  }
  return ctx;
}

export function RightNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  const closeAll = useCallback(() => {
    setIsSidebarOpen(false);
    setActiveSection("");
    setIsNavExpanded(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      closeAll();
    });
  }, [pathname, closeAll]);

  const toggleJourneyMenu = useCallback(() => {
    closeAll();
    router.push("/account");
  }, [closeAll, router]);

  const onNavIconClick = useCallback(
    (item: string) => {
      if (activeSection === item && isSidebarOpen) {
        setIsSidebarOpen(false);
        setActiveSection("");
      } else {
        setActiveSection(item);
        setIsSidebarOpen(true);
      }
    },
    [activeSection, isSidebarOpen],
  );

  const value = useMemo(
    () => ({
      isSidebarOpen,
      isNavExpanded,
      activeSection,
      toggleJourneyMenu,
      onNavIconClick,
    }),
    [
      isSidebarOpen,
      isNavExpanded,
      activeSection,
      toggleJourneyMenu,
      onNavIconClick,
    ],
  );

  return (
    <RightNavContext.Provider value={value}>
      {children}
      {!isStyleExplorerPath(pathname) && <RightSidebar />}
    </RightNavContext.Provider>
  );
}
