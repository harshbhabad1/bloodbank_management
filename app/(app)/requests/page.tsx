import { listRequests } from "@/lib/db/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import IssueRequestDialog from "@/components/issue-request-dialog";
import CancelRequestDialog from "@/components/cancel-request-dialog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood Requests",
};

interface RequestsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const { status } = await searchParams;
  const requests = await listRequests(status);

  const tabs = [
    { label: "All Requests", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Fulfilled", value: "fulfilled" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Blood Requests</h1>
          <p>Manage, track, and issue blood requests from hospitals and clinics</p>
        </div>
        <Link href="/requests/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-3">
        {tabs.map((tab) => {
          const isActive = (status ?? "") === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/requests?status=${tab.value}` : "/requests"}
            >
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={
                  isActive
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900"
                }
              >
                {tab.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="empty-state">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">No requests found</h3>
              <p className="text-slate-500 text-sm">
                {status
                  ? `There are no ${status} blood requests.`
                  : "No blood requests have been recorded yet."}
              </p>
              <div className="mt-4">
                <Link href="/requests/new">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    Create First Request
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-24">Req ID</TableHead>
                    <TableHead>Patient & Hospital</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-mono font-semibold text-xs text-slate-700">
                        REQ-{req.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{req.patientName}</div>
                        <div className="text-xs text-slate-500">
                          {req.hospitalName} · {req.contactPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="blood-group-badge bg-red-100 text-red-700 font-bold">
                          {req.bloodGroup}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize text-slate-700 text-sm">
                        {req.component.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-800">
                        {req.unitsRequested}
                      </TableCell>
                      <TableCell>
                        {req.urgency === "urgent" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Normal
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full status-pending">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {req.status === "fulfilled" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full status-fulfilled">
                            <CheckCircle className="w-3 h-3" />
                            Fulfilled
                          </span>
                        )}
                        {req.status === "cancelled" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full status-cancelled">
                            <XCircle className="w-3 h-3" />
                            Cancelled
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === "pending" && (
                            <>
                              <IssueRequestDialog
                                requestId={req.id}
                                patientName={req.patientName}
                                bloodGroup={req.bloodGroup}
                                component={req.component}
                                unitsRequested={req.unitsRequested}
                              />
                              <CancelRequestDialog
                                requestId={req.id}
                                patientName={req.patientName}
                              />
                            </>
                          )}
                          <Link href={`/requests/${req.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-slate-500" />
                              <span className="sr-only">View Details</span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
