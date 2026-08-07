import { BENCH, PHASES } from "../lib/constants";
import type { ProjectData } from "./types";

// Ported verbatim from Component.defaultData() (Ossa Fee Proposal App.dc.html
// lines 1735-1806). Field values, defaults, and copy are unchanged.

export function isoDate(d: Date): string {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
}

export function emptyPhaseObj(fill: number): Record<string, number> {
  const o: Record<string, number> = {};
  PHASES.forEach((p) => (o[p.k] = fill));
  return o;
}

export function defaultData(): ProjectData {
  const now = new Date();
  return {
    info: {
      name: "",
      client: "",
      date: isoDate(now),
      projectManual: "No",
      bidding: "No",
      publicSector: "No",
      leadGenBy: "",
      services: { sd: true, dd: true, cd: true, ca: true, ec: true, testfit: false, vr: false, hourlyCa: false },
      otherServicesChecked: {},
      address: "",
      city: "Charlotte",
      state: "NC",
      zip: "",
      clientCompany: "",
      contactPerson: "",
      clientAddr: "",
      clientCity: "",
      clientState: "NC",
      clientZip: "",
      clientEmail: "",
      description: "",
      proposalNumber: "",
      constructionBudget: "",
      areas: Array.from({ length: 2 }, () => ({ area: "", useType: "", sf: "", selPct: null, selSF: null })),
      go: Array.from({ length: 9 }, () => ({ score: 2, weight: 2 })),
    },
    calc: {
      weeks: { ec: 0, prog: 0, sd: 2, dd: 2, cd: 2, perm: 2, testfit: 0, bid: 0, ca: 2, hourlyCa: 2, close: 0, post: 0 },
      starts: {},
      hrs: [0, 1, 2, 3, 4].map(() => emptyPhaseObj(0)),
      consultants: [0, 0, 0],
      reimb: 0,
      feeSelect: "Method 2 - $/SF",
      customFee: 0,
    },
    schedule: { start: isoDate(new Date(now.getTime() + 28 * 864e5)) },
    packages: {
      A: { name: "Essential", basis: "Workplan Target", custom: 0, addons: {}, ca: "Excluded", weeks: 8 },
      B: { name: "Enhanced", basis: "Final Fee", custom: 0, addons: { "Renderings & VR package": "Yes", Bidding: "Yes" }, ca: "Hourly (Est. Budget)", weeks: 10 },
      C: { name: "Comprehensive", basis: "Final Fee", custom: 0, addons: { "Renderings & VR package": "Yes", Bidding: "Yes" }, ca: "Included (Lump Sum)", weeks: 12 },
    },
    proposal: {
      mode: "onepage",
      includeCoverLetter: true,
      includeFirmOverview: true,
      includeSchedule: true,
      serviceDescOverrides: {},
      clarifications:
        "Fee includes engineering consultants as itemized above; others excluded unless noted.\nOne round of permit revisions included; additional revisions billed hourly at standard rates.\nReimbursable expenses billed at cost plus mark-up.\nFees invoiced monthly based on phase progress.",
      notIncluded:
        "Revisions to previously approved work; changes in project size, scope or complexity.\nRenderings & VR, furniture procurement, graphics/signage, cost estimating, record drawings.\nHazardous materials, special inspections coordination, move/relocation services.",
    },
    settings: {
      profit: 0.2,
      team: [
        { name: "Jack", role: "Principal", rate: 250, participation: 0.15 },
        { name: "Andrew", role: "Project Manager", rate: 175, participation: 0.25 },
        { name: "Renato", role: "Architectural Staff", rate: 125, participation: 0.3 },
      ],
      bench: BENCH.map((b) => ({ type: b[0], cost: b[1], feePct: b[2] / 100, feeSF: b[3] })),
      consultants: [
        { name: "MEPF Engineering", typicalPct: 0.15 },
        { name: "Structural Engineering", typicalPct: 0.12 },
        { name: "Civil Engineering", typicalPct: 0 },
      ],
      adders: { specs: 0.08, public: 0.1 },
      markups: { cons: 0.15, reimb: 0.1 },
      phase: {
        ec: { private: 0, public: 0.05 },
        prog: { private: 0, public: 0.05 },
        sd: { private: 0.15, public: 0.1 },
        dd: { private: 0.25, public: 0.15 },
        cd: { private: 0.4, public: 0.3 },
        perm: { private: 0, public: 0.03 },
        bid: { private: 0, public: 0.04 },
        ca: { private: 0.2, public: 0.2 },
        hourlyCa: { private: 0, public: 0 },
        close: { private: 0, public: 0.05 },
        post: { private: 0, public: 0.03 },
      },
      addons: [
        { name: "Renderings & VR package", price: 6500 },
        { name: "Bidding", price: 3500 },
      ],
      otherServices: [
        { id: "ec", name: "Existing Conditions Documentation", price: 0, perSF: 0.5 },
        { id: "testfit", name: "Test Fit", price: 0, perSF: 0.15 },
        { id: "projectManual", name: "Project Manual", price: 2500 },
        { id: "vr", name: "Renderings", price: 6500 },
        { id: "bidding", name: "Bidding", price: 3500 },
      ],
      leadSources: ["Jack", "Andrew", "Renato", "Mary Anna Ossa", "Website Form", "Referral From"],
      downPayment: 0.1,
    },
    pipeline: {
      status: "New Lead",
      potentialFee: 0,
      invoiced: 0,
      remaining: 0,
      chances: 25,
      date: isoDate(now),
      fallbackYear: String(now.getFullYear()),
      lostReason: "",
      yearSplits: [],
      projectNumber: "",
    },
  };
}
