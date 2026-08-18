"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";

import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

type NotificationPrefs = {
  emailSecurity: boolean;
  emailDigest: boolean;
  inAppUpdates: boolean;
};

type SettingsSessionItem = {
  id: string;
  current: boolean;
  label: string;
  detail: string;
  lastSeenLabel: string;
};

type NotifRow = {
  category: string;
  email: boolean;
  sms: boolean;
  push: boolean;
};

const NOTIF_DEFAULTS: NotifRow[] = [
  { category: "Transactional", email: true, sms: true, push: true },
  { category: "Project activity", email: true, sms: false, push: true },
  { category: "Shared-project mentions", email: true, sms: true, push: true },
  { category: "Eva digest", email: true, sms: false, push: false },
  { category: "New collections", email: true, sms: false, push: false },
  { category: "Design tips", email: false, sms: false, push: false },
  { category: "Marketing & promotions", email: false, sms: false, push: false },
];

function buildInitialRows(prefs: NotificationPrefs): NotifRow[] {
  return NOTIF_DEFAULTS.map((row) => {
    if (row.category === "Eva digest") {
      return { ...row, email: prefs.emailDigest };
    }
    if (row.category === "Project activity") {
      return { ...row, push: prefs.inAppUpdates };
    }
    return row;
  });
}

const DIGEST_CHOICES = ["Daily", "Weekly", "Off"] as const;
type DigestChoice = (typeof DIGEST_CHOICES)[number];

/**
 * Route-owned Settings page — exact studio markup/classes.
 * Persisted: notification prefs, password change, active sessions.
 * Deferred: profile field editors, SMS/push beyond mapped emailDigest /
 * inAppUpdates / emailSecurity. The authenticator row is rendered
 * `aria-disabled` because no MFA backend exists.
 */
