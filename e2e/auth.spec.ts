import { test, expect } from "@playwright/test";

const randomEmail = () =>
  `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

test.describe("auth: signup → verify → login → logout", () => {
  test("full flow", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const email = randomEmail();
    const password = "E2e-Test-Pass-12345!";
    const name = "Playwright Tester";

    const signupRes = await page.request.post(`${baseURL}/api/auth/signup`, {
      data: { name, email, password, marketingOptIn: false },
    });
    expect(signupRes.status()).toBe(201);
    const verifyToken = signupRes.headers()["x-test-verify-token"];
    expect(
      verifyToken,
      "x-test-verify-token header missing — set ALLOW_TEST_HELPERS=1 for E2E",
    ).toBeTruthy();

    await page.goto(`/login/verify/${verifyToken}`);
    await expect(
      page.getByText(/verified|success|signed in|continue/i),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/account");
    await expect(page).not.toHaveURL(/\/login/);

    await page.context().clearCookies();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("failed login shows error and does not redirect", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("nobody@example.test");
    await page.locator("#login-password").fill("wrong-password-000000");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(
      page.getByText(/email or password doesn't match/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
