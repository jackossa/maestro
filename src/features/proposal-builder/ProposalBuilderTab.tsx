import { useProposalBuilder } from "./useProposalBuilder";

// Ported from Ossa Fee Proposal App.dc.html lines 1042-1358 (Tab 7 markup):
// on-screen summary (no-print) + the full print-only proposal document
// (Sections A-G).
export function ProposalBuilderTab() {
  const p = useProposalBuilder();

  return (
    <div>
      <div className="no-print flex items-center justify-between gap-4">
        <div className="font-bold text-[11px] tracking-[.2em] uppercase text-os-orange-700">Ossa Studio · 7 of 7</div>
        <button onClick={p.onCreatePdf} className="px-5 py-[9px] border border-os-orange bg-os-orange text-white font-bold text-[11.5px] tracking-[.06em] rounded-full hover:bg-accent-hover">
          PDF
        </button>
      </div>
      <h1 className="no-print mt-[6px] mb-5 font-bold text-[30px] leading-[1.15] font-display tracking-[-.01em] text-os-ink">Proposal Builder</h1>

      <div className="no-print grid grid-cols-2 gap-6 border border-os-200 bg-white rounded-brand-lg overflow-hidden shadow-sm px-[22px] py-5 mt-4 max-md:grid-cols-1">
        <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-[7px]">
          <div className="font-medium text-xs text-os-600">Project</div>
          <div className="font-bold text-sm text-os-ink">{p.sumProject}</div>
          <div className="font-medium text-xs text-os-600">Client</div>
          <div className="font-medium text-sm text-os-ink">{p.sumClient}</div>
          <div className="font-medium text-xs text-os-600">Location</div>
          <div className="font-medium text-[13px] text-os-ink">{p.sumLocation}</div>
          <div className="font-medium text-xs text-os-600">Date</div>
          <div className="font-medium text-sm text-os-ink">{p.sumDate}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[10.5px] tracking-[.16em] uppercase text-os-600">Total Fee</div>
          <div className="font-bold text-[36px] leading-[1.1] font-display text-os-orange">{p.sumTotal}</div>
        </div>
      </div>

      <div className="no-print grid grid-cols-[1fr_320px] gap-9 items-start mt-7 max-md:grid-cols-1">
        <div>
          <div className="font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px]">Design Fee</div>
          <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-2 border-b border-os-300">
            <div />
            <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">Fee</div>
            <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">% of Total</div>
          </div>
          {p.sumPhaseRows.map((r) => (
            <div key={r.key} className="border-b border-os-200">
              <div className="grid grid-cols-[16px_1fr_130px_90px] gap-x-[10px] py-[6px] items-center">
                {r.hasDesc ? (
                  <button onClick={r.onToggleDesc} title="Show description" className="w-4 h-4 p-0 border border-os-300 bg-white text-os-600 font-bold text-[9px] rounded-[3px] flex items-center justify-center hover:border-os-orange hover:text-os-orange-700">
                    {r.toggleGlyph}
                  </button>
                ) : (
                  <div />
                )}
                <div className="font-light text-[13px] text-os-800">{r.label}</div>
                <div className="font-medium text-[13px] text-os-ink text-right">{r.fee}</div>
                <div className="font-light text-xs text-os-500 text-right">{r.pct}</div>
              </div>
              {r.descOpen && (
                <div className="pt-[2px] pb-3 pl-[26px]">
                  <textarea
                    value={r.descBody}
                    onChange={(e) => r.onDescChange(e.target.value)}
                    className="box-border w-full min-h-[70px] px-[10px] py-2 border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-light text-[12.5px] leading-[1.6] text-os-700 resize-y appearance-none"
                  />
                </div>
              )}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-2 border-b border-os-300">
            <div className="font-bold text-[13px] text-os-ink">Sub-Total Architecture</div>
            <div className="font-bold text-[13px] text-os-ink text-right">{p.subArch}</div>
            <div className="font-light text-xs text-os-500 text-right">{p.subArchPct}</div>
          </div>
          {p.hasOtherServices && (
            <>
              <div className="mt-3 font-bold text-[11px] tracking-[.08em] uppercase text-os-600">Other Services</div>
              {p.otherServiceRows.map((r) => (
                <div key={r.key} className="border-b border-os-200">
                  <div className="grid grid-cols-[16px_1fr_130px_90px] gap-x-[10px] py-[6px] items-center">
                    {r.hasDesc ? (
                      <button onClick={r.onToggleDesc} title="Show description" className="w-4 h-4 p-0 border border-os-300 bg-white text-os-600 font-bold text-[9px] rounded-[3px] flex items-center justify-center hover:border-os-orange hover:text-os-orange-700">
                        {r.toggleGlyph}
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="font-light text-[13px] text-os-800">{r.label}</div>
                    <div className="font-medium text-[13px] text-os-ink text-right">{r.fee}</div>
                    <div />
                  </div>
                  {r.descOpen && (
                    <div className="pt-[2px] pb-3 pl-[26px]">
                      <textarea
                        value={r.descBody}
                        onChange={(e) => r.onDescChange(e.target.value)}
                        className="box-border w-full min-h-[70px] px-[10px] py-2 border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-light text-[12.5px] leading-[1.6] text-os-700 resize-y appearance-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          <div className="mt-3 font-bold text-[11px] tracking-[.08em] uppercase text-os-600">Engineering Consultants</div>
          {p.sumConsRows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-[5px] border-b border-os-200">
              <div className="font-light text-[13px] text-os-800">{r.label}</div>
              <div className="font-medium text-[13px] text-os-ink text-right">{r.fee}</div>
              <div className="font-light text-xs text-os-500 text-right">{r.pct}</div>
            </div>
          ))}
          {p.hasConsMarkup && (
            <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-[5px] border-b border-os-200">
              <div className="font-light text-[13px] text-os-800">{p.consMarkupLabel}</div>
              <div className="font-medium text-[13px] text-os-ink text-right">{p.consMarkupFee}</div>
              <div />
            </div>
          )}
          <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-2 border-b border-os-300">
            <div className="font-bold text-[13px] text-os-ink">Sub-Total Engineering</div>
            <div className="font-bold text-[13px] text-os-ink text-right">{p.subEng}</div>
            <div className="font-light text-xs text-os-500 text-right">{p.subEngPct}</div>
          </div>
          <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-[6px] border-b border-os-200">
            <div className="font-light text-[13px] text-os-800">{p.coordLiabilityLabel}</div>
            <div className="font-medium text-[13px] text-os-ink text-right">{p.coordLiabilityFee}</div>
            <div />
          </div>
          <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] py-[6px] border-b border-os-200">
            <div className="font-light text-[13px] text-os-800">Reimbursable Expenses (allowance)</div>
            <div className="font-medium text-[13px] text-os-ink text-right">{p.sumReimb}</div>
            <div className="font-light text-xs text-os-500 text-right">{p.sumReimbPct}</div>
          </div>
          <div className="grid grid-cols-[1fr_130px_90px] gap-x-[10px] px-[10px] py-3 mt-2 items-center bg-os-charcoal rounded-brand-sm">
            <div className="font-bold text-[15px] font-display text-white">Total</div>
            <div className="font-bold text-xl font-display text-white text-right">{p.sumTotal}</div>
            <div />
          </div>

          <div className="mt-[30px] font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px]">Schedule Summary</div>
          {p.sumSchedRows.map((r, i) => (
            <div key={i} className="flex justify-between py-[6px] border-b border-os-200 font-light text-[13px] text-os-800">
              <span>{r.name}</span>
              <span className="text-os-500">{r.weeks}</span>
              <span>{r.range}</span>
            </div>
          ))}
          <p className="mt-3 mb-0 font-medium text-[13px] text-os-ink">Estimated completion: {p.completionLong}</p>

          <div className="mt-7 font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px] mb-3">
            Clarifications <span className="font-light text-[11.5px] tracking-normal normal-case text-os-500">(editable)</span>
          </div>
          <textarea
            value={p.clarifications}
            onChange={(e) => p.onClarifications(e.target.value)}
            className="box-border w-full min-h-[90px] px-3 py-[10px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-light text-[13px] leading-[1.6] text-os-800 resize-y appearance-none"
          />

          <div className="mt-[22px] font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px] mb-3">
            Not Included <span className="font-light text-[11.5px] tracking-normal normal-case text-os-500">(editable)</span>
          </div>
          <textarea
            value={p.notIncluded}
            onChange={(e) => p.onNotIncluded(e.target.value)}
            className="box-border w-full min-h-[72px] px-3 py-[10px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-light text-[13px] leading-[1.6] text-os-800 resize-y appearance-none"
          />
        </div>

        <div>
          <div className="font-bold text-xs tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[7px] mb-3">Estimated Invoicing Schedule</div>
          <div className="flex justify-between py-[7px] border-b border-os-200 font-medium text-[13px] text-os-ink">
            <span>Down Payment ({p.downPctLabel})</span>
            <span>{p.downAmt}</span>
          </div>
          {p.invoiceRows.map((r, i) => (
            <div key={i} className="flex justify-between py-[6px] border-b border-os-200 font-light text-[12.5px] text-os-700">
              <span>{r.label}</span>
              <span>{r.amt}</span>
            </div>
          ))}
          <div className="flex justify-between pt-[10px] font-bold text-sm text-os-orange-700">
            <span>Total</span>
            <span>{p.invoiceTotal}</span>
          </div>
          <p className="mt-4 mb-0 font-light text-[11.5px] text-os-500">
            Engineering consultants and reimbursables are invoiced within phase invoices proportionally. Amounts are estimates; actual invoices follow monthly phase progress.
          </p>
        </div>
      </div>

      {/* ===== PRINT-ONLY PORTRAIT LETTER-SIZE PROPOSAL DOCUMENT ===== */}
      <div
        className="print-only print-proposal hidden bg-white box-border mx-auto"
        style={{ width: "8.5in", padding: "1.15in 1in 1.25in 1in", fontFamily: "var(--font-body-doc)", color: "var(--fg1)" }}
      >
        <div className="fixed flex items-center justify-between pb-2 border-b border-[color:var(--border)]" style={{ top: "0.55in", left: "1in", right: "1in" }}>
          <span className="font-sans font-bold text-[8.5px] tracking-[.1em] uppercase text-[color:var(--fg1)]">Ossa Studio</span>
          <span className="font-sans text-[8.5px] text-[color:var(--fg3)] tracking-[.03em]">Design Services Proposal · No. {p.fpProposalNumber}</span>
        </div>
        <div className="fixed flex items-center justify-between pt-[9px] border-t border-[color:var(--border)] font-sans text-[8.5px] text-[color:var(--fg3)] tracking-[.03em]" style={{ bottom: "0.55in", left: "1in", right: "1in" }}>
          <span className="inline-flex items-center gap-[7px]">
            <span className="w-1 h-1 bg-accent inline-block" />
            Ossa Studio — Design Services Proposal
          </span>
          <span>{p.sumProject}</span>
        </div>

        <div className="flex items-start justify-between pb-[14px] border-b-2 border-accent mb-5">
          <img src="/assets/logo-horizontal-doc.png" alt="Ossa Studio" className="h-10 block" />
          <div className="text-right font-sans text-[9px] leading-[1.55] text-[color:var(--fg3)] tracking-[.02em]">
            <b className="text-[color:var(--fg1)] font-bold">Design Services Proposal</b>
            <br />
            No. {p.fpProposalNumber}
          </div>
        </div>

        <div className="mb-5">
          <div className="font-display font-bold text-[23px] leading-[1.1] tracking-[-.01em] text-[color:var(--fg1)]">Proposal for Architectural &amp; Engineering Design Services</div>
          <p className="text-[11px] text-[color:var(--fg2)] mt-2 mb-0">
            {p.sumProject} · {p.sumLocation} · {p.sumDate}
          </p>
        </div>

        <div className="text-[11px] text-[color:var(--fg1)] leading-[1.65] mb-[18px]">
          {p.fpContactPerson}
          <br />
          {p.fpClientCompany}
          {p.fpHasClientEmail && (
            <>
              <br />
              {p.fpClientEmail}
            </>
          )}
        </div>

        <p className="text-[11px] leading-[1.75] text-[color:var(--fg2)] m-0 mb-3">Dear {p.coverLetterFirstName},</p>
        <p className="text-[11px] leading-[1.75] text-[color:var(--fg2)] m-0 mb-3">
          Thank you for the opportunity to offer our design services for {p.sumProject}. Please find the following proposal for your review and approval.
        </p>

        {/* A. PROJECT DESCRIPTION */}
        <div className="mt-6 border-t border-os-200" style={{ breakInside: "avoid" }}>
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-2">A. Project Description</div>
          <p className="text-[11px] leading-[1.65] text-[color:var(--fg2)] m-0 whitespace-pre-line">{p.fpDescription}</p>
        </div>

        {/* B. SCOPE OF SERVICES */}
        <div className="mt-[22px] border-t border-os-200">
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-[10px]">B. Scope of Services</div>
          <p className="text-[10.5px] leading-[1.6] text-[color:var(--fg2)] m-0 mb-[14px]">The following phases are included in this proposal, based on the services selected for this project:</p>
          {p.serviceDescRows.map((s) => (
            <div key={s.num} className="mb-4" style={{ breakInside: "avoid" }}>
              <div className="font-sans font-bold text-[11px] text-[color:var(--fg1)] mb-[3px]">
                {s.num}. {s.title}
              </div>
              <p className="text-[10px] leading-[1.7] text-[color:var(--fg2)] m-0 whitespace-pre-line">{s.body}</p>
            </div>
          ))}

          <div className="font-sans font-bold text-[11px] text-[color:var(--fg1)] mt-[18px] mb-2">Anticipated Schedule</div>
          <div className="grid grid-cols-[1fr_90px_1fr] gap-x-[10px] pb-[6px] border-b border-os-300">
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)]">Phase</div>
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)] text-right">Duration</div>
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)] text-right">Dates</div>
          </div>
          {p.sumSchedRows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_1fr] gap-x-[10px] py-[6px] border-b border-os-200" style={{ breakInside: "avoid" }}>
              <div className="text-[10.5px] text-[color:var(--fg1)]">{r.name}</div>
              <div className="text-[10px] text-[color:var(--fg2)] text-right">{r.weeks}</div>
              <div className="text-[10px] text-[color:var(--fg2)] text-right">{r.range}</div>
            </div>
          ))}
          <p className="mt-[10px] mb-0 text-[10.5px] text-[color:var(--fg1)]">
            <b>Estimated completion: {p.completionLong}</b>
          </p>
        </div>

        {/* C. ADDITIONAL SERVICES */}
        <div className="mt-[22px] border-t border-os-200">
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-2">C. Additional Services</div>
          <p className="text-[10.5px] leading-[1.6] text-[color:var(--fg2)] m-0 mb-[10px]">
            Ossa Studio can provide services beyond Basic Services if requested by the Client and confirmed in writing, billed hourly at our Standard Hourly Billing Rates (Section E) unless
            agreed as a lump sum. Additional Services include, but are not limited to:
          </p>
          <div className="grid grid-cols-2 gap-x-[26px] gap-y-[3px]">
            {[
              "Value engineering", "Revisions to previously approved work", "Photorealistic renderings & physical models", "Furniture procurement & specification",
              "Cost estimating", "BOMA calculations", "Acoustical & sound-masking design", "Special inspections",
            ].map((t) => (
              <div key={t} className="text-[9.5px] leading-[1.8] text-[color:var(--fg2)]">
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* D. COMPENSATION */}
        <div className="mt-[22px] border-t border-os-200">
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-[10px]">D. Compensation</div>
          <p className="text-[10px] text-[color:var(--fg3)] m-0 mb-[10px]">{p.summaryTitleLine2}. When compensation is based on hourly rates, rates are those outlined in Section E.</p>
          <div className="grid grid-cols-[1fr_100px_70px] gap-x-2 pb-[6px] border-b border-os-300">
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)]">Phase</div>
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)] text-right">Fee</div>
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)] text-right">%</div>
          </div>
          {p.sumPhaseRows.map((r) => (
            <div key={r.key} className="grid grid-cols-[1fr_100px_70px] gap-x-2 py-[5px] border-b border-os-200 text-[10.5px]" style={{ breakInside: "avoid" }}>
              <span className="text-[color:var(--fg2)]">{r.label}</span>
              <span className="font-sans font-bold text-[color:var(--fg1)] text-right">{r.fee}</span>
              <span className="text-[color:var(--fg3)] text-right">{r.pct}</span>
            </div>
          ))}
          <div className="flex justify-between py-[6px] border-b border-os-300 text-[11px]">
            <span className="font-bold text-[color:var(--fg1)]">Sub-Total Architecture</span>
            <span className="font-display font-bold text-[color:var(--fg1)]">{p.subArch}</span>
          </div>
          {p.hasOtherServices && (
            <>
              <div className="mt-[10px] font-sans text-[9px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)] mb-1">Other Services</div>
              {p.otherServiceRows.map((r) => (
                <div key={r.key} className="flex justify-between py-[5px] border-b border-os-200 text-[10.5px]" style={{ breakInside: "avoid" }}>
                  <span className="text-[color:var(--fg2)]">{r.label}</span>
                  <span className="font-sans font-bold text-[color:var(--fg1)]">{r.fee}</span>
                </div>
              ))}
            </>
          )}
          <div className="mt-[10px] font-sans text-[9px] font-bold tracking-[.1em] uppercase text-[color:var(--fg3)] mb-1">Engineering Consultants</div>
          {p.sumConsRows.map((r, i) => (
            <div key={i} className="flex justify-between py-[5px] border-b border-os-200 text-[10.5px]" style={{ breakInside: "avoid" }}>
              <span className="text-[color:var(--fg2)]">{r.label}</span>
              <span className="font-sans font-bold text-[color:var(--fg1)]">{r.fee}</span>
            </div>
          ))}
          {p.hasConsMarkup && (
            <div className="flex justify-between py-[5px] border-b border-os-200 text-[10.5px]">
              <span className="text-[color:var(--fg2)]">{p.consMarkupLabel}</span>
              <span className="font-sans font-bold text-[color:var(--fg1)]">{p.consMarkupFee}</span>
            </div>
          )}
          <div className="flex justify-between py-[6px] border-b border-os-300 text-[10.5px] bg-os-100">
            <span className="font-sans font-bold text-[color:var(--fg1)]">Sub-Total Engineering</span>
            <span className="font-display font-bold text-[color:var(--fg1)]">{p.subEng}</span>
          </div>
          <div className="flex justify-between py-[6px] border-b border-os-300 text-[10.5px]">
            <span className="text-[color:var(--fg2)]">{p.coordLiabilityLabel}</span>
            <span className="font-sans font-bold text-[color:var(--fg1)]">{p.coordLiabilityFee}</span>
          </div>
          <div className="flex justify-between py-[6px] border-b-2 border-os-charcoal text-[10.5px]" style={{ breakInside: "avoid" }}>
            <span className="text-[color:var(--fg2)]">Reimbursable Expenses (allowance — see Section F)</span>
            <span className="font-sans font-bold text-[color:var(--fg1)]">{p.sumReimb}</span>
          </div>
          <div className="flex justify-between items-center px-2 py-3 mt-2 bg-os-charcoal text-white" style={{ breakInside: "avoid" }}>
            <span className="font-display font-bold text-[13px]">Total</span>
            <span className="font-display font-bold text-[17px]">{p.sumTotal}</span>
          </div>

          <div className="mt-4">
            <div className="font-sans text-[9px] font-bold tracking-[.12em] uppercase text-[color:var(--fg3)] mb-[6px]">Estimated Invoicing Schedule</div>
            <div className="flex justify-between py-[5px] border-b border-os-200 text-[10px]">
              <span className="font-bold text-[color:var(--fg1)]">Down Payment ({p.downPctLabel})</span>
              <span className="font-sans font-bold text-[color:var(--fg1)]">{p.downAmt}</span>
            </div>
            {p.invoiceRows.map((r, i) => (
              <div key={i} className="flex justify-between py-[5px] border-b border-os-200 text-[10px]" style={{ breakInside: "avoid" }}>
                <span className="text-[color:var(--fg2)]">{r.label}</span>
                <span className="font-sans font-bold text-[color:var(--fg1)]">{r.amt}</span>
              </div>
            ))}
            <div className="flex justify-between pt-[7px] text-[10.5px]">
              <span className="font-bold text-[color:var(--fg1)]">Total</span>
              <span className="font-display font-bold text-accent">{p.invoiceTotal}</span>
            </div>
          </div>
        </div>

        {/* E. STANDARD HOURLY RATES */}
        <div className="mt-[22px] border-t border-os-200" style={{ breakInside: "avoid" }}>
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-[10px]">E. Standard Hourly Rates</div>
          <p className="text-[10.5px] leading-[1.6] text-[color:var(--fg2)] m-0 mb-[10px]">Rates apply to Additional Services and to any Basic Services billed hourly rather than as a lump sum.</p>
          <div className="grid grid-cols-[1fr_1fr_90px] gap-x-[10px] pb-[6px] border-b border-os-300">
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)]">Name</div>
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)]">Role</div>
            <div className="font-sans font-bold text-[9px] tracking-[.1em] uppercase text-[color:var(--fg3)] text-right">Rate</div>
          </div>
          {p.hourlyRateRows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_90px] gap-x-[10px] py-[5px] border-b border-os-200 text-[10.5px]" style={{ breakInside: "avoid" }}>
              <span className="text-[color:var(--fg1)]">{r.name}</span>
              <span className="text-[color:var(--fg2)]">{r.role}</span>
              <span className="font-sans font-bold text-[color:var(--fg1)] text-right">{r.rate}/hr</span>
            </div>
          ))}
        </div>

        {/* F. REIMBURSABLE EXPENSES */}
        <div className="mt-[22px] border-t border-os-200">
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-2">F. Reimbursable Expenses</div>
          <p className="text-[10.5px] leading-[1.6] text-[color:var(--fg2)] m-0 mb-[10px]">
            Reimbursable Expenses are in addition to compensation for Basic and Additional Services and include expenses incurred by Ossa Studio and its consultants in the interest of the
            Project, including but not limited to:
          </p>
          <div className="grid grid-cols-2 gap-x-[26px] gap-y-[3px]">
            {[
              "Printing and reproduction — drawing deliverables are provided in electronic PDF format at no charge",
              "Shipping, handling and delivery",
              "Mileage, tolls and parking for authorized site travel",
              "Renderings, models, mock-ups and photography",
            ].map((t) => (
              <div key={t} className="flex gap-2 text-[9.5px] leading-[1.8] text-[color:var(--fg2)]">
                <span className="w-1 h-1 bg-accent inline-block flex-none mt-[7px]" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* G. AGREEMENT AND ACCEPTANCE */}
        <div className="mt-[22px] border-t border-os-200" style={{ breakInside: "avoid" }}>
          <div className="font-display font-bold text-[14.5px] tracking-[.02em] uppercase text-[color:var(--fg1)] mt-[13px] mb-[10px]">G. Agreement &amp; Acceptance</div>
          <p className="text-[11px] leading-[1.6] text-[color:var(--fg2)] m-0 mb-[10px]">
            This Proposal is comprised of and incorporates the following documents in order of precedence: (1) this proposal, dated {p.sumDate}; (2) Ossa Studio's Standard Terms and Conditions
            (available upon request). Where a document of higher precedence amends a portion of another, all unmodified portions remain in effect.
          </p>
          <p className="text-[11px] leading-[1.6] text-[color:var(--fg3)] m-0 mb-[10px]">
            This proposal is valid for 30 days from {p.sumDate}. An initial payment constitutes notice to proceed; progress payments are billed monthly by percentage of completion. Ossa Studio
            reserves the right to suspend performance of services if payment is not received per the terms of this agreement, with written notice to the Client.
          </p>
          <p className="text-[11px] leading-[1.6] text-[color:var(--fg2)] m-0 mb-[22px]">
            Please let us know if you would like to proceed, or have any additional questions, and we'll send a formal contract for signature. Thank you for the opportunity to consider our
            design services.
          </p>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <div className="text-[10px] text-[color:var(--fg3)] mb-[2px]">Agreed:</div>
              <div className="border-b border-os-ink h-[38px]" />
              <div className="text-[10px] text-[color:var(--fg2)] mt-[6px]">
                {p.fpContactPerson}, {p.fpClientCompany}
              </div>
              <div className="text-[10px] text-[color:var(--fg3)] mt-[2px]">Date: ______________</div>
            </div>
            <div>
              <div className="text-[10px] text-[color:var(--fg3)] mb-[2px]">Ossa Studio:</div>
              <img src="/assets/jack-signature.png" alt="Signature" className="h-[38px] block" />
              <div className="text-[10px] text-[color:var(--fg2)] mt-[6px]">Jack Ossa, NCARB, AIA, LEED AP — Principal</div>
              <div className="text-[10px] text-[color:var(--fg3)] mt-[2px]">Date: {p.sumDate}</div>
            </div>
          </div>

          <div className="mt-[22px] pt-[14px] border-t border-os-200 text-center">
            <a href="https://www.ossastudio.com" className="font-sans text-[9.5px] tracking-[.06em] text-accent no-underline">
              See more of our work at ossastudio.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
