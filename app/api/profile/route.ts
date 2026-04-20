import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { ProfilePatchSchema } from "@/lib/validation/schemas";

/**
 * GET /api/profile
 *   → the current user plus their extended profile + measurements.
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        profile: {
          include: { measurements: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    return NextResponse.json({ profile: user });
  } catch (e) {
    return apiError(e);
  }
}

/**
 * PATCH /api/profile
 *   body: ProfilePatch (name, phone, home context, measurements)
 *   → updates the User row + upserts UserProfile + replaces measurements.
 *
 * Wrapped in a transaction so partial failures don't leave inconsistent state.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const json = await req.json();
    const patch = ProfilePatchSchema.parse(json);

    const { name, measurements, ...profileFields } = patch;

    const updated = await prisma.$transaction(async (tx) => {
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

      // Replace measurements wholesale if provided — simpler than diff-by-id
      // for a small array. Revisit if rooms > 30.
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

      return tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          profile: { include: { measurements: true } },
        },
      });
    });

    return NextResponse.json({ profile: updated });
  } catch (e) {
    return apiError(e);
  }
}
