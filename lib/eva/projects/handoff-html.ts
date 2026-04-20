import type { ProjectSummaryDto } from "@/lib/eva/projects/build-project-summary";
import { stageDisplayLabel } from "@/lib/eva/design-workflow/stages";
import {
  PROJECT_EXECUTION_PACKAGE_COPY,
  PROJECT_SHORTLIST_STATUS_LABEL,
  PROJECT_SUMMARY_LIMITS,
} from "@/lib/eva/projects/summary-constants";
import { EXECUTION_READINESS_LABEL } from "@/lib/eva/projects/execution-readiness";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Printable, recipient-friendly handoff document (not raw JSON).
 */
export function renderProjectHandoffHtml(summary: ProjectSummaryDto): string {
  const p = summary;
  const lines: string[] = [];
  lines.push(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>`);
  lines.push(
    `<title>${esc(p.title)} — Furnishes project handoff</title>`,
    `<style>
      body{font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.5}
      h1{font-size:1.35rem;margin:0 0 .5rem}
      h2{font-size:1rem;margin:1.5rem 0 .5rem;color:#333;border-bottom:1px solid #ddd;padding-bottom:.25rem}
      .muted{color:#555;font-size:.9rem}
      ul{padding-left:1.2rem}
      .card{border:1px solid #e5e5e5;border-radius:8px;padding:.75rem 1rem;margin:.5rem 0;background:#fafafa}
    </style></head><body>`,
  );

  lines.push(`<h1>${esc(p.title)}</h1>`);
  lines.push(
    `<p class="muted">${esc(p.room)}${p.roomType ? ` · ${esc(p.roomType)}` : ""}</p>`,
  );
  lines.push(`<p>${esc(p.goalSummary)}</p>`);

  lines.push(`<h2>Status</h2>`);
  lines.push(
    `<p><strong>Execution phase:</strong> ${esc(EXECUTION_READINESS_LABEL[p.executionReadiness])}</p>`,
  );
  lines.push(
    `<p class="card"><strong>Handoff readiness:</strong> ${esc(p.handoffReadiness.headline)}${
      p.handoffReadiness.subline
        ? `<br/><span class="muted">${esc(p.handoffReadiness.subline)}</span>`
        : ""
    }</p>`,
  );
  lines.push(
    `<p><strong>Workflow:</strong> ${esc(stageDisplayLabel(p.workflowStage))}</p>`,
  );
  lines.push(
    `<p><strong>Milestone:</strong> ${esc(p.milestone.label)} — ${esc(p.milestone.hint)}</p>`,
  );
  lines.push(`<p>${esc(p.workflowEvaluation.transitionExplanation)}</p>`);

  if (p.briefLines.length > 0) {
    lines.push(`<h2>Brief snapshot</h2><ul>`);
    for (const b of p.briefLines) {
      lines.push(`<li><strong>${esc(b.key)}:</strong> ${esc(b.value)}</li>`);
    }
    lines.push(`</ul>`);
  }

  if (p.acceptedConstraints.length > 0) {
    lines.push(`<h2>Accepted constraints</h2><ul>`);
    for (const c of p.acceptedConstraints) {
      lines.push(`<li>${esc(c)}</li>`);
    }
    lines.push(`</ul>`);
  }

  if (p.comparisonCandidates.length > 0) {
    lines.push(`<h2>Comparison snapshot</h2>`);
    for (const c of p.comparisonCandidates) {
      lines.push(
        `<p><strong>${esc(c.label)}</strong> — ${c.items.length} item(s)</p>`,
      );
    }
  }

  if (p.preferredDirection) {
    lines.push(`<h2>Preferred direction</h2>`);
    lines.push(`<p><strong>${esc(p.preferredDirection.label)}</strong></p>`);
    if (p.preferredDirection.notes) {
      lines.push(`<p>${esc(p.preferredDirection.notes)}</p>`);
    }
    lines.push(`<ul>`);
    for (const it of p.preferredDirection.items) {
      lines.push(
        `<li><strong>${esc(it.title)}</strong> (${esc(it.category)}) — ${esc(it.reasonWhyItFits)}</li>`,
      );
    }
    lines.push(`</ul>`);
  }

  if (p.recommendations.topItems.length > 0) {
    lines.push(`<h2>Key recommendations (saved run)</h2>`);
    if (p.recommendations.snapshotCapturedAt) {
      lines.push(
        `<p class="muted">Captured ${esc(p.recommendations.snapshotCapturedAt)}</p>`,
      );
    }
    lines.push(`<ul>`);
    for (const it of p.recommendations.topItems.slice(
      0,
      PROJECT_SUMMARY_LIMITS.summaryRankedItemCap,
    )) {
      const priceHint =
        it.estimatedPrice != null
          ? ` (${esc(String(it.estimatedPrice))} est.)`
          : "";
      lines.push(
        `<li><strong>${esc(it.title)}</strong>${priceHint} — ${esc(it.reasonWhyItFits)}</li>`,
      );
    }
    lines.push(`</ul>`);
  }

  if (p.shortlist.length > 0) {
    lines.push(`<h2>Project shortlist</h2><ul>`);
    for (const s of p.shortlist.slice(
      0,
      PROJECT_SUMMARY_LIMITS.handoffShortlistItemsMax,
    )) {
      const statusLabel = PROJECT_SHORTLIST_STATUS_LABEL[s.status];
      const ext = s.externalLifecycle;
      const rationale = s.reasonSelected?.trim() || s.rationale?.trim() || null;
      const noteLine = s.notes?.trim()
        ? `<span class="muted">Notes: ${esc(s.notes.trim())}</span>`
        : "";
      lines.push(
        `<li><strong>${esc(s.productName)}</strong> — ${esc(statusLabel)} · procurement: ${esc(ext)} · ${esc(s.productCategory)} (${esc(s.currency)})` +
          (rationale
            ? `<br/><span class="muted">${esc(rationale)}</span>`
            : "") +
          (noteLine ? `<br/>${noteLine}` : "") +
          `</li>`,
      );
    }
    lines.push(`</ul>`);
  }

  const ep = p.executionPackage;
  if (
    ep.shortlistByStatus.primary.length > 0 ||
    ep.acceptedConstraints.length > 0
  ) {
    lines.push(`<h2>Execution package (chosen path)</h2>`);
    if (ep.preferredDirectionLabel) {
      lines.push(
        `<p><strong>Preferred direction:</strong> ${esc(ep.preferredDirectionLabel)}</p>`,
      );
    }
    if (ep.shortlistByStatus.primary.length > 0) {
      lines.push(`<p class="muted">Primary shortlist</p><ul>`);
      for (const s of ep.shortlistByStatus.primary) {
        lines.push(
          `<li>${esc(s.productName)} — ${esc(s.productCategory)}</li>`,
        );
      }
      lines.push(`</ul>`);
    }
    if (ep.shortlistByStatus.backup.length > 0) {
      lines.push(`<p class="muted">Alternates</p><ul>`);
      for (const s of ep.shortlistByStatus.backup.slice(0, 8)) {
        lines.push(`<li>${esc(s.productName)}</li>`);
      }
      lines.push(`</ul>`);
    }
    if (ep.workflowOpenItems.length > 0) {
      lines.push(
        `<p class="muted">${esc(PROJECT_EXECUTION_PACKAGE_COPY.workflowOpenItems)}</p><ul>`,
      );
      for (const b of ep.workflowOpenItems.slice(0, 12)) {
        lines.push(`<li>${esc(b)}</li>`);
      }
      lines.push(`</ul>`);
    }
  }

  if (p.studio) {
    lines.push(`<h2>Room layout (Eva Studio)</h2>`);
    lines.push(
      `<p>${p.studio.placementCount} piece(s) · saved ${esc(p.studio.createdAt)}</p>`,
    );
  }

  if (p.unresolvedSystem.length > 0 || p.unresolvedUser.length > 0) {
    lines.push(`<h2>Open items</h2>`);
    if (p.unresolvedSystem.length > 0) {
      lines.push(`<p class="muted">Workflow &amp; Eva checks</p><ul>`);
      for (const u of p.unresolvedSystem) {
        lines.push(`<li>${esc(u)}</li>`);
      }
      lines.push(`</ul>`);
    }
    if (p.unresolvedUser.length > 0) {
      lines.push(`<p class="muted">Your follow-ups</p><ul>`);
      for (const u of p.unresolvedUser) {
        lines.push(`<li>${esc(u)}</li>`);
      }
      lines.push(`</ul>`);
    }
  }

  lines.push(`<h2>External execution</h2>`);
  lines.push(
    `<p><strong>Operational phase:</strong> ${esc(p.externalExecution.phase)}</p>`,
  );
  if (p.externalExecution.hints.length > 0) {
    lines.push(`<ul>`);
    for (const h of p.externalExecution.hints) {
      lines.push(`<li>${esc(h)}</li>`);
    }
    lines.push(`</ul>`);
  }
  if (p.recentPacketSends.length > 0) {
    lines.push(`<p class="muted">Recorded handoffs / packet sends</p><ul>`);
    for (const s of p.recentPacketSends.slice(0, 12)) {
      lines.push(
        `<li>${esc(s.kind)} · ${esc(s.channel)} · ${esc(s.sentAt)}</li>`,
      );
    }
    lines.push(`</ul>`);
  }

  const ex = p.execution;
  lines.push(`<h2>Next best action</h2><p>${esc(p.nextBestAction)}</p>`);
  lines.push(`<p class="muted">Workflow guidance: ${esc(p.nextStep)}</p>`);

  lines.push(
    `<h2>Path integrity</h2><p><strong>${esc(ex.pathIntegrity.result)}</strong></p>`,
  );
  lines.push(`<ul>`);
  for (const r of ex.pathIntegrity.reasons.slice(0, 8)) {
    lines.push(`<li>${esc(r)}</li>`);
  }
  lines.push(`</ul>`);

  if (ex.activeBlockers.length > 0) {
    lines.push(`<h2>Active execution blockers</h2><ul>`);
    for (const b of ex.activeBlockers.slice(0, 16)) {
      const sug = b.resolutionSuggestion?.trim()
        ? ` — Suggested: ${esc(b.resolutionSuggestion.trim())}`
        : "";
      lines.push(`<li><strong>${esc(b.title)}</strong>${sug}</li>`);
    }
    lines.push(`</ul>`);
  }

  if (ex.openTasks.length > 0) {
    lines.push(`<h2>Open execution tasks</h2><ul>`);
    for (const t of ex.openTasks.slice(0, 20)) {
      lines.push(
        `<li><strong>${esc(t.title)}</strong> (${esc(t.status)}) — ${esc(t.priority)}</li>`,
      );
    }
    lines.push(`</ul>`);
  }

  if (ex.substitutionLog.length > 0) {
    lines.push(`<h2>Recent path / shortlist changes</h2><ul>`);
    for (const s of ex.substitutionLog.slice(-8)) {
      lines.push(
        `<li><span class="muted">${esc(s.at)}</span> — ${esc(s.summary)}</li>`,
      );
    }
    lines.push(`</ul>`);
  }
  if (p.decisionNotes) {
    lines.push(`<h2>Decision notes</h2><p>${esc(p.decisionNotes)}</p>`);
  }

  if (p.artifacts.highlighted.length > 0) {
    lines.push(`<h2>Highlighted files</h2><ul>`);
    for (const a of p.artifacts.highlighted.slice(
      0,
      PROJECT_SUMMARY_LIMITS.summaryRankedItemCap,
    )) {
      lines.push(`<li>${esc(a.title)} (${esc(a.fileType)})</li>`);
    }
    lines.push(`</ul>`);
  }

  lines.push(
    `<p class="muted" style="margin-top:2rem">Exported from Furnishes — project summary handoff.</p>`,
    `</body></html>`,
  );

  return lines.join("\n");
}
