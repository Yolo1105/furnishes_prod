import { expect, test } from "@playwright/test";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";

test("style profile API saves", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const saved = await request.put("/api/account/style", {
    data: {
      displayName: "Owner Studio",
      styleWords: "oak, linen, warm light",
    },
  });
  expect(saved.ok()).toBeTruthy();
});

test("budget API rejects maximum below minimum", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const rejected = await request.put("/api/account/budget", {
    data: {
      minimum: 9000,
      maximum: 1000,
      currency: "SGD",
      allocations: [],
    },
  });
  expect(rejected.status()).toBeGreaterThanOrEqual(400);
});

test("privacy memory API toggles", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const saved = await request.put("/api/account/privacy/memory", {
    data: { memoryEnabled: false },
  });
  expect(saved.ok()).toBeTruthy();
});

test("style deep link opens wireframe", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/style");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(page.locator('.nav a[href="/account/style"]')).toHaveCount(0);
  await expect(page.locator(".wireview")).toBeVisible();
  await expect(page.locator(".wf-title")).toContainText("Your design language");
});

test("style profile save persists property type", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/style");
  await page.locator(".wf-choice span", { hasText: "Condo" }).click();
  await expect(page.locator(".wf-choice span.on")).toHaveText("Condo");
  await page.getByRole("button", { name: /Save profile/ }).click();
  await expect(page.locator(".wf-toast")).toContainText("Saved");

  const loaded = await page.request.get("/api/account/style");
  expect(loaded.ok()).toBeTruthy();
  const body = (await loaded.json()) as {
    preferences: { propertyType: string };
  };
  expect(body.preferences.propertyType).toBe("Condo");

  await page.reload();
  await expect(page.locator(".wf-choice span.on")).toHaveText("Condo");
});

test("budget deep link and save range", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/budget");
  await expect(page.locator('.nav a[href="/account/budget"]')).toHaveCount(0);
  await expect(page.locator(".wf-title")).toContainText(
    "Where your money goes",
  );
  await page.getByRole("button", { name: "Save range" }).click();
  await expect(page.locator(".wf-toast")).toContainText("Saved");

  const loaded = await page.request.get("/api/account/budget");
  expect(loaded.ok()).toBeTruthy();
  const body = (await loaded.json()) as {
    minimum: number;
    maximum: number;
    currency: string;
  };
  expect(body.minimum).toBe(15000);
  expect(body.maximum).toBe(20000);
  expect(body.currency).toBe("SGD");
});

test("privacy deep link and memory toggle persists", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  const primed = await page.request.put("/api/account/privacy/memory", {
    data: { memoryEnabled: true },
  });
  expect(primed.ok()).toBeTruthy();

  await page.goto("/account/privacy");
  await expect(page.locator(".wf-title")).toContainText("memory & data");
  const memoryToggle = page
    .locator(".wf-tog2")
    .filter({ hasText: "Remember my taste across sessions" });
  await expect(memoryToggle.locator(".wf-switch")).not.toHaveClass(/off/);
  await memoryToggle.click();
  await expect(memoryToggle.locator(".wf-switch")).toHaveClass(/off/);
  await page.reload();
  await expect(
    page
      .locator(".wf-tog2")
      .filter({ hasText: "Remember my taste across sessions" })
      .locator(".wf-switch"),
  ).toHaveClass(/off/);
});

test("settings deep link and save notifications", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/settings");
  await expect(page.locator('.nav a[href="/account/settings"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".wf-title")).toHaveText("Profile");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".wf-toast")).toContainText("Saved");
});

test("settings offers log out and delete account", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/settings");
  await page.getByTestId("account-logout").click();
  await expect(page.getByTestId("account-logout-confirm")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/account\/settings/);

  await page.getByTestId("account-delete").click();
  await expect(page.getByTestId("account-delete-confirm")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/account\/settings/);
});
