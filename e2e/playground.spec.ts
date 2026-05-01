import { test, expect } from "@playwright/test";
import { STUDIO_PLAYGROUND_PATH_PREFIX } from "../lib/routes/studio-playground-path";

const randomEmail = () =>
  `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

test.describe("playground", () => {
  test("loads for signed-in user after signup", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    test.skip(
      process.env.STUDIO_ENABLED === "0",
      "STUDIO_ENABLED=0 disables Studio routes",
    );

    const email = randomEmail();
    const password = "E2e-Test-Pass-12345!";
    const name = "Playground E2E";

    const signupRes = await page.request.post(`${baseURL}/api/auth/signup`, {
      data: { name, email, password, marketingOptIn: false },
    });
    expect(signupRes.status()).toBe(201);
    const verifyToken = signupRes.headers()["x-test-verify-token"];
    expect(verifyToken).toBeTruthy();

    await page.goto(`/login/verify/${verifyToken}`);
    await expect(
      page.getByText(/verified|success|signed in|continue/i),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto(STUDIO_PLAYGROUND_PATH_PREFIX);
    await expect(page).toHaveURL(
      new RegExp(`^${STUDIO_PLAYGROUND_PATH_PREFIX.replace("/", "\\/")}(\/|$)`),
    );
    await expect(page).not.toHaveURL(/\/login/);

    await expect(
      page.getByText(/loading studio|furnishes|undo|help/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
