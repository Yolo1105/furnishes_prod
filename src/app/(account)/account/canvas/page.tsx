import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { CanvasPage } from "@/features/account/canvas/CanvasPage";
import { CanvasPlaceholder } from "@/features/account/canvas/CanvasPlaceholder";
import { isCanvasPlaygroundEnabled } from "@/server/canvas/canvas-playground-enabled";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-syne",
});

export default async function AccountCanvasRoute() {
  await requireCurrentSession();
  if (!isCanvasPlaygroundEnabled()) {
    return <CanvasPlaceholder />;
  }
  return <CanvasPage className={syne.variable} />;
}

export const metadata: Metadata = {
  title: "Canvas",
};
