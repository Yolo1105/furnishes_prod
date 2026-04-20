"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { PHASE_7_UI_COPY } from "@/lib/eva/projects/summary-constants";

export type InAppNotificationRow = {
  id: string;
  projectId: string | null;
  projectTitle: string | null;
  category: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type UseInAppNotificationsOptions = {
  take?: number;
};

/**
 * Shared load + mark-read for in-app notifications (account inbox + workspace Activity).
 */
export function useInAppNotifications({
  take = 60,
}: UseInAppNotificationsOptions = {}) {
  const [rows, setRows] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void apiGet<{ notifications: InAppNotificationRow[] }>(
      API_ROUTES.notifications(take),
    )
      .then((r) => setRows(r.notifications ?? []))
      .catch(() => {
        setRows([]);
        setError(PHASE_7_UI_COPY.notificationsLoadError);
      })
      .finally(() => setLoading(false));
  }, [take]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const au = a.readAt ? 1 : 0;
      const bu = b.readAt ? 1 : 0;
      if (au !== bu) return au - bu;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rows]);

  const markRead = useCallback(async (id: string): Promise<boolean> => {
    setBusyId(id);
    try {
      await apiPatch(API_ROUTES.notification(id), { read: true });
      setRows((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      return true;
    } catch {
      return false;
    } finally {
      setBusyId(null);
    }
  }, []);

  return {
    rows,
    sorted,
    loading,
    error,
    busyId,
    load,
    markRead,
  };
}
