import { expect, test } from "@playwright/test";
import {
  landingHero,
  SETTLED_LANDING_PATH,
  SETTLED_READY_MS,
} from "./landing-helpers";

test("landing and login crossfade without leaving the peach cover up", async ({
  page,
}) => {
  await page.goto(SETTLED_LANDING_PATH, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-hero-ready="1"]')).toBeVisible({
    timeout: SETTLED_READY_MS,
  });

  const handoff = page.locator("#furnishes-route-handoff-cover");
  await expect(handoff).toHaveAttribute("data-route-handoff", "off");

  await page.getByRole("link", { name: "login" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(handoff).toHaveAttribute("data-route-handoff", "off", {
    timeout: SETTLED_READY_MS,
  });

  const homeLink = page.getByRole("link", { name: /furnishes/i });
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/, { timeout: SETTLED_READY_MS });
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({
    timeout: SETTLED_READY_MS,
  });
  await expect(handoff).toHaveAttribute("data-route-handoff", "off", {
    timeout: SETTLED_READY_MS,
  });
  await expect(
    landingHero(page).or(page.locator("[data-hero-placeholder-ready]")).first(),
  ).toBeVisible();
});
