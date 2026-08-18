import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildLegacyChatMigrationPlan,
  formatLegacyChatMigrationReport,
} from "./legacy-chat-plan";
import type { LegacyChatSnapshot } from "./legacy-chat-types";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "legacy-chat-fixture.json",
);

function loadFixture(): LegacyChatSnapshot {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as LegacyChatSnapshot;
}

describe("buildLegacyChatMigrationPlan", () => {
  it("imports owned chat data and skips excluded legacy domains", () => {
    const plan = buildLegacyChatMigrationPlan(loadFixture());

    expect(plan.users).toHaveLength(1);
    expect(plan.users[0]).toMatchObject({
      legacyId: "legacy-user-1",
      targetUserId: "target-user-1",
      match: "email",
      activeAssistantId: "eva-style",
    });

    expect(plan.conversations.map((row) => row.id).sort()).toEqual([
      "conv-bad-persona",
      "conv-owned",
    ]);
    expect(
      plan.conversations.find((row) => row.id === "conv-owned")?.projectId,
    ).toBeNull();

    expect(plan.messages.map((row) => row.id).sort()).toEqual([
      "msg-asst-1",
      "msg-user-1",
    ]);
    expect(
      plan.messages.find((row) => row.id === "msg-asst-1")?.assistantId,
    ).toBe("eva-style");

    expect(plan.feedback).toHaveLength(1);
    expect(plan.feedback[0]).toMatchObject({
      messageId: "msg-asst-1",
      rating: "down",
    });

    expect(plan.preferences.map((row) => row.category).sort()).toEqual([
      "color",
      "style",
    ]);
    expect(
      plan.preferences.find((row) => row.category === "style")?.value,
    ).toBe("japandi");
    expect(
      plan.preferences.find((row) => row.category === "color")?.value,
    ).toBe("warm neutrals");

    expect(
      plan.skips.some((row) => row.reason === "guest_or_unowned_conversation"),
    ).toBe(true);
    expect(
      plan.skips.some((row) => row.reason === "preference_change_not_imported"),
    ).toBe(true);
    expect(
      plan.conflicts.some((row) => row.code === "orphaned_project_link"),
    ).toBe(true);
    expect(
      plan.conflicts.some((row) => row.code === "preference_category_conflict"),
    ).toBe(true);
    expect(
      plan.conflicts.some((row) => row.code === "invalid_persona_id"),
    ).toBe(true);
  });

  it("is repeatable for the same fixture", () => {
    const first = buildLegacyChatMigrationPlan(loadFixture());
    const second = buildLegacyChatMigrationPlan(loadFixture());
    expect(second).toEqual(first);
  });

  it("formats a readable dry-run report", () => {
    const report = formatLegacyChatMigrationReport(
      buildLegacyChatMigrationPlan(loadFixture()),
    );
    expect(report).toContain("Source counts:");
    expect(report).toContain("Conflicts");
    expect(report).toContain("guest_or_unowned_conversation");
  });
});
