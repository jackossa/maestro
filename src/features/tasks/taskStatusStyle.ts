import type { TaskStatus } from "./types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  complete: "Complete",
};

// Deliberately not reusing the SHARED/PRIVATE badge's bg-os-100/text-os-600
// and bg-os-orange-050/text-os-orange-700 pairs -- those exact
// background/text combinations are already claimed by the Projects
// screen's sharing badge, and reusing them would make "todo" read as
// "private" and "complete" read as "shared" at a glance. See the
// 2026-08-08 projects-accordion final review for the original collision
// this was fixed from.
export const STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "bg-os-200 text-os-700",
  in_progress: "bg-os-blue/10 text-os-800",
  complete: "bg-os-orange-100 text-os-orange-700",
};
