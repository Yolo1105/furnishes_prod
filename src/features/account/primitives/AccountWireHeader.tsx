import type { ReactNode } from "react";

/**
 * Route-owned wireframe header — mirrors approved Account wireframe `head()`.
 */
export function AccountWireHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="wf-head">
      <div className="wf-head__main">
        <p className="wf-eye">{eyebrow}</p>
        <h1 className="wf-title">{title}</h1>
        {subtitle ? <p className="wf-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="wf-head__act">{actions}</div> : null}
    </header>
  );
}
