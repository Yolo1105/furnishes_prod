"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import {
  DEFAULT_PROJECT_PACKET_KIND_FOR_SEND,
  PHASE_7_UI_COPY,
  PROJECT_PACKET_DELIVERY_CHANNEL_LABEL,
  PROJECT_PACKET_DELIVERY_CHANNEL_SELECT_ORDER,
  PROJECT_PACKET_KIND_LABEL,
  PROJECT_PACKET_KIND_SELECT_ORDER,
  projectPacketChannelDisplay,
  projectPacketKindDisplay,
} from "@/lib/eva/projects/summary-constants";
import { apiGet, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SendRow = {
  id: string;
  kind: string;
  channel: string;
  recipientEmail: string | null;
  sentAt: string;
};

type Props = {
  projectId: string;
  summary: ProjectSummaryDto;
  className?: string;
  onSent?: () => void;
};

export function ProjectPacketSendPanel({
  projectId,
  summary,
  className,
  onSent,
}: Props) {
  const P = PHASE_7_UI_COPY;
  const [sends, setSends] = useState<SendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kind, setKind] = useState<string>(
    DEFAULT_PROJECT_PACKET_KIND_FOR_SEND,
  );
  const [channel, setChannel] = useState<string>(
    PROJECT_PACKET_DELIVERY_CHANNEL_SELECT_ORDER[0] ?? "recorded_download",
  );

  const load = useCallback(() => {
    setLoading(true);
    apiGet<{ sends: SendRow[] }>(API_ROUTES.projectPacketSends(projectId))
      .then((r) => setSends(r.sends ?? []))
      .catch(() => setSends([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Prefer API history; fall back to summary snapshot only when the dedicated list is empty. */
  const displayRows = useMemo((): SendRow[] => {
    if (sends.length > 0) return sends;
    return (summary.recentPacketSends ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      channel: r.channel,
      recipientEmail: null,
      sentAt: r.sentAt,
    }));
  }, [sends, summary.recentPacketSends]);

  const handleSend = async () => {
    setSubmitting(true);
    try {
      await apiPost(API_ROUTES.projectPacketSends(projectId), {
        kind,
        channel,
        recipientEmail: null,
      });
      toast.success(P.packetWorkspaceSendSuccessToast);
      load();
      onSent?.();
    } catch {
      toast.error(P.packetWorkspaceSendErrorToast);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={cn("border-border bg-card rounded-lg border p-4", className)}
    >
      <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
        {P.packetWorkspaceAuditEyebrow}
      </p>
      <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
        {P.packetWorkspaceAuditIntro}
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[10px] font-medium uppercase">
          {P.packetKindLabel}
          <select
            className="border-border bg-background text-foreground rounded border px-2 py-1.5 text-xs font-normal normal-case"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {PROJECT_PACKET_KIND_SELECT_ORDER.map((k) => (
              <option key={k} value={k}>
                {PROJECT_PACKET_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium uppercase">
          {P.packetChannelLabel}
          <select
            className="border-border bg-background text-foreground rounded border px-2 py-1.5 text-xs font-normal normal-case"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {PROJECT_PACKET_DELIVERY_CHANNEL_SELECT_ORDER.map((c) => (
              <option key={c} value={c}>
                {PROJECT_PACKET_DELIVERY_CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={submitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {P.packetWorkspaceRecordSendCta}
        </button>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
          {P.packetWorkspaceSendHistoryHeading}
        </p>
        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
            {P.notificationsLoading}
          </p>
        ) : displayRows.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {P.packetWorkspaceSendEmpty}
          </p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
            {displayRows.map((s) => (
              <li
                key={s.id}
                className="border-border flex flex-wrap justify-between gap-2 border-b border-dashed pb-2 last:border-0"
              >
                <span className="text-foreground font-medium">
                  {projectPacketKindDisplay(s.kind)}
                </span>
                <span className="text-muted-foreground">
                  {projectPacketChannelDisplay(s.channel)}
                </span>
                <span className="text-muted-foreground w-full text-[10px]">
                  {new Date(s.sentAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-muted-foreground mt-3 text-[10px] leading-snug">
        {P.packetWorkspaceResendHint}
      </p>
    </section>
  );
}
