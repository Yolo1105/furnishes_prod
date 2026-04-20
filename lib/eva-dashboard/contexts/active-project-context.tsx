"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { apiGet, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";

const STORAGE_KEY = "furnishes.activeProjectId.v1";

export type ProjectListItem = {
  id: string;
  title: string;
  room: string;
  workflowStage: string;
  updatedAt: string;
  /** Persisted Eva thread for this project, when set. */
  activeConversationId: string | null;
};

type ActiveProjectContextValue = {
  activeProjectId: string | null;
  /** Resolved row from `projects` when `activeProjectId` is set. */
  activeProject: ProjectListItem | null;
  setActiveProjectId: (id: string | null) => void;
  projects: ProjectListItem[];
  refreshProjects: () => Promise<void>;
  creating: boolean;
  createProject: (input: {
    title: string;
    room: string;
    description?: string;
    roomType?: string;
  }) => Promise<{ id: string } | null>;
};

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(
  null,
);

export function ActiveProjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status: sessionStatus } = useSession();
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    null,
  );
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "" || v === "null") setActiveProjectIdState(null);
      else if (v) setActiveProjectIdState(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Only hits GET /api/projects when NextAuth reports a signed-in session (avoids 401 noise for guests on /chatbot). */
  const refreshProjects = useCallback(async () => {
    if (sessionStatus !== "authenticated") {
      setProjects([]);
      return;
    }
    try {
      const data = await apiGet<{ projects: ProjectListItem[] }>(
        API_ROUTES.projects,
      );
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    }
  }, [sessionStatus]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (sessionStatus !== "unauthenticated") return;
    setProjects([]);
    setActiveProjectId(null);
  }, [sessionStatus, setActiveProjectId]);

  const createProject = useCallback(
    async (input: {
      title: string;
      room: string;
      description?: string;
      roomType?: string;
    }) => {
      if (sessionStatus !== "authenticated") return null;
      setCreating(true);
      try {
        const data = await apiPost<{ project: { id: string } }>(
          API_ROUTES.projects,
          {
            title: input.title,
            room: input.room,
            description: input.description ?? "",
            roomType: input.roomType,
          },
        );
        await refreshProjects();
        return data.project;
      } catch {
        return null;
      } finally {
        setCreating(false);
      }
    },
    [refreshProjects, sessionStatus],
  );

  const activeProject = useMemo(
    () =>
      activeProjectId
        ? (projects.find((p) => p.id === activeProjectId) ?? null)
        : null,
    [activeProjectId, projects],
  );

  const value = useMemo(
    () => ({
      activeProjectId,
      activeProject,
      setActiveProjectId,
      projects,
      refreshProjects,
      creating,
      createProject,
    }),
    [
      activeProjectId,
      activeProject,
      setActiveProjectId,
      projects,
      refreshProjects,
      creating,
      createProject,
    ],
  );

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject(): ActiveProjectContextValue {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) {
    throw new Error(
      "useActiveProject must be used within ActiveProjectProvider",
    );
  }
  return ctx;
}

export function useActiveProjectOptional(): ActiveProjectContextValue | null {
  return useContext(ActiveProjectContext);
}
