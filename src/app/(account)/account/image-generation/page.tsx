import type { Metadata } from "next";
import { ImageGenerationPage } from "@/features/account/image-generation/ImageGenerationPage";
import { listImageGenerations } from "@/server/image-generation/image-generation-service";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountImageGenerationPage() {
  const session = await requireCurrentSession();
  const { items } = await listImageGenerations(session.user.id);
  return <ImageGenerationPage initialItems={items} />;
}

export const metadata: Metadata = {
  title: "Image Generation",
};
