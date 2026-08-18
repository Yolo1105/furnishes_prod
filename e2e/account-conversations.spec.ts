import { expect, test } from "@playwright/test";
import { E2E_OWNER, E2E_STRANGER, setSessionCookie } from "./account-helpers";

test("create conversation and send message via API", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const created = await request.post("/api/account/conversations", {
    data: {},
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  const sent = await request.post(`/api/account/conversations/${id}/messages`, {
    data: {
      content: "Help me plan a calm bedroom.",
      clientMessageId: crypto.randomUUID(),
    },
  });
  expect(sent.ok()).toBeTruthy();
});

test("unrelated user cannot post to another user's conversation", async ({
  request,
}) => {
  const ownerLogin = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(ownerLogin.ok()).toBeTruthy();
  const created = await request.post("/api/account/conversations", {
    data: {},
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  const stranger = await request.post("/api/auth/login", {
    data: {
      email: E2E_STRANGER.email,
      password: E2E_STRANGER.password,
    },
  });
  expect(stranger.ok()).toBeTruthy();

  const apiDenied = await request.post(
    `/api/account/conversations/${id}/messages`,
    {
      data: { content: "hello", clientMessageId: crypto.randomUUID() },
      headers: {
        cookie: `furnishes_session=${E2E_STRANGER.sessionToken}`,
      },
    },
  );
  expect(apiDenied.status()).toBe(404);
});

test("conversations deep link opens route-owned list", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/conversations");
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(
    page.locator('.nav a[href="/account/conversations"]'),
  ).toHaveCount(0);
  await expect(page.locator(".wf-title")).toContainText("Conversations");
  await expect(page.locator(".wireview")).toBeVisible();
});

test("new thread creates conversation and opens chat workspace", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await page.goto("/account/conversations");
  await page.getByRole("button", { name: "+ New thread" }).click();
  await expect(page).toHaveURL(/\/account\/conversations\/.+/);
  await expect(page.locator(".furnishes-account")).toBeVisible();
  await expect(page.locator(".wireview--chat")).toBeVisible();
  await expect(page.locator("#fa-rail-chat")).toBeVisible();
  await expect(page.locator("[data-chat-input]")).toBeVisible();
});

test("chat workspace loads messages and sends via API", async ({ page }) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  const created = await page.request.post("/api/account/conversations", {
    data: {},
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  await page.goto(`/account/conversations/${id}`);
  await expect(page.locator(".wf-empty__h")).toContainText(
    "How can I help you today?",
  );
  await page.locator("[data-chat-input]").fill("Help me plan a calm bedroom.");
  await page.locator("[data-chat-send]").click();
  await expect(page.locator(".wf-cmsg.wf-cmsg--me .wf-bub")).toContainText(
    "Help me plan a calm bedroom.",
  );
  await expect(
    page.locator(".wf-cmsg:not(.wf-cmsg--me) .wf-bub").first(),
  ).toBeVisible();
});

test("unrelated user cannot open another user's conversation page", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  const created = await page.request.post("/api/account/conversations", {
    data: {},
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()) as { id: string };

  await setSessionCookie(page, E2E_STRANGER.sessionToken);
  await page.goto(`/account/conversations/${id}`);
  await expect(
    page.getByRole("heading", { name: "Conversation not found" }),
  ).toBeVisible();
});
