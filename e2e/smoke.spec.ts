import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PAGES = ["/", "/collections", "/about", "/login", "/quiz"];

for (const path of PUBLIC_PAGES) {
  test.describe(`smoke: ${path}`, () => {
    test("loads without console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();

      const appErrors = errors.filter(
        (e) =>
          !/sentry|stripe\.com|fonts\.googleapis|\.r2\.dev/i.test(e) &&
          !e.startsWith("[HMR]") &&
          !e.startsWith("[Fast Refresh]"),
      );
      expect(appErrors).toEqual([]);
    });

    test("passes axe scan (wcag2a, wcag2aa)", async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
