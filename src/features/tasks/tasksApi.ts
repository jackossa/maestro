import { arrayUnion, collection, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
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

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, "taskProjects", projectId, "tasks", taskId));
}

// Board-view drop: sets status/completed per the exact mapping in the
// design spec, plus the new column-scoped sortOrder.
export async function moveTaskToStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
  sortOrder: number,
): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId, "tasks", taskId), {
    status,
    completed: status === "complete",
    sortOrder,
    updatedAt: Date.now(),
  });
}
