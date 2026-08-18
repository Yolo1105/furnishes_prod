import type { Metadata } from "next";
import { HelpPage } from "@/features/account/help/HelpPage";

export default function AccountHelpRoute() {
  return <HelpPage />;
}

export const metadata: Metadata = {
  title: "Customer Service",
};
