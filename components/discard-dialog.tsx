"use client";

import { useState, useTransition } from "react";
import { discardUnit } from "@/app/(app)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

export default function DiscardDialog({ unitId, unitCode }: { unitId: number; unitCode: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDiscard() {
    setError(null);
    const formData = new FormData();
    formData.set("unitId", String(unitId));
    formData.set("reason", reason);

    startTransition(async () => {
      const result = await discardUnit(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to discard unit");
      } else {
        setOpen(false);
        setReason("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard Unit {unitCode}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            This will permanently mark the unit as discarded and remove it from available stock.
          </p>
          <div className="form-field">
            <Label htmlFor="discard-reason">Reason *</Label>
            <Textarea
              id="discard-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Contamination suspected, storage failure, leaking bag…"
              rows={3}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDiscard}
            disabled={isPending || reason.trim().length < 5}
          >
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Discarding…</> : "Discard Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
