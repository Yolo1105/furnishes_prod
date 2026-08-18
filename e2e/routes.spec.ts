import { test, expect } from "@playwright/test";

test("quiz route renders the design quiz", async ({ page }) => {
  const response = await page.goto("/quiz");
  expect(response?.ok()).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: /what kind of space are you/i }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Back to Furnishes home" }).click();
  await expect(page).toHaveURL("/");
});

test("login route renders sign-in form", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toHaveCount(
    1,
  );
});

test("account requires authentication", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

test("health route returns operational JSON", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    status: "ok",
    application: "web",
  });
});

test("health readiness includes database check", async ({ request }) => {
  const response = await request.get("/api/health?ready=1");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    status: string;
    ready: boolean;
    checks: { database: string };
  };
  expect(body.status).toBe("ok");
  expect(body.ready).toBe(true);
  expect(body.checks.database).toBe("ok");
});

test("unknown route returns not-found behavior", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
});

test("robots disallow crawling", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("User-Agent: *");
  expect(body).toContain("Disallow: /");
});
