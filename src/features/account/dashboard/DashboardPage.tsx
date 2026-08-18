"use client";

import Link from "next/link";
import { accountDisplayParts } from "@/features/account/shell/account-display";
import { useAccountShellUser } from "@/features/account/shell/account-shell-user";
import type { AccountDashboardModel } from "@/server/account/dashboard";

/**
 * Route-owned Dashboard — exact studio markup/classes, real Links + server model.
 */
export function DashboardPage({ model }: { model: AccountDashboardModel }) {
  const user = useAccountShellUser();
  const { first } = accountDisplayParts(user.displayName, user.email);

  return (
    <div className="canvas" style={{ display: "flex" }}>
      <div className="dash">
        <header className="dash-head">
          <h1 className="dash-hi">
            Welcome back, <em>{first}</em>.
          </h1>
          <p className="dash-status">
            <b>{model.projectsInProgress}</b> project
            {model.projectsInProgress === 1 ? "" : "s"} in progress
            {model.budgetUsedPercent != null ? (
              <>
                {" "}
                · budget <b>{model.budgetUsedPercent}%</b> used
              </>
            ) : null}
          </p>
        </header>

        <div className="ledger">
          <section className="row row--feature" aria-label="Identity and Eva">
            <Link className="door door--feat" href="/account/style">
              <span className="band-label">Style profile</span>
              <span className="feat-title">{model.styleLabel}</span>
              <span className="feat-sub">{model.styleSummary}</span>
              <span className="palette">
                {model.styleColors.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="door__go">Open profile →</span>
              <span className="door__arr">↗</span>
            </Link>
            <Link
              className="door door--feat"
              href="/account/conversations"
              style={{ cursor: "pointer" }}
            >
              <span className="band-label">Eva</span>
              <span className="feat-title">Continue with Eva</span>
              <span className="feat-sub">
                {model.conversationPreview
                  ? `Last thread, “${model.conversationPreview},” recently.`
                  : "Start a new conversation with Eva."}
              </span>
              <span className="door__go">Resume thread →</span>
              <span className="door__arr">↗</span>
            </Link>
          </section>

          <section className="row row--work" aria-label="Workspaces">
            <Link className="door" href="/account/conversations">
              <span className="door__top">
                <span className="door__name">Conversations</span>
                <span className="door__count">{model.conversationCount}</span>
              </span>
              <span className="door__meta">
                {model.conversationCount} conversation
                {model.conversationCount === 1 ? "" : "s"}
              </span>
              <span className="door__prev">{model.conversationPreview}</span>
              <span className="door__arr">↗</span>
            </Link>
            <Link className="door" href="/account/shortlist">
              <span className="door__top">
                <span className="door__name">Shortlist</span>
                <span className="door__count">{model.shortlistCount}</span>
              </span>
              <span className="door__meta">
                {model.shortlistCount > 0
                  ? `${model.shortlistCount} pieces`
                  : "Save pieces"}
              </span>
              <span className="door__prev">{model.shortlistPreview}</span>
              <span className="door__arr">↗</span>
            </Link>
            <Link className="door" href="/account/projects">
              <span className="door__top">
                <span className="door__name">Projects</span>
                <span className="door__count">{model.projectCount}</span>
              </span>
              <span className="door__meta">
                {model.projectsInProgress > 0
                  ? `${model.projectsInProgress} in progress`
                  : "Start a project"}
              </span>
              <span className="door__prev">{model.projectPreview}</span>
              <span className="door__arr">↗</span>
            </Link>
            <Link className="door" href="/account/uploads">
              <span className="door__top">
                <span className="door__name">Uploads</span>
                <span className="door__count">{model.uploadCount}</span>
              </span>
              <span className="door__meta">
                {model.uploadCount > 0
                  ? `${model.uploadCount} files`
                  : "Add a room photo"}
              </span>
              <span className="door__prev">{model.uploadPreview}</span>
              <span className="door__arr">↗</span>
            </Link>
          </section>

          <section className="row row--util" aria-label="Money and saved">
            <Link className="door door--util" href="/account/budget">
              <span className="door__name">Budget</span>
              <span className="door__val">
                {model.budgetSpentLabel}{" "}
                <span
                  style={{
                    color: "color-mix(in srgb,var(--ink) 40%,transparent)",
                  }}
                >
                  / {model.budgetMaxLabel}
                </span>
              </span>
              <span className="door__track">
                <i
                  style={{
                    width: `${model.budgetUsedPercent ?? 0}%`,
                  }}
                />
              </span>
              <span className="door__go">Manage →</span>
              <span className="door__arr">↗</span>
            </Link>
            <Link className="door door--util" href="/account/cart">
              <span className="door__name">Cart</span>
              <span className="door__val">4 items · S$4,909</span>
              <span className="door__go">Review order →</span>
              <span className="door__arr">↗</span>
            </Link>
          </section>
        </div>

        <div className="dash-act">
          <p className="band-label">Recent activity</p>
          <ul className="act">
            {model.recentActivity.length > 0 ? (
              model.recentActivity.map((item, index) => (
                <li key={`${item.at}-${item.title}-${index}`}>
                  {item.title}
                  <span className="act__d">{item.when} ago</span>
                </li>
              ))
            ) : (
              <li>
                No activity yet
                <span className="act__d">—</span>
              </li>
            )}
          </ul>
          <Link className="dash-act__all" href="/account/activity">
            View all activity →
          </Link>
        </div>
      </div>
    </div>
  );
}
