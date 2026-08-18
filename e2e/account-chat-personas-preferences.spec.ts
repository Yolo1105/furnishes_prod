import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { E2E_OWNER, E2E_STRANGER, setSessionCookie } from "./account-helpers";

async function createConversation(request: APIRequestContext) {
  const response = await request.post("/api/account/conversations", {
    data: { title: `chat-memory-${Date.now()}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string };
}

async function ensureMemoryOn(page: Page) {
  const response = await page.request.put("/api/account/privacy/memory", {
    data: { memoryEnabled: true },
  });
  expect(response.ok()).toBeTruthy();
}

async function clearConfirmedPreferences(page: Page) {
  for (const category of ["room", "style", "color", "budget", "furniture"]) {
    await page.request.delete(`/api/account/preferences/${category}`);
  }
}

/** Pending proposals dedupe globally per user; clear before re-extracting. */
async function clearPendingProposals(page: Page) {
  const listed = await page.request.get("/api/account/preference-proposals");
  expect(listed.ok()).toBeTruthy();
  const body = (await listed.json()) as { proposals: Array<{ id: string }> };
  for (const proposal of body.proposals) {
    const rejected = await page.request.post(
      `/api/account/preference-proposals/${proposal.id}/reject`,
    );
    expect(rejected.ok()).toBeTruthy();
  }
}

async function resetPreferenceState(page: Page) {
  await clearPendingProposals(page);
  await clearConfirmedPreferences(page);
}

async function openEvaPanelIfNeeded(page: Page) {
  const swap = page.getByRole("button", { name: "Change Eva persona" });
  const chip = page.locator(".wf-evachip");
  // Desktop: swap is already visible in the aside. Mobile: open via Eva chip
  // (chip exists but is CSS-hidden on desktop, so don't require it alone).
  await expect
    .poll(
      async () =>
        (await swap.isVisible().catch(() => false)) ||
        (await chip.isVisible().catch(() => false)),
      { timeout: 15_000 },
    )
    .toBeTruthy();
  if (await swap.isVisible().catch(() => false)) return;
  await chip.click();
  await expect(swap).toBeVisible({ timeout: 15_000 });
}

/** Pin the banner by id so `.first()` cannot retarget the next pending card. */
async function acceptProposalBanner(
  page: Page,
  banner: ReturnType<Page["locator"]>,
) {
  const id = await banner.getAttribute("data-proposal-id");
  expect(id).toBeTruthy();
  const card = page.locator(`.wf-propbanner[data-proposal-id="${id}"]`);
  await card.getByRole("button", { name: "Accept" }).click();
  await expect(card).toHaveCount(0, { timeout: 15_000 });
}

async function sendChatMessage(page: Page, text: string) {
  const input = page.locator("[data-chat-input]");
  const send = page.locator("[data-chat-send]");
  // Preference/persona overlays inert the composer; wait until they close.
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
  // Composer stays disabled while a reply streams — wait before typing.
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill(text);
  await expect(input).toHaveValue(text);
  await expect(send).toBeEnabled({ timeout: 10_000 });
  await send.click();
}

test.describe("account chat personas and preferences", () => {
  test("persona selection persists and affects local replies", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    const created = await page.request.post("/api/account/conversations", {
      data: { title: `persona-flow-${Date.now()}` },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: string };

    await page.goto(`/account/conversations/${id}`);
    await openEvaPanelIfNeeded(page);
    await page.getByRole("button", { name: "Change Eva persona" }).click();
    await page.getByRole("radio", { name: /Eva · Style/i }).click();
    await expect(page.locator(".wf-toast")).toContainText(
      "Switched to Eva · Style",
    );
    await expect(page.locator("[data-persona-name]")).toContainText(
      "Eva · Style",
    );
    await expect(page.locator("[data-persona-tag]")).toContainText(
      "Aesthetic & cohesion first",
    );

    const persisted = await page.request.get("/api/account/assistant-persona");
    expect(persisted.ok()).toBeTruthy();
    const personaState = (await persisted.json()) as {
      activePersona: { id: string; name: string };
    };
    expect(personaState.activePersona.id).toBe("eva-style");

    await page.reload();
    await expect(page.locator("[data-persona-name]")).toContainText(
      "Eva · Style",
    );

    await sendChatMessage(page, "Help me refine the mood.");
    await expect(page.getByText("[local:eva-style]")).toBeVisible();

    await page.locator('button[aria-label="Change Eva persona"]').click();
    await page.getByRole("radio", { name: /Eva · Plan/i }).click();
    await sendChatMessage(page, "What about circulation?");
    await expect(page.getByText("[local:eva-plan]")).toBeVisible();
    await expect(page.getByText("[local:eva-style]")).toBeVisible();
  });

  test("typed preference proposal accept/edit/reject/undo and source", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    await resetPreferenceState(page);

    const created = await page.request.post("/api/account/conversations", {
      data: { title: `pref-flow-${Date.now()}` },
    });
    const { id } = (await created.json()) as { id: string };
    await page.goto(`/account/conversations/${id}`);

    await sendChatMessage(
      page,
      "I want a scandinavian bedroom with navy blue accents under $3000.",
    );
    await expect(page.locator(".wf-propbanner").first()).toBeVisible({
      timeout: 15_000,
    });

    await acceptProposalBanner(page, page.locator(".wf-propbanner").first());

    await sendChatMessage(page, "Please remember modern style for this room.");
    await expect(
      page
        .locator(".wf-propbanner")
        .first()
        .getByRole("button", { name: "Edit" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await page
      .locator(".wf-propbanner")
      .first()
      .getByRole("button", { name: "Edit" })
      .click();
    await page.locator(".wf-prefedit input").fill("contemporary");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog", { name: /Edit/i })).toHaveCount(0);
    await expect(page.getByText(/contemporary/i).first()).toBeVisible();

    await sendChatMessage(page, "Also consider a sofa and coffee table.");
    await expect(
      page
        .locator(".wf-propbanner")
        .first()
        .getByRole("button", { name: "Dismiss" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await page
      .locator(".wf-propbanner")
      .first()
      .getByRole("button", { name: "View source" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Preference source" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await page
      .locator(".wf-propbanner")
      .first()
      .getByRole("button", { name: "Dismiss" })
      .click();
  });

  test("manual preference chips persist and memory-off skips proposals", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    await page.request.delete("/api/account/preferences/room");

    const created = await page.request.post("/api/account/conversations", {
      data: { title: `manual-pref-${Date.now()}` },
    });
    const { id } = (await created.json()) as { id: string };
    await page.goto(`/account/conversations/${id}`);
    await openEvaPanelIfNeeded(page);
    await page
      .getByRole("button", {
        name: /Tell Eva which rooms/i,
      })
      .click();
    await page.getByLabel("Preference value").fill("living room");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".wf-toast")).toContainText("Preference saved");
    await page.reload();
    await openEvaPanelIfNeeded(page);
    await expect(page.getByText("Living Room").first()).toBeVisible();
    await expect(page.locator(".wf-pref.done .wf-psel__v").first()).toHaveText(
      "Living Room",
    );

    await page.request.put("/api/account/privacy/memory", {
      data: { memoryEnabled: false },
    });
    const response = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "I want japandi kitchen under $2000 with a sofa.",
          clientMessageId: crypto.randomUUID(),
          messageSource: "typed",
        },
      },
    );
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      preferenceProposals: unknown[];
    };
    expect(body.preferenceProposals).toEqual([]);
    await ensureMemoryOn(page);
  });

  test("authorization: stranger cannot resolve owner proposals", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    await clearPendingProposals(page);
    const created = await page.request.post("/api/account/conversations", {
      data: { title: `auth-pref-${Date.now()}` },
    });
    const { id } = (await created.json()) as { id: string };
    const sent = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "I love coastal living room style.",
          clientMessageId: crypto.randomUUID(),
          messageSource: "typed",
        },
      },
    );
    const payload = (await sent.json()) as {
      preferenceProposals: Array<{ id: string }>;
    };
    const proposalId = payload.preferenceProposals[0]?.id;
    expect(proposalId).toBeTruthy();

    await setSessionCookie(page, E2E_STRANGER.sessionToken);
    const accept = await page.request.post(
      `/api/account/preference-proposals/${proposalId}/accept`,
      { data: {} },
    );
    expect(accept.status()).toBe(404);
    const source = await page.request.get(
      `/api/account/preference-proposals/${proposalId}/source`,
    );
    expect(source.status()).toBe(404);
  });

  test("messageSource extraction rules via API", async ({ page }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    await clearPendingProposals(page);
    const { id } = await createConversation(page.request);

    const quick = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "I want japandi bedroom under $2500",
          clientMessageId: crypto.randomUUID(),
          messageSource: "quick_suggestion",
        },
      },
    );
    const quickBody = (await quick.json()) as {
      preferenceProposals: unknown[];
    };
    expect(quickBody.preferenceProposals).toEqual([]);

    const brainstorm = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "I want japandi bedroom under $2500",
          clientMessageId: crypto.randomUUID(),
          messageSource: "brainstorm",
        },
      },
    );
    const brainstormBody = (await brainstorm.json()) as {
      preferenceProposals: unknown[];
    };
    expect(brainstormBody.preferenceProposals).toEqual([]);

    const room = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "Help me plan my living room.",
          clientMessageId: crypto.randomUUID(),
          messageSource: "room_starter",
        },
      },
    );
    const roomBody = (await room.json()) as {
      preferenceProposals: Array<{ category: string }>;
    };
    for (const proposal of roomBody.preferenceProposals) {
      expect(proposal.category).toBe("room");
    }
  });

  test("overlay Escape closes topmost only and restores persona focus", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    const { id } = await createConversation(page.request);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/account/conversations/${id}`);
    await expect(page.locator("[data-chat-input]")).toBeVisible();
    await openEvaPanelIfNeeded(page);

    const swap = page.getByRole("button", { name: "Change Eva persona" });
    await swap.click();
    await expect(
      page.getByRole("dialog", { name: "Choose Eva" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Choose Eva" })).toHaveCount(
      0,
    );
    await expect(page.locator(".wf-cx__aside.open")).toHaveCount(0);
    await expect(page.locator(".wf-evachip")).toBeFocused();
  });

  test("confirmed preference save failure keeps editor open", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    const { id } = await createConversation(page.request);
    await page.request.patch("/api/account/preferences/style", {
      data: { value: "japandi", sourceConversationId: id },
    });
    await page.goto(`/account/conversations/${id}`);
    await openEvaPanelIfNeeded(page);

    await page.route("**/api/account/preferences/style", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "server",
            message: "Simulated save failure",
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole("button", { name: /Japandi/i }).click();
    const dialog = page.getByRole("dialog", { name: "Current preference" });
    await expect(dialog).toBeVisible();
    await dialog.locator("input").fill("coastal modern");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator(".wf-toast")).toContainText(
      "Could not save preference",
    );
    await expect(dialog).toBeVisible();
    // Save mousedown prevents blur, so the draft stays in the input on failure.
    await expect(dialog.locator("input")).toHaveValue("coastal modern");
  });

  test("collapsed inline proposals stay pending and return after reload", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    await resetPreferenceState(page);
    const { id } = await createConversation(page.request);
    await page.goto(`/account/conversations/${id}`);
    await sendChatMessage(
      page,
      "I want a scandinavian bedroom with navy blue accents under $3000.",
    );
    await expect(page.locator(".wf-propbanner").first()).toBeVisible({
      timeout: 15_000,
    });
    // Collapse via React state (DOM .remove() is restored on re-render).
    await page.evaluate(() => {
      window.dispatchEvent(new Event("furnishes:collapse-inline-proposals"));
    });
    await expect(page.locator(".wf-propbanner")).toHaveCount(0);

    // Review aside was removed — pending proposals persist server-side and
    // surface again as inline cards after a fresh load.
    await page.reload();
    const card = page.locator(".wf-propbanner").first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByRole("button", { name: "Accept" })).toBeVisible();
  });

  test("send failure restores draft and shows alert", async ({ page }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    const { id } = await createConversation(page.request);
    await page.goto(`/account/conversations/${id}`);

    await page.route(`**/api/account/conversations/${id}/messages`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "unavailable",
          message: "Provider offline",
        }),
      }),
    );

    const draft = "Can you outline a soft lighting plan?";
    await sendChatMessage(page, draft);
    await expect(page.locator(".wf-cxerrs")).toContainText("Provider offline");
    await expect(page.locator("[data-chat-input]")).toHaveValue(draft);
  });

  test("Jump to latest appears after scrolling up during new messages", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    const { id } = await createConversation(page.request);
    for (let i = 0; i < 6; i += 1) {
      const response = await page.request.post(
        `/api/account/conversations/${id}/messages`,
        {
          data: {
            content: `Seed message ${i} for scroll depth.`,
            clientMessageId: crypto.randomUUID(),
            messageSource: "typed",
          },
        },
      );
      expect(response.ok()).toBeTruthy();
    }
    await page.goto(`/account/conversations/${id}`);
    await expect(page.locator(".wf-cmsg").first()).toBeVisible();
    await page.locator(".wf-cx__body").evaluate((el) => {
      el.scrollTop = 0;
    });
    await sendChatMessage(page, "Another follow-up note.");
    await expect(
      page.getByRole("button", { name: "Jump to latest" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Jump to latest" }).click();
    await expect(
      page.getByRole("button", { name: "Jump to latest" }),
    ).toHaveCount(0);
  });

  test("duplicate clientMessageId does not create a second user message", async ({
    page,
  }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    const { id } = await createConversation(page.request);
    const clientMessageId = crypto.randomUUID();
    const first = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "Idempotent send for living room.",
          clientMessageId,
          messageSource: "typed",
        },
      },
    );
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as {
      userMessage: { id: string };
      assistantMessage: { id: string };
    };

    const second = await page.request.post(
      `/api/account/conversations/${id}/messages`,
      {
        data: {
          content: "Idempotent send for living room.",
          clientMessageId,
          messageSource: "typed",
        },
      },
    );
    expect(second.ok()).toBeTruthy();
    const secondBody = (await second.json()) as {
      userMessage: { id: string };
      assistantMessage: { id: string };
    };
    expect(secondBody.userMessage.id).toBe(firstBody.userMessage.id);
    expect(secondBody.assistantMessage.id).toBe(firstBody.assistantMessage.id);
  });

  test("accepted preference keeps Source after reload", async ({ page }) => {
    await setSessionCookie(page, E2E_OWNER.sessionToken);
    await ensureMemoryOn(page);
    await resetPreferenceState(page);
    const { id } = await createConversation(page.request);
    await page.goto(`/account/conversations/${id}`);
    await sendChatMessage(
      page,
      "I want a scandinavian bedroom with navy blue accents under $3000.",
    );
    const firstCard = page.locator(".wf-propbanner").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await expect(firstCard.getByRole("button", { name: "Accept" })).toBeVisible(
      { timeout: 15_000 },
    );
    await acceptProposalBanner(page, firstCard);

    await page.reload();
    await openEvaPanelIfNeeded(page);
    const sourceButton = page.getByRole("button", { name: "Source" }).first();
    await expect(sourceButton).toBeVisible({ timeout: 15_000 });
    await sourceButton.click();
    await expect(
      page.getByRole("heading", { name: "Preference source" }),
    ).toBeVisible();
  });
});
