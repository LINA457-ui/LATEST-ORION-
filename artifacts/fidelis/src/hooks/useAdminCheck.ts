import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { useUser } from "@clerk/react";

export function useAdminCheck() {
  const { isSignedIn, user } = useUser();
  // Scope by Clerk user id so switching accounts on a shared browser doesn't
  // leak the previous user's admin state from cache.
  return useQuery({
    queryKey: ["admin", "check", user?.id ?? null],
    queryFn: () => adminApi.check(),
    enabled: !!isSignedIn,
    staleTime: 60_000,
    retry: false,
  });
}
