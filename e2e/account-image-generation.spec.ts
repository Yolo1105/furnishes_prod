import { expect, test } from "@playwright/test";
import { E2E_OWNER, E2E_STRANGER, setSessionCookie } from "./account-helpers";

test("unauthenticated image generation redirects to login", async ({
  page,
}) => {
  await page.goto("/account/image-generation");
  await expect(page).toHaveURL(/\/login/);
});

test("create ready generation and save to inspiration via API", async ({
  request,
}) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const created = await request.post("/api/account/image-generations", {
    data: {
      prompt: `test-ready bright balcony ${Date.now()}`,
      width: 768,
      height: 768,
    },
  });
  expect(created.ok()).toBeTruthy();
  const generation = (await created.json()) as { id: string; status: string };
  expect(generation.status).toBe("ready");

  const saved = await request.post("/api/account/inspiration", {
    data: { imageGenerationId: generation.id, title: "Balcony pin" },
  });
  expect(saved.ok()).toBeTruthy();
});

test("delayed generation reaches ready after refresh", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const created = await request.post("/api/account/image-generations", {
    data: {
      prompt: `test-delayed calm bedroom ${Date.now()}`,
      width: 768,
      height: 768,
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = (await created.json()) as { id: string; status: string };
  expect(["queued", "generating", "ready"]).toContain(body.status);

  let status = body.status;
  for (let i = 0; i < 10 && status !== "ready"; i += 1) {
    const refreshed = await request.post(
      `/api/account/image-generations/${body.id}/refresh`,
    );
    expect(refreshed.ok()).toBeTruthy();
    status = ((await refreshed.json()) as { status: string }).status;
  }
  expect(status).toBe("ready");
});

test("cancel and retry generation via API", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const created = await request.post("/api/account/image-generations", {
    data: {
      prompt: `test-cancel unique ${Date.now()}`,
      width: 768,
      height: 768,
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = (await created.json()) as { id: string };

  const canceled = await request.post(
    `/api/account/image-generations/${body.id}/cancel`,
  );
  expect(canceled.ok()).toBeTruthy();

  const retried = await request.post(
    `/api/account/image-generations/${body.id}/retry`,
  );
  expect(retried.ok()).toBeTruthy();
});

test("unrelated user cannot access generation API", async ({ request }) => {
  const ownerLogin = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(ownerLogin.ok()).toBeTruthy();
  const created = await request.post("/api/account/image-generations", {
    data: {
      prompt: `test-ready private ${Date.now()}`,
      width: 768,
      height: 768,
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = (await created.json()) as { id: string };

  const denied = await request.get(
    `/api/account/image-generations/${body.id}`,
    {
      headers: {
        cookie: `furnishes_session=${E2E_STRANGER.sessionToken}`,
      },
    },
  );
  expect(denied.status()).toBeGreaterThanOrEqual(400);
});

test("image-gen deep link opens route-owned Image Gen", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/image-generation");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(
    page.locator('.modeswitch a[href="/account/image-generation"]'),
  ).toHaveCount(0);
  await expect(page.locator('.modeswitch a[href="/account"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".wf-title")).toContainText("Image Gen");
  await expect(page.locator(".wireview")).toBeVisible();
});

test("image-gen UI generates a ready render", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/image-generation");
  const prompt = `test-ready ui render ${Date.now()}`;
  await page.locator(".wf-3col__l textarea.wf-input").fill(prompt);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.locator(".wf-canvas img")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".wf-toast")).toContainText("Saved");
});
