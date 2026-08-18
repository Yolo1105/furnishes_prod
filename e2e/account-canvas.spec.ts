import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";

async function resetPlaygroundConversations(page: Page) {
  const projectsRes = await page.request.get("/api/studio/projects");
  if (!projectsRes.ok()) return;
  const body = (await projectsRes.json()) as {
    projects?: { id: string }[];
  };
  for (const project of body.projects ?? []) {
    const convosRes = await page.request.get(
      `/api/conversations?projectId=${encodeURIComponent(project.id)}`,
    );
    if (!convosRes.ok()) continue;
    const convos = (await convosRes.json()) as {
      conversations?: { id: string }[];
    };
    for (const convo of convos.conversations ?? []) {
      await page.request.delete(
        `/api/conversations/${encodeURIComponent(convo.id)}`,
      );
    }
  }
}

async function waitForCanvasProject(page: Page, projectName: string) {
  const canvas = page.locator("[data-canvas-playground]");
  await expect(canvas).toHaveAttribute("data-canvas-project", projectName, {
    timeout: 30_000,
  });
  await expect(canvas).toHaveAttribute("data-canvas-ready", "1", {
    timeout: 30_000,
  });
}

async function openProjectsModal(page: Page) {
  await page
    .getByRole("button", { name: "All projects", exact: true })
    .click({ force: true });
  const dialog = page.getByRole("dialog", { name: "Projects" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openChatHistory(page: Page) {
  await page
    .getByRole("button", { name: "Chat history", exact: true })
    .click({ force: true });
  const dialog = page.getByRole("dialog", { name: "Chat history" });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

async function closeDialog(page: Page, dialog: Locator) {
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

async function switchProject(page: Page, projectName: string) {
  const dialog = await openProjectsModal(page);
  await dialog.getByRole("button", { name: projectName, exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await waitForCanvasProject(page, projectName);
}

function conversationButton(dialog: Locator, title: string) {
  return dialog.getByRole("button", { name: title, exact: true });
}

test("canvas project switch preserves per-project conversations", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);
  await resetPlaygroundConversations(page);
  await page.goto("/account/canvas");
  await waitForCanvasProject(page, "Demo apartment");

  let chatHistory = await openChatHistory(page);
  await expect(conversationButton(chatHistory, "Conversation 1")).toBeVisible({
    timeout: 30_000,
  });

  await chatHistory.getByRole("button", { name: "New conversation" }).click();
  await expect(conversationButton(chatHistory, "Conversation 2")).toBeVisible({
    timeout: 15_000,
  });

  await closeDialog(page, chatHistory);

  await switchProject(page, "Blank Canvas");

  chatHistory = await openChatHistory(page);
  await expect(conversationButton(chatHistory, "Conversation 1")).toBeVisible();
  await expect(conversationButton(chatHistory, "Conversation 2")).toHaveCount(
    0,
  );

  await closeDialog(page, chatHistory);

  await switchProject(page, "Demo apartment");

  chatHistory = await openChatHistory(page);
  await expect(conversationButton(chatHistory, "Conversation 2")).toBeVisible({
    timeout: 30_000,
  });
});
