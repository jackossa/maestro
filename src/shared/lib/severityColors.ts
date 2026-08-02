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
