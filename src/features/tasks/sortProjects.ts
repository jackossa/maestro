import type { TaskProject } from "./types";
import { computeSortOrder } from "./sortOrder";

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

export interface ProjectReorderWrite {
  id: string;
  sortOrder: number;
}

// Computes the writes needed to move `activeId` to land at `overId`'s
// position within `sorted`. When both new neighbors already have a
// sortOrder, this is a single midpoint write -- the common case once a
// workspace is fully migrated. When either neighbor is still legacy (no
// sortOrder yet), a single relative write would be indistinguishable from
// "no neighbor" and the moved project would jump to the top of the list
// instead of landing where it was dropped -- so this renumbers every
// project in the displayed list instead, giving all of them a real
// sortOrder in the same pass. That's what makes "the first drag migrates
// it" true for the whole list, not just the two projects a naive fix
// would touch.
export function computeProjectReorder(
  sorted: TaskProject[],
  activeId: string,
  overId: string,
): ProjectReorderWrite[] {
  const activeIndex = sorted.findIndex((p) => p.id === activeId);
  const overIndex = sorted.findIndex((p) => p.id === overId);
  if (activeIndex === -1 || overIndex === -1) return [];

  const reordered = [...sorted];
  const [moved] = reordered.splice(activeIndex, 1);
  reordered.splice(overIndex, 0, moved);

  const before = reordered[overIndex - 1];
  const after = reordered[overIndex + 1];
  const bothNeighborsOrdered =
    (before === undefined || typeof before.sortOrder === "number") &&
    (after === undefined || typeof after.sortOrder === "number");

  if (bothNeighborsOrdered) {
    const beforeOrder = before?.sortOrder ?? null;
    const afterOrder = after?.sortOrder ?? null;
    return [{ id: moved.id, sortOrder: computeSortOrder(beforeOrder, afterOrder) }];
  }

  return reordered.map((p, i) => ({ id: p.id, sortOrder: (i + 1) * 1000 }));
}
