import { expect, test } from "@playwright/test";
import { E2E_OWNER, E2E_STRANGER, setSessionCookie } from "./account-helpers";

test("unauthenticated inspiration redirects to login", async ({ page }) => {
  await page.goto("/account/inspiration");
  await expect(page).toHaveURL(/\/login/);
});

test("list and update inspiration via API", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const listed = await request.get("/api/account/inspiration");
  expect(listed.ok()).toBeTruthy();
  const payload = (await listed.json()) as {
    items?: Array<{ id: string; title: string | null }>;
  };
  const items = payload.items ?? [];
  expect(items.length).toBeGreaterThan(0);
  const first = items[0];
  if (!first) return;

  const updated = await request.patch(`/api/account/inspiration/${first.id}`, {
    data: {
      title: "Edited living room",
      note: "More oak",
      colors: ["oak", "linen"],
      materials: ["wood", "stone"],
    },
  });
  expect(updated.ok()).toBeTruthy();
});

test("unrelated user cannot mutate inspiration", async ({ request }) => {
  const ownerLogin = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(ownerLogin.ok()).toBeTruthy();
  const listed = await request.get("/api/account/inspiration");
  expect(listed.ok()).toBeTruthy();
  const payload = (await listed.json()) as {
    items?: Array<{ id: string }>;
  };
  const first = payload.items?.[0];
  expect(first).toBeTruthy();
  if (!first) return;

  const denied = await request.patch(`/api/account/inspiration/${first.id}`, {
    data: { title: "Hijack" },
    headers: {
      cookie: `furnishes_session=${E2E_STRANGER.sessionToken}`,
    },
  });
  expect(denied.status()).toBeGreaterThanOrEqual(400);
});

test("inspiration deep link opens route-owned Saved pieces", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/inspiration");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(page.locator('.nav a[href="/account/inspiration"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".wf-title")).toContainText("Explore");
  await expect(page.locator(".wireview")).toBeVisible();
  await expect(page.getByText("Söderhamn 3-seat sofa")).toBeVisible();
  await expect(
    page.locator(".wf-picks:not(.wf-picks--saved) .wf-pick"),
  ).toHaveCount(6);
});

test("inspiration UI can open a piece and remove it", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  const created = await page.request.post("/api/account/image-generations", {
    data: {
      prompt: `test-ready inspiration ui ${Date.now()}`,
      width: 768,
      height: 768,
    },
  });
  expect(created.ok()).toBeTruthy();
  const generation = (await created.json()) as { id: string };
  const pinned = await page.request.post("/api/account/inspiration", {
    data: {
      imageGenerationId: generation.id,
      title: "UI remove target",
    },
  });
  expect(pinned.ok()).toBeTruthy();

  await page.goto("/account/inspiration");
  await page.getByText("UI remove target").first().click();
  await expect(page.locator(".wf-insp__t")).toContainText("UI remove target");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator(".wf-toast")).toContainText("Removed");
});
