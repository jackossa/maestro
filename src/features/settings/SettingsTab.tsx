import { SectionHeader } from "../../shared/components/SectionHeader";
import { useSettings } from "./useSettings";

// base has no width class -- callers add w-full or a fixed w-[Npx] themselves,
// so a fixed-width usage never loses a Tailwind class-order tiebreak to w-full
const inputClsBase = "box-border px-2 py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink";
const inputCls = `${inputClsBase} w-full`;
const removeBtnCls =
  "px-[6px] py-[5px] border border-os-300 bg-white text-os-600 font-medium text-[10px] tracking-[.06em] rounded-full hover:border-os-orange hover:text-os-orange-700";
const addBtnCls =
  "mt-[10px] px-[14px] py-[7px] border border-os-orange bg-white text-os-orange-700 font-bold text-[11px] tracking-[.08em] rounded-full hover:bg-os-orange hover:text-white";

// Ported from Ossa Fee Proposal App.dc.html lines 659-822 (Tab 5 markup).
export function SettingsTab() {
  const s = useSettings();

  return (
    <div>
      <div className="font-bold text-[11px] tracking-[.2em] uppercase text-os-orange-700">Ossa Studio · 5 of 7</div>
      <h1 className="mt-[6px] mb-1 font-bold text-[30px] leading-[1.1] font-display tracking-[-.01em] text-os-ink">Settings — Firm Defaults</h1>

      <div className="flex items-center gap-3 my-[26px]">
        <span className="font-medium text-[13px] text-os-700">Target Net Profit</span>
        <input type="number" min={0} max={90} value={s.setProfit} onChange={(e) => s.onSetProfit(parseFloat(e.target.value) || 0)} className={`${inputClsBase} w-[74px] text-right`} />
        <span className="font-medium text-[13px] text-os-600">%</span>
      </div>

      <div>
        <SectionHeader>Team &amp; Billing Rates</SectionHeader>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1.2fr_1.2fr_120px_130px_80px] gap-x-3 py-[9px] border-b border-os-300 min-w-[640px]">
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Name</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Role</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">Billing Rate</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">% Project Participation</div>
              <div />
            </div>
            {s.teamSetRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.2fr_1.2fr_120px_130px_80px] gap-x-3 py-[5px] border-b border-os-200 items-center min-w-[640px]">
                <input value={r.name} onChange={(e) => r.onName(e.target.value)} className={inputCls} />
                <input value={r.role} onChange={(e) => r.onRole(e.target.value)} className={inputCls} />
                <div className="flex items-center gap-[5px]">
                  <span className="font-medium text-[13px] text-os-600">$</span>
                  <input type="number" min={0} value={r.rate} onChange={(e) => r.onRate(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                </div>
                <div className="flex items-center gap-[5px]">
                  <input type="number" min={0} max={100} value={r.participation} onChange={(e) => r.onParticipation(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                  <span className="font-medium text-[13px] text-os-600">%</span>
                </div>
                <button onClick={r.onRemove} className={removeBtnCls}>
                  REMOVE
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 font-light text-[11.5px]" style={{ color: s.participationSumColor }}>
            Total participation: {s.participationSumLabel} {s.participationSumWarn && "— should add up to 100% to distribute hours correctly"}
          </div>
          <button onClick={s.onAddTeam} className={addBtnCls}>
            + ADD TEAM MEMBER
          </button>

          <div className="mt-[30px]">
            <SectionHeader>Project Type Benchmarks</SectionHeader>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1.6fr_110px_100px_100px_80px] gap-x-[10px] py-[9px] border-b border-os-300 min-w-[560px]">
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600">Use Type</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Cost $/SF</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Fee % (typ.)</div>
              <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Fee $/SF</div>
              <div />
            </div>
            {s.benchRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.6fr_110px_100px_100px_80px] gap-x-[10px] py-1 border-b border-os-200 items-center min-w-[560px]">
                <input value={r.type} onChange={(e) => r.onType(e.target.value)} className={`${inputCls} text-[12.5px]`} />
                <input type="number" min={0} value={r.cost} onChange={(e) => r.onCost(parseFloat(e.target.value) || 0)} className={`${inputCls} text-[12.5px] text-right`} />
                <input type="number" min={0} step={0.5} value={r.feePct} onChange={(e) => r.onFeePct(parseFloat(e.target.value) || 0)} className={`${inputCls} text-[12.5px] text-right`} />
                <input type="number" min={0} step={0.25} value={r.feeSF} onChange={(e) => r.onFeeSF(parseFloat(e.target.value) || 0)} className={`${inputCls} text-[12.5px] text-right`} />
                <button onClick={r.onRemove} className={removeBtnCls}>
                  REMOVE
                </button>
              </div>
            ))}
          </div>
          <button onClick={s.onAddBench} className={addBtnCls}>
            + ADD PROJECT TYPE
          </button>

          <div className="grid grid-cols-2 gap-9 mt-[30px] max-md:grid-cols-1">
            <div>
              <SectionHeader className="mb-3">Adjustments &amp; Mark-Ups</SectionHeader>
              <div className="grid grid-cols-[1fr_100px] gap-x-3 gap-y-2 items-center">
                <span className="font-light text-[13px] text-os-800">Project Manual / Full Specs adder (%)</span>
                <input type="number" min={0} step={0.5} value={s.setAdderSpecs} onChange={(e) => s.onSetAdderSpecs(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                <span className="font-light text-[13px] text-os-800">Public Sector adder (%)</span>
                <input type="number" min={0} step={0.5} value={s.setAdderPublic} onChange={(e) => s.onSetAdderPublic(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                <span className="font-light text-[13px] text-os-800">Mark-up on Consultants (%)</span>
                <input type="number" min={0} step={0.5} value={s.setMkCons} onChange={(e) => s.onSetMkCons(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                <span className="font-light text-[13px] text-os-800">Mark-up on Reimbursables (%)</span>
                <input type="number" min={0} step={0.5} value={s.setMkReimb} onChange={(e) => s.onSetMkReimb(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
              </div>

              <div className="mt-7">
                <SectionHeader note="(typical % of total fee — informational)" className="mb-3">
                  Outside Consultants
                </SectionHeader>
              </div>
              <div className="grid grid-cols-[1fr_100px_80px] gap-x-3 pb-[7px] border-b border-os-300">
                <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Consultant</div>
                <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">Typical %</div>
                <div />
              </div>
              {s.consSetRows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_80px] gap-x-3 py-[5px] border-b border-os-200 items-center">
                  <input value={r.name} onChange={(e) => r.onName(e.target.value)} className={inputCls} />
                  <input type="number" min={0} step={0.5} value={r.pct} onChange={(e) => r.onPct(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                  <button onClick={r.onRemove} className={removeBtnCls}>
                    REMOVE
                  </button>
                </div>
              ))}
              <button onClick={s.onAddConsultant} className={addBtnCls}>
                + ADD CONSULTANT
              </button>

              <div className="mt-7">
                <SectionHeader note="— checkbox list on Project Information; price flows into the proposal's Other Services line" className="mb-[6px]">
                  Additional Services
                </SectionHeader>
              </div>
              <div className="grid grid-cols-[1fr_130px_80px] gap-x-3 pb-[7px] border-b border-os-300">
                <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Service</div>
                <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">Price</div>
                <div />
              </div>
              {s.otherServiceSetRows.map((r, i) => (
                <div key={i} className="flex items-center gap-[10px] py-[5px] border-b border-os-200">
                  <input value={r.name} onChange={(e) => r.onName(e.target.value)} className={`${inputCls} flex-1 min-w-0`} />
                  {r.isPerSF && (
                    <div className="flex-none flex items-center gap-[5px] w-[110px]">
                      <span className="font-medium text-[13px] text-os-600">$</span>
                      <input type="number" min={0} step={0.01} value={r.perSF} onChange={(e) => r.onPerSF(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                      <span className="flex-none font-medium text-[11px] text-os-600">/SF</span>
                    </div>
                  )}
                  {r.isPctCC && (
                    <div className="flex-none flex items-center gap-[5px] w-[170px]">
                      <input type="number" min={0} step={0.01} value={r.pctCC} onChange={(e) => r.onPctCC(parseFloat(e.target.value) || 0)} className={`${inputClsBase} w-[60px] text-right`} />
                      <span className="flex-none font-medium text-[11px] text-os-600">% CC, min $</span>
                      <input type="number" min={0} step={100} value={r.minPrice} onChange={(e) => r.onMinPrice(parseFloat(e.target.value) || 0)} className={`${inputClsBase} w-[70px] text-right`} />
                    </div>
                  )}
                  {r.isFlat && (
                    <div className="flex-none flex items-center gap-[5px] w-[110px]">
                      <span className="font-medium text-[13px] text-os-600">$</span>
                      <input type="number" min={0} step={100} value={r.price} onChange={(e) => r.onPrice(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
                    </div>
                  )}
                  <button onClick={r.onRemove} className={`flex-none ${removeBtnCls}`}>
                    REMOVE
                  </button>
                </div>
              ))}
              <button onClick={s.onAddOtherService} className={addBtnCls}>
                + ADD SERVICE
              </button>
              <p className="mt-2 mb-0 font-light text-[11.5px] text-os-500">Bidding is priced through its phase allocation in Fee Calculation, not this price field.</p>

              <div className="mt-7">
                <SectionHeader className="mb-3">Down Payment</SectionHeader>
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-x-3 gap-y-2 items-center">
                <span className="font-light text-[13px] text-os-800">Default % at signing</span>
                <input type="number" min={0} step={1} value={s.setDownPct} onChange={(e) => s.onSetDownPct(parseFloat(e.target.value) || 0)} className={`${inputCls} text-right`} />
              </div>

              <div className="mt-7">
                <SectionHeader note="— options for Project Information" className="mb-3">
                  Lead Generated By
                </SectionHeader>
              </div>
              {s.leadSourceSetRows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px] gap-x-3 py-[5px] border-b border-os-200 items-center">
                  <input value={r.name} onChange={(e) => r.onName(e.target.value)} className={inputCls} />
                  <button onClick={r.onRemove} className={removeBtnCls}>
                    REMOVE
                  </button>
                </div>
              ))}
              <button onClick={s.onAddLeadSource} className={addBtnCls}>
                + ADD SOURCE
              </button>
            </div>

            <div>
              <SectionHeader note="— Private vs Public Sector" className="mb-3">
                Phase Fee Distribution
              </SectionHeader>
              <div className="grid grid-cols-[1.6fr_90px_90px] gap-x-[10px] pb-[7px] border-b border-os-300">
                <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600">Phase</div>
                <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Private %</div>
                <div className="font-bold text-[10px] tracking-[.06em] uppercase text-os-600 text-right">Public %</div>
              </div>
              {s.phaseSetRows.map((r) => (
                <div key={r.key} className="grid grid-cols-[1.6fr_90px_90px] gap-x-[10px] py-[5px] border-b border-os-200 items-center">
                  <span className="font-light text-[12.5px] text-os-800">{r.label}</span>
                  <input type="number" min={0} step={1} value={r.priv} onChange={(e) => r.onPriv(parseFloat(e.target.value) || 0)} className={`${inputCls} text-[12.5px] text-right`} />
                  <input type="number" min={0} step={1} value={r.pub} onChange={(e) => r.onPub(parseFloat(e.target.value) || 0)} className={`${inputCls} text-[12.5px] text-right`} />
                </div>
              ))}
              <div className="grid grid-cols-[1.6fr_90px_90px] gap-x-[10px] pt-2">
                <div className="font-bold text-[13px] text-os-ink">Total</div>
                <div className="font-bold text-[13px] text-right" style={{ color: s.phPrivColor }}>
                  {s.phPrivLabel}
                </div>
                <div className="font-bold text-[13px] text-right" style={{ color: s.phPubColor }}>
                  {s.phPubLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

