import { test, expect } from "@playwright/test";

test.describe("checkout: happy path", () => {
  test.slow();

  test("browse → add to cart → checkout → Stripe test card → confirmation", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const email = `e2e+co-${Date.now()}@example.test`;
    const password = "E2e-Test-Pass-12345!";

    const signup = await page.request.post(`${baseURL}/api/auth/signup`, {
      data: { name: "Checkout Tester", email, password },
    });
    expect(signup.status()).toBe(201);
    const verifyToken = signup.headers()["x-test-verify-token"];
    expect(verifyToken).toBeTruthy();

    await page.goto(`/login/verify/${verifyToken!}`);
    await expect(
      page.getByText(/verified|success|continue|signed in/i),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForLoadState("networkidle");

    const addrRes = await page.request.post(
      `${baseURL}/api/account/addresses`,
      {
        data: {
          label: "Home",
          recipientName: "Checkout Tester",
          phone: "+6591234567",
          postalCode: "238801",
          street: "2 Orchard Turn",
          unit: "#10-88",
          isDefault: true,
        },
      },
    );
    expect(
      addrRes.ok(),
      `address seed failed: ${addrRes.status()} ${await addrRes.text()}`,
    ).toBeTruthy();

    await page.goto("/collections");
    await page.getByTestId("product-card").first().click();
    await page.waitForLoadState("networkidle");

    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("add-to-cart")).toHaveClass(
      /addToCartSuccess/i,
      { timeout: 10_000 },
    );

    await page.goto("/cart");
    await expect(page.getByTestId("cart-total")).toBeVisible();
    await page.getByTestId("cart-checkout-link").click();

    await page.getByTestId("shipping-continue").click();

    await page.getByTestId("delivery-continue").click();

    await page.getByTestId("place-order").click();

    await expect(page.getByTestId("stripe-element")).toBeVisible({
      timeout: 30_000,
    });

    const stripeFrame = page
      .frameLocator(
        'iframe[name^="__privateStripeFrame"], iframe[title*="payment" i], iframe[src*="stripe.com"]',
      )
      .first();

    await stripeFrame
      .locator('[placeholder*="Card number" i], [placeholder*="1234 1234" i]')
      .first()
      .fill("4242424242424242");
    await stripeFrame
      .locator('[placeholder*="MM / YY" i]')
      .first()
      .fill("12 / 34");
    await stripeFrame.locator('[placeholder*="CVC" i]').first().fill("123");
    const zip = stripeFrame
      .locator('[placeholder*="ZIP" i], [placeholder*="Postal" i]')
      .first();
    if (await zip.isVisible().catch(() => false)) {
      await zip.fill("10001");
    }

    await page.getByTestId("stripe-pay-submit").click();

    await expect(page.getByTestId("order-confirmation")).toBeVisible({
      timeout: 90_000,
    });
    const orderNumber = await page.getByTestId("order-number").textContent();
    expect(orderNumber).toMatch(/./);
  });
});
