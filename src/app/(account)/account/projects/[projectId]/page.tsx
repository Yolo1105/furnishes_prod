import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailPage } from "@/features/account/projects/ProjectDetailPage";
import { getProject } from "@/server/projects/service";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireCurrentSession();
  const { projectId } = await params;
  const result = await getProject(session.user.id, projectId);
  if (!result.ok) return { title: "Project" };
  return { title: result.value.name?.trim() || "Project" };
}

export default async function AccountProjectRoute({ params }: Params) {
  const session = await requireCurrentSession();
  const { projectId } = await params;
  const result = await getProject(session.user.id, projectId);
  if (!result.ok) notFound();
  return <ProjectDetailPage initialProject={result.value} />;
}
