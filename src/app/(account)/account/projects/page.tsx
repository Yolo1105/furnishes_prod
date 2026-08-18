import type { Metadata } from "next";
import { ProjectsPage } from "@/features/account/projects/ProjectsPage";
import { listProjects } from "@/server/projects/service";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountProjectsRoute() {
  const session = await requireCurrentSession();
  const items = await listProjects(session.user.id);
  return <ProjectsPage initialItems={items} />;
}

export const metadata: Metadata = {
  title: "Projects",
};
