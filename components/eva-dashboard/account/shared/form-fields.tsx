"use client";

import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Eyebrow } from "./eyebrow";
import { SectionCard } from "./section-card";

/* ── FormSection ───────────────────────────────────────────── */

export function FormSection({
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <SectionCard padding="lg" className="mb-5">
      <div className="border-border mb-5 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          )}
          <h2 className="text-foreground text-xl leading-tight font-[var(--font-manrope)] tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </SectionCard>
  );
}

/* ── Field wrapper ─────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  layout = "stacked",
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  layout?: "stacked" | "inline";
}) {
  if (layout === "inline") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <label
            htmlFor={htmlFor}
            className="text-foreground text-sm font-medium"
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          {hint && (
            <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
          )}
          {error && <p className="text-destructive mt-0.5 text-xs">{error}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    );
  }
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-muted-foreground mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  );
}

/* ── TextInput ─────────────────────────────────────────────── */

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <input
      {...rest}
      className={`font-ui block h-10 w-full border px-3 text-sm transition-colors outline-none ${className}`}
      style={{
        background: "var(--input)",
        borderColor: "var(--border-strong)",
        color: "var(--foreground)",
        ...style,
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLInputElement).style.borderColor =
          "var(--primary)";
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLInputElement).style.borderColor =
          "var(--border-strong)";
        rest.onBlur?.(e);
      }}
    />
  );
}

/* ── Textarea ──────────────────────────────────────────────── */

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", rows = 3, style, ...rest } = props;
  return (
    <textarea
      rows={rows}
      {...rest}
      className={`font-ui block w-full border px-3 py-2 text-sm transition-colors outline-none ${className}`}
      style={{
        background: "var(--input)",
        borderColor: "var(--border-strong)",
        color: "var(--foreground)",
        ...style,
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLTextAreaElement).style.borderColor =
          "var(--primary)";
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLTextAreaElement).style.borderColor =
          "var(--border-strong)";
        rest.onBlur?.(e);
      }}
    />
  );
}

/* ── Select ────────────────────────────────────────────────── */

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, style, ...rest } = props;
  return (
    <select
      {...rest}
      className={`font-ui block h-10 w-full border px-3 text-sm transition-colors outline-none ${className}`}
      style={{
        background: "var(--input)",
        borderColor: "var(--border-strong)",
        color: "var(--foreground)",
        ...style,
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLSelectElement).style.borderColor =
          "var(--primary)";
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLSelectElement).style.borderColor =
          "var(--border-strong)";
        rest.onBlur?.(e);
      }}
    >
      {children}
    </select>
  );
}

/* ── Toggle ────────────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`focus-visible:ring-primary/30 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none ${
        checked ? "bg-primary border-primary" : "bg-muted border-border"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`bg-card pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ── Radio cards (large, touch-friendly) ───────────────────── */

export function RadioCards<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`border p-3 text-left transition-colors ${
              active
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="text-foreground text-sm font-medium">{o.label}</div>
            {o.description && (
              <div className="text-muted-foreground mt-0.5 text-xs">
                {o.description}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
