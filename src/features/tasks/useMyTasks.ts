import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { useAuth } from "../../shared/state/auth";
import type { Task } from "./types";

// Collection-group query across every taskProjects/*/tasks subcollection
// -- this is what the design spec's denormalized projectName field exists
// to support. See the design spec, "Architecture". Authorized by the
// recursive-wildcard `match /{path=**}/tasks/{taskId}` rule in
// firestore.rules, which matches on assigneeId: the path-scoped rule
// under taskProjects/{projectId} does NOT apply to collectionGroup()
// queries, so the where() clause below and that rule must stay in sync.
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
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
        setLoading(false);
      },
      // Without this, a denied query or a missing index leaves loading
      // stuck true forever -- an eternal skeleton with no console signal.
      (err) => {
        console.warn("[tasks] my-tasks listener failed", err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  return { tasks, loading };
}
