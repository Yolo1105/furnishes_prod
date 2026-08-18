import type { Page } from "@playwright/test";

export const E2E_OWNER = {
  email: "owner@example.com",
  password: "password1234",
  sessionToken: "e2e-owner-session-token",
};

export const E2E_STRANGER = {
  email: "stranger@example.com",
  password: "password1234",
  sessionToken: "e2e-stranger-session-token",
};

export async function setSessionCookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: "furnishes_session",
      value: token,
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
