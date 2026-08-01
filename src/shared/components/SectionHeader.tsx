import React from "react";

// Ported from the repeated "SECTION HEADER" inline-style pattern used ~25x
// throughout the original (e.g. Ossa Fee Proposal App.dc.html line 223):
// font:700 12px; letter-spacing:.14em; uppercase; border-bottom:2px solid var(--os-ink).
export function SectionHeader({
  children,
  note,
  className = "",
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px] ${className}`}>
      {children}
      {note && <span className="font-light text-xs tracking-normal normal-case text-os-500"> {note}</span>}
    </div>
  );
}
