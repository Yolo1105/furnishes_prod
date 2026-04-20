import { DashboardLayout } from "@/components/eva-dashboard/layout/dashboard-layout";

/**
 * Full Eva workspace — UI aligned with `chatbot_v3` (DashboardLayout, sidebars, ChatView).
 */
export default function ChatbotPage() {
  return (
    <div className="eva-dashboard-root bg-muted text-foreground h-dvh min-h-0 overflow-hidden">
      <DashboardLayout />
    </div>
  );
}
