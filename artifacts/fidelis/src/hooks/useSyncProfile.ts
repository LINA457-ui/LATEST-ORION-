import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";

// Pushes the user's Clerk email + name to the backend on first signed-in mount
// so the admin dashboard can display real identifying info, and the very first
// user gets auto-promoted to admin (handled server-side in ensureAccount).
export function useSyncProfile() {
  const { isSignedIn, user } = useUser();
  const sentRef = useRef<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSignedIn || !user) return;
    const key = `${user.id}|${user.primaryEmailAddress?.emailAddress ?? ""}|${user.fullName ?? ""}`;
    if (sentRef.current === key) return;
    sentRef.current = key;
    adminApi
      .syncMe({
        email: user.primaryEmailAddress?.emailAddress ?? undefined,
        displayName: user.fullName ?? undefined,
      })
      .then(() => {
        // Re-check admin status after sync, since first-user promotion happens
        // inside the same ensureAccount call that sync triggers.
        qc.invalidateQueries({ queryKey: ["admin", "check", user.id] });
      })
      .catch(() => {
        sentRef.current = null;
      });
  }, [isSignedIn, user, qc]);
}
