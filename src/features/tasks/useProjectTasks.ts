import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { Task } from "./types";

export function useProjectTasks(projectId: string | null): { tasks: Task[]; loading: boolean } {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "taskProjects", projectId, "tasks"), orderBy("sortOrder"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
      setLoading(false);
    });
    return unsubscribe;
  }, [projectId]);

  return { tasks, loading };
}
