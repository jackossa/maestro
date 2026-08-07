import { describe, it, expect } from "vitest";
import { deepMerge } from "./deepMerge";

describe("deepMerge", () => {
  it("fills in missing keys from the default", () => {
    const result = deepMerge({ a: 1, b: 2 }, { a: 5 });
    expect(result).toEqual({ a: 5, b: 2 });
  });

  it("keeps extra keys from the saved object", () => {
    const result = deepMerge({ a: 1 }, { a: 1, extra: "kept" });
    expect(result).toEqual({ a: 1, extra: "kept" });
  });

  it("replaces primitive-array values wholesale, not merged", () => {
    const result = deepMerge([1, 2, 3], [9]);
    expect(result).toEqual([9]);
  });

  it("merges arrays of objects element-by-element against the default's first element as template", () => {
    const result = deepMerge([{ a: 1, b: 2 }], [{ a: 9 }, { a: 8, b: 7 }]);
    expect(result).toEqual([{ a: 9, b: 2 }, { a: 8, b: 7 }]);
  });

  it("falls back to the default entirely when saved is null or undefined", () => {
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });
});
