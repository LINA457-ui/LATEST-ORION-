import { useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useGetMyAccount } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Upload } from "lucide-react";

import { adminApi } from "@/lib/adminApi";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type AccountShape = {
  userId?: string | null;
  avatarUrl?: string | null;
  totalEquity?: number | string | null;
  cashBalance?: number | string | null;
  buyingPower?: number | string | null;
};

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function ProfilePage() {
  const { user } = useUser();
  const { data: rawAccount } = useGetMyAccount();

  const account = rawAccount as AccountShape | undefined;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);

  const customAvatar = account?.avatarUrl ?? null;
  const avatarSrc = customAvatar || user?.imageUrl || "";

  const accountNumber =
    typeof account?.userId === "string" && account.userId.length > 0
      ? account.userId.slice(-10).toUpperCase()
      : "INV-00012345";

  const totalEquity = safeNumber(account?.totalEquity, 100000);
  const cashBalance = safeNumber(account?.cashBalance, 100000);
  const buyingPower = safeNumber(account?.buyingPower, 100000);

  const refreshAccount = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/account/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["account"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      return adminApi.uploadAvatar(formData);
    },
    onSuccess: () => {
      toast({
        title: "Profile picture updated",
      });

      refreshAccount();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setBusy(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("remove", "true");

      return adminApi.uploadAvatar(formData);
    },
    onSuccess: () => {
      toast({
        title: "Profile picture removed",
      });

      refreshAccount();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return null;
  }

  const isUploading = busy || uploadMutation.isPending;
  const isRemoving = removeMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Profile
        </h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}

              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                {user.firstName?.[0] || "U"}
                {user.lastName?.[0] || ""}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow transition hover:scale-105 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";

                if (!file) return;

                setBusy(true);
                uploadMutation.mutate(file);
              }}
            />
          </div>

          <div className="min-w-0">
            <CardTitle className="truncate text-2xl">
              {user.fullName || "Investor User"}
            </CardTitle>

            <CardDescription className="truncate text-base">
              {user.primaryEmailAddress?.emailAddress || "user@example.com"}
            </CardDescription>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {isUploading ? "Uploading..." : "Upload picture"}
              </Button>

              {customAvatar ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMutation.mutate()}
                  disabled={isRemoving}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {isRemoving ? "Removing..." : "Remove"}
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <div>
            <h3 className="mb-4 text-lg font-bold">Account Snapshot</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Account Number
                </div>
                <div className="font-mono">{accountNumber}</div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Total Equity
                </div>
                <div className="font-bold">{formatCurrency(totalEquity)}</div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Available Cash
                </div>
                <div className="font-bold">{formatCurrency(cashBalance)}</div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Buying Power
                </div>
                <div className="font-bold">{formatCurrency(buyingPower)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}