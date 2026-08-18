import {
  listConfirmedPreferences,
  listPendingPreferenceProposals,
} from "@/server/preferences/preference-service";
import { preferenceMapFromDetails } from "@/server/preferences/preference-types";
import { jsonOk, requireApiSession } from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const [preferences, pending] = await Promise.all([
    listConfirmedPreferences(session.user.id),
    listPendingPreferenceProposals({ userId: session.user.id }),
  ]);

  return jsonOk({
    preferences,
    confirmedPreferences: preferenceMapFromDetails(preferences),
    pendingCount: pending.length,
  });
}
