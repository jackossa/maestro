import { PageHeader } from "../../shared/components/PageHeader";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { useFeeCalculation } from "./useFeeCalculation";

// Ported from Ossa Fee Proposal App.dc.html lines 340-524 (Tab 2 markup).
export function FeeCalculationTab() {
  const fc = useFeeCalculation();

  return (
    <div>
      <PageHeader eyebrow="Ossa Studio" title="Fee Calculation" subtitle={fc.projHeader} />

      <SectionHeader>Market Price</SectionHeader>
      {fc.hasCalcRows ? (
        <>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1.3fr_1.1fr_70px_90px_105px_90px_100px_90px_100px] gap-x-2 pt-[9px] pb-[7px] border-b border-os-300 mt-2 min-w-[820px]">
              {["Area", "Use Type", "SF", "Constr. Cost", "Sugg. %", "Fee %", "M1 Fee", "$/SF", "M2 Fee"].map((h, i) => (
                <div key={h} className={`font-bold text-[10px] tracking-[.06em] uppercase text-os-600 ${i > 1 ? "text-right" : ""}`}>
                  {h}
                </div>
              ))}
            </div>
            {fc.calcRows.map((r) => (
              <div key={r.index} className="grid grid-cols-[1.3fr_1.1fr_70px_90px_105px_90px_100px_90px_100px] gap-x-2 py-[7px] border-b border-os-200 items-center min-w-[820px]">
                <div className="font-medium text-[13px] text-os-ink">{r.area}</div>
                <div className="font-light text-[12.5px] text-os-800">{r.use}</div>
                <div className="font-medium text-[13px] text-os-800 text-right tabular-nums">{r.sfDisp}</div>
                <div className="font-medium text-[13px] text-os-800 text-right tabular-nums">{r.ccDisp}</div>
                <div className="font-light text-xs text-os-500 text-right tabular-nums">{r.suggPctDisp}</div>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={r.selPct}
                  onChange={(e) => r.onSelPct(parseFloat(e.target.value) || 0)}
                  className={`box-border w-full px-[7px] py-[5px] border rounded-brand-sm bg-[#fdf4e3] font-medium text-[12.5px] text-right text-os-ink ${fc.feeSelect === "Method 1 - % of Construction" ? "border-os-orange" : "border-os-300"}`}
                />
                <div className="font-medium text-[13px] text-os-ink text-right tabular-nums">{r.m1Disp}</div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.selSF}
                  onChange={(e) => r.onSelSF(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                  className={`box-border w-full px-[7px] py-[5px] border rounded-brand-sm bg-[#fdf4e3] font-medium text-[12.5px] text-right text-os-ink ${fc.feeSelect === "Method 2 - $/SF" ? "border-os-orange" : "border-os-300"}`}
                />
                <div className="font-medium text-[13px] text-os-ink text-right tabular-nums">{r.m2Disp}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1.3fr_1.1fr_70px_90px_105px_90px_100px_90px_100px] gap-x-2 pt-[10px] min-w-[820px]">
              <div className="font-bold text-[13px] text-os-ink">TOTAL</div>
              <div />
              <div className="font-bold text-[13px] text-os-ink text-right">{fc.totalSF}</div>
              <div className="font-bold text-[13px] text-os-ink text-right">{fc.ccTotal}</div>
              <div />
              <div />
              <div className="font-bold text-[13px] text-os-orange-700 text-right">{fc.m1Total}</div>
              <div />
              <div className="font-bold text-[13px] text-os-orange-700 text-right">{fc.m2Total}</div>
            </div>
          </div>
          {fc.grossInfo.show && (
            <p className="mt-3 mb-0 font-light text-xs text-os-500">
              Fee % and $/SF above are architecture only. Including <b className="font-medium text-os-700">{fc.grossInfo.consLabel}</b>, the gross
              figure is approximately <b className="font-bold text-os-700">{fc.grossInfo.pctLabel}</b> of construction cost ·{" "}
              <b className="font-bold text-os-700">{fc.grossInfo.sfLabel}</b>.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 mb-0 font-light text-[13.5px] text-os-500 border border-dashed border-os-300 p-5 text-center">
          No project areas defined yet — add areas with a Use Type on Project Information.
        </p>
      )}

      <div className="mt-[34px] flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader>Hourly Workplan</SectionHeader>
      </div>
      <div className="flex gap-2 justify-end mt-2">
        {fc.hasSfSuggestion && (
          <button onClick={fc.onFillFromSF} className="px-[14px] py-[6px] border border-os-orange bg-white text-os-orange-700 font-bold text-[10.5px] tracking-[.06em] rounded-full hover:bg-os-orange hover:text-white">
            Fill Hours per SF
          </button>
        )}
        {fc.hasPctSuggestion && (
          <button onClick={fc.onFillFromPct} className="px-[14px] py-[6px] border border-os-orange bg-white text-os-orange-700 font-bold text-[10.5px] tracking-[.06em] rounded-full hover:bg-os-orange hover:text-white">
            Fill Hours per %
          </button>
        )}
        <button onClick={fc.onResetHours} className="px-[14px] py-[6px] border border-os-300 bg-white text-os-600 font-bold text-[10.5px] tracking-[.06em] rounded-full hover:border-os-orange hover:text-os-orange-700">
          Reset Hours to 0
        </button>
      </div>

      <div className="overflow-x-auto mt-2">
        <div className="grid gap-x-[6px] py-[6px] items-center min-w-[940px]" style={{ gridTemplateColumns: `130px 100px 78px repeat(${fc.phaseCount}, 52px) 70px 92px` }}>
          <div className="font-medium text-[11.5px] text-os-600">Phase Duration (weeks)</div>
          <div />
          <div />
          {fc.phaseWeekInputs.map((p) => (
            <input
              key={p.key}
              type="number"
              min={0}
              value={p.val}
              onChange={(e) => p.onChange(e.target.value)}
              className="box-border w-full px-[2px] py-[5px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-xs text-center text-os-ink"
            />
          ))}
          <div />
          <div />
        </div>
        <div
          className="grid gap-x-[6px] py-[9px] border-b-2 border-os-ink min-w-[940px]"
          style={{ gridTemplateColumns: `130px 100px 78px repeat(${fc.phaseCount}, 52px) 70px 92px` }}
        >
          <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600">Team Member</div>
          <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600">Role</div>
          <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Rate</div>
          {fc.phaseAbbrevs.map((p) => (
            <div key={p.key} className="font-bold text-[9.5px] tracking-[.04em] uppercase text-os-600 text-center">
              {p.label}
            </div>
          ))}
          <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Hrs</div>
          <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Labor Fee</div>
        </div>
        {fc.teamRows.map((r, i) => (
          <div
            key={i}
            className="grid gap-x-[6px] py-[5px] border-b border-os-200 items-center min-w-[940px]"
            style={{ gridTemplateColumns: `130px 100px 78px repeat(${fc.phaseCount}, 52px) 70px 92px` }}
          >
            <div className="font-medium text-[12.5px] text-os-ink overflow-hidden text-ellipsis whitespace-nowrap">{r.name}</div>
            <div className="font-light text-[12.5px] text-os-700 overflow-hidden text-ellipsis whitespace-nowrap">{r.role}</div>
            <div className="font-light text-[12.5px] text-os-700 text-right tabular-nums">{r.rateDisp}</div>
            {r.hrsInputs.map((h) => (
              <input
                key={h.key}
                type="number"
                min={0}
                value={h.val}
                onChange={(e) => h.onChange(e.target.value)}
                className="box-border w-full px-[2px] py-[5px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-xs text-center text-os-ink"
              />
            ))}
            <div className="font-medium text-[12.5px] text-os-800 text-right tabular-nums">{r.totDisp}</div>
            <div className="font-medium text-[12.5px] text-os-ink text-right tabular-nums">{r.feeDisp}</div>
          </div>
        ))}
        <div className="grid gap-x-[6px] pt-[10px] min-w-[940px]" style={{ gridTemplateColumns: `130px 100px 78px repeat(${fc.phaseCount}, 52px) 70px 92px` }}>
          <div className="font-bold text-[12.5px] text-os-ink">Phase Hours / TOTALS</div>
          <div />
          <div />
          {fc.phaseHourTotals.map((p) => (
            <div key={p.key} className="font-bold text-xs text-os-ink text-center">
              {p.val}
            </div>
          ))}
          <div className="font-bold text-[12.5px] text-os-ink text-right">{fc.hoursTotal}</div>
          <div className="font-bold text-[12.5px] text-os-orange-700 text-right">{fc.laborTotal}</div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-9 items-start mt-[34px] max-md:grid-cols-1">
        <div>
          <SectionHeader>Engineering &amp; Expenses</SectionHeader>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_76px_96px_110px_80px_80px] gap-x-2 py-2 border-b border-os-300 min-w-[520px]">
              <div />
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Typ. %</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Sugg. $</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Actual $</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">% Fee</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">$/SF</div>
            </div>
            {fc.consRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_76px_96px_110px_80px_80px] gap-x-2 py-[5px] border-b border-os-200 items-center min-w-[520px]">
                <div className="font-light text-[13px] text-os-800">{r.label}</div>
                <div className="font-light text-xs text-os-500 text-right">{r.typPct}</div>
                <div className="font-light text-xs text-os-500 text-right">{r.sugg}</div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.amtDisp}
                  onChange={(e) => r.onAmt(e.target.value)}
                  className="box-border w-full px-[7px] py-[5px] border border-os-orange rounded-brand-sm bg-[#fdf4e3] font-medium text-[12.5px] text-right text-os-ink"
                />
                <div className="font-light text-[12.5px] text-os-700 text-right">{r.pctDisp}</div>
                <div className="font-light text-[12.5px] text-os-500 text-right">{r.sfDisp}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_76px_96px_110px_80px_80px] gap-x-2 pt-2 pb-1 min-w-[520px]">
              <div className="font-bold text-[13px] text-os-ink">TOTAL CONSULTANTS (at cost)</div>
              <div className="font-bold text-xs text-os-ink text-right">{fc.consTypTotal}</div>
              <div />
              <div className="font-bold text-[13px] text-os-ink text-right">{fc.consSub}</div>
              <div className="font-medium text-[12.5px] text-os-700 text-right">{fc.consSubPct}</div>
              <div />
            </div>
            {fc.hasConsMarkup && (
              <div className="grid grid-cols-[1fr_76px_96px_110px_80px_80px] gap-x-2 py-1 items-center min-w-[520px]">
                <div className="font-light text-[13px] text-os-800">{fc.coordLiabilityLabel}</div>
                <div />
                <div />
                <div className="font-medium text-[13px] text-os-ink text-right">{fc.coordLiabilityFee}</div>
                <div />
                <div />
              </div>
            )}
            <div className="grid grid-cols-[1fr_76px_96px_110px_80px_80px] gap-x-2 py-1 items-center min-w-[520px]">
              <div className="font-light text-[13px] text-os-800">Reimbursables (at cost)</div>
              <div />
              <div />
              <input
                type="text"
                inputMode="decimal"
                value={fc.reimb}
                onChange={(e) => fc.onReimb(e.target.value)}
                className="box-border w-full px-[7px] py-[5px] border border-os-orange rounded-brand-sm bg-[#fdf4e3] font-medium text-[12.5px] text-right text-os-ink"
              />
              <div />
              <div />
            </div>
          </div>
          <p className="mt-[14px] mb-0 font-light text-xs text-os-500">
            All consultants together typically run 25–35% of total fee. Actual well below typical usually means missing scope, not savings.
          </p>
        </div>

        <div>
          <div className="border border-os-200 bg-white rounded-brand-lg shadow-sm overflow-hidden px-5 py-[18px]">
            <div className="font-bold text-[10px] tracking-[.14em] uppercase text-os-600 border-b border-os-200 pb-[10px] mb-[10px]">
              Verdict — select the architectural fee
            </div>
            <div className="flex justify-between font-light text-[12.5px] text-os-800 py-[3px]">
              <span>Method 1: % of Construction</span>
              <span className="font-medium tabular-nums">{fc.m1Total}</span>
            </div>
            <div className="flex justify-between font-light text-[12.5px] text-os-800 py-[3px]">
              <span>Method 2: $/SF</span>
              <span className="font-medium tabular-nums">{fc.m2Total}</span>
            </div>
            <div className="flex justify-between font-light text-[12.5px] text-os-800 py-[3px]">
              <span>Workplan Labor (billed)</span>
              <span className="font-medium tabular-nums">{fc.laborTotal}</span>
            </div>
            <div className="flex justify-between font-medium text-[12.5px] text-os-ink py-[3px] border-t border-os-200 mt-[6px]">
              <span>Break-Even Floor</span>
              <span className="font-bold tabular-nums">{fc.floorLabel}</span>
            </div>

            <div className="mt-[14px]">
              <label className="font-medium text-[11.5px] text-os-600 block mb-[5px]">Select Architectural Fee</label>
              <select
                value={fc.feeSelect}
                onChange={(e) => fc.onFeeSelect(e.target.value)}
                title="This choice picks the Architectural Fee for the whole total"
                className="box-border w-full px-[9px] py-[7px] border border-os-orange rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
              >
                <option value="Method 1 - % of Construction">Method 1 — % of Construction</option>
                <option value="Method 2 - $/SF">Method 2 — $/SF</option>
                <option value="Workplan Labor">Workplan Labor</option>
                <option value="Custom">Custom</option>
              </select>
              <label className="font-medium text-[11.5px] text-os-600 block mt-2 mb-[5px]">Custom Fee (if selected)</label>
              <input
                type="number"
                min={0}
                value={fc.customFee}
                onChange={(e) => fc.onCustomFee(parseFloat(e.target.value) || 0)}
                className={`box-border w-full px-[9px] py-[7px] border rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-right text-os-ink ${fc.feeSelect === "Custom" ? "border-os-orange" : "border-os-300"}`}
              />
            </div>

            <div className="mt-[14px] pt-3 border-t border-os-200">
              <div className="flex justify-between font-medium text-[12.5px] text-os-800 py-[2px]">
                <span>Architectural Fee</span>
                <span className="tabular-nums">{fc.archFeeLabel}</span>
              </div>
              <div className="flex justify-between font-light text-[12.5px] text-os-800 py-[2px]">
                <span>+ Consultants (cost + mark-up)</span>
                <span className="tabular-nums">{fc.consBilledLabel}</span>
              </div>
              <div className="flex justify-between font-light text-[12.5px] text-os-800 py-[2px]">
                <span>+ Reimbursables (cost + mark-up)</span>
                <span className="tabular-nums">{fc.reimbBilledLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-os-charcoal text-white px-[22px] pt-[22px] pb-[18px] mt-[14px] rounded-brand-lg">
            <div className="font-bold text-[10.5px] tracking-[.18em] uppercase text-white/60">Total Project Fee</div>
            <div className="font-bold text-[36px] leading-[1.05] font-display my-2 text-white">{fc.totalFeeLabel}</div>
            <div className="font-light text-xs text-white/65">{fc.totalFeeMetaLabel}</div>
          </div>

          <div
            className="bg-white border-t border-r border-b border-os-200 px-4 py-[14px] mt-[14px] font-medium text-[12.5px] leading-[1.55] text-os-800"
            style={{ borderLeft: `4px solid ${fc.statusColor}` }}
          >
            {fc.statusText}
          </div>
        </div>
      </div>
    </div>
  );
}
