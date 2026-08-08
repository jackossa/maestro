import { arrayUnion, collection, doc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { Task, TaskProject, TaskStatus } from "./types";

interface NewTaskInput {
  projectId: string;
  parentTaskId: string | null;
  title: string;
  sortOrder: number;
  createdBy: string;
  project: Pick<TaskProject, "name">;
}

export async function createTask(input: NewTaskInput): Promise<string> {
  const ref = doc(collection(db, "taskProjects", input.projectId, "tasks"));
  await writeTaskDoc(ref.id, input);
  return ref.id;
}

// Split out so Step usage below stays readable; not exported.
async function writeTaskDoc(id: string, input: NewTaskInput) {
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(doc(db, "taskProjects", input.projectId, "tasks", id), {
    projectId: input.projectId,
    parentTaskId: input.parentTaskId,
    title: input.title,
    description: null,
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    status: "todo" as TaskStatus,
    completed: false,
    sortOrder: input.sortOrder,
    // A new task starts in the same relative position in both views; the
    // two orders only diverge once someone drags it in one of them.
    boardSortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    projectName: input.project.name,
  });
  await batch.commit();
}

export async function updateTask(
  projectId: string,
  taskId: string,
  fields: Partial<Pick<Task, "title" | "description" | "dueDate" | "status" | "completed" | "sortOrder">>,
): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId, "tasks", taskId), { ...fields, updatedAt: Date.now() });
}

export async function assignTask(
  projectId: string,
  taskId: string,
  assigneeId: string | null,
  assigneeName: string | null,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "taskProjects", projectId, "tasks", taskId), {
    assigneeId,
    assigneeName,
    updatedAt: Date.now(),
  });
  if (assigneeId) {
    batch.update(doc(db, "taskProjects", projectId), { members: arrayUnion(assigneeId), updatedAt: Date.now() });
  }
  await batch.commit();
}

// Deletes the task AND any subtasks hanging off it. Without the cascade an
// orphaned subtask keeps a parentTaskId pointing at a deleted doc: invisible
// in List and Board (both only render one level from a live parent) but
// still reachable and mutable from My Tasks if it happens to be assigned.
// Mirrors deleteTaskProjectCascade() in taskProjectsApi.ts.
export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  const subtasksSnap = await getDocs(
    query(collection(db, "taskProjects", projectId, "tasks"), where("parentTaskId", "==", taskId)),
  );
  const batch = writeBatch(db);
  subtasksSnap.forEach((subtaskDoc) => batch.delete(subtaskDoc.ref));
  batch.delete(doc(db, "taskProjects", projectId, "tasks", taskId));
  await batch.commit();
}

// Board-view drop: sets status/completed per the exact mapping in the
// design spec, plus the column-scoped boardSortOrder. Deliberately does
// NOT touch `sortOrder` -- that belongs to List view's own manual order.
export async function moveTaskToStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
  boardSortOrder: number,
): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId, "tasks", taskId), {
    status,
    completed: status === "complete",
    boardSortOrder,
    updatedAt: Date.now(),
  });
}
