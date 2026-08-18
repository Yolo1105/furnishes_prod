import { type ReactNode } from "react";

/**
 * Render assistant message text for the chat bubble.
 * Supports a small Markdown subset so users never see raw `##` / `**`,
 * while preserving `[[entity]]` highlight marks.
 */
export function renderAssistantContent(text: string): ReactNode {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[0]?.trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }
  return lines.map((line, index) => {
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (heading) {
      const level = Math.min(heading[1]?.length ?? 3, 3);
      return (
        <div
          key={index}
          className={`wf-md-h wf-md-h${level}`}
          role="heading"
          aria-level={level}
        >
          {renderInline(heading[2] ?? "", `${index}-h`)}
        </div>
      );
    }

    const list = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (list) {
      const indent = Math.min(Math.floor((list[1]?.length ?? 0) / 2), 3);
      return (
        <div
          key={index}
          className="wf-md-li"
          style={
            indent > 0 ? { paddingLeft: `${indent * 0.85}rem` } : undefined
          }
        >
          <span className="wf-md-bullet" aria-hidden="true">
            •
          </span>
          <span className="wf-md-li__t">
            {renderInline(list[3] ?? "", `${index}-li`)}
          </span>
        </div>
      );
    }

    if (line.trim() === "") {
      return <div key={index} className="wf-md-br" aria-hidden="true" />;
    }

    return (
      <div key={index} className="wf-md-p">
        {renderInline(line, `${index}-p`)}
      </div>
    );
  });
}

function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\[\[.+?\]\])/g);
  return parts.map((part, index) => {
    const entity = part.match(/^\[\[(.+?)\]\]$/);
    if (entity) {
      return (
        <mark className="wf-hl" data-ent key={`${keyPrefix}-e${index}`}>
          {entity[1]}
        </mark>
      );
    }
    return renderEmphasis(part, `${keyPrefix}-t${index}`);
  });
}

/** Bold `**text**` and italic `*text*` (no nested markdown). */
function renderEmphasis(text: string, keyPrefix: string): ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return <strong key={`${keyPrefix}-b${index}`}>{bold[1]}</strong>;
    }
    const italic = part.match(/^\*([^*]+)\*$/);
    if (italic) {
      return <em key={`${keyPrefix}-i${index}`}>{italic[1]}</em>;
    }
    return <span key={`${keyPrefix}-s${index}`}>{part}</span>;
  });
}
