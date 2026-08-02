import React from "react";

// Ported from the repeated tab-header pattern, e.g.
// Ossa Fee Proposal App.dc.html lines 213-219 (tab 1, with status pill) and
// lines 342-344 (tab 2, with the "Project: X | Client: Y" subtitle).
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  statusPill,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  statusPill?: { label: string; color: string };
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* text-os-orange-700, not text-os-orange: brand orange is ~3.4:1 on white,
            below WCAG AA's 4.5:1 for text this size -- see design review A11Y-01 */}
        <div className="font-bold text-[11px] tracking-[.2em] uppercase text-os-orange-700">{eyebrow}</div>
        <h1 className="mt-[6px] mb-1 font-bold text-[30px] leading-[1.1] font-display tracking-[-.01em] text-os-ink">{title}</h1>
        {subtitle && <p className="m-0 mb-[26px] font-medium text-[13.5px] text-os-600">{subtitle}</p>}
      </div>
      {statusPill && (
        <div
          className="flex-none whitespace-nowrap mt-[2px] px-[14px] py-[7px] rounded-full font-bold text-[10.5px] tracking-[.05em] uppercase text-white"
          style={{ background: statusPill.color }}
        >
          {statusPill.label}
        </div>
      )}
    </div>
  );
}
