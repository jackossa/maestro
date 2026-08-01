// Ported verbatim from Component.defaultData()/migrate() in
// Ossa Fee Proposal App.dc.html (lines 1735-1900). Field names, defaults,
// and nesting are unchanged from the original.

export interface Area {
  area: string;
  useType: string;
  sf: string;
  selPct: number | null;
  selSF: number | null;
}

export interface GoRow {
  score: number;
  weight: number;
}

export interface ProjectInfo {
  name: string;
  client: string;
  date: string;
  projectManual: "Yes" | "No";
  bidding: "Yes" | "No";
  publicSector: "Yes" | "No";
  outcome: string;
  leadGenBy: string;
  services: { sd: boolean; dd: boolean; cd: boolean; ca: boolean; ec: boolean; testfit: boolean; vr: boolean };
  otherServicesChecked: Record<string, boolean>;
  address: string;
  city: string;
  state: string;
  zip: string;
  clientCompany: string;
  contactPerson: string;
  clientAddr: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientEmail: string;
  description: string;
  proposalNumber: string;
  constructionBudget: string;
  areas: Area[];
  go: GoRow[];
}

export interface CalcData {
  weeks: Record<string, number>;
  starts: Record<string, string>;
  hrs: Record<string, number>[];
  consultants: number[];
  reimb: number;
  feeSelect: "Method 1 - % of Construction" | "Method 2 - $/SF" | "Workplan Labor" | "Custom";
  customFee: number;
}

export interface PackageDef {
  name: string;
  basis: string;
  custom: number;
  addons: Record<string, string>;
  ca: string;
  weeks: number;
}

export interface ProposalData {
  mode: string;
  includeCoverLetter: boolean;
  includeFirmOverview: boolean;
  includeSchedule: boolean;
  serviceDescOverrides: Record<string, string>;
  clarifications: string;
  notIncluded: string;
}

export interface TeamMember {
  name: string;
  role: string;
  rate: number;
  participation: number;
}

export interface BenchRow {
  type: string;
  cost: number;
  feePct: number;
  feeSF: number;
}

export interface ConsultantDef {
  name: string;
  typicalPct: number;
}

export interface OtherServiceDef {
  id: string;
  name: string;
  price: number;
  perSF?: number;
  pctCC?: number;
  minPrice?: number;
}

export interface Settings {
  profit: number;
  team: TeamMember[];
  bench: BenchRow[];
  consultants: ConsultantDef[];
  adders: { specs: number; public: number };
  markups: { cons: number; reimb: number };
  phase: Record<string, { private: number; public: number }>;
  addons: { name: string; price: number }[];
  otherServices: OtherServiceDef[];
  leadSources: string[];
  downPayment: number;
}

export interface ProjectData {
  info: ProjectInfo;
  calc: CalcData;
  schedule: { start: string };
  packages: { A: PackageDef; B: PackageDef; C: PackageDef };
  proposal: ProposalData;
  settings: Settings;
}

export interface ProjectRecord {
  created: number;
  updated: number;
  data: ProjectData;
}

export interface Store {
  currentId: string;
  order: string[];
  projects: Record<string, ProjectRecord>;
  leads: Record<string, unknown>;
  leadOrder: string[];
}
