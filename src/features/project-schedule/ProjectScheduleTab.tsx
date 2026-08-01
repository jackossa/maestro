import { useProjectSchedule } from "./useProjectSchedule";

// Ported from Ossa Fee Proposal App.dc.html lines 526-657 (Tab 3 markup,
// including the print-only landscape schedule document).
export function ProjectScheduleTab() {
  const s = useProjectSchedule();

  return (
    <div>
      <div className="no-print flex items-center justify-between gap-4">
        <div className="font-bold text-[11px] tracking-[.2em] uppercase text-os-orange">Ossa Studio · 3 of 7</div>
        <button
          onClick={s.onPrintSchedule}
          className="px-5 py-[9px] border border-os-orange bg-os-orange text-white font-bold text-[11.5px] tracking-[.06em] rounded-full hover:bg-accent-hover"
        >
          PDF
        </button>
      </div>
      <h1 className="no-print mt-[6px] mb-[26px] font-bold text-[30px] leading-[1.1] font-display tracking-[-.01em] text-os-ink">Project Schedule</h1>

      <div className="no-print flex gap-[30px] items-center my-[14px] mb-6 flex-wrap">
        <div>
          <div className="font-medium text-[11.5px] text-os-600 mb-[5px]">Project Start (Approval to Proceed)</div>
          <input
            type="date"
            value={s.schedStart}
            onChange={(e) => s.onSchedStart(e.target.value)}
            className="px-[10px] py-[7px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13.5px] text-os-ink"
          />
        </div>
        <div>
          <div className="font-medium text-[11.5px] text-os-600 mb-[5px]">Estimated Permit Submission</div>
          <div className="font-bold text-xl font-display text-os-ink">{s.estPermitSubmission}</div>
        </div>
        <div>
          <div className="font-medium text-[11.5px] text-os-600 mb-[5px]">Estimated Construction Completion</div>
          <div className="font-bold text-xl font-display text-os-ink">{s.estConstructionCompletion}</div>
        </div>
      </div>

      <div className="no-print grid grid-cols-[220px_70px_80px_100px_100px_1fr] gap-x-3 pt-1 pb-[2px]">
        <div /><div /><div /><div /><div />
        <div className="relative h-[15px]">
          {s.monthTicks.map((t, i) => (
            <div key={i} className="absolute top-0 -translate-x-1/2 font-medium text-[9.5px] tracking-[.04em] uppercase text-os-600 whitespace-nowrap" style={{ left: t.left }}>
              {t.label}
            </div>
          ))}
        </div>
      </div>
      <div className="no-print grid grid-cols-[220px_70px_80px_100px_100px_1fr] gap-x-3 py-[9px] border-b-2 border-os-ink">
        <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Phase</div>
        <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-center">Weeks</div>
        <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-center">Work Days</div>
        <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Start</div>
        <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">End</div>
        <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Timeline</div>
      </div>
      {s.schedRows.map((r) => (
        <div key={r.k} className="no-print grid grid-cols-[220px_70px_80px_100px_100px_1fr] gap-x-3 py-[6px] border-b border-os-200 items-center">
          <div className="font-medium text-[13.5px] text-os-ink">{r.name}</div>
          <input
            type="number"
            min={0}
            value={r.weeksDisp}
            onChange={(e) => s.onWeeksChange(r.k, Math.max(0, parseFloat(e.target.value) || 0))}
            className="box-border w-full px-[6px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-center text-os-ink"
          />
          <div className="font-light text-[13px] text-os-700 text-center">{r.days}</div>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={r.startInput}
              onChange={(e) => s.onStartChange(r.k, e.target.value)}
              title="Override this phase's start date — lets it overlap the previous phase"
              className="box-border w-full px-1 py-[5px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[11.5px] text-os-ink"
            />
            {r.overridden && (
              <button
                onClick={() => s.onResetStart(r.k)}
                title="Reset to auto-sequenced date"
                className="flex-none w-[18px] h-[18px] p-0 border border-os-300 bg-white text-os-600 font-bold text-[11px] rounded-[3px] hover:border-os-orange hover:text-os-orange"
              >
                ×
              </button>
            )}
          </div>
          <div className="font-light text-[13px] text-os-700">{r.end}</div>
          <div className="relative h-5 bg-os-100">
            <div className="absolute top-0 bottom-0" style={{ left: r.left, width: r.width, background: r.color }} />
            {s.monthTicks.map((t, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-os-ink/[.28]" style={{ left: t.left }} />
            ))}
          </div>
        </div>
      ))}
      <div className="no-print grid grid-cols-[220px_70px_80px_100px_100px_1fr] gap-x-3 pt-[11px]">
        <div className="font-bold text-[13px] text-os-ink">TOTAL</div>
        <div className="font-bold text-[13px] text-os-ink text-center">{s.schedTotalWeeks}</div>
        <div className="font-bold text-[13px] text-os-ink text-center">{s.schedTotalDays}</div>
        <div />
        <div className="font-bold text-[13px] text-os-orange">{s.completion}</div>
        <div />
      </div>

      {/* ===== PRINT-ONLY LANDSCAPE LETTER-SIZE SCHEDULE DOCUMENT ===== */}
      <div
        className="print-only print-schedule hidden bg-white mx-auto box-border relative"
        style={{ width: "11in", height: "8.5in", padding: "0.55in 0.65in", fontFamily: "var(--font-body-doc)", color: "var(--fg1)" }}
      >
        <header className="flex items-start justify-between pb-3 border-b-2 border-accent mb-4">
          <img src="/assets/logo-horizontal-doc.png" alt="Ossa Studio" className="h-[38px] block" />
          <div className="text-right font-sans text-[9px] leading-[1.5] text-[color:var(--fg3)] tracking-[.02em]">
            <b className="text-[color:var(--fg1)] font-bold">Ossa Studio</b>
            <br />
            4539 Hedgemore Dr, Suite 101
            <br />
            Charlotte, NC 28209
          </div>
        </header>
        <div className="flex items-end justify-between mb-[14px]">
          <div>
            <div className="font-sans text-[9px] font-bold tracking-[.16em] uppercase text-accent mb-1">Schedule</div>
            <div className="font-display font-bold text-xl leading-[1.1] text-[color:var(--fg1)]">Estimated Project Schedule</div>
            <div className="text-[11px] text-[color:var(--fg2)] mt-[3px]">
              {s.sumProject} — {s.sumClient}
            </div>
          </div>
          <div className="text-right text-[9.5px] leading-[1.6] text-[color:var(--fg3)]">
            <div>
              Estimated Permit Submission: <b className="text-[color:var(--fg1)]">{s.estPermitSubmission}</b>
            </div>
            <div>
              Estimated Construction Completion: <b className="text-[color:var(--fg1)]">{s.estConstructionCompletion}</b>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[180px_55px_60px_75px_75px_1fr] gap-x-[10px] pt-[3px] pb-[2px]">
          <div /><div /><div /><div /><div />
          <div className="relative h-[13px]">
            {s.monthTicks.map((t, i) => (
              <div key={i} className="absolute top-0 -translate-x-1/2 font-sans text-[8px] tracking-[.04em] uppercase text-[color:var(--fg3)] whitespace-nowrap" style={{ left: t.left }}>
                {t.label}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[180px_55px_60px_75px_75px_1fr] gap-x-[10px] py-[6px] border-b-2 border-os-charcoal">
          <div className="font-sans text-[8.5px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)]">Phase</div>
          <div className="font-sans text-[8.5px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)] text-center">Weeks</div>
          <div className="font-sans text-[8.5px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)] text-center">Days</div>
          <div className="font-sans text-[8.5px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)]">Start</div>
          <div className="font-sans text-[8.5px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)]">End</div>
          <div className="font-sans text-[8.5px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)]">Timeline</div>
        </div>
        {s.schedRows.map((r) => (
          <div key={r.k} className="grid grid-cols-[180px_55px_60px_75px_75px_1fr] gap-x-[10px] py-[5px] border-b border-os-200 items-center">
            <div className="text-[11px] font-medium text-[color:var(--fg1)]">{r.name}</div>
            <div className="text-[10.5px] text-[color:var(--fg2)] text-center">{r.weeksDisp}</div>
            <div className="text-[10.5px] text-[color:var(--fg2)] text-center">{r.days}</div>
            <div className="text-[10.5px] text-[color:var(--fg2)]">{r.start}</div>
            <div className="text-[10.5px] text-[color:var(--fg2)]">{r.end}</div>
            <div className="relative h-4 bg-os-100">
              <div className="absolute top-0 bottom-0" style={{ left: r.left, width: r.width, background: r.color }} />
              {s.monthTicks.map((t, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-px bg-os-ink/25" style={{ left: t.left }} />
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[180px_55px_60px_75px_75px_1fr] gap-x-[10px] pt-2">
          <div className="text-[11.5px] font-bold text-[color:var(--fg1)]">TOTAL</div>
          <div className="text-[11.5px] font-bold text-[color:var(--fg1)] text-center">{s.schedTotalWeeks}</div>
          <div className="text-[11.5px] font-bold text-[color:var(--fg1)] text-center">{s.schedTotalDays}</div>
          <div />
          <div className="text-[11.5px] font-bold text-accent">{s.completion}</div>
          <div />
        </div>

        <footer
          className="absolute flex items-center justify-between pt-2 border-t border-[color:var(--border)] font-sans text-[8.5px] text-[color:var(--fg3)]"
          style={{ left: "0.65in", right: "0.65in", bottom: "0.4in" }}
        >
          <span>{s.sumDate}</span>
          <span>Ossa Studio · Project Schedule</span>
        </footer>
      </div>
    </div>
  );
}
