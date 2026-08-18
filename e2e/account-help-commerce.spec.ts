import { expect, test } from "@playwright/test";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";

test("help deep link opens route-owned Customer Service", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/help");
  await expect(page.locator(".wf-title")).toContainText("Customer Service");
  await expect(page.locator('.nav a[href="/account/help"]')).toHaveClass(
    /is-active/,
  );
});

test("help UI submits feedback via API", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/help");
  await page.getByRole("button", { name: /Send feedback/i }).click();
  await page
    .locator("textarea.wf-input")
    .fill("The rail navigation feels clear.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".wf-toast")).toContainText("Saved");
});

test("commerce screens are reachable from the rail", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);

  // The rail only shows these while COMMERCE_ENABLED=1, which run-e2e.mjs sets.
  await page.goto("/account");
  await page.locator('.nav a[href="/account/collections"]').click();
  await expect(page.locator(".wf-title")).toContainText("Collections");

  await page.goto("/account/orders");
  await expect(page.locator(".wf-title")).toContainText("Orders");

  await page.goto("/account/billing");
  await expect(page.locator(".wf-title")).toContainText("Billing");
  // Saved cards are deliberately absent: card details never reach this app.
  await expect(page.locator(".wf-pm")).toHaveCount(0);
  await expect(page.locator(".wf-frows").first()).toContainText("never stored");

  await page.goto("/account/checkout");
  await expect(page.locator(".wf-title")).toContainText("Checkout");
});

test("settings opens change-password inspector", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/settings");
  await page.getByRole("button", { name: "Change", exact: true }).click();
  await expect(page.locator(".wf-insp__t")).toContainText("Change password");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.locator(".wf-toast")).toContainText(
    /current password|highlighted|incorrect|at least/i,
  );
});

test("settings lists the current session as this device", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/settings");
  await expect(page.getByText("This device")).toBeVisible();
  await expect(page.locator(".wf-cellbox").first()).toBeVisible();
});
