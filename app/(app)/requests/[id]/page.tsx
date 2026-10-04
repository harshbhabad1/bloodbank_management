import { getRequest, countMatchingStock } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { compatibleDonorGroups } from "@/lib/rules";
import type { BloodGroup, Component } from "@/lib/rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Phone,
  Droplet,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import IssueRequestDialog from "@/components/issue-request-dialog";
import CancelRequestDialog from "@/components/cancel-request-dialog";
import type { Metadata } from "next";

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RequestDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Request REQ-${id}` };
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const requestId = Number(id);
  if (isNaN(requestId)) notFound();

  const req = await getRequest(requestId);
  if (!req) notFound();

  const compatGroups = compatibleDonorGroups(
    req.bloodGroup as BloodGroup,
    req.component as Component
  );

  const exactStock = await countMatchingStock(
    req.bloodGroup as BloodGroup,
    req.component as Component,
    [req.bloodGroup as BloodGroup]
  );

  const totalCompatibleStock = await countMatchingStock(
    req.bloodGroup as BloodGroup,
    req.component as Component,
    compatGroups
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div>
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blood Requests
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="flex items-center gap-3">
            <h1>Request REQ-{req.id}</h1>
            {req.status === "pending" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full status-pending">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
            )}
            {req.status === "fulfilled" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full status-fulfilled">
                <CheckCircle className="w-3.5 h-3.5" />
                Fulfilled
              </span>
            )}
            {req.status === "cancelled" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full status-cancelled">
                <XCircle className="w-3.5 h-3.5" />
                Cancelled
              </span>
            )}
            {req.urgency === "urgent" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Urgent Priority
              </span>
            )}
          </div>
          <p>Created on {format(new Date(req.createdAt), "MMMM d, yyyy 'at' HH:mm")}</p>
        </div>

        {req.status === "pending" && (
          <div className="flex items-center gap-2">
            <CancelRequestDialog requestId={req.id} patientName={req.patientName} />
            <IssueRequestDialog
              requestId={req.id}
              patientName={req.patientName}
              bloodGroup={req.bloodGroup}
              component={req.component}
              unitsRequested={req.unitsRequested}
              availableExactCount={Number(exactStock)}
              availableMatchingCount={Number(totalCompatibleStock)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient & Hospital Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-red-600" />
              Patient & Requisition Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Patient Name
                </div>
                <div className="font-semibold text-slate-900 text-base">{req.patientName}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" /> Hospital / Facility
                </div>
                <div className="font-semibold text-slate-900 text-base">{req.hospitalName}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Contact Phone
                </div>
                <div className="font-semibold text-slate-900">{req.contactPhone}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Fulfilled At
                </div>
                <div className="font-semibold text-slate-900">
                  {req.fulfilledAt
                    ? format(new Date(req.fulfilledAt), "MMM d, yyyy HH:mm")
                    : "Not fulfilled yet"}
                </div>
              </div>
            </div>

            {req.notes && (
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/60 text-sm">
                <span className="font-semibold text-amber-900 text-xs uppercase tracking-wider block mb-1">
                  Clinical Notes
                </span>
                <p className="text-amber-950">{req.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements & Stock Match Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Droplet className="w-4 h-4 text-red-600" />
              Blood Requirement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-slate-500">Blood Group</span>
              <span className="blood-group-badge bg-red-100 text-red-700 font-bold text-sm">
                {req.bloodGroup}
              </span>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-slate-500">Component</span>
              <span className="text-sm font-semibold capitalize text-slate-800">
                {req.component.replace(/_/g, " ")}
              </span>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-slate-500">Units Required</span>
              <span className="text-xl font-bold text-slate-900">{req.unitsRequested}</span>
            </div>

            {req.status === "pending" && (
              <div className="pt-2 space-y-3">
                <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Available In Inventory:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Exact Group ({req.bloodGroup}):</span>
                    <span
                      className={`font-bold ${
                        Number(exactStock) >= req.unitsRequested
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {exactStock} unit(s)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">All Compatible Groups:</span>
                    <span
                      className={`font-bold ${
                        Number(totalCompatibleStock) >= req.unitsRequested
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {totalCompatibleStock} unit(s)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t">
                    Compatible donors: {compatGroups.join(", ")}
                  </div>
                </div>

                {Number(totalCompatibleStock) < req.unitsRequested ? (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Critical Shortage: Insufficient stock to fulfill this request (needs{" "}
                      {req.unitsRequested}, available {totalCompatibleStock}).
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 shrink-0" />
                    <span>Sufficient stock available to issue immediately.</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issued Units (if fulfilled) */}
      {req.status === "fulfilled" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              Units Issued for this Request ({req.bloodUnits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {req.bloodUnits.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No unit records attached.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Unit ID</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Collected Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Issued Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {req.bloodUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-mono font-semibold text-xs">
                        UNT-{unit.id}
                      </TableCell>
                      <TableCell>
                        <span className="blood-group-badge bg-red-100 text-red-700 font-bold">
                          {unit.bloodGroup}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize text-slate-700 text-sm">
                        {unit.component.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-sm">{unit.volumeMl} ml</TableCell>
                      <TableCell>
                        {unit.donation?.donor ? (
                          <Link
                            href={`/donors/${unit.donation.donor.id}`}
                            className="text-red-600 hover:underline font-medium text-sm"
                          >
                            {unit.donation.donor.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {unit.collectedAt}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {unit.expiresAt}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {unit.issuedAt
                          ? format(new Date(unit.issuedAt), "MMM d, yyyy HH:mm")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
