import { deleteUpload } from "@/server/uploads/service";
import { fromServiceResult, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ uploadId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { uploadId } = await params;
  return fromServiceResult(await deleteUpload(session.user.id, uploadId));
}