export function SettingsPage({
  displayName,
  email,
  memberSince,
  initialPrefs,
  initialSessions,
}: {
  displayName: string;
  email: string;
  memberSince: string;
  initialPrefs: NotificationPrefs;
  initialSessions: SettingsSessionItem[];
}) {
  const router = useRouter();
  const [notifRows, setNotifRows] = useState<NotifRow[]>(() =>
    buildInitialRows(initialPrefs),
  );
  const [alertOnSignInsOn, setAlertOnSignInsOn] = useState(
    initialPrefs.emailSecurity,
  );
  const [digestFrequency, setDigestFrequency] =
    useState<DigestChoice>("Weekly");
  const [sessions, setSessions] =
    useState<SettingsSessionItem[]>(initialSessions);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [toastText, setToastText] = useState<string | null>(null);
  const [panel, setPanel] = useState<
    | { kind: "changepw" }
    | { kind: "editfield"; label: string; value: string }
    | { kind: "signout"; sessionId: string; device: string }
    | { kind: "logout" }
    | { kind: "deleteaccount" }
    | null
  >(null);
  const [editValue, setEditValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const recoveryEmail = "m.lu@gmail.com";
  const fullName = displayName;
  const accountEmail = email;
  const location = "Singapore";

  function flashToast(text: string) {
    setToastText(text);
    setTimeout(() => setToastText(null), 1500);
  }

  function openEdit(label: string, value: string) {
    setEditValue(value);
    setPanel({ kind: "editfield", label, value });
  }

  function toggleCell(rowIndex: number, column: "email" | "sms" | "push") {
    setNotifRows((rows) =>
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [column]: !row[column] } : row,
      ),
    );
  }

  async function handleSave() {
    setStatus("saving");
    const evaDigestRow = notifRows.find((row) => row.category === "Eva digest");
    const projectActivityRow = notifRows.find(
      (row) => row.category === "Project activity",
    );
    try {
      await accountRequest("/api/account/settings/notifications", {
        method: "PUT",
        body: JSON.stringify({
          emailSecurity: alertOnSignInsOn,
          emailDigest: evaDigestRow?.email ?? initialPrefs.emailDigest,
          inAppUpdates: projectActivityRow?.push ?? initialPrefs.inAppUpdates,
        }),
      });
      setStatus("saved");
      flashToast("Saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      flashToast("Couldn’t save");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  async function refreshSessions() {
    try {
      const data = await accountRequest<{ items: SettingsSessionItem[] }>(
        "/api/account/settings/sessions",
      );
      setSessions(data.items);
    } catch {
      /* keep existing list */
    }
  }

  async function handleSignOutSession(sessionId: string) {
    try {
      await accountRequest(`/api/account/settings/sessions/${sessionId}`, {
        method: "DELETE",
      });
      flashToast("Signed out");
      await refreshSessions();
      router.refresh();
    } catch {
      flashToast("Error");
    }
  }

  async function handleLogout() {
    setSessionBusy(true);
    try {
      await accountRequest("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  async function handleDeleteAccount() {
    setSessionBusy(true);
    try {
      await accountRequest("/api/account/privacy/delete", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  async function handleChangePassword() {
    setPasswordBusy(true);
    try {
      await accountRequest("/api/account/settings/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPanel(null);
      flashToast("Password updated");
      await refreshSessions();
      router.refresh();
    } catch (error) {
      const message = isAccountApiError(error)
        ? (error.fieldErrors?.currentPassword ??
          error.fieldErrors?.newPassword ??
          error.fieldErrors?.confirmPassword ??
          error.message)
        : "Error";
      flashToast(message);
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Personal details, notifications, and sign-in security."
      />

      <div className="wf-conn wf-conn--top">
        <div className="wf-sec">
          <p className="wf-sec__lbl">Notifications</p>
        </div>
        <p className="wf-secintro">
          Choose how Eva reaches you. Transactional alerts can’t be turned off.
        </p>
        <div className="wf-notif">
          <div className="wf-notif__r wf-notif__h">
            <span>Category</span>
            <span>Email</span>
            <span>SMS</span>
            <span>Push</span>
          </div>
          {notifRows.map((row, rowIndex) => (
            <div className="wf-notif__r" key={row.category}>
              <span className="wf-notif__cat">{row.category}</span>
              <span className="wf-notif__c">
                <button
                  type="button"
                  className={row.email ? "wf-check on" : "wf-check"}
                  onClick={() => toggleCell(rowIndex, "email")}
                  aria-label={`${row.category} email`}
                />
              </span>
              <span className="wf-notif__c">
                <button
                  type="button"
                  className={row.sms ? "wf-check on" : "wf-check"}
                  onClick={() => toggleCell(rowIndex, "sms")}
                  aria-label={`${row.category} sms`}
                />
              </span>
              <span className="wf-notif__c">
                <button
                  type="button"
                  className={row.push ? "wf-check on" : "wf-check"}
                  onClick={() => toggleCell(rowIndex, "push")}
                  aria-label={`${row.category} push`}
                />
              </span>
            </div>
          ))}
        </div>
        <div
          className="wf-frows"
          style={{ borderTop: "1px solid var(--hair)" }}
        >
          <div className="wf-frow">
            <span className="wf-frow__l">Digest frequency</span>
            <div className="wf-choice" style={{ flex: 1, marginTop: 0 }}>
              {DIGEST_CHOICES.map((choice) => (
                <span
                  key={choice}
                  className={digestFrequency === choice ? "on" : undefined}
                  onClick={() => setDigestFrequency(choice)}
                >
                  {choice}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Sign-in & security</p>
        </div>
        <p className="wf-secintro">
          Your password, recovery email, and two-factor protection.
        </p>
        <div className="wf-frows">
          <div className="wf-frow">
            <span className="wf-frow__l">Password</span>
            <span className="wf-frow__v">••••••••••••</span>
            <button
              type="button"
              className="wf-frow__a"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPanel({ kind: "changepw" });
              }}
            >
              Change
            </button>
          </div>
          <div className="wf-frow">
            <span className="wf-frow__l">Recovery email</span>
            <span className="wf-frow__v">{recoveryEmail}</span>
            <button
              type="button"
              className="wf-frow__a"
              onClick={() => openEdit("Recovery email", recoveryEmail)}
            >
              Edit
            </button>
          </div>
        </div>
        <div className="wf-togblock">
          {/* No MFA backend exists. Announced as unavailable rather than
              rendered as a working security control, but kept focusable so the
              explanation is reachable. */}
          <button
            type="button"
            className="wf-tog2"
            aria-disabled="true"
            onClick={() => flashToast("Authenticator app is not available yet")}
          >
            <div className="wf-tog2__main">
              <div className="wf-tog2__t">Authenticator app</div>
              <div className="wf-tog2__d">
                Require a code from your authenticator app at every sign-in.
              </div>
            </div>
            <span className="wf-switch off" />
          </button>
          <button
            type="button"
            className="wf-tog2"
            onClick={() => setAlertOnSignInsOn((prev) => !prev)}
          >
            <div className="wf-tog2__main">
              <div className="wf-tog2__t">Alert on new sign-ins</div>
              <div className="wf-tog2__d">
                Email me whenever a new device signs into the account.
              </div>
            </div>
            <span
              className={alertOnSignInsOn ? "wf-switch" : "wf-switch off"}
            />
          </button>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Active sessions</p>
        </div>
        <p className="wf-secintro">
          Where your account is signed in right now.
        </p>
        <div
          className="wf-cells"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
        >
          {sessions.map((item) =>
            item.current ? (
              <button
                type="button"
                className="wf-cellbox"
                key={item.id}
                onClick={() => setPanel({ kind: "logout" })}
              >
                <div className="wf-cellbox__top">
                  <span className="wf-cellbox__t">{item.label}</span>
                  <span className="wf-badge wf-badge--on">This device</span>
                </div>
                <div className="wf-cellbox__d">{item.detail}</div>
                <div className="wf-cellbox__go">Log out ↗</div>
                <div className="wf-cellbox__meta">{item.lastSeenLabel}</div>
              </button>
            ) : (
              <button
                type="button"
                className="wf-cellbox"
                key={item.id}
                onClick={() =>
                  setPanel({
                    kind: "signout",
                    sessionId: item.id,
                    device: item.label,
                  })
                }
              >
                <div className="wf-cellbox__t">{item.label}</div>
                <div className="wf-cellbox__d">{item.detail}</div>
                <div className="wf-cellbox__go">Sign out ↗</div>
                <div className="wf-cellbox__meta">{item.lastSeenLabel}</div>
              </button>
            ),
          )}
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Account</p>
        </div>
        <p className="wf-secintro">Your profile details on Furnishes.</p>
        <div className="wf-frows">
          <div className="wf-frow">
            <span className="wf-frow__l">Full name</span>
            <span className="wf-frow__v">{fullName}</span>
            <button
              type="button"
              className="wf-frow__a"
              onClick={() => openEdit("Full name", fullName)}
            >
              Edit
            </button>
          </div>
          <div className="wf-frow">
            <span className="wf-frow__l">Email</span>
            <span className="wf-frow__v">{accountEmail}</span>
            <button
              type="button"
              className="wf-frow__a"
              onClick={() => openEdit("Email", accountEmail)}
            >
              Edit
            </button>
          </div>
          <div className="wf-frow">
            <span className="wf-frow__l">Location</span>
            <span className="wf-frow__v">{location}</span>
            <button
              type="button"
              className="wf-frow__a"
              onClick={() => openEdit("Location", location)}
            >
              Edit
            </button>
          </div>
          <div className="wf-frow">
            <span className="wf-frow__l">Member since</span>
            <span className="wf-frow__v">{memberSince}</span>
          </div>
        </div>

        <div style={{ marginTop: "24px" }}>
          <button type="button" className="wf-btn" onClick={handleSave}>
            Save changes
          </button>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Session</p>
        </div>
        <div className="wf-acctact">
          <div className="wf-acctact__copy">
            <p className="wf-acctact__t">Log out</p>
            <p className="wf-acctact__p">
              {panel?.kind === "logout"
                ? "Sign out of this browser? Your projects and chats stay saved."
                : "End this browser session. Your work stays on the account."}
            </p>
          </div>
          <div className="wf-acctact__btns">
            {panel?.kind === "logout" ? (
              <>
                <button
                  type="button"
                  className="wf-btn"
                  data-testid="account-logout-confirm"
                  disabled={sessionBusy}
                  onClick={() => void handleLogout()}
                >
                  {sessionBusy ? "Signing out…" : "Log out"}
                </button>
                <button
                  type="button"
                  className="wf-btn ghost"
                  disabled={sessionBusy}
                  onClick={() => setPanel(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="wf-btn"
                data-testid="account-logout"
                onClick={() => setPanel({ kind: "logout" })}
              >
                Log out
              </button>
            )}
          </div>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Danger zone</p>
        </div>
        <div className="wf-acctact">
          <div className="wf-acctact__copy">
            <p className="wf-acctact__t">Delete account</p>
            <p className="wf-acctact__p">
              {panel?.kind === "deleteaccount"
                ? "This cannot be undone. Export from Memory & data first if you need a copy."
                : "Permanently remove your account, chats, and profile."}
            </p>
          </div>
          <div className="wf-acctact__btns">
            {panel?.kind === "deleteaccount" ? (
              <>
                <button
                  type="button"
                  className="wf-btn"
                  data-testid="account-delete-confirm"
                  disabled={sessionBusy}
                  onClick={() => void handleDeleteAccount()}
                >
                  {sessionBusy ? "Deleting…" : "Delete account"}
                </button>
                <button
                  type="button"
                  className="wf-btn ghost"
                  disabled={sessionBusy}
                  onClick={() => setPanel(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="wf-btn"
                data-testid="account-delete"
                onClick={() => setPanel({ kind: "deleteaccount" })}
              >
                Delete account
              </button>
            )}
          </div>
        </div>

        {panel?.kind === "changepw" ? (
          <div className="wf-conn" style={{ marginTop: 28 }}>
            <p className="wf-sec__lbl">Security</p>
            <h2 className="wf-insp__t">Change password</h2>
            <label className="wf-efield">
              <span className="wf-efield__l">Current</span>
              <input
                className="wf-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="wf-efield">
              <span className="wf-efield__l">New</span>
              <input
                className="wf-input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="wf-efield">
              <span className="wf-efield__l">Confirm</span>
              <input
                className="wf-input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <p className="wf-insp__p">
              Use at least 10 characters. Other sessions will be signed out.
            </p>
            <div className="wf-insp__act">
              <button
                type="button"
                className="wf-btn"
                disabled={passwordBusy}
                onClick={() => {
                  void handleChangePassword();
                }}
              >
                Update
              </button>
              <button
                type="button"
                className="wf-btn ghost"
                onClick={() => setPanel(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {panel?.kind === "editfield" ? (
          <div className="wf-conn" style={{ marginTop: 28 }}>
            <p className="wf-sec__lbl">Edit</p>
            <h2 className="wf-insp__t">{panel.label}</h2>
            <div className="wf-efields">
              <label className="wf-efield">
                <span className="wf-efield__l">{panel.label}</span>
                <input
                  className="wf-input"
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                />
              </label>
            </div>
            <div className="wf-insp__act">
              <button
                type="button"
                className="wf-btn"
                onClick={() => {
                  setPanel(null);
                  flashToast("Profile field editing deferred");
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="wf-btn ghost"
                onClick={() => setPanel(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {panel?.kind === "signout" ? (
          <div className="wf-conn" style={{ marginTop: 28 }}>
            <p className="wf-sec__lbl">Sessions</p>
            <h2 className="wf-insp__t">Sign out?</h2>
            <p className="wf-insp__p">
              This ends the session on {panel.device}. You’ll need to sign in
              again there.
            </p>
            <div className="wf-insp__act">
              <button
                type="button"
                className="wf-btn"
                onClick={() => {
                  void handleSignOutSession(panel.sessionId);
                  setPanel(null);
                }}
              >
                Sign out
              </button>
              <button
                type="button"
                className="wf-btn ghost"
                onClick={() => setPanel(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`wf-toast${status === "saved" || toastText ? " show" : ""}`}
      >
        {status === "saved" ? "Saved ✓" : toastText ? toastText : ""}
      </div>
    </AccountWireFrame>
  );
}
