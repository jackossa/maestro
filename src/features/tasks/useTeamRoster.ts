import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { TeamMember } from "./types";

export function useTeamRoster(): TeamMember[] {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setMembers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              displayName: data.displayName || data.email || "Unknown",
              email: data.email || "",
              photoURL: data.photoURL ?? null,
            };
          }),
        );
      },
      // No loading flag here (an empty roster renders fine), but a denied
      // read would otherwise be completely silent.
      (err) => {
        console.warn("[tasks] roster listener failed", err);
      },
    );
    return unsubscribe;
  }, []);

  return members;
}
