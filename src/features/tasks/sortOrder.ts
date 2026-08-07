// Spaced-integer manual ordering, gap of 1000. Reordering computes the
// midpoint between the item's new neighbors; appending to the end passes
// `after: null`. Deliberately not a fractional-indexing library -- see the
// Task Management design spec's explicit "don't overengineer" instruction.
const GAP = 1000;

export function computeSortOrder(before: number | null, after: number | null): number {
  if (before === null && after === null) return GAP;
  if (before === null) return after! - GAP;
  if (after === null) return before + GAP;
  return (before + after) / 2;
}
