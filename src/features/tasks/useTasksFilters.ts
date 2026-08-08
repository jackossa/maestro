import { isWithinDueDateFilter, type DueDateFilter } from "./dueDateBucket";
import type { Task, TaskStatus } from "./types";

export interface TaskFilters {
  assigneeId: string | "any";
  dueDate: DueDateFilter;
  status: TaskStatus | "any";
}

export const DEFAULT_FILTERS: TaskFilters = { assigneeId: "any", dueDate: "any", status: "any" };

// Pure so it's independently testable -- also directly reusable by My
// Tasks (Task 16), which applies the same three filters across projects.
export function applyTaskFilters(tasks: Task[], filters: TaskFilters, todayIso: string): Task[] {
  return tasks.filter((t) => {
    if (filters.assigneeId !== "any" && t.assigneeId !== filters.assigneeId) return false;
    if (filters.status !== "any" && t.status !== filters.status) return false;
    if (!isWithinDueDateFilter(t.dueDate, filters.dueDate, todayIso)) return false;
    return true;
  });
}
