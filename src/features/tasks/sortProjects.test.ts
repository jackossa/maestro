import { describe, it, expect } from "vitest";
import { sortProjectsForDisplay, computeProjectReorder } from "./sortProjects";
import type { TaskProject } from "./types";

function project(overrides: Partial<TaskProject>): TaskProject {
  return {
    id: "id",
    name: "name",
    createdBy: "u1",
    createdByName: "User",
    isShared: false,
    members: ["u1"],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("sortProjectsForDisplay", () => {
  it("returns an empty array unchanged", () => {
    expect(sortProjectsForDisplay([])).toEqual([]);
  });

  it("sorts projects that all have sortOrder ascending", () => {
    const a = project({ id: "a", sortOrder: 2000 });
    const b = project({ id: "b", sortOrder: 1000 });
    const c = project({ id: "c", sortOrder: 3000 });
    expect(sortProjectsForDisplay([a, b, c]).map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("falls back to updatedAt descending when none have sortOrder", () => {
    const a = project({ id: "a", updatedAt: 100 });
    const b = project({ id: "b", updatedAt: 300 });
    const c = project({ id: "c", updatedAt: 200 });
    expect(sortProjectsForDisplay([a, b, c]).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("puts every sortOrder-having project before every sortOrder-less one", () => {
    const ordered = project({ id: "ordered", sortOrder: 5000, updatedAt: 1 });
    const legacyNew = project({ id: "legacyNew", updatedAt: 999 });
    const legacyOld = project({ id: "legacyOld", updatedAt: 500 });
    expect(sortProjectsForDisplay([legacyNew, ordered, legacyOld]).map((p) => p.id)).toEqual([
      "ordered",
      "legacyNew",
      "legacyOld",
    ]);
  });

  it("does not mutate the input array", () => {
    const a = project({ id: "a", sortOrder: 2000 });
    const b = project({ id: "b", sortOrder: 1000 });
    const input = [a, b];
    sortProjectsForDisplay(input);
    expect(input).toEqual([a, b]);
  });
});

describe("computeProjectReorder", () => {
  it("returns a single midpoint write when both new neighbors are ordered", () => {
    const a = project({ id: "a", sortOrder: 1000 });
    const b = project({ id: "b", sortOrder: 2000 });
    const c = project({ id: "c", sortOrder: 3000 });
    // Move c to sit between a and b.
    const writes = computeProjectReorder([a, b, c], "c", "b");
    expect(writes).toEqual([{ id: "c", sortOrder: 1500 }]);
  });

  it("renumbers the whole list when every project is legacy (no sortOrder)", () => {
    const a = project({ id: "a", updatedAt: 300 });
    const b = project({ id: "b", updatedAt: 200 });
    const c = project({ id: "c", updatedAt: 100 });
    // Displayed order (via sortProjectsForDisplay) would be [a, b, c].
    // Drag c to the middle, landing on b.
    const writes = computeProjectReorder([a, b, c], "c", "b");
    expect(writes).toEqual([
      { id: "a", sortOrder: 1000 },
      { id: "c", sortOrder: 2000 },
      { id: "b", sortOrder: 3000 },
    ]);
  });

  it("renumbers the whole list when only one new neighbor is legacy", () => {
    const ordered = project({ id: "ordered", sortOrder: 5000 });
    const legacy = project({ id: "legacy", updatedAt: 1 });
    const other = project({ id: "other", sortOrder: 6000 });
    // Drag "other" to sit between "ordered" and "legacy".
    const writes = computeProjectReorder([ordered, legacy, other], "other", "legacy");
    expect(writes).toEqual([
      { id: "ordered", sortOrder: 1000 },
      { id: "other", sortOrder: 2000 },
      { id: "legacy", sortOrder: 3000 },
    ]);
  });

  it("does a single write when dropped at the very start (no before-neighbor)", () => {
    const a = project({ id: "a", sortOrder: 1000 });
    const b = project({ id: "b", sortOrder: 2000 });
    const writes = computeProjectReorder([a, b], "b", "a");
    expect(writes).toEqual([{ id: "b", sortOrder: 0 }]);
  });

  it("returns an empty array when active or over id is not found", () => {
    const a = project({ id: "a", sortOrder: 1000 });
    expect(computeProjectReorder([a], "missing", "a")).toEqual([]);
    expect(computeProjectReorder([a], "a", "missing")).toEqual([]);
  });
});
