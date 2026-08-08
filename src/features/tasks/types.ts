// Task Management's own data model -- deliberately standalone from the
// existing Fee Proposal Project/ProjectData types in
// src/shared/state/types.ts. Same name, different domain: this "Project"
// is a task-tracking container, not an architecture engagement. See the
// Task Management design spec, "Scope decisions".

export type TaskStatus = "todo" | "in_progress" | "complete";

export interface TaskProject {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  isShared: boolean;
  members: string[];
  // Manual display order for the Projects screen, same spaced-integer
  // pattern as Task.sortOrder. Optional because existing projects have
  // none yet -- this is a migration-free rollout, not a backfill. See
  // the design spec's "Data model changes" section.
  sortOrder?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  status: TaskStatus;
  completed: boolean;
  // Two independent manual orders. `sortOrder` is List view's project-wide
  // order (and what useProjectTasks orders its query by); `boardSortOrder`
  // is Board view's column-scoped order. They start equal at creation and
  // then diverge, so reordering cards on the Board no longer scrambles the
  // List's manual arrangement (or vice versa). See the design spec's
  // "Sort order" section.
  sortOrder: number;
  boardSortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  projectName: string;
}

export interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
