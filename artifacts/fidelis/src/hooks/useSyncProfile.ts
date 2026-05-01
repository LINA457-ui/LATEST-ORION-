import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";

export function useSyncProfile() {
  const qc = useQueryClient();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    let cancelled = false;

    async function syncProfile() {
      try {
        await adminApi.syncMe();

        if (cancelled) return;

        await Promise.all([
          qc.invalidateQueries({ queryKey: ["admin", "check"] }),
          qc.invalidateQueries({ queryKey: ["admin", "overview"] }),
          qc.invalidateQueries({ queryKey: ["admin", "users"] }),
          qc.invalidateQueries({ queryKey: ["/api/account/dashboard"] }),
          qc.invalidateQueries({ queryKey: ["account", "dashboard"] }),
          qc.invalidateQueries({ queryKey: ["account", "me"] }),
        ]);
      } catch (err) {
        if (!cancelled) {
          console.error("[SYNC ERROR]", err);
        }
      }
    }

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, [qc, isLoaded, isSignedIn, user?.id]);

  return null;
}