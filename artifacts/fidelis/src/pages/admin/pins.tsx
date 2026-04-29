import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, KeyRound, Trash2, Plus } from "lucide-react";

const MAX_PINS = 3;

export default function AdminPinsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "pins"],
    queryFn: () => adminApi.listPins(),
  });

  const [newPin, setNewPin] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const createMut = useMutation({
    mutationFn: () => adminApi.createPin(newPin, newLabel || undefined),
    onSuccess: () => {
      toast({ title: "PIN added" });
      setNewPin("");
      setNewLabel("");
      refetch();
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't add PIN", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deletePin(id),
    onSuccess: () => {
      toast({ title: "PIN removed" });
      refetch();
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't remove PIN", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: number; pin?: string; label?: string }) =>
      adminApi.updatePin(args.id, { pin: args.pin, label: args.label }),
    onSuccess: () => {
      toast({ title: "PIN updated" });
      refetch();
      qc.invalidateQueries({ queryKey: ["admin", "pins"] });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't update PIN", description: e.message, variant: "destructive" }),
  });

  const total = data?.length ?? 0;
  const canAdd = total < MAX_PINS;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="w-7 h-7" /> Admin PIN management
        </h1>
        <p className="text-muted-foreground mt-1">
          PINs gate access to the admin section. You can have up to {MAX_PINS} active PINs at a time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a new PIN</CardTitle>
          <CardDescription>
            Use 4–12 characters. Numeric or alphanumeric. {total} of {MAX_PINS} slots used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div className="sm:col-span-1">
              <Label>New PIN</Label>
              <Input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                maxLength={12}
                placeholder="••••"
                disabled={!canAdd}
              />
            </div>
            <div className="sm:col-span-1">
              <Label>Label (optional)</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Backup PIN"
                disabled={!canAdd}
              />
            </div>
            <Button
              type="submit"
              disabled={!canAdd || newPin.length < 4 || createMut.isPending}
            >
              <Plus className="w-4 h-4 mr-1" />
              {createMut.isPending ? "Saving..." : "Add PIN"}
            </Button>
          </form>
          {!canAdd && (
            <p className="text-sm text-destructive mt-3">
              You've reached the maximum of {MAX_PINS} PINs. Remove one before adding another.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active PINs</CardTitle>
          <CardDescription>
            We never display PIN values. To rotate a PIN, edit it below — the old value stops working immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <p className="text-destructive">Couldn't load PIN list.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground">No PINs configured.</p>
          ) : (
            <div className="divide-y">
              {data.map((p) => (
                <PinRow
                  key={p.id}
                  id={p.id}
                  label={p.label}
                  createdAt={p.createdAt}
                  canDelete={data.length > 1}
                  onDelete={() => {
                    if (confirm("Remove this PIN? Anyone using it will lose admin access.")) {
                      deleteMut.mutate(p.id);
                    }
                  }}
                  onUpdate={(body) => updateMut.mutate({ id: p.id, ...body })}
                  busy={updateMut.isPending || deleteMut.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PinRow({
  id,
  label,
  createdAt,
  canDelete,
  onDelete,
  onUpdate,
  busy,
}: {
  id: number;
  label: string | null;
  createdAt: string;
  canDelete: boolean;
  onDelete: () => void;
  onUpdate: (body: { pin?: string; label?: string }) => void;
  busy: boolean;
}) {
  const [pin, setPin] = useState("");
  const [labelDraft, setLabelDraft] = useState(label ?? "");
  return (
    <div className="py-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div className="md:col-span-3">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} />
      </div>
      <div className="md:col-span-3">
        <Label className="text-xs text-muted-foreground">New PIN (leave blank to keep current)</Label>
        <Input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={12}
          placeholder="••••"
        />
      </div>
      <div className="md:col-span-3 text-xs text-muted-foreground">
        <div>ID: {id}</div>
        <div>Added {new Date(createdAt).toLocaleString()}</div>
      </div>
      <div className="md:col-span-3 flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={busy || (pin.length === 0 && labelDraft === (label ?? ""))}
          onClick={() => {
            const body: { pin?: string; label?: string } = {};
            if (pin) body.pin = pin;
            if (labelDraft !== (label ?? "")) body.label = labelDraft;
            onUpdate(body);
            setPin("");
          }}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={!canDelete || busy}
          onClick={onDelete}
          title={canDelete ? "Remove this PIN" : "You can't remove the last PIN"}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
