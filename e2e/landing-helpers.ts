import { expect, type Page, type TestInfo } from "@playwright/test";

/** Full loader + handoff; allow CI headroom. */
const LANDING_READY_MS = 60_000;
export const SETTLED_READY_MS = 30_000;
export const RENDERER_READY_MS = 60_000;

/** Settled Landing URL: skip intro + low-cost renderer when NEXT_PUBLIC_E2E is set. */
export const SETTLED_LANDING_PATH = "/?intro=skip&e2e=1";

export function landingHero(page: Page) {
  return page.locator("#landing-hero-scene");
}

export async function expectLandingReady(page: Page) {
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({
    timeout: LANDING_READY_MS,
  });
  await expect(
    page.getByRole("dialog", { name: "Loading Furnishes" }),
  ).toHaveCount(0, { timeout: LANDING_READY_MS });
  await expect(page.locator("main")).toBeVisible();
}

export async function waitForLandingReady(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectLandingReady(page);
}

/**
 * Wait until the hero island reports a terminal renderer state.
 * With `/?intro=skip`, opening UI can paint before the first WebGL frame —
 * do not treat data-opening-complete as renderer readiness.
 */
export async function waitForSettledLanding(
  page: Page,
  options: { requireWebGL?: boolean; testMode?: boolean } = {},
) {
  const { requireWebGL = false, testMode = false } = options;

  await page.goto(SETTLED_LANDING_PATH, { waitUntil: "domcontentloaded" });

  const hero = landingHero(page);
  await expect(hero).toBeVisible({ timeout: SETTLED_READY_MS });

  if (requireWebGL) {
    await expect(hero).toHaveAttribute("data-renderer-state", "webgl", {
      timeout: RENDERER_READY_MS,
    });
    await expect(hero.locator("canvas")).toHaveCount(1, {
      timeout: RENDERER_READY_MS,
    });
    await expect(hero).toHaveAttribute("data-opening-complete", "true", {
      timeout: SETTLED_READY_MS,
    });
    if (testMode) {
      await expect(hero).toHaveAttribute("data-e2e-renderer", "true");
    }
    return;
  }

  await expect
    .poll(async () => hero.getAttribute("data-renderer-state"), {
      timeout: RENDERER_READY_MS,
    })
    .toMatch(/^(webgl|fallback)$/);

  const state = await hero.getAttribute("data-renderer-state");
  if (state === "webgl") {
    await expect(hero).toHaveAttribute("data-opening-complete", "true", {
      timeout: SETTLED_READY_MS,
    });
  }
}

/**
 * Disable WebGL so Landing uses the static fallback instead of building the
 * full Three.js scene. Use for UI-only coverage.
 */
export async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const prototype = HTMLCanvasElement.prototype;
    const original = prototype.getContext;

    prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      ) {
        return null;
      }

      return original.apply(this, [type, ...args] as never);
    } as typeof prototype.getContext;
  });
}

/** Settled Landing chrome without initializing the heavy WebGL scene. */
export async function waitForLandingUi(page: Page) {
  await disableWebGL(page);

  await page.goto(SETTLED_LANDING_PATH, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({
    timeout: SETTLED_READY_MS,
  });

  const hero = landingHero(page);
  await expect(hero).toHaveAttribute("data-renderer-state", "fallback", {
    timeout: RENDERER_READY_MS,
  });

  await expect(page.locator("h1")).toContainText("Interior");
}

/**
 * Best-effort hero snapshot capped at 1s so post-timeout teardown cannot hang
 * the afterEach diagnostic for minutes.
 */
async function safeHeroState(page: Page) {
  return Promise.race([
    page.evaluate(() => {
      const hero = document.querySelector("#landing-hero-scene");

      if (!(hero instanceof HTMLElement)) {
        return {
          present: false,
          url: location.href,
        };
      }

      return {
        present: true,
        url: location.href,
        e2eRenderer: hero.dataset.e2eRenderer,
        renderer: hero.dataset.rendererState,
        paused: hero.dataset.paused,
        activeRoom: hero.dataset.activeRoom,
        resizeVersion: hero.dataset.resizeVersion,
        renderWidth: hero.dataset.renderWidth,
        renderHeight: hero.dataset.renderHeight,
        openingComplete: hero.dataset.openingComplete,
      };
    }),
    new Promise<{ diagnosticTimeout: true; url: string }>((resolve) => {
      setTimeout(
        () =>
          resolve({
            diagnosticTimeout: true,
            url: page.url(),
          }),
        1_000,
      );
    }),
  ]);
}

export async function attachLandingRendererState(
  page: Page,
  testInfo: TestInfo,
) {
  const state = await safeHeroState(page);
  await testInfo.attach("landing-hero-state", {
    body: JSON.stringify(state, null, 2),
    contentType: "application/json",
  });
}
