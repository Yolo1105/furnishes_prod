import type { InspirationDto, InspirationSource } from "./inspiration-types";

type InspirationFilter = "all" | InspirationSource;

export function matchesFilter(
  item: InspirationDto,
  filter: InspirationFilter,
): boolean {
  return filter === "all" || item.source === filter;
}

export function matchesProject(
  item: InspirationDto,
  projectId: string | null,
): boolean {
  return !projectId || item.projectId === projectId;
}

export function filterInspirationItems(
  items: InspirationDto[],
  filter: InspirationFilter,
  projectId: string | null,
): InspirationDto[] {
  return items.filter(
    (item) => matchesFilter(item, filter) && matchesProject(item, projectId),
  );
}

export function inspirationCardTitle(item: InspirationDto): string {
  const title = item.title?.trim();
  if (title && title.toLowerCase() !== "saved piece") return title;
  const roomLabel = item.roomLabel?.trim();
  if (roomLabel) return roomLabel;
  if (item.source === "generated") return "Warm minimal room study";
  return item.filename?.replace(/\.[^.]+$/, "") ?? "Saved piece";
}

export function countByFilter(
  items: InspirationDto[],
  filter: InspirationFilter,
): number {
  return items.filter((item) => matchesFilter(item, filter)).length;
}
