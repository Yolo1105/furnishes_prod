import { expect, test } from "@playwright/test";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";
import {
  QUIZ_RESULT_STORAGE_KEY,
  type QuizResultV1,
} from "../src/lib/contracts/quiz-result";

test("quiz intro opens from Design Work rail", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account");
  await page.locator('.nav a[href="/account/quiz"]').click();
  await expect(page).toHaveURL(/\/account\/quiz/);
  await expect(page.locator('.nav a[href="/account/quiz"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".wf-title")).toContainText("Quiz");
  await expect(page.getByRole("button", { name: /Full quiz/ })).toBeVisible();
  await expect(page.locator(".wf-quiz-opt")).toHaveCount(4);
  await expect(
    page.locator('a.wf-btn[href="/quiz?mode=full&start=1"]').first(),
  ).toContainText(/Start full quiz/i);
});

test("quiz intro can start a single path", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/quiz");
  await page.getByRole("radio", { name: /Style/ }).click();
  await expect(
    page.locator('a.wf-btn[href="/quiz?mode=style&start=1"]').first(),
  ).toContainText(/Start Style only/i);
  await page
    .locator('a.wf-btn[href="/quiz?mode=style&start=1"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/quiz\?mode=style&start=1/);
});

test("public quiz handoff creates quiz-tagged proposals after signup", async ({
  page,
}) => {
  const result: QuizResultV1 = {
    version: 1,
    completedAt: new Date().toISOString(),
    answers: {
      style: { primary: "minimalist", secondary: ["organic"] },
      palette: { colors: ["warm linen"], avoid: [] },
      roomFocus: "living room",
      budgetBand: "$5k–$8k",
      lifestyle: [],
      furniture: ["sofa"],
    },
    rawScores: { minimalist: 9, organic: 3 },
  };

  await page.goto("/signup");
  await page.evaluate(
    ({ key, payload }) => {
      sessionStorage.setItem(key, JSON.stringify(payload));
    },
    { key: QUIZ_RESULT_STORAGE_KEY, payload: result },
  );

  const email = `quiz-handoff-${Date.now()}@example.com`;
  await page.getByLabel("Display name").fill("Quiz Handoff");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });

  await expect
    .poll(async () => {
      const listed = await page.request.get(
        "/api/account/preference-proposals",
      );
      if (!listed.ok()) return 0;
      const body = (await listed.json()) as {
        proposals: Array<{ source?: string; proposedValue: string }>;
      };
      return body.proposals.filter((row) => row.source === "quiz").length;
    })
    .toBeGreaterThan(0);

  const created = await page.request.post("/api/account/conversations", {
    data: { title: `quiz-handoff-${Date.now()}` },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };
  await page.goto(`/account/conversations/${id}`);
  await expect(page.locator("[data-quiz-source]").first()).toBeVisible({
    timeout: 15_000,
  });
});
