import { describe, it, expect } from "vitest";
import { applyTaskFilters, DEFAULT_FILTERS } from "./useTasksFilters";
import type { Task } from "./types";

const TODAY = "2026-08-07";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1", projectId: "p1", parentTaskId: null, title: "Test", description: null,
    assigneeId: null, assigneeName: null, dueDate: null, status: "todo", completed: false,
    sortOrder: 1000, createdAt: 0, updatedAt: 0, createdBy: "u1", projectName: "Project",
    ...overrides,
  };
}

describe("applyTaskFilters", () => {
  it("returns everything when all filters are 'any'", () => {
    const tasks = [makeTask({ id: "a" }), makeTask({ id: "b", status: "complete" })];
    expect(applyTaskFilters(tasks, DEFAULT_FILTERS, TODAY)).toHaveLength(2);
  });

  it("filters by assignee", () => {
    const tasks = [makeTask({ id: "a", assigneeId: "u1" }), makeTask({ id: "b", assigneeId: "u2" })];
    const result = applyTaskFilters(tasks, { ...DEFAULT_FILTERS, assigneeId: "u1" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("filters by status", () => {
    const tasks = [makeTask({ id: "a", status: "todo" }), makeTask({ id: "b", status: "complete" })];
    const result = applyTaskFilters(tasks, { ...DEFAULT_FILTERS, status: "complete" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("filters by due date bucket", () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-08-01" }), makeTask({ id: "b", dueDate: "2026-09-01" })];
    const result = applyTaskFilters(tasks, { ...DEFAULT_FILTERS, dueDate: "overdue" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("combines all three filters with AND semantics", () => {
    const tasks = [
      makeTask({ id: "a", assigneeId: "u1", status: "todo", dueDate: "2026-08-01" }),
      makeTask({ id: "b", assigneeId: "u1", status: "complete", dueDate: "2026-08-01" }),
    ];
    const result = applyTaskFilters(tasks, { assigneeId: "u1", status: "todo", dueDate: "overdue" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });
});
