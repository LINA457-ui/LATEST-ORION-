import { useUser } from "@clerk/react";
import { useGetMyAccount } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const { user } = useUser();
  const { data: account } = useGetMyAccount();

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-6">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user.imageUrl} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.fullName}</CardTitle>
            <CardDescription className="text-base">{user.primaryEmailAddress?.emailAddress}</CardDescription>
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
