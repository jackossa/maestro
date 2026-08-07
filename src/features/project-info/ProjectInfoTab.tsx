import { PageHeader } from "../../shared/components/PageHeader";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { CreamInput, CreamSelect, CreamTextarea, CheckboxRow, FieldLabel } from "../../shared/components/inputs";
import { useProjectInfo } from "./useProjectInfo";

// Ported from Ossa Fee Proposal App.dc.html lines 211-338 (Tab 1 markup).
export function ProjectInfoTab() {
  const {
    info,
    upd,
    totalSF,
    useTypeOptions,
    basicServiceRows,
    additionalServiceRows,
    areaRows,
    onAddArea,
    goRows,
    goWeightedTotal,
    goPctLabel,
    verdict,
    verdictColor,
    projectStatusLabel,
    projectStatusPillColor,
  } = useProjectInfo();

  return (
    <div>
      <PageHeader
        eyebrow="Ossa Studio"
        title="Project Information"
        statusPill={{ label: projectStatusLabel, color: projectStatusPillColor }}
      />

      {/*
        Laid out as an explicit 2-col/2-row grid (not two independent
        <section> columns) so "Basic Services" and "Project Areas" land on
        the same grid row and align horizontally regardless of how tall
        the Client Information vs. Project Information blocks above them
        are -- CSS Grid auto-sizes each row to its tallest item, so this
        holds without a hand-tuned margin-top magic number.
      */}
      <div className="grid grid-cols-2 gap-x-9 max-md:grid-cols-1">
        {/* row 1, col 1 */}
        <div className="min-w-0">
          <SectionHeader className="mb-[14px]">Client Information</SectionHeader>
          <div className="grid grid-cols-[110px_1fr] gap-x-[14px] gap-y-[10px] items-center">
            <FieldLabel>Company</FieldLabel>
            <CreamInput
              value={info.clientCompany}
              onChange={(e) => upd((d) => { d.info.clientCompany = e.target.value; })}
              placeholder="Company Name"
            />
            <FieldLabel>Name</FieldLabel>
            <CreamInput
              value={info.client}
              onChange={(e) => upd((d) => { d.info.client = e.target.value; })}
              placeholder="Client Name"
            />
            <FieldLabel>Email</FieldLabel>
            <CreamInput
              value={info.clientEmail}
              onChange={(e) => upd((d) => { d.info.clientEmail = e.target.value; })}
              placeholder="name@company.com"
            />
            <FieldLabel>Address</FieldLabel>
            <CreamInput
              value={info.clientAddr}
              onChange={(e) => upd((d) => { d.info.clientAddr = e.target.value; })}
              placeholder="Street, City, State Zip"
            />
          </div>
        </div>

        {/* row 1, col 2 */}
        <div className="min-w-0">
          <SectionHeader className="mb-[14px]">Project Information</SectionHeader>
          <div className="grid grid-cols-[130px_1fr] gap-x-[14px] gap-y-[10px] items-center mb-[26px]">
            <FieldLabel>Project Name</FieldLabel>
            <CreamInput
              value={info.name}
              onChange={(e) => upd((d) => { d.info.name = e.target.value; })}
              placeholder="Project Name"
            />
            <FieldLabel>Address</FieldLabel>
            <CreamInput
              value={info.address}
              onChange={(e) => upd((d) => { d.info.address = e.target.value; })}
              placeholder="Street, City, State Zip"
            />
            <FieldLabel className="self-start mt-2">Project Description</FieldLabel>
            <CreamTextarea
              value={info.description}
              onChange={(e) => upd((d) => { d.info.description = e.target.value; })}
              placeholder="Brief description of the project scope and goals"
            />
          </div>
          <label className="flex items-center gap-[9px] mt-[14px] ml-[144px] max-md:ml-0 cursor-pointer font-medium text-[13px] text-os-800">
            <input
              type="checkbox"
              checked={info.publicSector === "Yes"}
              onChange={(e) => upd((d) => { d.info.publicSector = e.target.checked ? "Yes" : "No"; })}
              className="w-4 h-4 accent-os-orange cursor-pointer"
            />
            Public Sector Project
          </label>
        </div>

        {/* row 2, col 1 -- aligns with Project Areas below via grid row-sizing */}
        <div className="min-w-0 mt-[26px]">
          <SectionHeader className="mb-[14px]">Basic Services</SectionHeader>
          <div className="flex flex-col gap-2">
            {basicServiceRows.map((s) => (
              <CheckboxRow key={s.key} checked={s.checked} onChange={s.onChange}>
                {s.label}
              </CheckboxRow>
            ))}
          </div>

          <SectionHeader className="mt-[26px] mb-[14px]">Other Services</SectionHeader>
          <div className="flex flex-col gap-2">
            {additionalServiceRows.map((s) => (
              <CheckboxRow key={s.key} checked={s.checked} onChange={s.onChange}>
                {s.label}
              </CheckboxRow>
            ))}
          </div>
        </div>

        {/* row 2, col 2 */}
        <div className="min-w-0 mt-[26px]">
          <SectionHeader className="mb-[14px]">Project Areas</SectionHeader>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_152px_70px_34px] gap-x-2 py-[9px] border-b border-os-300 min-w-[420px]">
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Space Name</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Use Type</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">SF</div>
              <div />
            </div>
            {areaRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_152px_70px_34px] gap-x-2 py-[5px] border-b border-os-200 items-center min-w-[420px]">
                <CreamInput value={r.area} onChange={(e) => r.onArea(e.target.value)} placeholder={r.num} className="px-2 py-[7px] text-[13px]" />
                <CreamSelect value={r.useType} onChange={(e) => r.onUseType(e.target.value)} className="px-[6px] py-[7px] text-xs">
                  <option value=""></option>
                  {useTypeOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </CreamSelect>
                <CreamInput
                  type="text"
                  inputMode="numeric"
                  value={r.sf}
                  onChange={(e) => r.onSf(e.target.value)}
                  className="px-[6px] py-[7px] text-[13px] text-right"
                />
                <button
                  onClick={r.onRemove}
                  title="Remove"
                  className="w-full py-[7px] border border-os-300 bg-white text-os-600 font-bold text-[13px] cursor-pointer rounded-full leading-none hover:border-os-orange hover:text-os-orange-700"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={onAddArea}
              className="mt-[10px] px-[14px] py-[7px] border border-os-orange bg-white text-os-orange-700 font-bold text-[11px] tracking-[.08em] cursor-pointer rounded-full whitespace-nowrap hover:bg-os-orange hover:text-white"
            >
              + ADD AREA
            </button>
            <div className="grid grid-cols-[1fr_152px_70px_34px] gap-x-2 pt-3 min-w-[420px]">
              <div className="font-bold text-[13px] text-os-ink">TOTAL</div>
              <div />
              <div className="font-bold text-sm text-os-orange-700 text-right">{totalSF}</div>
              <div />
            </div>
          </div>
        </div>
      </div>

      <section className="mt-[38px]">
        <SectionHeader>Go / No-Go Scorecard</SectionHeader>
        <div className="grid grid-cols-[1fr_320px] gap-9 items-start mt-[14px] max-md:grid-cols-1">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_100px_80px] gap-x-3 pb-[9px] border-b-2 border-os-ink min-w-[400px]">
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600">Question</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-center">Score (1–3)</div>
              <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 text-right">Weighted</div>
            </div>
            {goRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_80px] gap-x-3 py-[6px] border-b border-os-200 items-center min-w-[400px]">
                <div className="font-light text-[13.5px] text-os-800">{r.q}</div>
                <CreamSelect
                  value={r.score}
                  onChange={(e) => r.onScore(parseInt(e.target.value, 10) || 1)}
                  className="justify-self-center px-2 py-[6px] text-[13px] w-auto"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </CreamSelect>
                <div className="font-medium text-[13.5px] text-os-ink text-right tabular-nums">{r.weighted}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_100px_80px] gap-x-3 pt-[11px] min-w-[400px]">
              <div className="font-bold text-[13px] text-os-ink">TOTALS</div>
              <div />
              <div className="font-bold text-[13px] text-os-ink text-right">{goWeightedTotal}</div>
            </div>
          </div>
          <div className="border border-os-200 bg-white rounded-brand-lg shadow-sm overflow-hidden p-[22px] text-center">
            <div className="font-bold text-[10.5px] tracking-[.16em] uppercase text-os-600">Score</div>
            <div className="font-bold text-[44px] leading-none font-display text-os-ink my-[8px] mb-[14px]">{goPctLabel}</div>
            <div
              className="inline-block px-[22px] py-2 text-white font-bold text-sm tracking-[.12em] rounded-full"
              style={{ background: verdictColor }}
            >
              {verdict}
            </div>
            <p className="mt-4 mb-0 font-light text-xs text-os-500">
              GO or CAUTION: continue to Fee Calculation. NO-GO: refer it out and protect the pipeline.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
