// Pure date-bucketing logic shared by My Tasks grouping and the Due Date
// filter. Dates are ISO yyyy-mm-dd strings (what native <input type="date">
// produces, already the convention used elsewhere in this app), which
// compare correctly with plain string comparison.
export type DueDateBucket = "overdue" | "today" | "upcoming" | "no-date";

// "Today" as the user's LOCAL calendar date. Deliberately not
// `new Date().toISOString().slice(0, 10)` -- that returns the UTC calendar
// date, which disagrees with what <input type="date"> writes (a local
// date) for part of every day at any non-zero UTC offset, flagging
// today's tasks overdue for hours at a time.
//
// Note: the two functions below take a `todayIso` STRING parameter that
// shadows this function inside their bodies. That's intentional -- they
// stay pure and take "today" as an argument so they're testable; only
// callers reach for todayIso().
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
