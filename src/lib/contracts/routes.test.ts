import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("routes", () => {
  it("exposes static route strings", () => {
    expect(routes.home).toBe("/");
    expect(routes.quiz).toBe("/quiz");
    expect(routes.login).toBe("/login");
    expect(routes.signup).toBe("/signup");
    expect(routes.account).toBe("/account");
    expect(routes.accountStyle).toBe("/account/style");
    expect(routes.accountCanvas).toBe("/account/canvas");
  });

  it("builds dynamic account routes", () => {
    expect(routes.accountConversation("abc")).toBe(
      "/account/conversations/abc",
    );
    expect(routes.accountProject("xyz")).toBe("/account/projects/xyz");
    expect(routes.accountQuiz).toBe("/account/quiz");
    expect(routes.accountImageGeneration).toBe("/account/image-generation");
    expect(routes.accountInspiration).toBe("/account/inspiration");
    expect(routes.accountImageGenerationItem("g1")).toBe(
      "/account/image-generation?generation=g1",
    );
    expect(routes.accountInspirationItem("i1")).toBe(
      "/account/inspiration?item=i1",
    );
    expect(routes.apiAccountConversationSuggestions("c1")).toBe(
      "/api/account/conversations/c1/suggestions",
    );
    expect(routes.apiAccountConversationBrainstorm("c1")).toBe(
      "/api/account/conversations/c1/brainstorm",
    );
    expect(routes.apiAccountConversationRecommendations("c1")).toBe(
      "/api/account/conversations/c1/recommendations",
    );
    expect(routes.apiAccountPreferencesCalibration).toBe(
      "/api/account/preferences/calibration",
    );
    expect(routes.apiAccountRoomPlans).toBe("/api/account/room-plans");
    expect(routes.apiAccountRoomPlan("rp1")).toBe(
      "/api/account/room-plans/rp1",
    );
    expect(routes.apiAccountRoomPlanItems("rp1")).toBe(
      "/api/account/room-plans/rp1/items",
    );
    expect(routes.apiAccountRoomPlanItem("rp1", "i1")).toBe(
      "/api/account/room-plans/rp1/items/i1",
    );
    expect(routes.apiAccountDesignBrief).toBe("/api/account/design-brief");
    expect(routes.apiAccountConversationRenders("c1")).toBe(
      "/api/account/conversations/c1/renders",
    );
    expect(routes.apiAccountConversationInsights("c1")).toBe(
      "/api/account/conversations/c1/insights",
    );
    expect(routes.apiAccountConversationShare("c1")).toBe(
      "/api/account/conversations/c1/share",
    );
    expect(routes.apiShared("abc123")).toBe("/api/shared/abc123");
    expect(routes.sharedPage("abc123")).toBe("/shared/abc123");
    expect(routes.apiAccountStudioPieces).toBe("/api/account/studio/pieces");
  });
});
