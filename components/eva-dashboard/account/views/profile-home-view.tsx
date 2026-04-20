"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import {
  PageHeader,
  FormSection,
  Field,
  TextInput,
  Toggle,
  RadioCards,
  Button,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { ProfileTabNav } from "../profile-tab-nav";
import { saveProfileAction } from "@/lib/actions/profile";
import type { AccountHomeState } from "@/lib/site/account/server/profile";
import type { HomeType, Measurement } from "@/lib/site/account/types";

export function ProfileHomeView({ initial }: { initial: AccountHomeState }) {
  const router = useRouter();
  const [homeType, setHomeType] = useState<HomeType>(initial.homeType);
  const [roomCount, setRoomCount] = useState(initial.roomCount);
  const [household, setHousehold] = useState(initial.householdSize);
  const [hasPets, setHasPets] = useState(initial.hasPets);
  const [hasKids, setHasKids] = useState(initial.hasKids);
  const [measurements, setMeasurements] = useState<Measurement[]>(
    initial.measurements,
  );
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const save = () => {
    startTransition(async () => {
      const res = await saveProfileAction({
        homeType,
        roomCount,
        householdSize: household,
        hasPets,
        hasKids,
        measurements: measurements.map((m) => ({
          room: m.room,
          widthCm: m.widthCm,
          heightCm: m.heightCm,
          ceilingCm: m.ceilingCm,
          doorwayCm: m.doorwayCm,
        })),
      });
      if (!res.ok) {
        toast.error("Could not save. Check measurements and try again.");
        return;
      }
      toast.success("Home context saved");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="HOME CONTEXT"
        title="About your space"
        subtitle="Helps Eva recommend furniture that fits physically and stylistically."
        actions={
          <Button
            variant="primary"
            onClick={save}
            disabled={pending}
            icon={<Check className="h-3.5 w-3.5" />}
          >
            Save changes
          </Button>
        }
      />

      <PreviewBanner />

      <ProfileTabNav />

      <FormSection eyebrow="TYPE" title="Home type">
        <Field label="Home type">
          <RadioCards<HomeType>
            value={homeType}
            onChange={setHomeType}
            options={[
              { value: "HDB", label: "HDB", description: "Public housing" },
              {
                value: "Condo",
                label: "Condo",
                description: "Private apartment",
              },
              {
                value: "Landed",
                label: "Landed",
                description: "House / terrace",
              },
              {
                value: "Rental",
                label: "Rental",
                description: "Short / long-term",
              },
              { value: "Other", label: "Other" },
            ]}
          />
        </Field>
      </FormSection>

      <FormSection eyebrow="HOUSEHOLD" title="Who lives there">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Rooms" htmlFor="rooms">
            <TextInput
              id="rooms"
              type="number"
              min={1}
              value={roomCount}
              onChange={(e) => setRoomCount(Number(e.target.value))}
            />
          </Field>
          <Field label="Household" htmlFor="household">
            <TextInput
              id="household"
              type="number"
              min={1}
              value={household}
              onChange={(e) => setHousehold(Number(e.target.value))}
            />
          </Field>
          <Field label="Pets" layout="inline">
            <Toggle checked={hasPets} onChange={setHasPets} label="Pets" />
          </Field>
          <Field label="Kids" layout="inline">
            <Toggle checked={hasKids} onChange={setHasKids} label="Kids" />
          </Field>
        </div>
      </FormSection>

      <FormSection
        eyebrow="MEASUREMENTS"
        title="Room measurements"
        description="Eva uses these for 'will it fit' checks when you browse collections."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setMeasurements((prev) => [
                ...prev,
                {
                  id: `tmp-${Date.now()}`,
                  room: "New room",
                  widthCm: 300,
                  heightCm: 300,
                  ceilingCm: 265,
                  doorwayCm: 85,
                },
              ])
            }
            icon={<Plus className="h-3 w-3" />}
          >
            Add room
          </Button>
        }
      >
        <div
          className="overflow-hidden border"
          style={{ borderColor: "var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead
              className="font-ui"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              <tr
                className="border-b text-[10px] tracking-wider uppercase"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="px-3 py-2 text-left">Room</th>
                <th className="px-3 py-2 text-right">W (cm)</th>
                <th className="px-3 py-2 text-right">H (cm)</th>
                <th className="px-3 py-2 text-right">Ceiling</th>
                <th className="px-3 py-2 text-right">Doorway</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr
                  key={m.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-2 py-2">
                    <TextInput
                      value={m.room}
                      onChange={(e) =>
                        setMeasurements((prev) =>
                          prev.map((x) =>
                            x.id === m.id ? { ...x, room: e.target.value } : x,
                          ),
                        )
                      }
                      className="h-8"
                    />
                  </td>
                  {(
                    ["widthCm", "heightCm", "ceilingCm", "doorwayCm"] as const
                  ).map((k) => (
                    <td key={k} className="px-2 py-2">
                      <TextInput
                        type="number"
                        value={m[k]}
                        onChange={(e) =>
                          setMeasurements((prev) =>
                            prev.map((x) =>
                              x.id === m.id
                                ? ({
                                    ...x,
                                    [k]: Number(e.target.value),
                                  } as Measurement)
                                : x,
                            ),
                          )
                        }
                        className="h-8 w-20 text-right"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMeasurements((prev) =>
                          prev.filter((x) => x.id !== m.id),
                        )
                      }
                      aria-label="Remove"
                      className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[var(--destructive)]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>
    </div>
  );
}
