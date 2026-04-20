import type { Metadata } from "next";
import { ImageGenProviders } from "@/components/eva-dashboard/account/image-gen/image-gen-providers";

export const metadata: Metadata = {
  title: "Image Gen — Furnishes",
  description:
    "Generate reference imagery and 3D furniture drafts, arrange in a room, and chat with Eva.",
};

/**
 * Dedicated route layout for Image Gen (providers + metadata), like other top-level workspace routes.
 */
export default function ImageGenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ImageGenProviders>{children}</ImageGenProviders>;
}
