import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

function AdminGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useAdminCheck();
  if (isLoading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !data?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminGate>{children}</AdminGate>
    </ProtectedRoute>
  );
}
