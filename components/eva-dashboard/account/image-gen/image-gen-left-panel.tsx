"use client";

import type { KeyboardEvent } from "react";
import Image from "next/image";
import {
  Bookmark,
  Box,
  HelpCircle,
  History,
  LayoutGrid,
  Plus,
  View,
  X,
} from "lucide-react";
import { ARRANGE_MSG } from "@/lib/furniture-gen/arrange-room-messages";
import type { StudioPieceListItem } from "@/lib/furniture-gen/studio-piece-api";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  ScrollArea,
  SegmentedControl,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import {
  ARRANGE_SHAPE_PRESETS,
  ENV_PRESET_ORDER,
  ENVIRONMENT_HINTS,
  MODEL_META,
  type StudioTab,
} from "./constants";
import type { ArrangeRoomController } from "./use-arrange-room";
import { FilmstripThumbSvg } from "./furniture-svgs";
import type { FilmRow } from "@/types/furniture-session";
import { ImageGenSectionLabel } from "./image-gen-section-label";

export type ImageGenLeftPanelProps = {
  tab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  generateTabHelp: string;
  arrangeTabHelp: string;
  /** Prompt + generate flow */
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onClearPrompt: () => void;
  onRunGeneration: () => void;
  running: boolean;
  hasCompletedRow: boolean;
  recentPieces: StudioPieceListItem[];
  onAddRecentPiece: (p: StudioPieceListItem) => void;
  /** Arrange */
  arrange: ArrangeRoomController;
  glbCatalog: (FilmRow & { glbUrl: string })[];
  onRequestFreshGenerate: () => void;
  onOpenSaveDialog: () => void;
};

/**
 * Dedicated left rail for `/account/image-gen`: describe → quality → models → session tools,
 * plus a separate Arrange mode. Not shared with the generic Studio hub page.
 */
