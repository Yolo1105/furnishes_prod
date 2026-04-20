"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { CONTACT_HREF } from "@/content/site/site";
import {
  FOOTER_ADDRESS_LINES,
  FOOTER_COMPANY_NAME,
  FOOTER_CONTACT_HEADING,
  FOOTER_COPYRIGHT,
  FOOTER_CTA_WORDS,
  FOOTER_DESCRIPTION,
  FOOTER_EMAIL,
  FOOTER_HOURS_HEADING,
  FOOTER_HOURS_LINES,
  FOOTER_OFFICE_HEADING,
  FOOTER_PHONE,
  LEGAL_LINKS,
} from "@/content/site/footer-content";
import { defaultTransition, fadeUp } from "@/lib/site/animations";

const transition = defaultTransition;

export default function Footer() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.01 });
  const [hoveringCta, setHoveringCta] = useState(false);

  return (
    <footer
      id="site-footer"
      ref={ref}
      className="bg-accent text-cream relative w-full overflow-hidden pb-8 font-sans md:pb-10"
    >
      <div className="mx-auto w-full max-w-[min(100%,2400px)] px-6 md:px-12 lg:px-16">
        <motion.div
          className="-mx-6 flex min-w-0 justify-center overflow-x-auto overflow-y-visible px-1 py-4 [-ms-overflow-style:none] [scrollbar-width:none] md:-mx-12 md:px-4 md:py-5 md:[scrollbar-width:thin] lg:-mx-16 lg:px-6 [&::-webkit-scrollbar]:hidden"
          initial={fadeUp.initial}
          animate={inView ? fadeUp.animate : {}}
          transition={transition}
        >
          <Link
            href={CONTACT_HREF}
            className="group/cta mx-auto flex w-max flex-nowrap items-baseline justify-center"
            onMouseEnter={() => setHoveringCta(true)}
            onMouseLeave={() => setHoveringCta(false)}
          >
            <motion.span
              className="text-cream shrink-0 text-[clamp(1.65rem,5vw,3.1rem)] font-[375] tracking-tight whitespace-nowrap md:text-[clamp(2.15rem,6.5vw,3.95rem)]"
              animate={{ marginRight: hoveringCta ? "2.25rem" : "0" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {FOOTER_CTA_WORDS.getIn}
            </motion.span>
            <motion.span
              className={`relative flex shrink-0 -translate-y-3 items-center justify-center overflow-visible rounded-full border-2 bg-transparent ${
                hoveringCta ? "border-cream" : "border-transparent"
              }`}
              initial={false}
              aria-hidden
              animate={{
                width: hoveringCta ? 52 : 10,
                height: hoveringCta ? 52 : 10,
                opacity: hoveringCta ? 1 : 0,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.span
                className="text-cream relative"
                initial={false}
                animate={{
                  scale: hoveringCta ? 1 : 0,
                  opacity: hoveringCta ? 1 : 0,
                }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                aria-hidden
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 md:h-7 md:w-7"
                >
                  <path d="M7 17L17 7" />
                  <path d="M17 7v6M17 7h-6" />
                </svg>
              </motion.span>
            </motion.span>
            <motion.span
              className="text-cream shrink-0 text-[clamp(1.65rem,5vw,3.1rem)] font-[375] tracking-tight whitespace-nowrap md:text-[clamp(2.15rem,6.5vw,3.95rem)]"
              animate={{ marginLeft: hoveringCta ? "2.25rem" : "0" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {FOOTER_CTA_WORDS.touch}
            </motion.span>
          </Link>
        </motion.div>

        <div
          className="grid w-full min-w-0 grid-cols-1 justify-items-start gap-6 gap-x-6 pt-3 pb-2 text-left sm:grid-cols-2 md:grid-cols-2 md:gap-x-6 md:gap-y-6 md:pt-4 md:pb-3 lg:grid-cols-4 lg:gap-x-7 lg:gap-y-6 xl:gap-x-8"
          role="navigation"
          aria-label="Footer information"
        >
          <motion.div
            className="max-w-full min-w-0"
            aria-label="Company description"
            initial={fadeUp.initial}
            animate={inView ? fadeUp.animate : {}}
            transition={{ ...transition, delay: 0.1 }}
          >
            <h4 className="text-cream mb-1 text-lg leading-tight font-semibold md:text-xl">
              {FOOTER_COMPANY_NAME}
            </h4>
            <p className="text-cream text-sm leading-tight md:text-base md:leading-tight">
              {FOOTER_DESCRIPTION}
            </p>
          </motion.div>

          <motion.div
            className="max-w-full min-w-0"
            initial={fadeUp.initial}
            animate={inView ? fadeUp.animate : {}}
            transition={{ ...transition, delay: 0.15 }}
            aria-label="Office address"
          >
            <h4 className="text-cream mb-1 text-lg leading-tight font-semibold md:text-xl">
              {FOOTER_OFFICE_HEADING}
            </h4>
            <p className="text-cream text-sm leading-tight md:text-base md:leading-tight">
              {FOOTER_ADDRESS_LINES[0]}
              <br />
              {FOOTER_ADDRESS_LINES[1]}
            </p>
          </motion.div>

          <motion.div
            className="max-w-full min-w-0"
            initial={fadeUp.initial}
            animate={inView ? fadeUp.animate : {}}
            transition={{ ...transition, delay: 0.18 }}
            aria-label="Business hours"
          >
            <h4 className="text-cream mb-1 text-lg leading-tight font-semibold md:text-xl">
              {FOOTER_HOURS_HEADING}
            </h4>
            <p className="text-cream text-sm leading-tight md:text-base md:leading-tight">
              {FOOTER_HOURS_LINES.map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </motion.div>

          <motion.div
            className="max-w-full min-w-0"
            initial={fadeUp.initial}
            animate={inView ? fadeUp.animate : {}}
            transition={{ ...transition, delay: 0.22 }}
            aria-label="Contact details"
          >
            <h4 className="text-cream mb-1 text-lg leading-tight font-semibold md:text-xl">
              {FOOTER_CONTACT_HEADING}
            </h4>
            <p className="text-cream text-sm leading-tight md:text-base md:leading-tight">
              Tel: {FOOTER_PHONE}
              <br />
              Email: {FOOTER_EMAIL}
            </p>
          </motion.div>
        </div>

        <motion.div
          className="flex flex-wrap items-center justify-between gap-3 py-1.5 md:py-2"
          initial={fadeUp.initial}
          animate={inView ? fadeUp.animate : {}}
          transition={{ ...transition, delay: 0.26 }}
        >
          <div className="text-cream flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm md:gap-x-8 md:text-base">
            {LEGAL_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="transition hover:opacity-90"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="text-cream text-sm md:text-base">
            © {new Date().getFullYear()} {FOOTER_COPYRIGHT}.
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
