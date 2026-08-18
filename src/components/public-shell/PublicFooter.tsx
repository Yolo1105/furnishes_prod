import styles from "./public-shell.module.css";

type PublicFooterLink = {
  label: string;
  href: string | null;
  enabled: boolean;
};

export type PublicFooterContent = {
  ctaBefore: string;
  ctaAfter: string;
  body: string;
  email: string;
  hours: ReadonlyArray<string>;
  studioBlurb: string;
  studioLabel: string;
  social: ReadonlyArray<PublicFooterLink>;
  legal: ReadonlyArray<PublicFooterLink>;
};

type PublicFooterProps = {
  content: PublicFooterContent;
  /** Optional scroll-reveal class from the host surface (e.g. Landing). */
  gridClassName?: string;
};

export function PublicFooter({ content, gridClassName }: PublicFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} id="contact">
      <a className={styles.footerCta} href="#contact">
        <span className={styles.footerCtaA}>{content.ctaBefore}</span>
        <span className={styles.footerCtaMid} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17L17 7" />
            <path d="M17 7v6M17 7h-6" />
          </svg>
        </span>
        <span className={styles.footerCtaB}>{content.ctaAfter}</span>
      </a>
      <div
        className={
          gridClassName
            ? `${styles.footerGrid} ${gridClassName}`
            : styles.footerGrid
        }
      >
        <div>
          <p className={styles.footerHeading}>furnishes.</p>
          <p className={styles.footerBody}>{content.body}</p>
        </div>
        <div>
          <p className={styles.footerLabel}>[ Hours ]</p>
          <p className={styles.footerBody}>
            {content.hours.map((row) => (
              <span key={row}>
                {row}
                <br />
              </span>
            ))}
          </p>
        </div>
        <div>
          <p className={styles.footerLabel}>[ Contact ]</p>
          <p className={styles.footerBody}>
            <a className={styles.footerLink} href={`mailto:${content.email}`}>
              {content.email}
            </a>
          </p>
          <ul className={styles.footerSocial}>
            {content.social.map((item) => (
              <li key={item.label}>
                {item.enabled && item.href ? (
                  <a className={styles.footerLink} href={item.href}>
                    {item.label}
                  </a>
                ) : (
                  <span
                    className={styles.footerLinkDisabled}
                    aria-disabled="true"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={styles.footerLabel}>[ Studio ]</p>
          <p className={styles.footerBody}>{content.studioBlurb}</p>
          <p className={styles.footerCoord}>{content.studioLabel}</p>
        </div>
      </div>
      <div className={styles.footerLegal}>
        <div className={styles.footerLegalLinks}>
          {content.legal.map((item) =>
            item.enabled && item.href ? (
              <a
                key={item.label}
                className={styles.footerLink}
                href={item.href}
              >
                {item.label}
              </a>
            ) : (
              <span
                key={item.label}
                className={styles.footerLinkDisabled}
                aria-disabled="true"
              >
                {item.label}
              </span>
            ),
          )}
        </div>
        <p className={styles.footerCopy}>© {year} Furnishes.</p>
      </div>
    </footer>
  );
}
