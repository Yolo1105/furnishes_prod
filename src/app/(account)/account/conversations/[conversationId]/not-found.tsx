import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conversation Not Found",
};

export default function ConversationNotFound() {
  return (
    <div>
      <h2>Conversation not found</h2>
      <p>This conversation does not exist or you do not have access.</p>
    </div>
  );
}
