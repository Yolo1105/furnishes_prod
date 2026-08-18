import { expect, test } from "@playwright/test";

test("login rejects bad credentials without revealing account state", async ({
  request,
}) => {
  const response = await request.post("/api/auth/login", {
    data: { email: "nobody@example.com", password: "wrong-password" },
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.message).toMatch(/invalid email or password/i);
});

test("forgot password returns generic success copy", async ({ request }) => {
  const response = await request.post("/api/auth/forgot-password", {
    data: { email: "nobody@example.com" },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.message).toMatch(/if an account exists/i);
});

test("signup then protected route works", async ({ page }) => {
  const email = `user-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Display name").fill("New Member");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.locator(".dash-hi")).toContainText("Welcome back");
});
