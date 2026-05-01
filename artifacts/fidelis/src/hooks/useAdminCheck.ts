import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";

export function useAdminCheck() {
  return useQuery({
    queryKey: ["admin", "check"],
    queryFn: () => adminApi.check(),
    staleTime: 60_000,
    retry: false,
  });
}