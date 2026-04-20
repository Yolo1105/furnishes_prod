export const SAVE_STUDIO_ROOM_PATH = "/api/furniture-3d/save-room" as const;

/** Account project workspace — same path as project hub links elsewhere. */
export const ACCOUNT_PROJECTS_BASE = "/account/projects" as const;

export function accountProjectDetailHref(projectId: string): string {
  return `${ACCOUNT_PROJECTS_BASE}/${projectId}`;
}

/** Query on project page: which `ProjectStudioRoomSave` to highlight (optional). */
export const STUDIO_SAVED_ROOM_QUERY = "savedRoom" as const;

/** After saving from Eva Studio — land on the project with that layout selected. */
export function accountProjectDetailHrefAfterStudioSave(
  projectId: string,
  savedRoomId: string,
): string {
  const qs = new URLSearchParams();
  qs.set("fromStudio", "1");
  qs.set(STUDIO_SAVED_ROOM_QUERY, savedRoomId);
  return `${accountProjectDetailHref(projectId)}?${qs.toString()}`;
}

/** Continue editing this revision in Eva Studio (Arrange tab). */
export function accountImageGenArrangeResumeHref(args: {
  projectId: string;
  savedRoomId: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("tab", "arrange");
  qs.set("projectId", args.projectId);
  qs.set(STUDIO_SAVED_ROOM_QUERY, args.savedRoomId);
  return `/account/image-gen?${qs.toString()}`;
}
