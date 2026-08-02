// Canonical 3-tier severity palette, shared by every screen that renders a
// positive/caution/critical judgment: the Go/No-Go verdict (Project
// Information) and the fee-health status (Fee Calculation). Defined once,
// here, and referenced by name -- not picked ad hoc per screen from
// whichever brand accent is nearby.
//
// Values are Fee Calculation's original GREEN/YELLOW pairing (aqua/amber),
// which don't collide with any Pipeline stage color. Go/No-Go previously
// used steel/tangerine for the same two tiers -- both of those are also
// Pipeline stage colors ("Won / In Process" and "Write Proposal"), so the
// same hue meant two unrelated things depending on which tab you were on.
// See the Maestro design review, COLOR-01.
export const POSITIVE_COLOR = "#74C4CA"; // aqua -- GO, GREEN/healthy
export const CAUTION_COLOR = "#F8B74B"; // amber -- CAUTION, YELLOW/thin margin

// "Stop" color for negative/critical states (NO-GO verdict, Lost pipeline
// status, below-break-even fee health, out-of-balance settings totals).
//
// Deliberately NOT brand orange (--os-orange / #EB5B28): orange is this
// app's primary action color (New, Add, active nav, active filters), so
// reusing it for "this is bad" makes the same hue mean both "click here"
// and "stop" -- see the Maestro design review, COLOR-01. A muted brick/
// maroon in the same warm family reads as "attention" without borrowing
// the brand's "go" signal.
export const STOP_COLOR = "#A13E2E";
