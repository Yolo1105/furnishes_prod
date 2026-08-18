import { retryImageGeneration } from "@/server/image-generation/image-generation-service";
import { fromServiceResult, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ generationId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { generationId } = await params;
  return fromServiceResult(
    await retryImageGeneration(session.user.id, generationId),
  );
}
