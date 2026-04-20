import { describe, it, expect } from "vitest";
import {
  accountProjectDetailHrefAfterStudioSave,
  accountImageGenArrangeResumeHref,
  STUDIO_SAVED_ROOM_QUERY,
} from "@/lib/furniture-gen/save-studio-room-routes";

describe("save-studio-room-routes", () => {
  it("redirect after save includes saved room id and fromStudio", () => {
    const href = accountProjectDetailHrefAfterStudioSave("proj-1", "save-99");
    expect(href).toContain("proj-1");
    expect(href).toContain("fromStudio=1");
    expect(href).toContain(`${STUDIO_SAVED_ROOM_QUERY}=save-99`);
  });

  it("resume editing href carries project, saved room, and arrange tab", () => {
    const href = accountImageGenArrangeResumeHref({
      projectId: "p",
      savedRoomId: "s",
    });
    expect(href).toContain("tab=arrange");
    expect(href).toContain("projectId=p");
    expect(href).toContain(`${STUDIO_SAVED_ROOM_QUERY}=s`);
  });
});
