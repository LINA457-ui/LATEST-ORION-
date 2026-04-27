import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useConfirmDeposit } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function FundingSuccessPage() {
  const [, setLocation] = useLocation();
  const confirmDeposit = useConfirmDeposit();
  const mounted = useRef(false);
  
  const [status, setStatus] = useState<"loading"|"success"|"error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("error");
      setErrorMsg("Invalid session ID");
      return;
    }

    confirmDeposit.mutate(
      { data: { sessionId } },
      {
        onSuccess: () => {
          setStatus("success");
          queryClient.invalidateQueries({ queryKey: ["/api/account/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/account/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["/api/account/transactions"] });
        },
        onError: (err: any) => {
          setStatus("error");
          if (err.response?.status === 503) {
            setErrorMsg("Payment system not fully configured yet. Please check back later.");
          } else {
            setErrorMsg(err.message || "Failed to confirm deposit.");
          }
        }
      }
    );
  }, [confirmDeposit]);

  return (
    <div className="max-w-md mx-auto mt-12 pb-8">
      <Card className="text-center">
        <CardContent className="pt-12 pb-8 space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
              <h2 className="text-2xl font-bold">Processing deposit...</h2>
              <p className="text-muted-foreground mt-2">Please wait while we confirm your transfer.</p>
            </div>
          )}
          
          {status === "success" && (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-success" />
              </div>
              <h2 className="text-2xl font-bold">Deposit Successful</h2>
              <p className="text-muted-foreground mt-2 mb-8">
                Your funds have been credited to your account and are ready for trading.
              </p>
              <Button className="w-full" size="lg" onClick={() => setLocation("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold">Verification Failed</h2>
              <p className="text-muted-foreground mt-2 mb-8 max-w-sm mx-auto">
                {errorMsg}
              </p>
              <Button className="w-full" variant="outline" size="lg" onClick={() => setLocation("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
