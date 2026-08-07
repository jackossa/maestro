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
  sortOrder: number;
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
