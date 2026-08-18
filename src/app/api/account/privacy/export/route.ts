import { exportAccountData } from "@/server/account/privacy";
import { requireApiSession } from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const data = await exportAccountData(session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition":
        'attachment; filename="furnishes-account-export.json"',
    },
  });
}
