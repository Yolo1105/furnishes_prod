import {
  User,
  Home,
  MapPin,
  CreditCard,
  Mail,
  type LucideIcon,
} from "lucide-react";

export type ProfileSubTab = {
  slug: string;
  label: string;
  eyebrow: string;
  icon: LucideIcon;
};

export const PROFILE_TABS: ProfileSubTab[] = [
  { slug: "identity", label: "Identity", eyebrow: "IDENTITY", icon: User },
  { slug: "home", label: "Home", eyebrow: "HOME CONTEXT", icon: Home },
  { slug: "addresses", label: "Addresses", eyebrow: "ADDRESSES", icon: MapPin },
  { slug: "payment", label: "Payment", eyebrow: "PAYMENT", icon: CreditCard },
  { slug: "contact", label: "Contact", eyebrow: "CONTACT", icon: Mail },
];
