import { describe, it, expect } from "vitest";
import { getDueDateBucket, isWithinDueDateFilter } from "./dueDateBucket";

const TODAY = "2026-08-07";

describe("getDueDateBucket", () => {
  it("buckets a null date as no-date", () => {
    expect(getDueDateBucket(null, TODAY)).toBe("no-date");
  });
  it("buckets a past date as overdue", () => {
    expect(getDueDateBucket("2026-08-01", TODAY)).toBe("overdue");
  });
  it("buckets today's date as today", () => {
    expect(getDueDateBucket(TODAY, TODAY)).toBe("today");
  });
  it("buckets a future date as upcoming", () => {
    expect(getDueDateBucket("2026-08-20", TODAY)).toBe("upcoming");
  });
});

describe("isWithinDueDateFilter", () => {
  it("'any' matches everything, including no due date", () => {
    expect(isWithinDueDateFilter(null, "any", TODAY)).toBe(true);
    expect(isWithinDueDateFilter("2026-01-01", "any", TODAY)).toBe(true);
  });
  it("non-'any' filters never match a null due date", () => {
    expect(isWithinDueDateFilter(null, "overdue", TODAY)).toBe(false);
    expect(isWithinDueDateFilter(null, "this-week", TODAY)).toBe(false);
  });
  it("'overdue' and 'today' match their buckets only", () => {
    expect(isWithinDueDateFilter("2026-08-01", "overdue", TODAY)).toBe(true);
    expect(isWithinDueDateFilter(TODAY, "overdue", TODAY)).toBe(false);
    expect(isWithinDueDateFilter(TODAY, "today", TODAY)).toBe(true);
  });
  it("'this-week' matches today through +7 days inclusive, not before today", () => {
    expect(isWithinDueDateFilter(TODAY, "this-week", TODAY)).toBe(true);
    expect(isWithinDueDateFilter("2026-08-14", "this-week", TODAY)).toBe(true);
    expect(isWithinDueDateFilter("2026-08-15", "this-week", TODAY)).toBe(false);
    expect(isWithinDueDateFilter("2026-08-01", "this-week", TODAY)).toBe(false);
  });
  it("'custom' respects an inclusive start/end range", () => {
    expect(isWithinDueDateFilter("2026-08-10", "custom", TODAY, "2026-08-05", "2026-08-15")).toBe(true);
    expect(isWithinDueDateFilter("2026-08-01", "custom", TODAY, "2026-08-05", "2026-08-15")).toBe(false);
    expect(isWithinDueDateFilter("2026-08-20", "custom", TODAY, "2026-08-05", "2026-08-15")).toBe(false);
  });
});
