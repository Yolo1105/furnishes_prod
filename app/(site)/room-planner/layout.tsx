import type { Metadata } from "next";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Room Planner | ${SITE_TITLE}`,
  description:
    "Preview the room planning workflow and how it fits into design on Furnishes.",
};

export default function RoomPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
