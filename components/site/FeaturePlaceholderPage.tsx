import Link from "next/link";
import type { ReactNode } from "react";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import { aboutBodyMutedClass } from "@/lib/site/about-typography";

/** Shared accent link style for preview / placeholder pages. */
export const previewLinkClass =
  "text-[var(--color-accent)] underline underline-offset-4 hover:opacity-90";

type FeaturePlaceholderPageProps = {
  title: string;
  description: string;
  /** When false, default footer omits the Inspiration link. */
  showInspirationLink?: boolean;
  /** Replaces the default Home / Inspiration footer when provided. */
  footer?: ReactNode;
};

/** Neutral layout for workflow previews or partially integrated features. */
export function FeaturePlaceholderPage({
  title,
  description,
  showInspirationLink = true,
  footer,
}: FeaturePlaceholderPageProps) {
  return (
    <div className="site-chrome-pad text-primary min-h-screen w-full px-6 pt-[var(--site-content-pt-inspiration)] pb-24 font-sans md:px-10 md:pt-[var(--site-content-pt-md-inspiration)]">
      <h1 className="max-w-3xl font-sans text-[clamp(1.5rem,3.5vw,2.4rem)] leading-tight font-[375] tracking-tight text-[var(--color-primary)]">
        {title}
      </h1>
      <p className={`mt-6 max-w-2xl ${aboutBodyMutedClass}`}>{description}</p>
      {footer ?? (
        <p className={`mt-6 max-w-2xl ${aboutBodyMutedClass}`}>
          {showInspirationLink ? (
            <>
              <Link
                href={WORKFLOW_ROUTES.inspiration}
                className={previewLinkClass}
              >
                Back to Inspiration
              </Link>
              <span aria-hidden> · </span>
            </>
          ) : null}
          <Link href={WORKFLOW_ROUTES.home} className={previewLinkClass}>
            Home
          </Link>
        </p>
      )}
    </div>
  );
}
