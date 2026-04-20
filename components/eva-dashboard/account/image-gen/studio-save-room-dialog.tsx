"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/eva-dashboard/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/eva-dashboard/ui/select";
import type { ProjectListItem } from "@/lib/eva-dashboard/contexts/active-project-context";

export type StudioSaveRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Target project — controlled from parent (synced with active project on open). */
  projectId: string | null;
  onProjectIdChange: (id: string | null) => void;
  projects: ProjectListItem[];
  shapeLabel: string;
  widthLabel: string;
  depthLabel: string;
  environmentLabel: string;
  placedCount: number;
  unplacedCount: number;
  onConfirm: () => void | Promise<void>;
  submitting: boolean;
  canSubmit: boolean;
  blockReason?: string | null;
};

export function StudioSaveRoomDialog({
  open,
  onOpenChange,
  projectId,
  onProjectIdChange,
  projects,
  shapeLabel,
  widthLabel,
  depthLabel,
  environmentLabel,
  placedCount,
  unplacedCount,
  onConfirm,
  submitting,
  canSubmit,
  blockReason,
}: StudioSaveRoomDialogProps) {
  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none border shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-ui text-[15px] font-semibold">
            Save room to project
          </DialogTitle>
          <DialogDescription className="font-body text-[13px] leading-relaxed">
            This writes your current room layout and placed generated pieces
            into the selected project. Unplaced pieces in the session list are
            not saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-[13px]">
          {projects.length === 0 ? (
            <p className="text-muted-foreground font-body">
              You don&apos;t have a project yet.{" "}
              <Link
                href="/account/projects"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Create a project
              </Link>{" "}
              first, then return here to save.
            </p>
          ) : (
            <div className="space-y-1.5">
              <span className="text-muted-foreground font-ui text-[10px] font-medium tracking-wide uppercase">
                Target project
              </span>
              <Select
                value={projectId ?? undefined}
                onValueChange={(v) => onProjectIdChange(v)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full max-w-none rounded-none"
                >
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {projects.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className="rounded-none"
                    >
                      <span className="font-ui">{p.title}</span>
                      <span className="text-muted-foreground ml-2 text-[11px]">
                        · {p.room}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject ? (
                <p className="text-muted-foreground font-body text-[11px]">
                  Saving into{" "}
                  <span className="text-foreground font-medium">
                    {selectedProject.title}
                  </span>{" "}
                  ({selectedProject.room}).
                </p>
              ) : null}
            </div>
          )}

          <ul className="border-border bg-muted/30 font-body space-y-1.5 rounded-none border p-3 text-[12px]">
            <li>
              <span className="text-muted-foreground">Shape · </span>
              {shapeLabel}
            </li>
            <li>
              <span className="text-muted-foreground">Dimensions · </span>
              {widthLabel} × {depthLabel}
            </li>
            <li>
              <span className="text-muted-foreground">Lighting · </span>
              {environmentLabel}
            </li>
            <li>
              <span className="text-muted-foreground">Placed (saved) · </span>
              {placedCount}
            </li>
            <li>
              <span className="text-muted-foreground">
                Unplaced in session (excluded) ·{" "}
              </span>
              {unplacedCount}
            </li>
          </ul>

          {blockReason ? (
            <p className="text-destructive font-body text-[12px]">
              {blockReason}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none"
            disabled={!canSubmit || submitting || projects.length === 0}
            onClick={() => void onConfirm()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save to project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @internal sync project picker when dialog opens */
export function useSyncProjectPickerOnOpen(
  open: boolean,
  activeProjectId: string | null,
  projects: ProjectListItem[],
  setSelected: (id: string | null) => void,
) {
  useEffect(() => {
    if (!open) return;
    if (activeProjectId && projects.some((p) => p.id === activeProjectId)) {
      setSelected(activeProjectId);
    } else if (projects[0]) {
      setSelected(projects[0].id);
    } else {
      setSelected(null);
    }
  }, [open, activeProjectId, projects, setSelected]);
}
