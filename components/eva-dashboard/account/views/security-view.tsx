"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Smartphone,
  Monitor,
  Check,
  AlertTriangle,
  Shield,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  Eyebrow,
  Button,
  StatusBadge,
  RightInspector,
  Field,
  TextInput,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { changePasswordAction } from "@/lib/actions/security";
import { relativeTime } from "@/lib/site/account/formatters";
import type { SecurityEvent, SessionRow } from "@/lib/site/account/types";

export function SecurityView({
  initialSessions,
  initialEvents,
}: {
  initialSessions?: SessionRow[];
  initialEvents?: SecurityEvent[];
} = {}) {
  const router = useRouter();
  const [isPwPending, startPwTransition] = useTransition();
  const [sessions, setSessions] = useState<SessionRow[]>(
    () => initialSessions ?? [],
  );
  const [events, setEvents] = useState<SecurityEvent[]>(
    () => initialEvents ?? [],
  );

  useEffect(() => {
    if (initialSessions !== undefined) setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    if (initialEvents !== undefined) setEvents(initialEvents);
  }, [initialEvents]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { toast } = useToast();

  const lastPasswordAt = events.find((e) => e.kind === "password-change")?.at;

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="SECURITY"
        title="Sign-in & security"
        subtitle="Manage your password and review where you are signed in."
      />

      {/* Password */}
      <SectionCard padding="lg" className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-muted border-border inline-flex h-10 w-10 items-center justify-center border">
              <Key className="text-foreground h-4 w-4" />
            </div>
            <div>
              <Eyebrow>PASSWORD</Eyebrow>
              <h3 className="text-foreground mt-1 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
                Change your password
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Last changed{" "}
                {lastPasswordAt ? relativeTime(lastPasswordAt) : "—"}. We
                recommend a passphrase of at least 12 characters.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
            Change password
          </Button>
        </div>
      </SectionCard>

      {/* 2FA — informational only; not configured in this workspace */}
      <SectionCard padding="lg" className="mb-5">
        <div className="flex items-start gap-3">
          <div className="bg-muted border-border inline-flex h-10 w-10 shrink-0 items-center justify-center border">
            <Shield className="text-foreground h-4 w-4" />
          </div>
          <div>
            <Eyebrow>TWO-FACTOR AUTHENTICATION</Eyebrow>
            <h3 className="text-foreground mt-1 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
              Not managed here
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              Two-factor authentication is not turned on or off from Furnishes
              Studio. If your organization enforces 2FA for this email, that
              policy is applied at your identity provider or sign-in path—not in
              this screen.
            </p>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              When in-app 2FA setup is available, it will appear here. Until
              then, use a strong, unique password.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Sessions */}
      <SectionCard padding="lg" className="mb-5">
        <div className="mb-4">
          <div>
            <Eyebrow>ACTIVE SESSIONS</Eyebrow>
            <h3 className="text-foreground mt-1 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
              Where you're signed in
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Active browser sessions from Auth.js. Per-session revoke is not
              exposed here yet.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No other sessions recorded.
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="bg-card border-border inline-flex h-9 w-9 items-center justify-center border">
                  {s.deviceLabel.toLowerCase().includes("phone") ||
                  s.deviceLabel.toLowerCase().includes("ipad") ? (
                    <Smartphone className="text-foreground h-4 w-4" />
                  ) : (
                    <Monitor className="text-foreground h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">
                      {s.deviceLabel}
                    </span>
                    {s.current && (
                      <StatusBadge variant="ok">THIS DEVICE</StatusBadge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {s.browser} · {s.city}, {s.country} · {s.ip}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs tabular-nums">
                  {relativeTime(s.lastActive)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Recent security events */}
      <SectionCard padding="lg">
        <Eyebrow>SECURITY EVENTS</Eyebrow>
        <h3 className="text-foreground mt-1 mb-4 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
          Recent activity
        </h3>

        <ul className="space-y-2">
          {events.length === 0 && (
            <li className="text-muted-foreground text-sm">
              No security events logged yet.
            </li>
          )}
          {events.map((e) => (
            <li
              key={e.id}
              className="border-border bg-muted/20 flex items-start gap-3 border p-3"
            >
              <div
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  e.ok
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {e.ok ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-sm">{e.description}</div>
                <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                  {e.city}, {e.country} · {relativeTime(e.at)}
                </div>
              </div>
              {!e.ok && <StatusBadge variant="warn">REVIEW</StatusBadge>}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Change password inspector */}
      <RightInspector
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false);
          setPasswordError(null);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }}
        eyebrow="CHANGE PASSWORD"
        title="Update your password"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPasswordOpen(false);
                setPasswordError(null);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isPwPending}
              onClick={() => {
                setPasswordError(null);
                if (newPassword !== confirmPassword) {
                  setPasswordError("New passwords do not match.");
                  return;
                }
                startPwTransition(async () => {
                  const res = await changePasswordAction({
                    currentPassword,
                    newPassword,
                  });
                  if (res.ok) {
                    toast.success(
                      "Password changed. Other devices have been signed out.",
                    );
                    setPasswordOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    router.refresh();
                  } else {
                    setPasswordError(res.error);
                  }
                });
              }}
            >
              Update password
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {passwordError && (
            <p className="text-destructive text-sm" role="alert">
              {passwordError}
            </p>
          )}
          <Field label="Current password" htmlFor="cur" required>
            <TextInput
              id="cur"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field
            label="New password"
            htmlFor="new"
            hint="At least 12 characters. Mix of letters, numbers, symbols recommended."
            required
          >
            <TextInput
              id="new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="conf" required>
            <TextInput
              id="conf"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        </div>
      </RightInspector>
    </div>
  );
}
