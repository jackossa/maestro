import type { ProjectData } from "../../shared/state/types";
import { isoDate } from "../../shared/state/defaultData";

// "Start a new project from a previous one" -- clones the reusable setup
// (team/rates/markups/service-description overrides/clarifications text)
// but clears client identity and areas, since those are specific to the
// old client, not reusable. Always produces a genuinely new, independent
// project (own pipeline entry at New Lead), not a scratch scenario
// attached to the original -- see the design spec, "Duplicate" section.
export function duplicateProjectData(source: ProjectData, projectNumber: string): ProjectData {
  const cloned: ProjectData = JSON.parse(JSON.stringify(source));
  const today = isoDate(new Date());

  cloned.info.name = "";
  cloned.info.client = "";
  cloned.info.clientCompany = "";
  cloned.info.contactPerson = "";
  cloned.info.clientAddr = "";
  cloned.info.clientCity = "";
  cloned.info.clientEmail = "";
  cloned.info.clientZip = "";
  cloned.info.description = "";
  cloned.info.proposalNumber = "";
  cloned.info.constructionBudget = "";
  cloned.info.date = today;
  cloned.info.areas = source.info.areas.map(() => ({ area: "", useType: "", sf: "", selPct: null, selSF: null }));

  cloned.pipeline = {
    status: "New Lead",
    potentialFee: 0,
    invoiced: 0,
    remaining: 0,
    chances: 25,
    date: today,
    fallbackYear: String(new Date().getFullYear()),
    lostReason: "",
    yearSplits: [],
    projectNumber,
  };

  return cloned;
}
