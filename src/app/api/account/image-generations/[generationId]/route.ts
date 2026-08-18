import {
  deleteImageGeneration,
  getImageGeneration,
} from "@/server/image-generation/image-generation-service";
import { fromServiceResult, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ generationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { generationId } = await params;
  return fromServiceResult(
    await getImageGeneration(session.user.id, generationId),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { generationId } = await params;
  return fromServiceResult(
    await deleteImageGeneration(session.user.id, generationId),
  );
}
