import { usePipeline } from "./usePipeline";
import { STOP_COLOR } from "../../shared/lib/severityColors";

const cardCls = "border border-os-200 bg-white rounded-brand-lg overflow-hidden shadow-sm px-[18px] py-4";
const inputCls = "box-border px-[10px] py-[7px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[12.5px] text-os-ink";

// Ported from Ossa Fee Proposal App.dc.html lines 824-1040 (Tab 6 markup).
export function PipelineTab() {
  const p = usePipeline();

  return (
    <div>
      <div className="font-bold text-[11px] tracking-[.2em] uppercase text-os-orange-700">Ossa Studio</div>
      <h1 className="mt-[6px] mb-1 font-bold text-[30px] leading-[1.1] font-display tracking-[-.01em] text-os-ink">Pipeline</h1>
      <p className="m-0 mb-[26px] font-light text-[13.5px] text-os-600">Trends and advice drawn from every project saved in this browser.</p>

      <div className="grid grid-cols-5 gap-[14px] max-md:grid-cols-2">
        <div className={cardCls}>
          <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">Project Saved</div>
          <div className="font-bold text-[26px] font-display text-os-ink mt-[6px]">{p.pfCount}</div>
        </div>
        <div className={cardCls}>
          <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">Total Pipeline</div>
          <div className="font-bold text-[26px] font-display text-os-orange mt-[6px]">{p.pfPipeline}</div>
        </div>
        <div className={cardCls}>
          <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">Avg. Fee / Project</div>
          <div className="font-bold text-[26px] font-display text-os-ink mt-[6px]">{p.pfAvgFee}</div>
        </div>
        <div className={cardCls}>
          <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">GO/CAUTION Rate</div>
          <div className="font-bold text-[26px] font-display text-os-ink mt-[6px]">{p.pfWinRate}</div>
        </div>
        <div className={cardCls}>
          <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">Avg. Fee % / $/SF</div>
          <div className="font-bold text-lg font-display text-os-ink mt-[10px]">
            {p.pfAvgPctCC} · {p.pfAvgFeeSF}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-[14px] mt-[14px] max-md:grid-cols-2">
        {[
          { label: "Active", value: p.outcomeOpen, color: "#918f92" },
          { label: "Won", value: p.outcomeWon, color: "#4C7E9C" },
          { label: "Completed", value: p.outcomeCompleted, color: "#57575a" },
          { label: "Lost", value: p.outcomeLost, color: STOP_COLOR },
          { label: "Cancelled", value: p.outcomeCancelled, color: "#6f6f73" },
        ].map((k) => (
          <div key={k.label} className={`${cardCls} text-center py-[14px]`}>
            <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">{k.label}</div>
            <div className="font-bold text-[22px] font-display mt-1" style={{ color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[30px] font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px]">
        Business Advice <span className="font-light text-[11.5px] tracking-normal normal-case text-os-500">— generated from your saved project history</span>
      </div>
      {p.adviceRows.map((text, i) => (
        <div key={i} className="flex gap-[10px] py-[9px] border-b border-os-200">
          <div className="w-[6px] h-[6px] rounded-full bg-os-orange mt-[7px] flex-none" />
          <div className="font-light text-[13.5px] leading-[1.6] text-os-800">{text}</div>
        </div>
      ))}

      <div className="no-print flex items-center justify-between gap-4 mt-[34px] border-b-2 border-os-ink pb-[7px] flex-wrap">
        <div className="font-bold text-xs tracking-[.14em] uppercase text-os-ink">
          Pipeline <span className="font-light text-[11.5px] tracking-normal normal-case text-os-500">— track every opportunity by year</span>
        </div>
        <div className="flex items-center gap-[10px]">
          <select value={p.oppYearValue} onChange={(e) => p.onOppYearChange(e.target.value)} className={`${inputCls} font-bold text-[13px]`}>
            {p.oppYearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button onClick={p.onOppAddProject} className="px-[18px] py-2 border border-os-orange bg-os-orange text-white font-bold text-[11px] tracking-[.06em] rounded-full hover:bg-accent-hover">
            + ADD OPPORTUNITY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mt-[18px] max-md:grid-cols-2">
        {p.oppKpis.map((k) => (
          <div key={k.label} className={cardCls}>
            <div className="font-bold text-[10px] tracking-[.12em] uppercase text-os-600">{k.label}</div>
            <div className="font-bold text-2xl font-display mt-[6px]" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="font-light text-[11px] text-os-500 mt-[3px]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex justify-between items-baseline mb-[6px]">
          <span className="font-bold text-[11px] tracking-[.08em] uppercase text-os-600">Progress to Pending-Approval Target</span>
          <span className="font-medium text-xs text-os-700">{p.oppProgressCaption}</span>
        </div>
        <div className="h-[10px] rounded-full bg-os-100 overflow-hidden">
          <div className="h-full bg-os-orange rounded-full" style={{ width: `${p.oppProgressPct}%` }} />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex h-[10px] rounded-full overflow-hidden bg-os-100">
          {p.oppStatusBar.map((s, i) => (
            <div key={i} title={s.title} style={{ width: `${s.widthPct}%`, background: s.color }} />
          ))}
        </div>
        <div className="flex gap-4 flex-wrap mt-[10px]">
          {p.oppStatusLegend.map((l, i) => (
            <div key={i} className="flex items-center gap-[6px] font-medium text-[11.5px] text-os-700">
              <span className="inline-block w-[9px] h-[9px] rounded-full" style={{ background: l.color }} />
              {l.label} — {l.value}
            </div>
          ))}
        </div>
      </div>

      <div className="no-print flex items-center justify-between gap-4 mt-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {p.oppStatusFilters.map((f) => (
            <button
              key={f.label}
              onClick={f.onClick}
              className="font-bold text-[11px] px-[13px] py-[6px] rounded-full border"
              style={{ borderColor: f.active ? "#EB5B28" : "#d2d1d3", background: f.active ? "#EB5B28" : "#fff", color: f.active ? "#fff" : "#57575a" }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[10px]">
          <input value={p.oppSearch} onChange={(e) => p.onOppSearchChange(e.target.value)} placeholder="Search client or project" className={`${inputCls} w-[220px]`} />
          <div className="flex">
            <button
              onClick={p.onOppViewList}
              className="font-bold text-[11.5px] px-4 py-[7px] border rounded-l-full cursor-pointer"
              style={{ borderColor: p.oppViewList ? "#EB5B28" : "#d2d1d3", background: p.oppViewList ? "#EB5B28" : "#fff", color: p.oppViewList ? "#fff" : "#57575a" }}
            >
              LIST
            </button>
            <button
              onClick={p.onOppViewBoard}
              className="font-bold text-[11.5px] px-4 py-[7px] border border-l-0 rounded-r-full cursor-pointer"
              style={{ borderColor: p.oppViewBoard ? "#EB5B28" : "#d2d1d3", background: p.oppViewBoard ? "#EB5B28" : "#fff", color: p.oppViewBoard ? "#fff" : "#57575a" }}
            >
              BOARD
            </button>
          </div>
        </div>
      </div>

      {p.oppViewList && (
        <div className="overflow-x-auto mt-4">
          <div className="flex min-w-[1100px] border-b-2 border-os-ink">
            {p.oppColumns.map((c) => (
              <div
                key={c.key}
                onClick={c.onClick}
                style={{ width: c.w }}
                className={`px-[10px] py-2 font-bold text-[9.5px] tracking-[.06em] uppercase text-os-600 cursor-pointer whitespace-nowrap ${c.num ? "text-right" : "text-left"}`}
              >
                {c.label} {c.sortIndicator}
              </div>
            ))}
            <div className="w-[12%]" />
          </div>
          {p.oppRows.map((r) => (
            <div key={r._id} className="flex min-w-[1100px] items-center border-b border-os-200 py-[6px]">
              <div className="w-[5%] px-[10px] font-medium text-[11.5px] text-os-600">{r.projectNumber}</div>
              <div className="w-[7%] px-[10px]">
                <input type="date" value={r.date} onChange={(e) => r.onDateChange(e.target.value)} className="box-border w-full px-1 py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-[11px] text-os-ink" />
              </div>
              <div className="w-[13%] px-[10px]">
                <select
                  value={r.status}
                  onChange={(e) => r.onStatusChange(e.target.value)}
                  className="w-full box-border font-bold text-[10px] tracking-[.02em] uppercase px-[6px] py-[5px] text-white border-none rounded-full cursor-pointer"
                  style={{ background: r.statusColor }}
                >
                  {["New Lead", "Write Proposal", "Pending Approval", "Won / In Process", "Completed", "Lost", "Cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {r.showLostReason && (
                  <input
                    value={r.lostReason}
                    onChange={(e) => r.onLostReasonChange(e.target.value)}
                    placeholder="Lost reason"
                    className="box-border w-full mt-1 px-[6px] py-1 border border-os-300 rounded-[8px] bg-[#fdf4e3] font-light text-[10.5px] text-os-800"
                  />
                )}
              </div>
              <div className="w-[13%] px-[10px]">
                <input value={r.client} onChange={(e) => r.onClientChange(e.target.value)} placeholder="Client" className="box-border w-full px-[7px] py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-xs text-os-ink" />
              </div>
              <div className="w-[14%] px-[10px]">
                <input value={r.project} onChange={(e) => r.onProjectChange(e.target.value)} placeholder="Project" className="box-border w-full px-[7px] py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-xs text-os-ink" />
              </div>
              <div className="w-[8%] px-[10px]">
                <input
                  value={r.potentialFeeDisplay}
                  onFocus={r.onPotentialFeeFocus}
                  onBlur={r.onFieldBlur}
                  onChange={(e) => r.onPotentialFeeChange(e.target.value)}
                  className="box-border w-full px-[7px] py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-xs text-right text-os-ink"
                />
              </div>
              <div className="w-[7%] px-[10px]">
                <input
                  value={r.invoicedDisplay}
                  onFocus={r.onInvoicedFocus}
                  onBlur={r.onFieldBlur}
                  onChange={(e) => r.onInvoicedChange(e.target.value)}
                  className="box-border w-full px-[7px] py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-xs text-right text-os-ink"
                />
              </div>
              <div className="w-[7%] px-[10px]">
                <input
                  value={r.remainingDisplay}
                  onFocus={r.onRemainingFocus}
                  onBlur={r.onFieldBlur}
                  onChange={(e) => r.onRemainingChange(e.target.value)}
                  className="box-border w-full px-[7px] py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-xs text-right text-os-ink"
                />
              </div>
              <div className="w-[6%] px-[10px]">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={r.chances}
                  onChange={(e) => r.onChancesChange(Number(e.target.value))}
                  disabled={r.chancesDisabled}
                  title={r.chancesDisabled ? "Locked at 100% -- deal is Won or Completed" : undefined}
                  className="box-border w-full px-1 py-[5px] border border-os-300 rounded-[8px] bg-[#fdf4e3] font-medium text-xs text-right text-os-ink disabled:bg-os-100 disabled:border-os-200 disabled:text-os-500 disabled:cursor-not-allowed"
                />
              </div>
              <div className="w-[8%] px-[10px] text-right font-bold text-xs text-os-ink">{r.expectedValueDisplay}</div>
              <div className="w-[12%] px-[10px] flex gap-[5px] justify-end">
                <button onClick={r.onOpenProject} title="Open linked project" className="px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
                  OPEN
                </button>
                <button onClick={r.onDuplicate} title="Start a new project from this one's setup" className="px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
                  DUPLICATE
                </button>
                <button onClick={r.onRemove} title="Remove" className="px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
                  ×
                </button>
              </div>
            </div>
          ))}
          {p.oppNoResults && (
            <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
              {p.hasNoProjectsAtAll ? "No projects yet — click + Add Opportunity to create your first one." : "No opportunities match this filter."}
            </p>
          )}
          <p className="mt-[10px] mb-0 font-light text-xs text-os-500">{p.oppResultsCaption}</p>
        </div>
      )}

      {p.oppViewBoard && (
        <div className="grid grid-cols-7 gap-[10px] mt-4 overflow-x-auto max-md:grid-cols-3">
          {p.oppBoardColumns.map((col) => (
            <div key={col.status} onDragOver={col.onDragOver} onDrop={col.onDrop} className="bg-os-100 rounded-xl p-[10px] min-w-[150px]">
              <div className="font-bold text-[10.5px] tracking-[.04em]" style={{ color: col.color }}>
                {col.status}
              </div>
              <div className="font-medium text-[10.5px] text-os-600 my-[2px] mb-2">
                {col.count} · {col.total}
              </div>
              {col.cards.map((card) => (
                <div key={card.id} draggable onDragStart={card.onDragStart} onClick={card.onOpenProject} className="bg-white border border-os-200 rounded-lg px-[10px] py-[9px] mb-2 cursor-grab">
                  <div className="font-bold text-xs text-os-ink">{card.project}</div>
                  <div className="font-medium text-[11px] text-os-600 mt-[2px]">{card.client}</div>
                  <div className="flex justify-between mt-[6px] font-bold text-[11px] text-os-ink">
                    <span>{card.fee}</span>
                    <span className="text-os-500 font-medium">{card.chances}%</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); card.onDuplicate(); }}
                    title="Start a new project from this one's setup"
                    className="mt-[6px] w-full px-2 py-1 border border-os-300 bg-white text-os-600 font-bold text-[9px] tracking-[.05em] rounded-full hover:border-os-orange hover:text-os-orange-700"
                  >
                    DUPLICATE
                  </button>
                  {card.isLost && (
                    <input
                      value={card.lostReason}
                      onChange={(e) => card.onLostReasonChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Lost reason"
                      className="box-border w-full mt-[6px] px-[6px] py-1 border border-os-300 rounded-[6px] bg-[#fdf4e3] font-light text-[10px] text-os-800"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
