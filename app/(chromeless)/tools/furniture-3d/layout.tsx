import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Furniture Studio",
  description:
    "Describe furniture in plain language and inspect a reference image and 3D draft — Eva Studio styling.",
};

export default function Furniture3DToolLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
