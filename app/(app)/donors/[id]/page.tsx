import { getDonor } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { isEligible } from "@/lib/rules";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DonorForm from "@/components/donor-form";
import { CheckCircle2, XCircle, Droplets } from "lucide-react";
import type { Metadata } from "next";

const COMPONENT_LABELS: Record<string, string> = {
  whole_blood: "Whole Blood",
  prbc: "PRBC",
  platelets: "Platelets",
  plasma: "Plasma",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const donor = await getDonor(Number(id));
  return { title: donor ? donor.name : "Donor Not Found" };
}

export default async function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donor = await getDonor(Number(id));
  if (!donor) notFound();

  const today = new Date().toISOString().split("T")[0];
  const eligibility = isEligible({
    dateOfBirth: donor.dateOfBirth,
    weightKg: donor.weightKg,
    lastDonationAt: donor.lastDonationAt,
    donationDate: today,
    volumeMl: 350, // default check for 350ml
  });

  const hasDonations = (donor.donations?.length ?? 0) > 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-3 mb-1">
            <h1>{donor.name}</h1>
            <span className="blood-group-badge bg-red-100 text-red-700 text-sm">{donor.bloodGroup}</span>
            {eligibility.eligible ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />Eligible
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />Not Eligible
              </Badge>
            )}
          </div>
          <p>Donor #{donor.id} · Registered {format(new Date(donor.createdAt), "dd MMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/donations/new?donorId=${donor.id}`}>
              <Droplets className="h-4 w-4" />Record Donation
            </Link>
          </Button>
        </div>
      </div>

      {!eligibility.eligible && (
        <div className="eligibility-error mb-6">
          <div className="eligibility-error-title">Not eligible for donation today:</div>
          <ul className="eligibility-error-list">
            {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ["Phone", donor.phone],
                ["Email", donor.email ?? "—"],
                ["Gender", donor.gender],
                ["Date of Birth", format(new Date(donor.dateOfBirth), "dd MMM yyyy")],
                ["Weight", `${donor.weightKg} kg`],
                ["Address", donor.address ?? "—"],
                ["Last Donation", donor.lastDonationAt ? format(new Date(donor.lastDonationAt), "dd MMM yyyy") : "Never"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-800 capitalize text-right max-w-[60%]">{val}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Edit form */}
        <div className="lg:col-span-2">
          <DonorForm
            donor={{
              id: donor.id,
              name: donor.name,
              phone: donor.phone,
              email: donor.email ?? "",
              gender: donor.gender,
              dateOfBirth: donor.dateOfBirth,
              bloodGroup: donor.bloodGroup,
              weightKg: donor.weightKg,
              address: donor.address ?? "",
              hasDonations,
            }}
          />
        </div>
      </div>

      {/* Donation history */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Donation History ({donor.donations?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasDonations ? (
            <p className="text-sm text-slate-400 py-4 text-center">No donations recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {donor.donations?.map((don) => (
                <div key={don.id} className="p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-800">
                      Donation #{don.id} · {format(new Date(don.donatedAt), "dd MMM yyyy")}
                    </div>
                    <div className="text-xs text-slate-400">{don.volumeMl}ml</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {don.bloodUnits?.map((unit) => (
                      <span key={unit.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {COMPONENT_LABELS[unit.component]}
                        <span className={`status-${unit.status} px-1.5 py-0.5 rounded-full text-xs`}>{unit.status}</span>
                      </span>
                    ))}
                  </div>
                  {don.hemoglobin && (
                    <p className="text-xs text-slate-400 mt-2">Hb: {don.hemoglobin} g/dL</p>
                  )}
                  {don.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{don.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
