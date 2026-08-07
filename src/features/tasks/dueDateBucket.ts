// Pure date-bucketing logic shared by My Tasks grouping and the Due Date
// filter. Dates are ISO yyyy-mm-dd strings (what native <input type="date">
// produces, already the convention used elsewhere in this app), which
// compare correctly with plain string comparison.
export type DueDateBucket = "overdue" | "today" | "upcoming" | "no-date";

export function getDueDateBucket(dueDate: string | null, todayIso: string): DueDateBucket {
  if (!dueDate) return "no-date";
  if (dueDate < todayIso) return "overdue";
  if (dueDate === todayIso) return "today";
  return "upcoming";
}

export type DueDateFilter = "any" | "overdue" | "today" | "this-week" | "this-month" | "custom";

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

export function isWithinDueDateFilter(
  dueDate: string | null,
  filter: DueDateFilter,
  todayIso: string,
  customStart: string | null = null,
  customEnd: string | null = null,
): boolean {
  if (filter === "any") return true;
  if (!dueDate) return false;
  const bucket = getDueDateBucket(dueDate, todayIso);
  if (filter === "overdue") return bucket === "overdue";
  if (filter === "today") return bucket === "today";
  if (filter === "this-week") return dueDate >= todayIso && dueDate <= addDaysIso(todayIso, 7);
  if (filter === "this-month") return dueDate >= todayIso && dueDate <= addDaysIso(todayIso, 30);
  if (filter === "custom") {
    if (customStart && dueDate < customStart) return false;
    if (customEnd && dueDate > customEnd) return false;
    return true;
  }
  return true;
}
