import { Space_Mono } from "next/font/google";

/** Shared monospace stack for `/style`, `/quiz`, and `/budget` chromeless flows. */
export const styleExplorerMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});
