import { describe, it, expect } from "vitest";
import { computeSortOrder } from "./sortOrder";

describe("computeSortOrder", () => {
  it("returns the base gap for the first item in an empty list", () => {
    expect(computeSortOrder(null, null)).toBe(1000);
  });

  it("appends after the last item", () => {
    expect(computeSortOrder(1000, null)).toBe(2000);
    expect(computeSortOrder(5000, null)).toBe(6000);
  });

  it("prepends before the first item", () => {
    expect(computeSortOrder(null, 1000)).toBe(0);
    expect(computeSortOrder(null, 5000)).toBe(4000);
  });

  it("computes the midpoint between two neighbors", () => {
    expect(computeSortOrder(1000, 2000)).toBe(1500);
    expect(computeSortOrder(1000, 1002)).toBe(1001);
  });
});
