import { getPreferenceProposalSource } from "@/server/preferences/preference-service";
import { fromServiceResult, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ proposalId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { proposalId } = await params;
  return fromServiceResult(
    await getPreferenceProposalSource({
      userId: session.user.id,
      proposalId,
    }),
  );
}
