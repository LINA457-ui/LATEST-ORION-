import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { adminApi } from "@/lib/adminApi";

function isProfileComplete(account: any) {
  return Boolean(
    account?.phone &&
      account?.dateOfBirth &&
      account?.addressLine1 &&
      account?.city &&
      account?.state &&
      account?.country &&
      account?.employmentStatus &&
      account?.sourceOfFunds &&
      account?.investmentExperience
  );
}

export default function AuthRedirectPage() {
  const [, navigate] = useLocation();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate("/sign-in");
      return;
    }

    async function checkProfile() {
      try {
        await adminApi.syncMe();

        const data = await adminApi.dashboard();
        const account = data?.account;

        if (isProfileComplete(account)) {
          navigate("/dashboard");
        } else {
          navigate("/complete-profile");
        }
      } catch (error) {
        console.error("[AUTH REDIRECT ERROR]", error);
        navigate("/complete-profile");
      }
    }

    checkProfile();
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <p className="text-muted-foreground">Preparing your account...</p>
    </div>
  );
}