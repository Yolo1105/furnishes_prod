import { expect, test } from "@playwright/test";
import { E2E_OWNER, E2E_STRANGER, setSessionCookie } from "./account-helpers";

test("create and update project via API", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const created = await request.post("/api/account/projects", {
    data: { name: "Balcony calm", summary: "Planters and bench" },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  const updated = await request.put(`/api/account/projects/${id}`, {
    data: { brief: "Keep it light and green." },
  });
  expect(updated.ok()).toBeTruthy();
});

test("unrelated user denied project API access", async ({ request }) => {
  const ownerLogin = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(ownerLogin.ok()).toBeTruthy();
  const created = await request.post("/api/account/projects", {
    data: { name: "Private only" },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  const denied = await request.put(`/api/account/projects/${id}`, {
    data: { name: "Hijack" },
    headers: {
      cookie: `furnishes_session=${E2E_STRANGER.sessionToken}`,
    },
  });
  expect(denied.status()).toBeGreaterThanOrEqual(400);
});

test("projects deep link opens route-owned list with active rail Link", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/projects");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(page.locator('.nav a[href="/account/projects"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".wf-title")).toContainText("Projects");
  await expect(page.locator(".wireview")).toBeVisible();
});

test("new project creates via API and opens project detail", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/projects");
  await page.getByRole("button", { name: "+ New project" }).click();
  await expect(page).toHaveURL(/\/account\/projects\/.+/);
  await expect(page.locator(".wf-head .wf-eye")).toContainText("Project");
  await expect(page.locator(".wf-input").first()).toBeVisible();
});

test("project detail saves brief and denies stranger", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  const created = await page.request.post("/api/account/projects", {
    data: { name: "Detail save target" },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/account/projects/${id}`);
  await page
    .locator(".wf-efield")
    .nth(2)
    .locator(".wf-input")
    .fill("Keep it light and green.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".wf-toast")).toContainText("Saved");

  const stranger = await page.request.get(`/api/account/projects/${id}`, {
    headers: {
      cookie: `furnishes_session=${E2E_STRANGER.sessionToken}`,
    },
  });
  expect(stranger.status()).toBe(404);

  await setSessionCookie(page, E2E_STRANGER.sessionToken);
  await page.goto(`/account/projects/${id}`);
  await expect(
    page.getByRole("heading", { name: "Project not found" }),
  ).toBeVisible();
});
