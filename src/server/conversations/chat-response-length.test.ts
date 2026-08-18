import { describe, expect, it } from "vitest";
import { getResponseLengthInstruction } from "./chat-response-length";

describe("getResponseLengthInstruction", () => {
  it("keeps greetings short", () => {
    expect(getResponseLengthInstruction("Hi")).toContain("1-2 short sentences");
    expect(getResponseLengthInstruction("hello!")).toContain(
      "1-2 short sentences",
    );
  });

  it("keeps brief requests short", () => {
    expect(getResponseLengthInstruction("Quick summary please")).toContain(
      "1-2 short sentences",
    );
  });

  it("allows depth for explain / compare / plan", () => {
    const instruction = getResponseLengthInstruction(
      "Can you explain and compare two layout plans?",
    );
    expect(instruction).toMatch(/compare|depth|conversational/i);
  });

  it("answers questions directly", () => {
    expect(getResponseLengthInstruction("What rug size works?")).toContain(
      "Answer the question directly",
    );
  });

  it("defaults to short paragraphs", () => {
    expect(
      getResponseLengthInstruction("Looking at soft neutrals for the walls."),
    ).toContain("1–2 short paragraphs");
  });
});
