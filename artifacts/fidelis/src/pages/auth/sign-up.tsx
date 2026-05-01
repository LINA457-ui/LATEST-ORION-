import { SignUp } from "@clerk/clerk-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { dark } from "@clerk/themes";
import { Logo } from "@/components/layout/Logo";

export default function SignUpPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8">
        <Logo />
      </div>

      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        appearance={{
          baseTheme: theme === "dark" ? dark : undefined,
          elements: {
            formButtonPrimary: "bg-primary hover:bg-primary/90",
            card: "shadow-lg border-border",
          },
        }}
      />
    </div>
  );
}