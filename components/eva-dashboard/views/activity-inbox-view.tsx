"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useActiveProject } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useInAppNotifications } from "@/lib/eva-dashboard/hooks/use-in-app-notifications";
import { PHASE_7_UI_COPY } from "@/lib/eva/projects/summary-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ActivityInboxView() {
  const { onItemClick } = useAppContext();
  const { setActiveProjectId } = useActiveProject();
  const { sorted, loading, error, busyId, markRead } = useInAppNotifications({
    take: 60,
  });

  const handleMarkRead = async (id: string) => {
    const ok = await markRead(id);
    if (!ok) toast.error(PHASE_7_UI_COPY.notificationsPatchError);
  };

  const openProject = (projectId: string | null) => {
    if (!projectId) return;
    setActiveProjectId(projectId);
    onItemClick("workspace", "Project");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-1">
      <header className="flex items-center gap-2">
        <Bell className="text-primary h-5 w-5" />
        <div>
          <h1 className="text-foreground text-base font-semibold">
            {PHASE_7_UI_COPY.workspaceActivityPageTitle}
          </h1>
          <p className="text-muted-foreground text-xs">
            {PHASE_7_UI_COPY.workspaceActivityPageSubtitle}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {PHASE_7_UI_COPY.notificationsLoading}
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {PHASE_7_UI_COPY.notificationsEmpty}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((n) => (
            <li
              key={n.id}
              className={cn(
                "border-border rounded-lg border p-3",
                n.readAt ? "bg-muted/15" : "bg-card",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                    {n.category}
                  </p>
                  <p className="text-foreground text-sm font-medium">
                    {n.title}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {n.body}
                  </p>
                  <p className="text-muted-foreground mt-2 text-[10px]">
                    {n.projectTitle && n.projectId ? (
                      <>
                        {PHASE_7_UI_COPY.notificationsProjectPrefix}:{" "}
                        <button
                          type="button"
                          className="text-primary font-medium underline"
                          onClick={() => openProject(n.projectId)}
                        >
                          {n.projectTitle}
                        </button>
                        {" · "}
                      </>
                    ) : null}
                    {new Date(n.createdAt).toLocaleString()}
                    {n.readAt
                      ? ` · ${PHASE_7_UI_COPY.notificationsReadSuffix}`
                      : ""}
                  </p>
                </div>
                {!n.readAt ? (
                  <button
                    type="button"
                    className="text-primary hover:bg-muted inline-flex shrink-0 items-center gap-1 rounded border border-transparent px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                    disabled={busyId === n.id}
                    onClick={() => void handleMarkRead(n.id)}
                    aria-label={PHASE_7_UI_COPY.notificationsMarkRead}
                  >
                    {busyId === n.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    )}
                    <span>{PHASE_7_UI_COPY.notificationsMarkRead}</span>
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
