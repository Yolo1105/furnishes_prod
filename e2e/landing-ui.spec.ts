import { test, expect } from "@playwright/test";
import { waitForLandingUi } from "./landing-helpers";

test.describe("Landing UI", () => {
  test("menu opens, traps focus, closes on Escape, restores trigger", async ({
    page,
  }) => {
    await waitForLandingUi(page);

    const menuButton = page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    const menu = page.getByRole("dialog", { name: "Main menu" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    const backgroundInert = await page
      .locator("#landing-hero-title")
      .evaluate((element) => element.closest("[inert]") !== null);
    expect(backgroundInert).toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await expect(menuButton).toBeFocused();
  });

  test("quiz menu item opens the design quiz", async ({ page }) => {
    await waitForLandingUi(page);

    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: "Quiz" }).click();

    await expect(page).toHaveURL(/\/quiz$/);
    await expect(
      page.getByRole("heading", { name: /what kind of space are you/i }),
    ).toBeVisible();
  });

  test("closed menu controls are not keyboard-focusable", async ({ page }) => {
    await waitForLandingUi(page);

    const menu = page.locator("#landing-main-menu");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(menu).toHaveAttribute("inert", "");

    await page.getByRole("button", { name: "Menu" }).focus();
    await page.keyboard.press("Tab");
    const focusInsideClosedMenu = await page.evaluate(() => {
      const menuEl = document.getElementById("landing-main-menu");
      return Boolean(
        menuEl &&
        document.activeElement &&
        menuEl.contains(document.activeElement),
      );
    });
    expect(focusInsideClosedMenu).toBe(false);
  });

  test("footer is reachable", async ({ page }) => {
    await waitForLandingUi(page);
    const footer = page.locator("#contact");
    await expect(footer).toBeAttached();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("furnishes.");
  });
});

test.describe("Landing waitlist", () => {
  test.beforeEach(async ({ page }) => {
    await waitForLandingUi(page);
    await page.locator("#waitlist").scrollIntoViewIfNeeded();
  });

  test("validates invalid and unavailable emails", async ({ page }) => {
    const email = page.locator("#landing-waitlist-email");
    const submit = page.getByRole("button", { name: "Join the waitlist" });
    const note = page.locator("#landing-waitlist-note");

    await email.fill("not-an-email");
    await submit.click();
    await expect(note).toContainText("valid email");

    await email.fill("unavailable@studio.com");
    await submit.click();
    await expect(note).toContainText("unavailable");
  });

  test("supports successful signup", async ({ page }) => {
    await page.locator("#landing-waitlist-email").fill("you@studio.com");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.locator("#waitlist").getByRole("status")).toContainText(
      "on the list",
    );
  });

  test("supports duplicate result", async ({ page }) => {
    await page.locator("#landing-waitlist-email").fill("duplicate@studio.com");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.locator("#waitlist").getByRole("status")).toContainText(
      "already on the list",
    );
  });
});

test.describe("Landing mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile hero and menu work", async ({ page }) => {
    await waitForLandingUi(page);
    await expect(page.locator("h1")).toContainText("Interior");

    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  });
});
