export const AWARDS_VIEWPORT = {
  banner: { once: true as const, amount: 0.3 },
  header: { once: true as const, amount: 0.2 },
  timeline: { once: true as const, amount: 0.15 },
} as const;

export const AWARDS_TRANSITIONS = {
  banner: { duration: 0.8, ease: "easeOut" as const },
  row: { duration: 0.55, ease: "easeOut" as const },
} as const;

export const awardsBannerVariants = {
  initial: { opacity: 0, y: -20, filter: "blur(5px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export const awardsHeaderContainerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
  hidden: {},
};

export const awardsTimelineContainerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  hidden: {},
};

export const awardsRowVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0 },
};
