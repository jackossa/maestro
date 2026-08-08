import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { useAuth } from "../../shared/state/auth";
import type { Task } from "./types";

// Collection-group query across every taskProjects/*/tasks subcollection
// -- this is what the design spec's denormalized projectName field and
// get()-based security rules exist to support. See the design spec,
// "Architecture".
export function useMyTasks(): { tasks: Task[]; loading: boolean } {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const q = query(collectionGroup(db, "tasks"), where("assigneeId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { tasks, loading };
}
