import { useRef, useState } from "react";
import { useUser } from "@clerk/react";
import { useGetMyAccount } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/adminApi";
import { resizeAvatar } from "@/lib/avatarUtils";

export default function ProfilePage() {
  const { user } = useUser();
  const { data: account } = useGetMyAccount();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const customAvatar = (account as { avatarUrl?: string | null } | undefined)
    ?.avatarUrl;
  const avatarSrc = customAvatar || user?.imageUrl;

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await resizeAvatar(file);
      return adminApi.uploadAvatar(dataUrl);
    },
    onSuccess: () => {
      toast({ title: "Profile picture updated" });
      qc.invalidateQueries({ queryKey: ["/api/account/me"] });
      qc.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
    },
    onError: (e: Error) =>
      toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
    onSettled: () => setBusy(false),
  });

  const removeMut = useMutation({
    mutationFn: () => adminApi.uploadAvatar(null),
    onSuccess: () => {
      toast({ title: "Profile picture removed" });
      qc.invalidateQueries({ queryKey: ["/api/account/me"] });
      qc.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-6">
          <div className="relative">
            <Avatar className="w-20 h-20">
              {avatarSrc && <AvatarImage src={avatarSrc} />}
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow border-2 border-background hover:scale-105 transition disabled:opacity-50"
              aria-label="Change profile picture"
              disabled={busy || uploadMut.isPending}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  setBusy(true);
                  uploadMut.mutate(f);
                }
              }}
            />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-2xl truncate">{user.fullName}</CardTitle>
            <CardDescription className="text-base truncate">
              {user.primaryEmailAddress?.emailAddress}
            </CardDescription>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={busy || uploadMut.isPending}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {uploadMut.isPending ? "Uploading..." : "Upload picture"}
              </Button>
              {customAvatar && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMut.mutate()}
                  disabled={removeMut.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          
          <div>
            <h3 className="font-bold text-lg mb-4">Account Snapshot</h3>
            {account ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Account Number</div>
                  <div className="font-mono">{account.userId.slice(-10).toUpperCase() || 'N/A'}</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Total Equity</div>
                  <div className="font-bold">{formatCurrency(account.totalEquity)}</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Available Cash</div>
                  <div className="font-bold">{formatCurrency(account.cashBalance)}</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Buying Power</div>
                  <div className="font-bold">{formatCurrency(account.buyingPower)}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Loading account details...</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
