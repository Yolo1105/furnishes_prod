import type { SupportThread, SupportMessage } from "./types";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();

export function getMockSupportThreads(): SupportThread[] {
  return [
    {
      id: "st1",
      number: "FH-00234",
      kind: "HELP",
      category: "billing",
      title: "Invoice for March not appearing",
      body: "My Studio Pro card was charged on 3 March but I don't see an invoice in the Billing page.",
      status: "awaiting_user",
      messages: [
        {
          id: "sm1",
          role: "user",
          content:
            "My Studio Pro card was charged on 3 March but I don't see an invoice in the Billing page.",
          at: daysAgo(2),
        },
        {
          id: "sm2",
          role: "staff",
          staffName: "Priya — Furnishes Support",
          content:
            "Hi Mohan — looks like the invoice was generated but filed under a prior email. I've moved it to your current account; can you check Billing now and confirm you see it?",
          at: hoursAgo(5),
        },
      ],
      attachments: [],
      metadata: {},
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(5),
    },
    {
      id: "st2",
      number: "FH-00198",
      kind: "HELP",
      category: "access",
      title: "2FA app changed — can't sign in",
      body: "I reinstalled my authenticator app and lost the codes. Need help regaining access.",
      status: "resolved",
      messages: [
        {
          id: "sm3",
          role: "user",
          content:
            "I reinstalled my authenticator app and lost the codes. Need help regaining access.",
          at: daysAgo(12),
        },
        {
          id: "sm4",
          role: "staff",
          staffName: "Daniel — Furnishes Support",
          content:
            "I've verified your identity via the backup email and reset 2FA on your account. Please re-enable it on your next sign-in.",
          at: daysAgo(11),
        },
        {
          id: "sm5",
          role: "user",
          content: "All good — re-enabled. Thanks!",
          at: daysAgo(11),
        },
      ],
      attachments: [],
      metadata: {},
      createdAt: daysAgo(12),
      updatedAt: daysAgo(11),
      closedAt: daysAgo(11),
    },
    {
      id: "sf1",
      number: "FH-00240",
      kind: "FEEDBACK",
      category: "bug",
      title: "Budget bar overflows at edge case",
      body: "If I set room allocations higher than the total max, the stacked bar on Budget overflows horizontally instead of capping.",
      status: "shipped",
      messages: [
        {
          id: "sm6",
          role: "user",
          content:
            "If I set room allocations higher than the total max, the stacked bar on Budget overflows horizontally instead of capping.",
          at: daysAgo(8),
        },
        {
          id: "sm7",
          role: "staff",
          staffName: "Cheng — Furnishes Product",
          content:
            "Confirmed and fixed in this week's release. Thanks for the catch — much appreciated.",
          at: daysAgo(3),
        },
      ],
      attachments: [],
      metadata: {},
      createdAt: daysAgo(8),
      updatedAt: daysAgo(3),
    },
    {
      id: "sf2",
      number: "FH-00215",
      kind: "FEEDBACK",
      category: "feature",
      title: "Export shortlist as a shareable PDF",
      body: "Would love to export my shortlist grouped by project as a PDF to share with my interior designer.",
      status: "under_review",
      messages: [
        {
          id: "sm8",
          role: "user",
          content:
            "Would love to export my shortlist grouped by project as a PDF to share with my interior designer.",
          at: daysAgo(20),
        },
        {
          id: "sm9",
          role: "staff",
          staffName: "Cheng — Furnishes Product",
          content:
            "Great idea — added to our queue. Aiming for Q3 once the main commerce release lands.",
          at: daysAgo(18),
        },
      ],
      attachments: [],
      metadata: {},
      createdAt: daysAgo(20),
      updatedAt: daysAgo(18),
    },
  ];
}

export function getMockSupportThreadById(id: string): SupportThread | null {
  return getMockSupportThreads().find((t) => t.id === id) ?? null;
}
