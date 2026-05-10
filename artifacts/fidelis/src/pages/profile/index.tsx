import { useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function show(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Not provided";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));

    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => adminApi.dashboard(),
    enabled: isLoaded && isSignedIn,
  });

  const account = data?.account;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);

  const refreshAccount = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/account/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["account"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const avatarUrl = await fileToDataUrl(file);
      return adminApi.uploadAvatar(avatarUrl);
    },
    onSuccess: () => {
      toast({ title: "Profile picture updated" });
      refreshAccount();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => setBusy(false),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      return adminApi.uploadAvatar(null);
    },
    onSuccess: () => {
      toast({ title: "Profile picture removed" });
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

  if (!isLoaded) return <div className="p-6">Loading profile...</div>;

  if (!isSignedIn || !user) {
    return <div className="p-6">Please sign in to view your profile.</div>;
  }

  if (isLoading) return <div className="p-6">Loading account details...</div>;

  if (isError || !account) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold">Profile unavailable</h2>
        <p className="mt-2 text-muted-foreground">
          Could not load your account profile.
        </p>
      </div>
    );
  }

  const customAvatar = account.avatarUrl ?? null;
  const avatarSrc = customAvatar || user.imageUrl || "";

  const displayName =
    account.displayName ||
    user.fullName ||
    user.username ||
    user.firstName ||
    "Investor User";

  const email =
    account.email || user.primaryEmailAddress?.emailAddress || "user@example.com";

  const accountNumber = account.accountNumber || "Not available";

  const totalEquity = safeNumber(account.totalEquity, 0);
  const portfolioValue = safeNumber(account.portfolioValue, 0);
  const cashBalance = safeNumber(account.cashBalance, 0);
  const buyingPower = safeNumber(account.buyingPower, 0);

  const isUploading = busy || uploadMutation.isPending;
  const isRemoving = removeMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">
          Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your account and registration details
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                {displayName?.[0]?.toUpperCase() || "U"}
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
            <CardTitle className="truncate text-2xl">{displayName}</CardTitle>
            <CardDescription className="truncate text-base">
              {email}
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
              <Info label="Account Number" value={accountNumber} mono />
              <Info label="Total Equity" value={formatCurrency(totalEquity)} />
              <Info label="Portfolio Value" value={formatCurrency(portfolioValue)} />
              <Info label="Available Cash" value={formatCurrency(cashBalance)} />
              <Info label="Buying Power" value={formatCurrency(buyingPower)} wide />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-4 text-lg font-bold">Registration Details</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Full Name" value={show(displayName)} />
              <Info label="Email Address" value={show(email)} />
              <Info label="Phone Number" value={show(account.phone)} />
              <Info label="Date of Birth" value={show(account.dateOfBirth)} />
              <Info label="Country" value={show(account.country)} />
              <Info label="State" value={show(account.state)} />
              <Info label="City" value={show(account.city)} />
              <Info label="Postal Code" value={show(account.postalCode)} />
              <Info label="Home Address" value={show(account.addressLine1)} wide />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-4 text-lg font-bold">Investor Profile</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Info
                label="Employment Status"
                value={show(account.employmentStatus)}
              />
              <Info label="Source of Funds" value={show(account.sourceOfFunds)} />
              <Info
                label="Investment Experience"
                value={show(account.investmentExperience)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-muted/30 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="mb-1 text-sm text-muted-foreground">{label}</div>
      <div className={`font-bold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}