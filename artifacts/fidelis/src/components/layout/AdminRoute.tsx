import { useState, type ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { adminPinSession } from "@/lib/adminApi";
import { PinGate } from "@/components/admin/PinGate";

function AdminGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useAdminCheck();
  const [, navigate] = useLocation();
  const [hasPin, setHasPin] = useState<boolean>(() => !!adminPinSession.get());
  const [open, setOpen] = useState<boolean>(() => !adminPinSession.get());

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
  if (!hasPin) {
    return (
      <>
        <div className="space-y-6 p-8 opacity-30 pointer-events-none">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
        <PinGate
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v && !adminPinSession.get()) {
              // User dismissed without unlocking — bounce them home
              navigate("/dashboard");
            }
          }}
          onSuccess={() => setHasPin(true)}
        />
      </>
    );
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
