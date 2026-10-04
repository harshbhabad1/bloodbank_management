"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordDonation } from "@/app/(app)/donors/actions";
import { isEligible } from "@/lib/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const COMPONENTS = [
  { value: "whole_blood", label: "Whole Blood", shelfLife: "35 days" },
  { value: "prbc", label: "PRBC (Packed Red Blood Cells)", shelfLife: "42 days" },
  { value: "platelets", label: "Platelets", shelfLife: "5 days" },
  { value: "plasma", label: "Plasma (FFP)", shelfLife: "365 days" },
];

interface DonorInfo {
  id: number;
  name: string;
  bloodGroup: string;
  dateOfBirth: string;
  weightKg: number;
  lastDonationAt: string | null;
}

export default function DonationForm({ donor }: { donor: DonorInfo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [eligibilityReasons, setEligibilityReasons] = useState<string[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>(["whole_blood"]);

  // Live eligibility check
  const [donatedAt, setDonatedAt] = useState(new Date().toISOString().split("T")[0]);
  const [volumeMl, setVolumeMl] = useState(450);
  const [hemoglobin, setHemoglobin] = useState<string>("");

  const eligibility = isEligible({
    dateOfBirth: donor.dateOfBirth,
    weightKg: donor.weightKg,
    lastDonationAt: donor.lastDonationAt,
    hemoglobin: hemoglobin ? Number(hemoglobin) : null,
    donationDate: donatedAt,
    volumeMl,
  });

  function toggleComponent(val: string) {
    setSelectedComponents((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEligibilityReasons([]);

    if (!eligibility.eligible) {
      setEligibilityReasons(eligibility.reasons);
      return;
    }

    const formData = new FormData(e.currentTarget);
    selectedComponents.forEach((c) => formData.append("components", c));

    startTransition(async () => {
      const result = await recordDonation(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to record donation");
        if ("fieldErrors" in result && result.fieldErrors) {
          const fe = result.fieldErrors as Record<string, string[]>;
          if (fe._) setEligibilityReasons(fe._);
        }
      } else {
        router.push(`/donors/${donor.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="donorId" value={donor.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Donation details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Donation Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="form-field">
              <Label htmlFor="donatedAt">Donation Date *</Label>
              <Input
                id="donatedAt"
                name="donatedAt"
                type="date"
                value={donatedAt}
                onChange={(e) => setDonatedAt(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="form-field">
              <Label htmlFor="volumeMl">Volume (ml) *</Label>
              <select
                id="volumeMl"
                name="volumeMl"
                value={volumeMl}
                onChange={(e) => setVolumeMl(Number(e.target.value))}
                className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-red-400"
              >
                <option value={350}>350 ml</option>
                <option value={450}>450 ml</option>
              </select>
            </div>

            <div className="form-field">
              <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
              <Input
                id="hemoglobin"
                name="hemoglobin"
                type="number"
                step="0.1"
                min="5"
                max="25"
                value={hemoglobin}
                onChange={(e) => setHemoglobin(e.target.value)}
                placeholder="e.g. 13.5 (optional)"
              />
            </div>

            <div className="form-field">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any observations or notes…" rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Eligibility status */}
          <Card className={eligibility.eligible ? "border-green-200" : "border-red-200"}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                {eligibility.eligible ? (
                  <><CheckCircle2 className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-700">Eligible to donate</span></>
                ) : (
                  <><XCircle className="h-5 w-5 text-red-600" /><span className="font-semibold text-red-700">Not eligible</span></>
                )}
              </div>
              {!eligibility.eligible && (
                <ul className="space-y-1 mt-2">
                  {eligibility.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                      <span className="mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Components */}
          <Card>
            <CardHeader><CardTitle className="text-base">Components to Create *</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {COMPONENTS.map((comp) => (
                <div key={comp.value} className="flex items-start gap-3">
                  <Checkbox
                    id={`comp-${comp.value}`}
                    checked={selectedComponents.includes(comp.value)}
                    onCheckedChange={() => toggleComponent(comp.value)}
                  />
                  <div>
                    <Label htmlFor={`comp-${comp.value}`} className="cursor-pointer">{comp.label}</Label>
                    <p className="text-xs text-slate-400">Shelf life: {comp.shelfLife}</p>
                  </div>
                </div>
              ))}
              {selectedComponents.length === 0 && (
                <p className="text-xs text-red-500">Select at least one component</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {(error || eligibilityReasons.length > 0) && (
        <div className="mt-4 eligibility-error max-w-4xl">
          <div className="eligibility-error-title">{error || "Donor is not eligible:"}</div>
          {eligibilityReasons.length > 0 && (
            <ul className="eligibility-error-list">
              {eligibilityReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={isPending || selectedComponents.length === 0}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recording…</> : "Record Donation"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
