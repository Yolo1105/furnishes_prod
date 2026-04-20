import "server-only";

import type { HomeType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Measurement } from "@/lib/site/account/types";

export type AccountIdentityState = {
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
};

export type AccountHomeState = {
  homeType: HomeType;
  roomCount: number;
  householdSize: number;
  hasPets: boolean;
  hasKids: boolean;
  measurements: Measurement[];
};

export async function getAccountIdentityState(
  userId: string,
): Promise<AccountIdentityState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user?.email) {
    return {
      name: "",
      email: "",
      emailVerified: false,
      phone: "",
      phoneVerified: false,
    };
  }
  return {
    name: user.name?.trim() ?? "",
    email: user.email,
    emailVerified: user.emailVerified != null,
    phone: user.profile?.phone?.trim() ?? "",
    phoneVerified: user.profile?.phoneVerified ?? false,
  };
}

export async function getAccountHomeState(
  userId: string,
): Promise<AccountHomeState> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: { measurements: { orderBy: { createdAt: "asc" } } },
  });
  if (!profile) {
    return {
      homeType: "Other",
      roomCount: 1,
      householdSize: 1,
      hasPets: false,
      hasKids: false,
      measurements: [],
    };
  }
  return {
    homeType: profile.homeType,
    roomCount: profile.roomCount,
    householdSize: profile.householdSize,
    hasPets: profile.hasPets,
    hasKids: profile.hasKids,
    measurements: profile.measurements.map((m) => ({
      id: m.id,
      room: m.room,
      widthCm: m.widthCm,
      heightCm: m.heightCm,
      ceilingCm: m.ceilingCm,
      doorwayCm: m.doorwayCm,
    })),
  };
}
