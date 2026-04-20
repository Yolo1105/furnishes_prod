"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import {
  PageHeader,
  FormSection,
  Toggle,
  Field,
  Select,
  TextInput,
  Button,
  useToast,
  SegmentedFilter,
} from "@/components/eva-dashboard/account/shared";
import { ProjectActivityInbox } from "@/components/eva-dashboard/account/views/project-activity-inbox";
import { PHASE_7_UI_COPY } from "@/lib/eva/projects/summary-constants";
import { saveNotificationPrefsAction } from "@/lib/actions/notifications";
import type {
  NotificationPrefs,
  NotificationCategory,
  NotificationChannel,
} from "@/lib/site/account/types";

const CATEGORIES: {
  key: NotificationCategory;
  label: string;
  description: string;
  locked?: NotificationChannel[];
}[] = [
  {
    key: "transactional",
    label: "Transactional",
    description: "Order confirmations, receipts, account security",
    locked: ["email"],
  },
  {
    key: "marketing",
    label: "Marketing & promotions",
    description: "Seasonal sales, new arrivals, member offers",
  },
  {
    key: "collections",
    label: "New collections",
    description: "When we release a new drop or collaboration",
  },
  {
    key: "eva-digest",
    label: "Eva digest",
    description: "Weekly summary of your design activity",
  },
  {
    key: "design-tips",
    label: "Design tips",
    description: "Editorial pieces and how-tos",
  },
  {
    key: "project-activity",
    label: "Project activity",
    description: "Updates to your projects and shortlist",
  },
  {
    key: "shared-mentions",
    label: "Shared-project mentions",
    description: "When collaborators tag you",
  },
];

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push" },
];

// Some channels aren't available per category (e.g. SMS digest).
const CHANNEL_AVAILABILITY: Record<
  NotificationCategory,
  NotificationChannel[]
> = {
  transactional: ["email", "sms", "push"],
  marketing: ["email", "sms", "push"],
  collections: ["email", "push"],
  "eva-digest": ["email"],
  "design-tips": ["email", "push"],
  "project-activity": ["email", "sms", "push"],
  "shared-mentions": ["email", "sms", "push"],
};

type NotificationsSection = "inbox" | "prefs";

export function NotificationsView({ initial }: { initial: NotificationPrefs }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [section, setSection] = useState<NotificationsSection>("inbox");
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [saved, setSaved] = useState(initial);
  const { toast } = useToast();

  useEffect(() => {
    setPrefs(initial);
    setSaved(initial);
  }, [initial]);

  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);

  const toggle = (cat: NotificationCategory, ch: NotificationChannel) => {
    setPrefs((prev) => ({
      ...prev,
      matrix: {
        ...prev.matrix,
        [cat]: {
          ...prev.matrix[cat],
          [ch]: !prev.matrix[cat]?.[ch],
        },
      },
    }));
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveNotificationPrefsAction(prefs);
      if (res.ok) {
        setSaved(prefs);
        toast.success("Notification preferences saved");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="SIGNALS"
        title="Notifications"
        subtitle={
          section === "inbox"
            ? PHASE_7_UI_COPY.notificationsPageSubtitleInbox
            : PHASE_7_UI_COPY.notificationsPageSubtitlePrefs
        }
        actions={
          section === "prefs" ? (
            <Button
              variant="primary"
              onClick={save}
              disabled={!dirty || isPending}
              icon={<Check className="h-3.5 w-3.5" />}
            >
              Save changes
            </Button>
          ) : null
        }
      />

      <div className="mb-6">
        <SegmentedFilter
          value={section}
          onChange={setSection}
          options={[
            { value: "inbox", label: PHASE_7_UI_COPY.notificationsInboxTab },
            {
              value: "prefs",
              label: PHASE_7_UI_COPY.notificationsPrefsTab,
            },
          ]}
        />
      </div>

      {section === "inbox" ? <ProjectActivityInbox /> : null}

      {section === "prefs" ? (
        <>
          <FormSection
            eyebrow="CHANNELS"
            title="Channels × categories"
            description="Toggle each cell to control whether we send that category on that channel."
          >
            <div className="border-border overflow-x-auto border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] tracking-wider uppercase">
                  <tr className="border-border border-b">
                    <th className="px-4 py-3 text-left font-semibold">
                      Category
                    </th>
                    {CHANNELS.map((c) => (
                      <th
                        key={c.key}
                        className="w-24 px-4 py-3 text-center font-semibold"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat) => (
                    <tr
                      key={cat.key}
                      className="border-border border-b last:border-0"
                    >
                      <td className="px-4 py-4">
                        <div className="text-foreground font-medium">
                          {cat.label}
                        </div>
                        <div className="text-muted-foreground mt-0.5 max-w-sm text-xs leading-snug">
                          {cat.description}
                        </div>
                      </td>
                      {CHANNELS.map((ch) => {
                        const available = CHANNEL_AVAILABILITY[
                          cat.key
                        ].includes(ch.key);
                        const locked = cat.locked?.includes(ch.key);
                        if (!available) {
                          return (
                            <td key={ch.key} className="px-4 py-4 text-center">
                              <span className="text-muted-foreground/50 text-xs">
                                —
                              </span>
                            </td>
                          );
                        }
                        if (locked) {
                          return (
                            <td key={ch.key} className="px-4 py-4 text-center">
                              <span
                                title="Required — cannot be disabled"
                                className="text-muted-foreground inline-flex items-center gap-1 text-[10px] tracking-wider uppercase"
                              >
                                <Lock className="h-3 w-3" />
                                Required
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={ch.key} className="px-4 py-4 text-center">
                            <div className="inline-flex">
                              <Toggle
                                checked={!!prefs.matrix[cat.key]?.[ch.key]}
                                onChange={() => toggle(cat.key, ch.key)}
                                label={`${cat.label} via ${ch.label}`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>

          <FormSection
            eyebrow="FREQUENCY"
            title="Delivery cadence"
            description="Batch non-urgent notifications to reduce noise."
          >
            <Field label="Digest frequency" htmlFor="freq">
              <Select
                id="freq"
                value={prefs.digestFrequency}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    digestFrequency: e.target
                      .value as NotificationPrefs["digestFrequency"],
                  })
                }
              >
                <option value="instant">Instant — send as they happen</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Quiet hours — start"
                htmlFor="qstart"
                hint="Non-urgent pushes and SMS are held during quiet hours."
              >
                <TextInput
                  id="qstart"
                  type="time"
                  value={prefs.quietHoursStart}
                  onChange={(e) =>
                    setPrefs({ ...prefs, quietHoursStart: e.target.value })
                  }
                />
              </Field>
              <Field label="Quiet hours — end" htmlFor="qend">
                <TextInput
                  id="qend"
                  type="time"
                  value={prefs.quietHoursEnd}
                  onChange={(e) =>
                    setPrefs({ ...prefs, quietHoursEnd: e.target.value })
                  }
                />
              </Field>
            </div>
          </FormSection>
        </>
      ) : null}
    </div>
  );
}
