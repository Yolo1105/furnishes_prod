import { redirect } from "next/navigation";
import { ACCOUNT_IMAGE_GEN_HREF } from "@/components/eva-dashboard/account/image-gen/constants";

/** Legacy URL — generation UI lives in Eva Studio (`/account/image-gen`). */
export default function Furniture3DToolRedirectPage() {
  redirect(ACCOUNT_IMAGE_GEN_HREF);
}
