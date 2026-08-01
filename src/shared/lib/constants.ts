// Ported verbatim from Ossa Fee Proposal App.dc.html (Component static fields,
// lines 1373-1438). Copy, keys, and values are unchanged from the original.

export interface Phase {
  k: string;
  label: string;
  abbr: string;
  publicOnly?: boolean;
  scheduleOnly?: boolean;
  biddingOnly?: boolean;
}

export const STATUS_OPTIONS = [
  "New Lead",
  "Write Proposal",
  "Pending Approval",
  "Won / In Process",
  "Lost",
  "Cancelled",
  "Completed",
] as const;

export function migrateOppStatus(s: string): string {
  const map: Record<string, string> = {
    Pending: "Pending Approval",
    Opportunity: "Write Proposal",
    "In Process": "Won / In Process",
  };
  return map[s] || s;
}

export const GO_Q = [
  "Potential fee (1: <$10K / 2: $10-50K / 3: >$50K)",
  "Long-term client relationship potential",
  "Talking to the decision maker?",
  "Past client?",
  "Trusted partner referral?",
  "Client knows design & construction process?",
  "Experienced in this project type?",
  "Opportunity for high design?",
  "Exciting opportunity?",
];

export const PHASES: Phase[] = [
  { k: "ec", label: "Existing Conditions / Facility Assessment", abbr: "EC", publicOnly: true },
  { k: "prog", label: "Programming", abbr: "PROG", publicOnly: true },
  { k: "testfit", label: "Test Fit", abbr: "TF", scheduleOnly: true },
  { k: "sd", label: "Schematic Design", abbr: "SD" },
  { k: "dd", label: "Design Development", abbr: "DD" },
  { k: "cd", label: "Construction Documents", abbr: "CD" },
  { k: "perm", label: "Permitting", abbr: "PERM", scheduleOnly: true },
  { k: "bid", label: "Bidding", abbr: "BID", biddingOnly: true },
  { k: "ca", label: "Construction Administration", abbr: "CA" },
  { k: "hourlyCa", label: "Hourly Construction Administration", abbr: "CA (HR)" },
  { k: "close", label: "Project Closeout", abbr: "CLOSE", publicOnly: true },
  { k: "post", label: "Post-Occupancy / Warranty Services", abbr: "POST", publicOnly: true },
];

export const USE_TYPES = [
  "Office Upfit", "Retail Upfit", "Restaurant Upfit", "Warehouse Storage", "Racking",
  "Church Upfit", "Country Club", "Adaptive Reuse", "Commercial Core & Shell",
  "Residential (Custom)", "Townhomes", "Educational", "Brewery", "Retail Banking",
  "Medical Office", "Dental Office", "Gym / Fitness", "Restrooms", "Kitchen", "Lobby Renovation",
];

// [type, cost($/SF), feePct(%), feeSF($/SF)]
export const BENCH: [string, number, number, number][] = [
  ["Office Upfit", 110, 10, 11], ["Retail Upfit", 100, 10, 10], ["Restaurant Upfit", 300, 9, 27],
  ["Warehouse Storage", 110, 5.5, 6], ["Racking", 30, 6, 1.75], ["Church Upfit", 140, 9, 12.5],
  ["Country Club", 375, 8.5, 32], ["Adaptive Reuse", 225, 10, 22.5], ["Commercial Core & Shell", 190, 6.5, 12.5],
  ["Testfit", 0, 0, 0.25], ["Residential (Custom)", 250, 10, 25], ["Townhomes", 160, 5, 8],
  ["Educational", 350, 7.5, 24], ["Brewery", 250, 8.5, 21], ["Retail Banking", 400, 8.5, 34],
  ["Medical Office", 200, 9, 18], ["Dental Office", 250, 9, 22.5], ["Gym / Fitness", 90, 8.5, 8],
  ["Restrooms", 350, 12, 42], ["Kitchen", 400, 10, 40], ["Lobby Renovation", 250, 10, 25],
];

export interface OppProject {
  _id: string;
  client: string;
  project: string;
  status: string;
  potentialFee: number;
  invoiced: number;
  remaining: number;
  chances: number;
  date: string;
  lostReason: string;
  yearSplits: { year: string; invoiced: number }[];
  projectNumber: string;
  fallbackYear: string;
  projectId?: string;
}

export const OPP_SEED: OppProject[] = [
  {
    client: "Sample Client", project: "Sample Project", status: "New Lead",
    potentialFee: 1, invoiced: 0, remaining: 1, chances: 1, date: "2026-07-26",
    lostReason: "", yearSplits: [], projectNumber: "1", _id: "sample-1", fallbackYear: "2026",
  },
];

export const FRAMEWORKS = [
  { title: "Standard / Private", body: "Programming > SD > DD > CD & Permit > (Permitting) > CA. Scope per Ossa LOA: zoning analysis, pricing drawings, engineering coordination, permit submission, biweekly site visits, submittal & RFI review, closeout." },
  { title: "Government — Mecklenburg County (example)", body: "SD > DD > CD (county review) > Bidding Administration (bid docs, bidders list, addenda, pre-bid conference, equivalency approvals per G.S.133) > CA (pre-construction meeting, progress meetings, field reports, payment certification with sales tax records, change orders) > Closeout (substantial & final inspection, consent of surety, lien releases, M/WBE reports, warranties, O&M manuals, record drawings within 60 days)." },
  { title: "NC SCO — Informal (smaller projects)", body: "Simplified single design review > informal bidding (3 quotes) > CD > CA > closeout. Project manual still required." },
  { title: "NC SCO — Formal", body: "SD submission & SCO review > DD submission & review > CD submission & review > SCO approval > formal advertised bid > CA with SCO oversight > final acceptance by SCO. Full project manual & specifications mandatory; add review cycles to the schedule." },
];
