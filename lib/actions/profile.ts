"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { ProfilePatchSchema } from "@/lib/validation/schemas";

/**
 * Server Action: persist profile fields (identity + home context + measurements).
 *
 * Intended for `/account/profile/*` tab views once they load/save against
 * Prisma instead of local mock state. On success, revalidates account routes.
 *
 * Returns a serializable result rather than throwing — client components
 * can inspect `result.ok` and display inline error messaging.
 */
export async function saveProfileAction(
  patch: unknown,
): Promise<
  | { ok: true; updatedAt: string }
  | { ok: false; error: string; issues?: unknown }
> {
  try {
    const { userId } = await requireUser();
    const data = ProfilePatchSchema.parse(patch);
    const { name, measurements, ...profileFields } = data;

    await prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { name } });
      }
      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          phone: profileFields.phone ?? null,
          homeType: profileFields.homeType ?? "Other",
          roomCount: profileFields.roomCount ?? 1,
          householdSize: profileFields.householdSize ?? 1,
          hasPets: profileFields.hasPets ?? false,
          hasKids: profileFields.hasKids ?? false,
        },
        update: {
          ...(profileFields.phone !== undefined && {
            phone: profileFields.phone,
          }),
          ...(profileFields.homeType !== undefined && {
            homeType: profileFields.homeType,
          }),
          ...(profileFields.roomCount !== undefined && {
            roomCount: profileFields.roomCount,
          }),
          ...(profileFields.householdSize !== undefined && {
            householdSize: profileFields.householdSize,
          }),
          ...(profileFields.hasPets !== undefined && {
            hasPets: profileFields.hasPets,
          }),
          ...(profileFields.hasKids !== undefined && {
            hasKids: profileFields.hasKids,
          }),
        },
      });
      if (measurements !== undefined) {
        await tx.measurement.deleteMany({ where: { profileId: profile.id } });
        if (measurements.length > 0) {
          await tx.measurement.createMany({
            data: measurements.map((m) => ({
              profileId: profile.id,
              room: m.room,
              widthCm: m.widthCm,
              heightCm: m.heightCm,
              ceilingCm: m.ceilingCm,
              doorwayCm: m.doorwayCm,
            })),
          });
        }
      }

      // Log to activity stream
      await tx.activityEvent.create({
        data: {
          userId,
          category: "profile",
          label: "Profile updated",
        },
      });
    });

    revalidatePath("/account/profile");
    revalidatePath("/account");
    return { ok: true, updatedAt: new Date().toISOString() };
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return {
        ok: false,
        error: "VALIDATION",
        issues: (e as { issues: unknown }).issues,
      };
    }
    console.error("[saveProfileAction] failed:", e);
    return { ok: false, error: "INTERNAL" };
  }
}
