import { describe, it, expect } from "vitest";
import { sortProjectsForDisplay } from "./sortProjects";
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
