import { STOP_COLOR } from "./severityColors";

// Ported from Component.oppStatusColor() (Ossa Fee Proposal App.dc.html
// lines 1542-1545), with one deliberate deviation: Lost now uses STOP_COLOR
// instead of brand orange, so it no longer shares a hue with the app's
// primary action color -- see the Maestro design review, COLOR-01.
const MAP: Record<string, string> = {
  "New Lead": "#A1AFC1", // var(--os-mist)
  "Write Proposal": "#F49633", // var(--os-tangerine)
  "Pending Approval": "#1C80C4", // var(--os-blue)
  "Won / In Process": "#4C7E9C", // var(--os-steel)
  Completed: "#57575a", // var(--os-700)
  Lost: STOP_COLOR,
  Cancelled: "#b4b3b6", // var(--os-400)
};

export function oppStatusColor(status: string): string {
  return MAP[status] || "#918f92"; // var(--os-500)
}
