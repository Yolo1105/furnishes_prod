import { envInt } from "@/server/env";
import { err, ok, type ServiceResult } from "@/server/result";

export function maxUploadFiles(): number {
  return envInt("UPLOAD_MAX_FILES_PER_USER", 200);
}

export function maxUploadBytes(): number {
  return envInt("UPLOAD_MAX_BYTES_PER_USER", 500 * 1024 * 1024);
}

export function maxHelpRequestsPerDay(): number {
  return envInt("HELP_REQUESTS_PER_DAY", 10);
}

export function maxProjectsPerUser(): number {
  return envInt("PROJECTS_MAX_PER_USER", 50);
}

export function maxRoomPlansPerUser(): number {
  return envInt("ROOM_PLANS_MAX_PER_USER", 100);
}

export function maxInspirationItemsPerUser(): number {
  return envInt("INSPIRATION_MAX_PER_USER", 500);
}

export function maxConversationsPerUser(): number {
  return envInt("CONVERSATIONS_MAX_PER_USER", 500);
}

export async function assertRowQuota(
  count: () => Promise<number>,
  max: number,
  label: string,
): Promise<ServiceResult<true, "rate_limited">> {
  if (max <= 0) return ok(true);
  return (await count()) >= max
    ? err("rate_limited", `You have reached the maximum number of ${label}.`)
    : ok(true);
}
