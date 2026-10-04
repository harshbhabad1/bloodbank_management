import { listActivity } from "@/lib/db/queries";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Droplet,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Log",
};

interface ActivityPageProps {
  searchParams: Promise<{ page?: string }>;
}

function getActionBadge(action: string) {
  if (action.startsWith("donor.")) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        <UserPlus className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action.startsWith("donation.")) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
        <Droplet className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action === "unit.discarded") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Trash2 className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action === "unit.expired") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        <Clock className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action === "request.fulfilled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        {action}
      </span>
    );
  }
  if (action === "request.cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        <XCircle className="w-3 h-3" />
        {action}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
      <FileText className="w-3 h-3" />
      {action}
    </span>
  );
}

function getEntityLink(entity: string, entityId: number) {
  if (entityId <= 0) return null;
  if (entity === "donor") {
    return (
      <Link
        href={`/donors/${entityId}`}
        className="text-xs text-red-600 hover:underline font-mono"
      >
        donor #{entityId}
      </Link>
    );
  }
  if (entity === "request") {
    return (
      <Link
        href={`/requests/${entityId}`}
        className="text-xs text-red-600 hover:underline font-mono"
      >
        REQ-{entityId}
      </Link>
    );
  }
  return (
    <span className="text-xs text-slate-400 font-mono">
      {entity} #{entityId}
    </span>
  );
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const perPage = 25;
  const { rows, total } = await listActivity(page, perPage);

  const totalPages = Math.ceil(Number(total) / perPage);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>System Activity Log</h1>
          <p>Audit trail of all donations, inventory adjustments, and fulfilled requests</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="empty-state">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">No activity logged yet</h3>
              <p className="text-slate-500 text-sm">
                Activity events will automatically appear here as operations are performed.
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-44">Timestamp</TableHead>
                      <TableHead className="w-40">Action</TableHead>
                      <TableHead className="w-32">Target</TableHead>
                      <TableHead>Event Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50/70">
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>{getActionBadge(entry.action)}</TableCell>
                        <TableCell>{getEntityLink(entry.entity, entry.entityId)}</TableCell>
                        <TableCell className="text-sm text-slate-800">
                          {entry.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Showing {(page - 1) * perPage + 1} to{" "}
                  {Math.min(page * perPage, Number(total))} of {total} events
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/activity?page=${page - 1}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      className="gap-1 h-8 text-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Previous
                    </Button>
                  </Link>
                  <span className="text-xs font-medium text-slate-700 px-2">
                    Page {page} of {totalPages || 1}
                  </span>
                  <Link href={`/activity?page=${page + 1}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      className="gap-1 h-8 text-xs"
                    >
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
