/**
 * Account architecture visual capture + regression.
 *
 * Frozen baselines live in docs/account-architecture-baseline/.
 * Default: write candidates to docs/account-architecture-candidate/ and
 * pixel-compare against the frozen set (fails if any file exceeds threshold).
 *
 * UPDATE_ACCOUNT_BASELINE=1 — overwrite the approved baseline (signoff only).
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { expect, test, type Page } from "@playwright/test";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";

const BASELINE = path.resolve("docs/account-architecture-baseline");
const CANDIDATE = path.resolve("docs/account-architecture-candidate");
const DIFF = path.resolve("docs/account-architecture-diff");
const UPDATE = process.env.UPDATE_ACCOUNT_BASELINE === "1";
const OUT = UPDATE ? BASELINE : CANDIDATE;

/** Max mismatched pixel ratio before a screen fails (fonts / AA / live data). */
const MAX_DIFF_RATIO = 0.08;

const VIEWPORTS = {
  desktop1440: { width: 1440, height: 900 },
  desktop1280: { width: 1280, height: 800 },
  tablet: { width: 1024, height: 768 },
  mobile390: { width: 390, height: 844 },
  mobile360: { width: 360, height: 800 },
} as const;

async function settle(page: Page) {
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await page.waitForTimeout(350);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: false,
    animations: "disabled",
  });
}

async function gotoAccount(page: Page, url: string) {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto(url);
  await settle(page);
}

function comparePng(name: string): { ratio: number; mismatched: number } {
  const expectedPath = path.join(BASELINE, name);
  const actualPath = path.join(CANDIDATE, name);
  if (!fs.existsSync(expectedPath)) {
    throw new Error(`Missing baseline: ${name}`);
  }
  if (!fs.existsSync(actualPath)) {
    throw new Error(`Missing candidate: ${name}`);
  }
  const expected = PNG.sync.read(fs.readFileSync(expectedPath));
  const actual = PNG.sync.read(fs.readFileSync(actualPath));
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return { ratio: 1, mismatched: expected.width * expected.height };
  }
  const diff = new PNG({ width: expected.width, height: expected.height });
  const mismatched = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    expected.width,
    expected.height,
    { threshold: 0.12 },
  );
  fs.mkdirSync(DIFF, { recursive: true });
  fs.writeFileSync(path.join(DIFF, name), PNG.sync.write(diff));
  const ratio = mismatched / (expected.width * expected.height);
  return { ratio, mismatched };
}

test.describe("Account architecture visual regression", () => {
  test("capture required screenshots", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(VIEWPORTS.desktop1440);

    await gotoAccount(page, "/account");
    await shot(page, "dashboard-desktop.png");

    await page.setViewportSize(VIEWPORTS.mobile390);
    await gotoAccount(page, "/account");
    await shot(page, "dashboard-mobile.png");

    await page.setViewportSize(VIEWPORTS.desktop1440);
    await gotoAccount(page, "/account/activity");
    await shot(page, "activity-desktop.png");

    await gotoAccount(page, "/account/style");
    await shot(page, "style-desktop.png");

    await gotoAccount(page, "/account/budget");
    await shot(page, "budget-desktop.png");

    await gotoAccount(page, "/account/privacy");
    await shot(page, "privacy-desktop.png");

    await gotoAccount(page, "/account/conversations");
    await shot(page, "conversations-desktop.png");

    const conversationLink = page
      .locator('a[href^="/account/conversations/"]')
      .first();
    await expect(conversationLink).toBeVisible();
    await conversationLink.click();
    await expect(page.locator("#fa-rail-chat")).toBeVisible();
    await settle(page);
    await shot(page, "conversation-desktop.png");

    await page.setViewportSize(VIEWPORTS.mobile390);
    await gotoAccount(page, "/account/conversations");
    await page.locator('a[href^="/account/conversations/"]').first().click();
    await expect(page.locator("#fa-rail-chat")).toBeVisible();
    await settle(page);
    await shot(page, "chat-mobile.png");

    await page.setViewportSize(VIEWPORTS.desktop1440);
    await gotoAccount(page, "/account/projects");
    await shot(page, "projects-desktop.png");

    const projectLink = page.locator('a[href^="/account/projects/"]').first();
    await expect(projectLink).toBeVisible();
    await projectLink.click();
    await expect(page.locator(".wf-title")).toBeVisible();
    await settle(page);
    await shot(page, "project-detail-desktop.png");
    await shot(page, "inspector-open-desktop.png");

    await gotoAccount(page, "/account/uploads");
    await shot(page, "uploads-desktop.png");

    await gotoAccount(page, "/account/image-generation");
    await shot(page, "image-generation-desktop.png");

    await gotoAccount(page, "/account/inspiration");
    await shot(page, "inspiration-desktop.png");

    await gotoAccount(page, "/account/settings");
    await shot(page, "settings-desktop.png");

    await page.getByRole("button", { name: "Change", exact: true }).click();
    await expect(page.locator(".wf-insp__t")).toContainText("Change password");
    await settle(page);
    await shot(page, "dialog-open-desktop.png");

    await gotoAccount(page, "/account/help");
    await shot(page, "help-desktop.png");

    await page.setViewportSize(VIEWPORTS.mobile390);
    await gotoAccount(page, "/account");
    await shot(page, "navigation-mobile.png");

    await page.setViewportSize(VIEWPORTS.desktop1280);
    await gotoAccount(page, "/account");
    await shot(page, "dashboard-1280.png");

    await page.setViewportSize(VIEWPORTS.tablet);
    await gotoAccount(page, "/account");
    await shot(page, "dashboard-1024.png");

    await page.setViewportSize(VIEWPORTS.mobile360);
    await gotoAccount(page, "/account");
    await shot(page, "dashboard-360.png");
  });

  test("compare candidates to approved baseline", async () => {
    test.skip(UPDATE, "Baseline was just updated — skip compare this run");

    const names = fs
      .readdirSync(BASELINE)
      .filter((name) => name.endsWith(".png"))
      .sort();
    expect(names.length).toBeGreaterThan(0);

    const failures: string[] = [];
    const report: string[] = [];

    for (const name of names) {
      if (!fs.existsSync(path.join(CANDIDATE, name))) {
        failures.push(`${name}: candidate missing (run capture first)`);
        continue;
      }
      const { ratio, mismatched } = comparePng(name);
      report.push(`${name}: ${(ratio * 100).toFixed(2)}% (${mismatched} px)`);
      if (ratio > MAX_DIFF_RATIO) {
        failures.push(
          `${name}: ${(ratio * 100).toFixed(2)}% > ${(MAX_DIFF_RATIO * 100).toFixed(0)}% (see docs/account-architecture-diff/)`,
        );
      }
    }

    fs.mkdirSync(DIFF, { recursive: true });
    fs.writeFileSync(
      path.join(DIFF, "SUMMARY.txt"),
      [
        `Threshold: ${(MAX_DIFF_RATIO * 100).toFixed(0)}% mismatched pixels`,
        ...report,
        failures.length
          ? `\nFAILED (${failures.length}):\n${failures.map((f) => `  - ${f}`).join("\n")}`
          : "\nAll screens within threshold.",
      ].join("\n"),
    );

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
