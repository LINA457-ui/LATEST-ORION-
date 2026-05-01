import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminApi, adminPinSession } from "@/lib/adminApi";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export function PinGate({
  open,
  onOpenChange,
  onSuccess,
  title = "Admin PIN required",
  description = "Enter your admin PIN to unlock the admin section.",
}: Props) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

async function submit() {
  if (!pin) return;

  setSubmitting(true);
  setError(null);

  try {
    const res = await adminApi.verifyPin(pin);

    // save in your real adminApi session helper
    adminPinSession.set(res.token);

    console.log("✅ PIN verified and saved:", res.token);

    onOpenChange(false);
    onSuccess?.();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong";

    setError(
      msg.toLowerCase().includes("pin")
        ? msg
        : "That PIN didn't work. Please double-check and try again.",
    );

    setPin("");
  } finally {
    setSubmitting(false);
  }
}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {error ? (
              <ShieldAlert className="w-6 h-6 text-destructive" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="admin-pin" className="sr-only">
              Admin PIN
            </Label>
            <Input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="••••"
              value={pin}
              maxLength={12}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(null);
              }}
              className="text-center text-2xl tracking-[0.5em] h-14"
            />
            {error && (
              <p className="mt-2 text-sm text-destructive text-center">{error}</p>
            )}
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!pin || submitting}>
              {submitting ? "Verifying..." : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
