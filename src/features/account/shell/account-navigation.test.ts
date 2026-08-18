import { describe, expect, it } from "vitest";
import {
  accountNavigationFor,
  accountNavigationGroups,
  accountPageTitle,
  accountTagline,
  accountWorkspaceModes,
  isAccountModeActive,
  isAccountNavActive,
  isChatPath,
} from "./account-navigation";

describe("account navigation matching", () => {
  it("matches account root exactly for nav hrefs", () => {
    expect(isAccountNavActive("/account", "/account")).toBe(true);
    expect(isAccountNavActive("/account/style", "/account")).toBe(false);
  });

  it("resolves page titles", () => {
    expect(accountPageTitle("/account/budget")).toBe("Budget");
    expect(accountPageTitle("/account")).toBe("Dashboard");
    expect(accountPageTitle("/account/activity")).toBe("History");
    expect(accountPageTitle("/account/privacy")).toBe("Memory & data");
    expect(accountPageTitle("/account/style")).toBe("Style Profile");
    expect(accountPageTitle("/account/shortlist")).toBe("Explore");
    expect(accountPageTitle("/account/inspiration")).toBe("Explore");
    expect(accountPageTitle("/account/orders")).toBe("Orders");
    expect(accountPageTitle("/account/cart")).toBe("Cart");
    expect(accountPageTitle("/account/image-generation")).toBe(
      "Image Generation",
    );
  });

  it("keeps Dashboard mode lit for every non-chat view", () => {
    expect(isAccountModeActive("/account/activity", "/account")).toBe(true);
    expect(isAccountModeActive("/account", "/account")).toBe(true);
    expect(isAccountModeActive("/account/inspiration", "/account")).toBe(true);
    expect(isAccountModeActive("/account/style", "/account")).toBe(true);
    expect(isAccountModeActive("/account/orders", "/account")).toBe(true);
    expect(isAccountModeActive("/account/conversations", "/account")).toBe(
      true,
    );
    expect(isAccountModeActive("/account/conversations/x", "/account")).toBe(
      false,
    );
    expect(isAccountModeActive("/account/image-generation", "/account")).toBe(
      true,
    );
    expect(isAccountModeActive("/account/canvas", "/account")).toBe(false);
    expect(isAccountModeActive("/account/canvas", "/account/canvas")).toBe(
      true,
    );
  });

  it("detects chat paths and taglines", () => {
    expect(isChatPath("/account/conversations")).toBe(false);
    expect(isChatPath("/account/chat")).toBe(true);
    expect(isChatPath("/account/conversations/x")).toBe(true);
    expect(isChatPath("/account")).toBe(false);
    expect(
      isAccountModeActive("/account/conversations/x", "/account/chat"),
    ).toBe(true);
    expect(isAccountModeActive("/account/conversations", "/account/chat")).toBe(
      false,
    );
    expect(accountTagline("/account/conversations/x")).toMatch(/conversation/i);
    expect(accountTagline("/account/conversations")).toMatch(/off-template/i);
    expect(accountTagline("/account")).toMatch(/off-template/i);
    expect(accountTagline("/account/image-generation")).toMatch(
      /off-template/i,
    );
    expect(accountTagline("/account/canvas")).toMatch(/move the room/i);
  });

  it("matches the Dashboard rail IA", () => {
    const designWork = accountNavigationGroups.find(
      (group) => group.label === "Design Work",
    );
    const orders = accountNavigationGroups.find(
      (group) => group.label === "Account",
    );
    expect(designWork?.items.map((item) => item.label)).toEqual([
      "Projects",
      "Explore",
      "Quiz",
    ]);
    expect(orders?.items.map((item) => item.label)).toEqual([
      "History",
      "Orders",
      "Billing",
    ]);
    expect(accountNavigationGroups.map((group) => group.label)).toEqual([
      "Design Work",
      "Account",
      "Support",
    ]);
    expect(
      accountNavigationGroups.find((group) => group.label === "Support"),
    ).toMatchObject({
      items: [
        { label: "Profile", href: "/account/settings" },
        { label: "Memory & data", href: "/account/privacy" },
        { label: "Customer Service", href: "/account/help" },
      ],
    });
    expect(accountWorkspaceModes.map((mode) => mode.label)).toEqual([
      "Dashboard",
      "Chat",
      "Canvas",
    ]);
  });

  it("hides every buying surface when commerce is off", () => {
    // A visible checkout that cannot charge reads as a completed purchase, so
    // the entries are removed rather than disabled.
    const labels = accountNavigationFor(false).flatMap((group) =>
      group.items.map((item) => item.label),
    );
    expect(labels).not.toContain("Cart");
    expect(labels).not.toContain("Collections");
    expect(labels).not.toContain("Orders");
    expect(labels).not.toContain("Billing");
    expect(labels).toContain("History");
    expect(labels).toContain("Projects");
  });

  it("puts Collections and Cart ahead of Orders when commerce is on", () => {
    const account = accountNavigationFor(true).find(
      (group) => group.label === "Account",
    );
    expect(account?.items.map((item) => item.label)).toEqual([
      "Collections",
      "Cart",
      "History",
      "Orders",
      "Billing",
    ]);
    expect(accountWorkspaceModes[0]?.href).toBe("/account");
    expect(accountWorkspaceModes[1]?.href).toBe("/account/chat");
    expect(accountWorkspaceModes[2]?.href).toBe("/account/canvas");
  });
});
