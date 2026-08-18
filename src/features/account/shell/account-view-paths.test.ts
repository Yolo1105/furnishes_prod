import { describe, expect, it } from "vitest";
import { pathForAccountView, viewFromAccountPath } from "./account-view-paths";

describe("account-view-paths", () => {
  it("maps paths to studio views", () => {
    expect(viewFromAccountPath("/account")).toBe("dashboard");
    expect(viewFromAccountPath("/account/style")).toBe("style");
    expect(viewFromAccountPath("/account/inspiration")).toBe("shortlist");
    expect(viewFromAccountPath("/account/projects/abc")).toBe("projects");
    expect(viewFromAccountPath("/account/quiz")).toBe("quiz");
    expect(viewFromAccountPath("/account/image-generation")).toBe("imagegen");
  });

  it("maps views to paths", () => {
    expect(pathForAccountView("dashboard")).toBe("/account");
    expect(pathForAccountView("chat")).toBe("/account/chat");
    expect(pathForAccountView("quiz")).toBe("/account/quiz");
    expect(pathForAccountView("canvas")).toBe("/account/canvas");
    expect(viewFromAccountPath("/account/chat")).toBe("chat");
    expect(viewFromAccountPath("/account/canvas")).toBe("canvas");
    expect(viewFromAccountPath("/account/conversations")).toBe("conversations");
    expect(viewFromAccountPath("/account/conversations/abc")).toBe(
      "conversations",
    );
    expect(pathForAccountView("imagegen")).toBe("/account/image-generation");
    expect(pathForAccountView("unknown")).toBe("/account");
  });
});
