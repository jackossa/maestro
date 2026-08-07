import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { TeamMember } from "./types";

export function useTeamRoster(): TeamMember[] {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
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
    });
    return unsubscribe;
  }, []);

  return members;
}
