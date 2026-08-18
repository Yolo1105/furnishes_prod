import type { Metadata } from "next";
import { QuizIntroPage } from "@/features/account/quiz/QuizIntroPage";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountQuizRoute() {
  await requireCurrentSession();
  return <QuizIntroPage />;
}

export const metadata: Metadata = {
  title: "Design Quiz",
};
