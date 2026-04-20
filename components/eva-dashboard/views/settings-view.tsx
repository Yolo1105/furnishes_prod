"use client";

export function SettingsView() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-foreground mb-2 text-xl font-semibold">Settings</h1>
      <p className="text-muted-foreground mb-6 max-w-xl text-sm leading-relaxed">
        Account preferences, notifications, and assistant options will appear
        here as they are wired to your profile. Until then, use the main
        assistant workspace for project-specific choices.
      </p>

      <div
        className="border-border bg-muted/30 max-w-xl rounded-lg border p-4 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <p className="text-foreground font-medium">Status</p>
        <p className="mt-2 leading-relaxed">
          No configurable settings are persisted from this screen yet. If you
          need to adjust how Eva responds, continue the conversation in the
          assistant — preferences confirmed there are stored with your chats
          when signed in.
        </p>
      </div>
    </div>
  );
}
