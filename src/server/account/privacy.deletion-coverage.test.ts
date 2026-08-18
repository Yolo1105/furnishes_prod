import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

/** Tables intentionally retained past account deletion, with the reason. */
const RETAINED: Record<string, string> = {
  CostLog: "spend ledger — no message or preference content",
  SecurityEvent: "audit trail",
  Order:
    "SG 5-year transaction records; shipping PII anonymized in deleteAccount",
};

/** Tables cleared explicitly by deleteAccount(). Keep in sync with privacy.ts. */
const DELETED = new Set([
  "PreferenceProposal",
  "UserPreference",
  "MessageFeedback",
  "ImplicitSignal",
  "Conversation",
  "RoomPlan",
  "InspirationItem",
  "FurnitureStudioPiece",
  "ImageGeneration",
  "Upload",
  "ProjectMember",
  "ProjectComment",
  "ProjectApproval",
  "StyleProfile",
  "Budget",
  "NotificationPrefs",
  "EmailToken",
  "HelpRequest",
  "Session",
  "Address",
  "Cart",
]);

/** Wiped via ownerId, not userId — not in the DMMF userId filter. */
const DELETED_BY_OWNER_ID = new Set(["Project"]);

describe("account deletion coverage", () => {
  it("accounts for every model carrying a userId", () => {
    const unhandled = Prisma.dmmf.datamodel.models
      .filter((m) => m.fields.some((f) => f.name === "userId"))
      .map((m) => m.name)
      .filter((name) => !DELETED.has(name) && !(name in RETAINED));

    expect(unhandled).toEqual([]);
  });

  it("does not list ownerId-only models as userId tables", () => {
    const userIdModels = new Set(
      Prisma.dmmf.datamodel.models
        .filter((m) => m.fields.some((f) => f.name === "userId"))
        .map((m) => m.name),
    );
    for (const name of DELETED_BY_OWNER_ID) {
      expect(userIdModels.has(name)).toBe(false);
    }
  });
});
