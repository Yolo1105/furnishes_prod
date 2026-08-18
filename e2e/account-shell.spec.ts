import { expect, test } from "@playwright/test";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";

test("unauthenticated /account redirects to login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("route-owned dashboard and React rail navigation", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(page.locator(".dash-hi")).toContainText("Welcome back");
  await page.locator('.nav a[href="/account/projects"]').click();
  await expect(page).toHaveURL(/\/account\/projects/);
  await expect(page.locator('.nav a[href="/account/projects"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".wireview")).toBeVisible();
});

test("workspace tabs switch Dashboard, Chat, and Canvas", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account");
  await expect(page.locator('.modeswitch a[href="/account"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator('.modeswitch a[href="/account"]')).toContainText(
    "Dashboard",
  );
  await expect(
    page.locator('.modeswitch a[href="/account/image-generation"]'),
  ).toHaveCount(0);
  await expect(page.locator('.nav a[href="/account"]')).toHaveCount(0);
  await page.locator('.modeswitch a[href="/account/chat"]').click();
  await expect(page).toHaveURL(/\/account\/conversations\/.+/);
  await expect(page.locator('.modeswitch a[href="/account/chat"]')).toHaveClass(
    /is-active/,
  );
  await expect(
    page.locator('.modeswitch a[href="/account/chat"]'),
  ).toContainText("Chat");
  await expect(page.locator("#fa-rail-chat")).toBeVisible();
  await expect(page.locator(".wf-cx")).toBeVisible();
  await page.locator('.modeswitch a[href="/account/canvas"]').click();
  await expect(page).toHaveURL(/\/account\/canvas/);
  await expect(page.locator("[data-canvas-playground]")).toBeVisible();
  await expect(page.locator(".furnishes-account")).toHaveCount(0);
  await page.goto("/account");
  await expect(page.locator(".furnishes-account")).toBeVisible();
});

test("chat rail sections stay inside the conversation workspace", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  const created = await page.request.post("/api/account/conversations", {
    data: { title: `sec-rail-${Date.now()}` },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };
  await page.goto(`/account/conversations/${id}`);
  await expect(page.locator("#fa-rail-chat")).toBeVisible();
  const chat = page.locator("#account-main .wireview--chat .wf-cx");
  await expect(chat).toBeVisible();

  await expect(async () => {
    await page.locator('#fa-rail-chat [data-cnav="project"]').click();
    await expect(chat).toHaveClass(/seco/);
  }).toPass({ timeout: 10_000 });

  await expect(page).toHaveURL(new RegExp(`/account/conversations/${id}`));
  await expect(page.locator("#account-main .wf-secv__h")).toHaveText(
    "Projects",
  );
  await expect(page.locator('#fa-rail-chat [data-cnav="project"]')).toHaveClass(
    /is-active/,
  );

  await page.getByRole("button", { name: "Open project chat" }).click();
  await expect(chat).not.toHaveClass(/seco/);
  await expect(page.locator("#account-main .wf-secv")).toHaveCount(0);
  await expect(
    page.locator('#fa-rail-chat [data-cnav="project"]'),
  ).not.toHaveClass(/is-active/);
});

test("activity deep link opens route-owned timeline", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account");
  await page.locator('a.dash-act__all[href="/account/activity"]').click();
  await expect(page).toHaveURL(/\/account\/activity/);
  await expect(page.locator(".wf-title")).toContainText("History");
  await expect(page.locator('.nav a[href="/account/activity"]')).toHaveClass(
    /is-active/,
  );
  await expect(
    page.locator(".wf-list .wf-row, .wf-blank").first(),
  ).toBeVisible();
});

test("rail Links own the Account URL", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account");
  await page.locator('.nav a[href="/account/projects"]').click();
  await expect(page).toHaveURL(/\/account\/projects/);
  await expect(page.locator(".wf-title")).toHaveText("Projects");
  await page.goBack();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator(".dash-hi")).toContainText("Welcome back");
});

test("logout returns to login", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/account/settings");
  await page.getByTestId("account-logout").click();
  await page.getByTestId("account-logout-confirm").click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});
