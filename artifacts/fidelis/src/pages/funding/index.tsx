import { useState } from "react";
import { useCreateDepositCheckout } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Wallet, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FundingPage() {
  const [amount, setAmount] = useState("1000");
  const { toast } = useToast();
  const createCheckout = useCreateDepositCheckout();

  const [notConfigured, setNotConfigured] = useState(false);

  const handleCheckout = async () => {
    const value = parseFloat(amount);
    if (!value || value < 10) {
      toast({ title: "Minimum deposit is $10", variant: "destructive" });
      return;
    }

    try {
      const res = await createCheckout.mutateAsync({ data: { amount: value } });
      window.location.href = res.url;
    } catch (e: any) {
      if (e.response?.status === 503 || e.message?.includes("not configured")) {
        setNotConfigured(true);
      } else {
        toast({ title: "Failed to initiate transfer", description: e.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Fund Account</h1>
        <p className="text-muted-foreground">Transfer funds to start trading</p>
      </div>

      {notConfigured ? (
        <Card className="border-muted bg-muted/30">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Funding Coming Soon</h3>
              <p className="text-muted-foreground max-w-sm">
                Fidelis Investments is currently in a closed beta simulation mode. Stripe payments are not yet configured for live deposits. 
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Deposit Funds</CardTitle>
            <CardDescription>Secure transfer via Stripe Checkout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">$</span>
                <Input 
                  type="number" 
                  min="10"
                  step="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-8 text-xl py-6 font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['100', '500', '1000', '5000'].map(val => (
                <Button 
                  key={val} 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setAmount(val)}
                >
                  ${val}
                </Button>
              ))}
            </div>

            <Button 
              className="w-full py-6 text-lg" 
              onClick={handleCheckout}
              disabled={createCheckout.isPending || !amount || parseFloat(amount) <= 0}
            >
              {createCheckout.isPending ? "Connecting..." : "Continue to checkout"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
              <ShieldCheck className="w-4 h-4" />
              Transfers are secured by industry-standard encryption
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