export function ImageGenLeftPanel({
  tab,
  onTabChange,
  generateTabHelp,
  arrangeTabHelp,
  prompt,
  onPromptChange,
  onPromptKeyDown,
  onClearPrompt,
  onRunGeneration,
  running,
  hasCompletedRow,
  recentPieces,
  onAddRecentPiece,
  arrange,
  glbCatalog,
  onRequestFreshGenerate,
  onOpenSaveDialog,
}: ImageGenLeftPanelProps) {
  return (
    <div className="bg-card flex h-full min-h-0 min-w-0 flex-col">
      <div className="border-border flex h-[60px] shrink-0 items-center justify-between border-b px-4 pt-2 pb-2">
        <SegmentedControl
          aria-label="Image generation mode"
          value={tab}
          onValueChange={onTabChange}
          options={[
            {
              value: "generate" as const,
              label: "Generate",
              icon: <Box className="h-3 w-3" />,
            },
            {
              value: "arrange" as const,
              label: "Arrange",
              icon: <LayoutGrid className="h-3 w-3" />,
            },
          ]}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {tab === "generate" ? generateTabHelp : arrangeTabHelp}
          </TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="account-sidebar-scroll min-h-0 flex-1">
        <div className="min-w-0 py-3 pr-3 pl-3 sm:pl-4">
          {tab === "generate" ? (
            <>
              <section className="pb-5">
                <ImageGenSectionLabel>Describe</ImageGenSectionLabel>
                <Card className="shadow-none">
                  <CardContent className="p-2.5">
                    <Textarea
                      value={prompt}
                      onChange={(e) => onPromptChange(e.target.value)}
                      onKeyDown={onPromptKeyDown}
                      placeholder="e.g. material, colour, style — one piece of furniture."
                      rows={4}
                      className="max-h-52 min-h-[5.5rem] border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                    <div className="border-border mt-2 flex items-center justify-between border-t pt-2">
                      <span className="text-muted-foreground font-body text-[11px]">
                        {prompt.length} / 400
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={onClearPrompt}
                          aria-label="Clear prompt"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void onRunGeneration()}
                          disabled={running}
                          className="gap-1.5 text-[11px] tracking-normal normal-case"
                        >
                          Generate <kbd className="opacity-80">⌘↵</kbd>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="pb-5">
                <ImageGenSectionLabel meta="· account">
                  Recent pieces
                </ImageGenSectionLabel>
                <p className="text-muted-foreground font-body mb-2 text-[11px]">
                  Reopen a prior generation — adds it to this session&apos;s
                  strip.
                </p>
                {recentPieces.length === 0 ? (
                  <p className="text-muted-foreground font-body text-[11px]">
                    No saved pieces yet. Finish a run to build your history.
                  </p>
                ) : (
                  <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
                    {recentPieces.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto w-full justify-start gap-2 py-2 text-left font-normal"
                        onClick={() => onAddRecentPiece(p)}
                      >
                        <History className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="font-ui block truncate text-[11px]">
                            {p.title}
                          </span>
                          <span className="text-muted-foreground line-clamp-1 text-[10px]">
                            {new Date(p.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </section>

              <section className="pb-6">
                <Button
                  type="button"
                  className="w-full tracking-normal normal-case"
                  size="lg"
                  onClick={() => void onRunGeneration()}
                  disabled={running}
                >
                  {hasCompletedRow ? "Regenerate" : "Generate"}
                </Button>
              </section>
            </>
          ) : (
            <>
              <section className="pb-5">
                <ImageGenSectionLabel>Room</ImageGenSectionLabel>
                <p className="text-muted-foreground font-body mb-2 text-[11px]">
                  Shape presets fill width and depth — edit values freely.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ARRANGE_SHAPE_PRESETS.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant="outline"
                      onClick={() => arrange.applyShapePreset(p.id)}
                      className={cn(
                        "h-auto flex-col items-start px-2 py-2 text-left text-[11px] font-normal",
                        arrange.roomShapeId === p.id &&
                          "border-primary bg-[var(--eva-studio-tint-strong)]",
                      )}
                    >
                      <span className="font-ui font-medium">{p.label}</span>
                      <span className="text-muted-foreground font-body">
                        {p.dim}
                      </span>
                    </Button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="room-width" variant="field">
                      Width (m)
                    </Label>
                    <Input
                      id="room-width"
                      value={arrange.roomWidthStr}
                      onChange={(e) => arrange.setRoomWidthStr(e.target.value)}
                      className={cn(
                        "text-[12px]",
                        arrange.roomDimensionValidation.widthError &&
                          "border-destructive",
                      )}
                      aria-invalid={Boolean(
                        arrange.roomDimensionValidation.widthError,
                      )}
                    />
                    {arrange.roomDimensionValidation.widthError ? (
                      <p className="text-destructive font-body text-[10px]">
                        {arrange.roomDimensionValidation.widthError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="room-depth" variant="field">
                      Depth (m)
                    </Label>
                    <Input
                      id="room-depth"
                      value={arrange.roomDepthStr}
                      onChange={(e) => arrange.setRoomDepthStr(e.target.value)}
                      className={cn(
                        "text-[12px]",
                        arrange.roomDimensionValidation.depthError &&
                          "border-destructive",
                      )}
                      aria-invalid={Boolean(
                        arrange.roomDimensionValidation.depthError,
                      )}
                    />
                    {arrange.roomDimensionValidation.depthError ? (
                      <p className="text-destructive font-body text-[10px]">
                        {arrange.roomDimensionValidation.depthError}
                      </p>
                    ) : null}
                  </div>
                </div>
                {arrange.roomWarnings.length > 0 ? (
                  <ul className="border-border bg-muted/40 mt-2 space-y-1 rounded-none border p-2">
                    {arrange.roomWarnings.map((w) => (
                      <li
                        key={w.id}
                        className="text-muted-foreground font-body text-[10px] leading-snug"
                      >
                        {w.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-muted-foreground font-ui mt-3 mb-1 text-[10px] font-medium tracking-wide uppercase">
                  Lighting
                </p>
                <div className="flex flex-wrap gap-1">
                  {ENV_PRESET_ORDER.map((env) => (
                    <Button
                      key={env}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => arrange.setEnvironment(env)}
                      className={cn(
                        "text-[10px] font-normal capitalize",
                        arrange.environment === env &&
                          "border-primary bg-[var(--eva-studio-tint-strong)]",
                      )}
                    >
                      {env}
                    </Button>
                  ))}
                </div>
                <p className="text-muted-foreground mt-2 text-[11px]">
                  {ENVIRONMENT_HINTS[arrange.environment]}
                </p>
              </section>

              <section className="pb-5">
                <ImageGenSectionLabel
                  meta={`· ${glbCatalog.length} generated · ${arrange.placedPieceIds.length} placed`}
                >
                  Your pieces
                </ImageGenSectionLabel>
                <p className="text-muted-foreground font-body mb-2 text-[11px]">
                  One tap places or removes a piece. Selected row is
                  highlighted.
                </p>
                <div className="flex flex-col gap-1">
                  {glbCatalog.length === 0 ? (
                    <div className="border-border bg-card rounded-none border border-dashed px-3 py-4 text-left">
                      <p className="text-foreground font-ui text-[12px] font-medium">
                        No pieces yet
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                        Generate a piece on the Generate tab first. When the 3D
                        draft is ready, return here to place it in the room.
                      </p>
                    </div>
                  ) : (
                    glbCatalog.map((row) => {
                      const placed = arrange.placedPieceIds.includes(row.key);
                      const failed = arrange.placementFailures[row.key];
                      const selected = arrange.selectedPieceId === row.key;
                      const title = row.pieceTitle?.trim()
                        ? `${row.pieceTitle.slice(0, 48)}${row.pieceTitle.length > 48 ? "…" : ""}`
                        : `Result ${String(row.badge).padStart(2, "0")} · ${MODEL_META[row.model].name}`;
                      const subtitle =
                        row.promptSnapshot?.trim() ||
                        "Generated piece — tap to place in the room.";
                      return (
                        <Button
                          key={row.key}
                          type="button"
                          variant="ghost"
                          onClick={() => arrange.togglePlacePiece(row.key)}
                          aria-pressed={selected}
                          className={cn(
                            "h-auto w-full justify-start gap-2 rounded-none border px-2 py-2 text-left font-normal",
                            placed &&
                              "border-primary/25 bg-[var(--eva-studio-row-placed)]",
                            !placed && failed && "border-destructive/60",
                            selected && "ring-primary/30 ring-2",
                          )}
                        >
                          <div className="border-border bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-none border">
                            {row.imageUrl ? (
                              <Image
                                src={row.imageUrl}
                                alt=""
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full">
                                <FilmstripThumbSvg variant={row.variant} />
                              </div>
                            )}
                          </div>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="font-ui block truncate text-[12px]">
                              {title}
                            </span>
                            <span className="text-muted-foreground line-clamp-2 block text-[10px] leading-snug">
                              {subtitle}
                            </span>
                            <span className="text-foreground mt-0.5 block text-[10px] font-medium">
                              {placed
                                ? (arrange.pieceHints[row.key] ??
                                  "In the room — tap to remove")
                                : failed
                                  ? failed
                                  : "Still unplaced — tap to add"}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {placed ? (
                              <X className="h-4 w-4" aria-hidden />
                            ) : (
                              <Plus className="h-4 w-4" aria-hidden />
                            )}
                          </span>
                        </Button>
                      );
                    })
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-[11px] font-normal"
                    disabled={
                      glbCatalog.length === 0 ||
                      !arrange.roomDimensionValidation.isValid
                    }
                    onClick={() => arrange.autoPlaceAll()}
                  >
                    Auto-place all
                  </Button>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-normal"
                      disabled={!arrange.selectedPieceId}
                      onClick={() => arrange.placeSelectedPiece()}
                    >
                      Place selected
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-normal"
                      disabled={!arrange.selectedPieceId}
                      onClick={() => arrange.removeSelectedPiece()}
                    >
                      Remove selected
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-[11px] font-normal"
                    onClick={() => arrange.resetLayout()}
                  >
                    Reset layout
                  </Button>
                </div>
              </section>

              <section className="pb-6">
                <ImageGenSectionLabel>Next action</ImageGenSectionLabel>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRequestFreshGenerate}
                  className="text-primary mt-1 w-full gap-2 border-dashed py-2 text-[11px] font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Generate another piece
                </Button>
                <Button
                  size="lg"
                  className="mt-3 w-full justify-between tracking-normal normal-case"
                  onClick={onOpenSaveDialog}
                  disabled={!arrange.saveReadiness.canSave}
                  title={arrange.saveReadiness.reasonIfBlocked ?? undefined}
                >
                  <Bookmark className="h-4 w-4" />
                  Save to my project
                </Button>
                <p className="text-muted-foreground mt-2 text-center text-[10px]">
                  {arrange.saveReadiness.canSave
                    ? ARRANGE_MSG.saveProjectReadyNote
                    : arrange.saveReadiness.reasonIfBlocked}
                </p>
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
