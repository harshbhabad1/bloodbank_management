"use client";

import { useState, useTransition } from "react";
import { cancelRequest } from "@/app/(app)/requests/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Ban, Loader2 } from "lucide-react";

interface CancelRequestDialogProps {
  requestId: number;
  patientName: string;
}

export default function CancelRequestDialog({
  requestId,
  patientName,
}: CancelRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);
    const formData = new FormData();
    formData.set("requestId", String(requestId));

    startTransition(async () => {
      const result = await cancelRequest(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to cancel request");
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-slate-600 hover:text-red-600 gap-1.5">
          <Ban className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="w-5 h-5" />
            Cancel Request REQ-{requestId}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the request for {patientName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Keep Active
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Yes, Cancel Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
