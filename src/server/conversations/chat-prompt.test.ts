import { describe, expect, it } from "vitest";
import { getAssistantPersonaById } from "@/lib/eva/personas/catalog";
import { buildChatSystemPrompt } from "./chat-prompt";

const baseInput = {
  persona: getAssistantPersonaById("eva-general")!,
  memoryEnabled: false,
  confirmedPreferences: {
    room: null,
    budget: null,
    style: null,
    color: null,
    furniture: null,
  },
  profileContext: {
    styleWords: null,
    budgetMinimum: null,
    budgetMaximum: null,
    budgetCurrency: null,
    projectName: null,
    projectSummary: null,
  },
};

describe("buildChatSystemPrompt", () => {
  it("includes style-conflict guidance in the base prompt", () => {
    const prompt = buildChatSystemPrompt(baseInput);
    expect(prompt).toMatch(/conflicting style signals/i);
    expect(prompt).toMatch(/dominant\/accent/i);
    expect(prompt).toMatch(/never silently pick/i);
  });

  it("appends critical-turn facts when present", () => {
    const prompt = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "Living room ideas under $5000, avoid dark wood.",
    });
    expect(prompt).toContain("Same-turn user constraints");
    expect(prompt).toContain("Budget");
    expect(prompt).toMatch(/dark wood/i);
  });

  it("appends design rules for layout keywords only", () => {
    const withRules = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "What clearance do I need between furniture?",
    });
    expect(withRules).toContain("[DESIGN RULES]");

    const withoutRules = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "I like navy accents.",
    });
    expect(withoutRules).not.toContain("[DESIGN RULES]");
  });

  it("ends with a response-length instruction", () => {
    const prompt = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "Hi",
    });
    expect(prompt).toContain("Respond in 1-2 short sentences.");
  });

  it("flag-off RAG leaves prompts byte-identical without a knowledge block", () => {
    const without = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "I like navy accents.",
    });
    const withEmpty = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "I like navy accents.",
      referenceKnowledgeBlock: "",
    });
    expect(withEmpty).toBe(without);
    expect(without).not.toContain("Reference knowledge");
  });

  it("flag-off summary/memory/plan leave prompts byte-identical without blocks", () => {
    const without = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "I like navy accents.",
    });
    const withEmpty = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "I like navy accents.",
      contextSummaryBlock: "",
      projectMemoryBlock: "",
      roomPlanBlock: "",
    });
    expect(withEmpty).toBe(without);
    expect(without).not.toContain("CONVERSATION MEMORY");
    expect(without).not.toContain("PROJECT CONTEXT");
    expect(without).not.toContain("ROOM PLAN");
  });

  it("appends conversation memory and project memory blocks when provided", () => {
    const prompt = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "Continue.",
      contextSummaryBlock:
        "CONVERSATION MEMORY — earlier context (summarized)\nthe user wants a calm palette\nTreat as accurate history; prefer recent messages when they conflict.",
      projectMemoryBlock:
        "[PROJECT CONTEXT — ground truth for this thread]\nUse this JSON…\n{}",
      roomPlanBlock:
        '[ROOM PLAN — orderable readiness]\nUse this JSON…\n{"remaining":"USD 2700"}',
    });
    expect(prompt).toContain("CONVERSATION MEMORY");
    expect(prompt).toContain("PROJECT CONTEXT");
    expect(prompt).toContain("ROOM PLAN");
    // Cache-friendly order: project memory (4) before room plan / summary.
    expect(prompt.indexOf("PROJECT CONTEXT")).toBeLessThan(
      prompt.indexOf("ROOM PLAN"),
    );
    expect(prompt.indexOf("ROOM PLAN")).toBeLessThan(
      prompt.indexOf("CONVERSATION MEMORY"),
    );
  });

  it("places design rules before critical facts (stable prefix first)", () => {
    const prompt = buildChatSystemPrompt({
      ...baseInput,
      userMessage:
        "What clearance do I need between furniture under $5000, avoid dark wood?",
    });
    const rulesIdx = prompt.indexOf("[DESIGN RULES]");
    const factsIdx = prompt.indexOf("Same-turn user constraints");
    expect(rulesIdx).toBeGreaterThan(-1);
    expect(factsIdx).toBeGreaterThan(-1);
    expect(rulesIdx).toBeLessThan(factsIdx);
  });

  it("appends reference knowledge when provided", () => {
    const prompt = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "Help with color.",
      referenceKnowledgeBlock:
        "Reference knowledge\n[1] source=color-theory.md\n60-30-10 rule",
    });
    expect(prompt).toContain("Reference knowledge");
    expect(prompt).toContain("color-theory.md");
  });

  it("appends attachment grounding when provided", () => {
    const prompt = buildChatSystemPrompt({
      ...baseInput,
      userMessage: "What do you see?",
      attachmentGroundingBlock:
        "Attached images\n- Attachment 1 (room.jpg, image/jpeg): Navy sofa",
    });
    expect(prompt).toContain("Attached images");
    expect(prompt).toContain("Navy sofa");
  });
});
