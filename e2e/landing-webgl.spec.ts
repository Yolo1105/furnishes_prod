import { test, expect } from "@playwright/test";
import {
  attachLandingRendererState,
  disableWebGL,
  expectLandingReady,
  landingHero,
  RENDERER_READY_MS,
  SETTLED_LANDING_PATH,
  SETTLED_READY_MS,
  waitForLandingReady,
  waitForSettledLanding,
} from "./landing-helpers";

test.describe("Landing WebGL", () => {
  /* Fail fast while demand-driven E2E rendering is under active validation. */
  test.describe.configure({ retries: 0 });

  test.afterEach(async ({ page }, testInfo) => {
    await attachLandingRendererState(page, testInfo);
  });

  test("loader hands off to hero with a single canvas", async ({ page }) => {
    test.setTimeout(180_000);
    await waitForLandingReady(page);

    const hero = landingHero(page);
    await expect(page.locator("h1")).toContainText("Interior");
    await expect(hero).toHaveAttribute("data-renderer-state", "webgl", {
      timeout: RENDERER_READY_MS,
    });
    await expect(hero.locator("canvas")).toHaveCount(1);
    await expect(hero).toBeVisible();
  });

  test("room controls, Overview, and pause/resume use real clicks", async ({
    page,
  }) => {
    await waitForSettledLanding(page, {
      requireWebGL: true,
      testMode: true,
    });

    const hero = landingHero(page);

    await expect(hero).toHaveAttribute("data-e2e-renderer", "true");

    const motion = page.getByTestId("landing-motion-toggle");

    await motion.click();

    await expect(hero).toHaveAttribute("data-paused", "true");
    await expect(motion).toHaveText("Resume");

    const room = hero.locator('[data-room-control][data-room="living"]');

    await expect(room).toBeVisible();
    await room.click();

    await expect(hero).toHaveAttribute("data-active-room", "living");

    await page.getByTestId("landing-overview").click();

    await expect(hero).toHaveAttribute("data-active-room", "overview");

    await motion.click();

    await expect(hero).toHaveAttribute("data-paused", "false");
  });

  test("WebGL failure shows fallback and reveals intro UI", async ({
    page,
  }) => {
    await disableWebGL(page);

    await page.goto(SETTLED_LANDING_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({
      timeout: SETTLED_READY_MS,
    });

    const hero = landingHero(page);
    await expect(hero).toHaveAttribute("data-renderer-state", "fallback", {
      timeout: RENDERER_READY_MS,
    });
    await expect(
      page.getByRole("img", { name: /interactive 3D model is unavailable/i }),
    ).toBeVisible({ timeout: SETTLED_READY_MS });
    await expect(page.locator("h1")).toContainText("Interior");
  });

  test("route-away and remount keeps a single canvas", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await waitForSettledLanding(page, {
      requireWebGL: true,
      testMode: true,
    });
    const hero = landingHero(page);
    await expect(hero.locator("canvas")).toHaveCount(1);

    await page.goto("/login");
    await expect(page.locator("h1")).toHaveText("Welcome back");
    await expect(landingHero(page)).toHaveCount(0);

    await page.goto(SETTLED_LANDING_PATH, { waitUntil: "domcontentloaded" });
    const remountedHero = landingHero(page);
    await expect(remountedHero).toHaveAttribute(
      "data-renderer-state",
      "webgl",
      {
        timeout: RENDERER_READY_MS,
      },
    );
    await expect(remountedHero).toHaveAttribute("data-e2e-renderer", "true");
    await expect(remountedHero.locator("canvas")).toHaveCount(1, {
      timeout: RENDERER_READY_MS,
    });
    expect(pageErrors).toEqual([]);
  });

  test("reload during loader still completes handoff", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("dialog", { name: "Loading Furnishes" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectLandingReady(page);

    const hero = landingHero(page);
    await expect(hero).toHaveAttribute("data-renderer-state", "webgl", {
      timeout: RENDERER_READY_MS,
    });
    await expect(hero.locator("canvas")).toHaveCount(1);
  });

  test("resize keeps Landing interactive", async ({ page }) => {
    await waitForSettledLanding(page, {
      requireWebGL: true,
      testMode: true,
    });

    const hero = landingHero(page);

    await expect(hero).toHaveAttribute("data-e2e-renderer", "true");

    const before = Number(await hero.getAttribute("data-resize-version"));

    await page.setViewportSize({ width: 1000, height: 700 });

    await expect
      .poll(
        async () => Number(await hero.getAttribute("data-resize-version")),
        {
          timeout: 30_000,
        },
      )
      .toBeGreaterThan(before);

    await expect(hero.locator("canvas")).toHaveCount(1);

    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();

    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeVisible();
  });
});
