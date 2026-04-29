import { useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";

export function useAdminCheck() {
  const { user, isSignedIn } = useUser();
  return useQuery({
    queryKey: ["admin", "check", user?.id],
    queryFn: () => adminApi.check(),
    enabled: !!isSignedIn,
    staleTime: 60_000,
  });
}
