"use client";

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, CardContent } from "@/components/ui";
import {
  MODEL_IDS,
  MODEL_META,
  PROMPT_EXAMPLES,
  QUALITY_HINTS,
  QUALITY_LABELS,
  QUALITY_ORDER,
  type ModelId,
  type QualityTier,
} from "./constants";
import { ImageGenSectionLabel } from "./image-gen-section-label";

export type ImageGenGenerateCenterSettingsProps = {
  running: boolean;
  onPromptChange: (value: string) => void;
  quality: QualityTier;
  onQualityChange: (q: QualityTier) => void;
  models: Set<ModelId>;
  onToggleModel: (id: ModelId) => void;
  modelsHint: string;
  progressLabel: string;
  streamHint: string;
  hasCompletedRow: boolean;
};

/**
 * Generation options shown in the center column (equal width with left + Eva).
 * Prompt stays on the left rail; examples, quality, models, and progress live here.
 */
export function ImageGenGenerateCenterSettings({
  running,
  onPromptChange,
  quality,
  onQualityChange,
  models,
  onToggleModel,
  modelsHint,
  progressLabel,
  streamHint,
  hasCompletedRow,
}: ImageGenGenerateCenterSettingsProps) {
  return (
    <div className="min-w-0 space-y-5">
      <section>
        <ImageGenSectionLabel>Try an example</ImageGenSectionLabel>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {PROMPT_EXAMPLES.map((ex) => (
            <Button
              key={ex}
              type="button"
              variant="outline"
              size="sm"
              disabled={running}
              className="h-auto flex-row items-start justify-start gap-2 py-2.5 text-left text-[11px] font-normal whitespace-normal"
              onClick={() => onPromptChange(ex)}
            >
              <Sparkles className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="font-body min-w-0 flex-1 text-pretty break-words">
                {ex}
              </span>
            </Button>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="min-w-0">
          <ImageGenSectionLabel>Quality</ImageGenSectionLabel>
          <p className="text-muted-foreground font-body mb-2 text-[11px] leading-relaxed break-words">
            Fast / Balanced / High — pick the trade-off between wait time and
            fidelity.
          </p>
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            {QUALITY_ORDER.map((q) => (
              <Button
                key={q}
                type="button"
                variant="outline"
                onClick={() => onQualityChange(q)}
                className={cn(
                  "h-auto min-h-[3.25rem] flex-col items-stretch justify-center gap-0.5 px-2 py-2 text-left text-[11px] font-normal whitespace-normal",
                  quality === q &&
                    "border-primary bg-[var(--eva-studio-tint-strong)]",
                )}
              >
                <span className="font-ui w-full font-medium break-words">
                  {QUALITY_LABELS[q]}
                </span>
                <span className="text-muted-foreground font-body w-full text-[9px] leading-tight font-normal break-words">
                  {q === "fast" ? "~10s" : q === "balanced" ? "~45s" : "~90s"}
                </span>
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground font-body text-[11px] leading-relaxed break-words">
            {QUALITY_HINTS[quality]}
          </p>
        </section>

        <section className="min-w-0">
          <ImageGenSectionLabel>Models</ImageGenSectionLabel>
          <div className="flex flex-col gap-1">
            {MODEL_IDS.map((id) => {
              const checked = models.has(id);
              const m = MODEL_META[id];
              return (
                <Button
                  key={id}
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleModel(id);
                  }}
                  className={cn(
                    "h-auto w-full justify-start gap-2 rounded-none border px-2.5 py-2 font-normal",
                    checked
                      ? "border-primary/30 bg-[var(--eva-studio-tint-soft)]"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-none border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-[var(--card)]",
                    )}
                  >
                    {checked ? (
                      <span className="text-[8px] font-bold">✓</span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-ui block text-[12px] break-words">
                      {m.name}{" "}
                      <span className="text-muted-foreground text-[10px]">
                        {m.tag}
                      </span>
                    </span>
                    <span className="text-muted-foreground block text-[10px] break-words">
                      {m.meta}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    ${m.cost.toFixed(3)}
                  </span>
                </Button>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">{modelsHint}</p>
        </section>
      </div>

      <section>
        <ImageGenSectionLabel>Progress</ImageGenSectionLabel>
        <Card className="shadow-none">
          <CardContent className="p-3">
            {running ? (
              <div className="flex gap-2">
                <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
                <div>
                  <p className="font-ui text-[12px] font-medium">
                    {progressLabel}
                  </p>
                  {streamHint ? (
                    <p className="text-muted-foreground font-body mt-1 text-[11px]">
                      {streamHint}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground font-body text-[12px]">
                {hasCompletedRow
                  ? "Ready for another run or a new variation."
                  : "Run Generate to create a reference image and 3D draft."}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
