import { redirect } from "next/navigation";
import { ACCOUNT_IMAGE_GEN_ARRANGE_HREF } from "@/components/eva-dashboard/account/image-gen/constants";

/** Legacy URL — room preview lives under Studio Arrange tab. */
export default function Furniture3DRoomRedirectPage() {
  redirect(ACCOUNT_IMAGE_GEN_ARRANGE_HREF);
}
