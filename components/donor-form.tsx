"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDonor, updateDonor } from "@/app/(app)/donors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }];

interface DonorData {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  weightKg?: number;
  address?: string;
  hasDonations?: boolean;
}

export default function DonorForm({ donor }: { donor?: DonorData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [bloodGroup, setBloodGroup] = useState(donor?.bloodGroup ?? "");
  const [gender, setGender] = useState(donor?.gender ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("bloodGroup", bloodGroup);
    formData.set("gender", gender);

    startTransition(async () => {
      const result = donor?.id
        ? await updateDonor(donor.id, formData)
        : await createDonor(formData);

      if (!result.ok) {
        setError(result.error ?? "An error occurred");
        if ("fieldErrors" in result && result.fieldErrors) {
          setFieldErrors(result.fieldErrors as Record<string, string[]>);
        }
      } else {
        if (!donor?.id && "donorId" in result) {
          router.push(`/donors/${result.donorId}`);
        } else {
          router.push(`/donors/${donor?.id}`);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Personal info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="form-field">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" defaultValue={donor?.name} required placeholder="e.g. Arjun Sharma" />
              {fieldErrors.name && <span className="field-error"><AlertCircle className="h-3 w-3" />{fieldErrors.name[0]}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" defaultValue={donor?.phone} required placeholder="e.g. 9800000001" />
              {fieldErrors.phone && <span className="field-error"><AlertCircle className="h-3 w-3" />{fieldErrors.phone[0]}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={donor?.email ?? ""} placeholder="optional" />
            </div>

            <div className="form-field">
              <Label>Gender *</Label>
              <Select onValueChange={setGender} value={gender}>
                <SelectTrigger id="gender-select"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="form-field">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={donor?.dateOfBirth} required />
            </div>

            <div className="form-field">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" defaultValue={donor?.address ?? ""} placeholder="Optional address" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Medical info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Medical Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="form-field">
              <Label>Blood Group *</Label>
              <Select
                onValueChange={setBloodGroup}
                value={bloodGroup}
                disabled={donor?.hasDonations}
              >
                <SelectTrigger id="blood-group-select"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              {donor?.hasDonations && (
                <p className="text-xs text-amber-600">Blood group cannot be changed after donations are recorded.</p>
              )}
            </div>

            <div className="form-field">
              <Label htmlFor="weightKg">Weight (kg) *</Label>
              <Input id="weightKg" name="weightKg" type="number" min="30" max="200" defaultValue={donor?.weightKg} required placeholder="e.g. 70" />
              {fieldErrors.weightKg && <span className="field-error"><AlertCircle className="h-3 w-3" />{fieldErrors.weightKg[0]}</span>}
            </div>

            {/* Summary of rules */}
            <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">Eligibility Requirements</p>
              <ul className="text-xs text-blue-600 space-y-0.5">
                <li>• Age: 18–65 years on donation date</li>
                <li>• Weight: ≥ 45 kg (≥ 55 kg for 450ml donations)</li>
                <li>• Gap: ≥ 90 days since last donation</li>
                <li>• Hemoglobin: ≥ 12.5 g/dL if measured</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 max-w-4xl">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : (donor?.id ? "Update Donor" : "Add Donor")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
