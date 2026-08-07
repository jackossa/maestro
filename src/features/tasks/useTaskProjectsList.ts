import { useEffect, useState } from "react";
import { collection, onSnapshot, or, query, where } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { useAuth } from "../../shared/state/auth";
import type { TaskProject } from "./types";

export function useTaskProjectsList(): { projects: TaskProject[]; loading: boolean } {
  const { user } = useAuth();
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "taskProjects"),
      or(where("isShared", "==", true), where("createdBy", "==", user.uid)),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskProject, "id">) })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { projects, loading };
}
