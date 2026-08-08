import type { TaskProject } from "./types";

// No-migration rollout: existing projects have no `sortOrder` yet. Those
// sort by `updatedAt` descending (today's behavior) and always land after
// every project that DOES have one; the first drag on a legacy project
// gives it a real value going forward. See the design spec's "Data model
// changes" section.
export function sortProjectsForDisplay(projects: TaskProject[]): TaskProject[] {
  const withOrder = projects.filter((p) => typeof p.sortOrder === "number");
  const withoutOrder = projects.filter((p) => typeof p.sortOrder !== "number");
  withOrder.sort((a, b) => a.sortOrder! - b.sortOrder!);
  withoutOrder.sort((a, b) => b.updatedAt - a.updatedAt);
  return [...withOrder, ...withoutOrder];
}
