"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ChatPreferenceCategory } from "../preference-types";
import { splitPreferenceValues } from "./preference-values";

function capT(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

type PreferenceOriginLabel = "user" | "chat";

const EXAMPLE_VISIBLE = 3;
const EXAMPLE_CYCLE_MS = 8500;
const EXAMPLE_FADE_MS = 320;

function RotatingExample({
  examples,
  staggerMs = 0,
}: {
  examples: string[];
  staggerMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const windowSize = Math.min(EXAMPLE_VISIBLE, examples.length);

  useEffect(() => {
    if (examples.length <= windowSize) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let fadeTimer: number | undefined;
    let cycleTimer: number | undefined;
    const start = window.setTimeout(() => {
      cycleTimer = window.setInterval(() => {
        setVisible(false);
        fadeTimer = window.setTimeout(() => {
          setIndex((prev) => (prev + windowSize) % examples.length);
          setVisible(true);
        }, EXAMPLE_FADE_MS);
      }, EXAMPLE_CYCLE_MS);
    }, staggerMs);
    return () => {
      window.clearTimeout(start);
      if (cycleTimer) window.clearInterval(cycleTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [examples, staggerMs, windowSize]);

  if (examples.length === 0) return null;

  const shown: string[] = [];
  for (let i = 0; i < windowSize; i += 1) {
    const item = examples[(index + i) % examples.length];
    if (item) shown.push(item);
  }

  return (
    <span
      className={`wf-pref__ex${visible ? " is-on" : ""}`}
      aria-hidden="true"
    >
      e.g. {shown.join(" · ")}
    </span>
  );
}

export function PreferenceBlock({
  category,
  icon,
  title,
  placeholder,
  examples,
  index,
  value,
  origin,
  disabled,
  canViewSource,
  onAdd,
  onEdit,
  onRemoveValue,
  onViewSource,
}: {
  category: ChatPreferenceCategory;
  icon: ReactNode;
  title: string;
  placeholder: string;
  examples: string[];
  index: number;
  value: string | null;
  origin: PreferenceOriginLabel | null;
  disabled?: boolean;
  canViewSource?: boolean;
  onAdd: (category: ChatPreferenceCategory) => void;
  onEdit: (category: ChatPreferenceCategory, values: string[]) => void;
  onRemoveValue: (category: ChatPreferenceCategory, value: string) => void;
  onViewSource?: (category: ChatPreferenceCategory) => void;
}) {
  const values = splitPreferenceValues(value);

  return (
    <div
      className={`wf-pref${values.length ? " done" : ""}${disabled ? " is-disabled" : ""}`}
    >
      <div className="wf-pref__h">
        {icon}
        <span className="wf-pref__t">{title}</span>
        <span className="wf-pidx">[0{index + 1}]</span>
        {origin ? (
          <span
            className={`wf-pref__origin wf-pref__origin--${origin}`}
            title={
              origin === "user"
                ? "You set this preference"
                : "Captured from chat and saved to memory"
            }
          >
            {origin === "user" ? "You" : "Chat"}
          </span>
        ) : null}
      </div>
      <div className="wf-pref__body wf-pchips">
        {values.length === 0 ? (
          <button
            type="button"
            className="wf-pref__ph"
            disabled={disabled}
            title="Add preference"
            onClick={() => onAdd(category)}
          >
            <span className="wf-pref__ph-main">{placeholder}</span>
            <RotatingExample examples={examples} staggerMs={index * 450} />
          </button>
        ) : (
          <>
            {values.map((item) => (
              <span key={item.toLowerCase()} className="wf-psel">
                <button
                  type="button"
                  className="wf-psel__v"
                  data-psrc
                  disabled={disabled}
                  title="Edit preferences"
                  onClick={() => onEdit(category, values)}
                >
                  {capT(item)}
                </button>
                <button
                  type="button"
                  className="wf-psel__x"
                  title={`Remove ${item}`}
                  disabled={disabled}
                  onClick={() => onRemoveValue(category, item)}
                >
                  ✕
                </button>
              </span>
            ))}
            {canViewSource && onViewSource ? (
              <button
                type="button"
                className="wf-psel__src"
                title="View source"
                disabled={disabled}
                onClick={() => onViewSource(category)}
              >
                Source
              </button>
            ) : null}
            <button
              type="button"
              className="wf-pref__add"
              disabled={disabled}
              title="Add another"
              onClick={() => onAdd(category)}
            >
              + Add
            </button>
          </>
        )}
      </div>
    </div>
  );
}
