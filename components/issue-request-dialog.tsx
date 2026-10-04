"use client";

import { useState, useTransition } from "react";
import { issueRequest } from "@/app/(app)/requests/actions";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Droplet, Loader2 } from "lucide-react";
import { compatibleDonorGroups } from "@/lib/rules";
import type { BloodGroup, Component } from "@/lib/rules";

interface IssueRequestDialogProps {
  requestId: number;
  patientName: string;
  bloodGroup: string;
  component: string;
  unitsRequested: number;
  availableMatchingCount?: number;
  availableExactCount?: number;
}

export default function IssueRequestDialog({
  requestId,
  patientName,
  bloodGroup,
  component,
  unitsRequested,
  availableMatchingCount,
  availableExactCount,
}: IssueRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const compatibleGroups = compatibleDonorGroups(
    bloodGroup as BloodGroup,
    component as Component
  );

  const hasSubstitutesAvailable = compatibleGroups.length > 1;

  function handleIssue() {
    setError(null);
    const formData = new FormData();
    formData.set("requestId", String(requestId));
    formData.set("allowSubstitutes", String(allowSubstitutes));

    startTransition(async () => {
      const result = await issueRequest(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to issue blood units");
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Issue Blood
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplet className="w-5 h-5 text-red-600" />
            Issue Blood Units
          </DialogTitle>
          <DialogDescription>
            Issue units for Request REQ-{requestId} ({patientName})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Blood Group:</span>
              <span className="font-semibold text-slate-800">{bloodGroup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Component:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {component.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Required Units:</span>
              <span className="font-semibold text-slate-800">{unitsRequested} unit(s)</span>
            </div>
            {availableExactCount !== undefined && (
              <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                <span>Exact Match In Stock:</span>
                <span className="font-medium text-slate-700">{availableExactCount} unit(s)</span>
              </div>
            )}
            {availableMatchingCount !== undefined && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Compatible In Stock:</span>
                <span className="font-medium text-slate-700">{availableMatchingCount} unit(s)</span>
              </div>
            )}
          </div>

          {hasSubstitutesAvailable && (
            <div className="border border-slate-200 rounded-lg p-3 bg-amber-50/50 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowSubstitutes"
                  checked={allowSubstitutes}
                  onCheckedChange={(c) => setAllowSubstitutes(c === true)}
                />
                <Label htmlFor="allowSubstitutes" className="text-sm font-medium cursor-pointer">
                  Allow compatible blood group substitution
                </Label>
              </div>
              <p className="text-xs text-slate-600 pl-6">
                Compatible donor groups:{" "}
                <span className="font-mono font-medium text-slate-800">
                  {compatibleGroups.join(", ")}
                </span>
                . Oldest units will be issued first, prioritizing exact matches.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Units are allocated and locked atomically. If stock is insufficient, the transaction
            will safely abort without modifying any units.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleIssue}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Allocating Units...
              </>
            ) : (
              `Confirm & Issue ${unitsRequested} Unit(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
