export type ChatSseEvent =
  | {
      type: "user";
      message: {
        id: string;
        role: "user";
        content: string;
        status: string;
        createdAt: string;
      };
    }
  | { type: "delta"; text: string }
  | { type: "tool_activity"; tool: string; status: string }
  | {
      type: "done";
      userMessage: {
        id: string;
        role: "user";
        content: string;
        status: string;
        createdAt: string;
      };
      assistantMessage: {
        id: string;
        role: "assistant";
        content: string;
        status: string;
        assistantId: string | null;
        createdAt: string;
      };
      assistantPersona: unknown;
      preferenceProposals: unknown[];
    }
  | {
      type: "stopped";
      assistantMessage: {
        id: string;
        role: "assistant";
        content: string;
        status: string;
        assistantId: string | null;
        createdAt: string;
      };
    }
  | { type: "meta"; costWarning?: boolean }
  | { type: "error"; error: string; message: string };

export function encodeSseEvent(event: ChatSseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSseResponse(
  stream: ReadableStream<Uint8Array>,
): Response {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
