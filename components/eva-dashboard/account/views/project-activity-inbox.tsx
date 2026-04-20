"use client";

import { Bell, Loader2 } from "lucide-react";
import {
  Button,
  LinkButton,
  SectionCard,
  Eyebrow,
} from "@/components/eva-dashboard/account/shared";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { useInAppNotifications } from "@/lib/eva-dashboard/hooks/use-in-app-notifications";
import { PHASE_7_UI_COPY } from "@/lib/eva/projects/summary-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProjectActivityInbox() {
  const { sorted, loading, error, busyId, markRead } = useInAppNotifications({
    take: 60,
  });

  async function handleMarkRead(id: string) {
    const ok = await markRead(id);
    if (!ok) toast.error(PHASE_7_UI_COPY.notificationsPatchError);
  }

  return (
    <SectionCard padding="lg">
      <Eyebrow>{PHASE_7_UI_COPY.notificationsInboxTitle}</Eyebrow>
      <p
        className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        {PHASE_7_UI_COPY.notificationsInboxSubtitle}
      </p>

      {loading ? (
        <div className="text-muted-foreground mt-8 flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {PHASE_7_UI_COPY.notificationsLoading}
        </div>
      ) : error ? (
        <p className="text-destructive mt-6 text-sm">{error}</p>
      ) : sorted.length === 0 ? (
        <p
          className="text-muted-foreground mt-8 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {PHASE_7_UI_COPY.notificationsEmpty}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((n) => (
            <li
              key={n.id}
              className={cn(
                "border-border flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between",
                !n.readAt && "bg-muted/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Bell className="text-primary h-4 w-4 shrink-0" />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {n.title}
                  </span>
                  {n.projectTitle ? (
                    <span
                      className="text-muted-foreground truncate text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      · {n.projectTitle}
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-1 text-xs leading-snug whitespace-pre-wrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {n.body}
                </p>
                <p
                  className="mt-2 text-[10px] tracking-wide uppercase tabular-nums opacity-70"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {new Date(n.createdAt).toLocaleString()}
                  {n.readAt
                    ? ` · ${PHASE_7_UI_COPY.notificationsReadSuffix}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!n.readAt ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={busyId === n.id}
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    {busyId === n.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      PHASE_7_UI_COPY.notificationsMarkRead
                    )}
                  </Button>
                ) : null}
                {n.projectId ? (
                  <LinkButton
                    href={accountPaths.project(n.projectId)}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    {PHASE_7_UI_COPY.notificationsOpenProject}
                  </LinkButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
