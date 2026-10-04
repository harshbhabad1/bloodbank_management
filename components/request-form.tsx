"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRequest } from "@/app/(app)/requests/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = [
  { value: "whole_blood", label: "Whole Blood" },
  { value: "prbc", label: "Packed Red Blood Cells (PRBC)" },
  { value: "platelets", label: "Platelets" },
  { value: "plasma", label: "Fresh Frozen Plasma (FFP)" },
];

export default function RequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [bloodGroup, setBloodGroup] = useState("");
  const [component, setComponent] = useState("");
  const [urgency, setUrgency] = useState("normal");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("bloodGroup", bloodGroup);
    formData.set("component", component);
    formData.set("urgency", urgency);

    startTransition(async () => {
      const result = await createRequest(formData);

      if (!result.ok) {
        setError(result.error ?? "An error occurred");
        if ("fieldErrors" in result && result.fieldErrors) {
          setFieldErrors(result.fieldErrors as Record<string, string[]>);
        }
      } else {
        router.push(`/requests/${result.requestId}`);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Blood Request Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <Label htmlFor="patientName">Patient Name *</Label>
              <Input
                id="patientName"
                name="patientName"
                placeholder="Full name of patient"
                required
              />
              {fieldErrors.patientName && (
                <span className="field-error">{fieldErrors.patientName[0]}</span>
              )}
            </div>

            <div className="form-field">
              <Label htmlFor="contactPhone">Contact Phone *</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="+1 555 000 0000"
                required
              />
              {fieldErrors.contactPhone && (
                <span className="field-error">{fieldErrors.contactPhone[0]}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <Label htmlFor="hospitalName">Hospital / Facility Name *</Label>
              <Input
                id="hospitalName"
                name="hospitalName"
                placeholder="e.g. City General Hospital"
                required
              />
              {fieldErrors.hospitalName && (
                <span className="field-error">{fieldErrors.hospitalName[0]}</span>
              )}
            </div>

            <div className="form-field">
              <Label htmlFor="urgency">Urgency Level *</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="urgency">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Priority</SelectItem>
                  <SelectItem value="urgent">🚨 Urgent (Stat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-field">
              <Label htmlFor="bloodGroup">Blood Group Required *</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger id="bloodGroup">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.bloodGroup && (
                <span className="field-error">{fieldErrors.bloodGroup[0]}</span>
              )}
            </div>

            <div className="form-field md:col-span-1">
              <Label htmlFor="component">Component Required *</Label>
              <Select value={component} onValueChange={setComponent}>
                <SelectTrigger id="component">
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.component && (
                <span className="field-error">{fieldErrors.component[0]}</span>
              )}
            </div>

            <div className="form-field">
              <Label htmlFor="unitsRequested">Units Requested *</Label>
              <Input
                id="unitsRequested"
                name="unitsRequested"
                type="number"
                min="1"
                max="10"
                defaultValue="1"
                required
              />
              {fieldErrors.unitsRequested && (
                <span className="field-error">{fieldErrors.unitsRequested[0]}</span>
              )}
            </div>
          </div>

          <div className="form-field">
            <Label htmlFor="notes">Clinical Notes & Reason (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="e.g. Scheduled for cardiac surgery, post-accident trauma, ward 4B..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !bloodGroup || !component}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                "Create Blood Request"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
