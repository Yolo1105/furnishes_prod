import { getSharedConversation } from "@/server/conversations/chat-share";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ shareId: string }> };

/**
 * Minimal anonymous shared-conversation page.
 * Product decision: title + messages only (no preference values).
 */
export default async function SharedConversationPage({ params }: Params) {
  const { shareId } = await params;
  const result = await getSharedConversation(shareId);
  if (!result.ok) notFound();

  const { title, messages, expiresAt } = result.value;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#1a1a1a",
        background:
          "linear-gradient(180deg, #f7f4ef 0%, #efe8dc 40%, #f7f4ef 100%)",
        minHeight: "100vh",
      }}
    >
      <p
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6b6358",
          marginBottom: 8,
        }}
      >
        Shared conversation
      </p>
      <h1 style={{ fontSize: "2rem", fontWeight: 500, margin: "0 0 0.5rem" }}>
        {title}
      </h1>
      {expiresAt ? (
        <p style={{ color: "#6b6358", fontSize: 14, marginBottom: "2rem" }}>
          Link expires {new Date(expiresAt).toLocaleString()}
        </p>
      ) : null}
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {messages.map((message, index) => (
          <li
            key={`${message.createdAt}-${index}`}
            style={{
              marginBottom: "1.25rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#6b6358",
                marginBottom: 6,
              }}
            >
              {message.role}
            </div>
            <p style={{ margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
              {message.content}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
