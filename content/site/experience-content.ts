/**
 * Experience landing block; layout parity with furnishes marketing InfoSection,
 * copy adapted for interior and renovation positioning.
 */

import { HERO_IMAGE_LUTE } from "@/content/site/about-images";

/** Brackets styled in accent in `ExperienceSection`; inner label only. */
export const EXPERIENCE_SECTION_LABEL = "EXPERIENCE";

export const EXPERIENCE_INTRO = {
  /** First line: `prefix` + `accent` (accent uses brand orange in ExperienceSection). */
  titleLine1: { prefix: "For ", accent: "Urban" },
  titleLine2: "Living.",
  body: "We believe good design should feel natural in daily life: easy to live with, calm to look at, and genuinely pleasant to use. Spaces ought to support how you move, rest, and gather without asking you to fuss over them. We work with skilled craftspeople and designers who understand city living, so rooms stay thoughtful, durable, and practical from first sketches to the day the work is complete.",
} as const;

export const EXPERIENCE_PHILOSOPHY_IMAGE = {
  src: HERO_IMAGE_LUTE,
  alt: "Modern minimalist living space",
} as const;

export const EXPERIENCE_PHILOSOPHY = {
  titleLines: ["Futuristic &", "Minimalist."],
  label: "Our Philosophy,",
  body: "You can trust what you experience on site to match what we discussed in planning. Every project is led by specialists who care about proportion, light, and honest use of materials, and who stay close to the work until the last detail feels right. We hold a steady bar for craftsmanship, clear updates along the way, and premium quality finishes that age well, so you are never left guessing about care or intent.",
} as const;

export const EXPERIENCE_QUOTE = "We provide the best experience";

export const EXPERIENCE_FEATURES = [
  {
    title: "Free Shipping",
    description:
      "Enjoy complimentary delivery when your order is $180 or more. We pad and crate items with care, partner with reliable carriers, and share tracking details so you can plan around arrival without surprises at the door.",
    icon: "truck" as const,
  },
  {
    title: "Flexible Payment",
    description:
      "Choose the option that fits your budget, from major cards to other secure methods we support at checkout. Every transaction is processed safely, and our team can walk you through available plans if you need a little more flexibility.",
    icon: "card" as const,
  },
  {
    title: "24×7 Support",
    description:
      "Questions do not keep office hours, so neither do we online. Reach out any time through chat or email and we will help with orders, deliveries, or product details. Real people review your message and follow up as soon as they can.",
    icon: "bell" as const,
  },
] as const;

export const EXPERIENCE_STATS = [
  {
    value: "900",
    suffix: "+",
    description: "Products that we have created\nand sold on the market",
  },
  {
    value: "20K",
    suffix: "+",
    description: "Happy and loyal customers\nbuy our products",
  },
  {
    value: "98",
    suffix: "%",
    description: "Customers who have purchased\nwill come back again",
  },
] as const;
