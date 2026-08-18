import { expect, test } from "@playwright/test";
import { E2E_OWNER, E2E_STRANGER, setSessionCookie } from "./account-helpers";

test("valid upload download and delete via API", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const created = await request.post("/api/account/uploads", {
    multipart: {
      file: {
        name: "sample.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("hello studio"),
      },
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = (await created.json()) as { id: string };

  const downloaded = await request.get(
    `/api/account/uploads/${body.id}/download`,
  );
  expect(downloaded.ok()).toBeTruthy();

  const deleted = await request.delete(`/api/account/uploads/${body.id}`);
  expect(deleted.ok()).toBeTruthy();
});

test("unauthorized download is denied", async ({ request }) => {
  const ownerLogin = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(ownerLogin.ok()).toBeTruthy();

  const created = await request.post("/api/account/uploads", {
    multipart: {
      file: {
        name: "secret.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("secret"),
      },
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = (await created.json()) as { id: string };

  const denied = await request.get(`/api/account/uploads/${body.id}/download`, {
    headers: {
      cookie: `furnishes_session=${E2E_STRANGER.sessionToken}`,
    },
  });
  expect(denied.status()).toBeGreaterThanOrEqual(400);

  const cleaned = await request.delete(`/api/account/uploads/${body.id}`);
  expect(cleaned.ok()).toBeTruthy();
});

test("uploads deep link opens route-owned list", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/uploads");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(page.locator('.nav a[href="/account/uploads"]')).toHaveCount(0);
  await expect(page.locator(".wf-title")).toContainText("Uploads");
  await expect(page.locator(".wireview")).toBeVisible();
});

test("uploads UI can share a file and delete it", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/uploads");

  await page.setInputFiles('input[type="file"]', {
    name: "ui-upload.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello from uploads ui"),
  });
  await expect(page.locator(".wf-toast")).toContainText("Saved");
  const row = page.locator(".wf-list--media .wf-row", {
    hasText: "ui-upload.txt",
  });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator(".wf-insp__t")).toContainText("ui-upload.txt");
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".wf-toast")).toContainText("Removed");
  await expect(
    page.locator(".wf-list--media .wf-row", { hasText: "ui-upload.txt" }),
  ).toHaveCount(0);
});
