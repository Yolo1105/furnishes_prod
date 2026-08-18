import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderAssistantContent } from "./chat-message-content";

function html(text: string): string {
  return renderToStaticMarkup(
    createElement(Fragment, null, renderAssistantContent(text)),
  );
}

describe("renderAssistantContent", () => {
  it("hides heading hashes and bold markers", () => {
    const out = html(
      "### Where to Splurge:\n- **Lighting**: warm bulbs\nplain line",
    );
    expect(out).not.toContain("###");
    expect(out).not.toContain("**");
    expect(out).toContain("Where to Splurge:");
    expect(out).toContain("<strong>Lighting</strong>");
    expect(out).toContain("warm bulbs");
    expect(out).toContain('role="heading"');
  });

  it("keeps entity marks clickable", () => {
    const out = html("Try [[oak flooring]] next.");
    expect(out).toContain("data-ent");
    expect(out).toContain("oak flooring");
    expect(out).not.toContain("[[");
  });
});
