import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../shared/lib/firebase";

// Project name and sharing state are the two fields also copied onto every
// child task (projectName for display, nothing else -- see the design
// spec's "Architecture" section for why isShared/members are NOT
// denormalized). Both mutators below batch-update every child task's
// projectName so it never goes stale; sharing itself is checked live via
// a security-rule get() on the parent doc, so it needs no propagation.

export async function createTaskProject(
  name: string,
  uid: string,
  displayName: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, "taskProjects"), {
    name,
    createdBy: uid,
    createdByName: displayName,
    isShared: false,
    members: [uid],
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function renameTaskProject(projectId: string, name: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "taskProjects", projectId), { name, updatedAt: Date.now() });
  const tasksSnap = await getDocs(collection(db, "taskProjects", projectId, "tasks"));
  tasksSnap.forEach((taskDoc) => batch.update(taskDoc.ref, { projectName: name }));
  await batch.commit();
}

export async function toggleTaskProjectShared(projectId: string, isShared: boolean): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId), { isShared, updatedAt: Date.now() });
}

export async function deleteTaskProjectCascade(projectId: string): Promise<void> {
  const tasksSnap = await getDocs(collection(db, "taskProjects", projectId, "tasks"));
  const batch = writeBatch(db);
  tasksSnap.forEach((taskDoc) => batch.delete(taskDoc.ref));
  batch.delete(doc(db, "taskProjects", projectId));
  await batch.commit();
}
