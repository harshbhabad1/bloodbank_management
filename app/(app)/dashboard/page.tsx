import { expireStaleUnits, getStockSummary, getExpiringSoon, listRequests, listActivity } from "@/lib/db/queries";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ClipboardList, Activity, Plus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const COMPONENTS = ["whole_blood", "prbc", "platelets", "plasma"] as const;
const COMPONENT_LABELS: Record<string, string> = {
  whole_blood: "Whole Blood",
  prbc: "PRBC",
  platelets: "Platelets",
  plasma: "Plasma",
};

export default async function DashboardPage() {
  // Expire stale units first
  await expireStaleUnits();

  const [stockRows, expiringSoon, pendingRequests, recentActivity] = await Promise.all([
    getStockSummary(),
    getExpiringSoon(3),
    listRequests("pending"),
    listActivity(1, 10).then((r) => r.rows),
  ]);

  // Build lookup map: group → component → count
  const stockMap: Record<string, Record<string, number>> = {};
  for (const row of stockRows) {
    if (!stockMap[row.bloodGroup]) stockMap[row.bloodGroup] = {};
    stockMap[row.bloodGroup][row.component] = Number(row.count);
  }

  const totalAvailable = stockRows.reduce((sum, r) => sum + Number(r.count), 0);
  const lowStockCount = stockRows.filter((r) => Number(r.count) < 3).length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Dashboard</h1>
          <p>Blood bank overview — stock, expiry, and pending requests</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/donors/new"><Plus className="h-4 w-4" />Add Donor</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/requests/new"><ClipboardList className="h-4 w-4" />New Request</Link>
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-2xl font-bold text-slate-900">{totalAvailable}</div>
            <div className="text-sm text-slate-500 mt-1">Available Units</div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-5 pb-5">
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : "text-slate-900"}`}>{lowStockCount}</div>
            <div className="text-sm text-slate-500 mt-1">Low Stock ({"<"}3)</div>
          </CardContent>
        </Card>
        <Card className={expiringSoon.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-5 pb-5">
            <div className={`text-2xl font-bold ${expiringSoon.length > 0 ? "text-amber-600" : "text-slate-900"}`}>{expiringSoon.length}</div>
            <div className="text-sm text-slate-500 mt-1">Expiring in 3 Days</div>
          </CardContent>
        </Card>
        <Card className={pendingRequests.length > 0 ? "border-blue-200 bg-blue-50" : ""}>
          <CardContent className="pt-5 pb-5">
            <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? "text-blue-600" : "text-slate-900"}`}>{pendingRequests.length}</div>
            <div className="text-sm text-slate-500 mt-1">Pending Requests</div>
          </CardContent>
        </Card>
      </div>

      {/* Stock grid */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            Blood Stock by Group &amp; Component
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-500 w-20">Group</th>
                  {COMPONENTS.map((c) => (
                    <th key={c} className="text-center py-2 px-3 font-semibold text-slate-500">
                      {COMPONENT_LABELS[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BLOOD_GROUPS.map((group) => (
                  <tr key={group} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 pr-4">
                      <span className="blood-group-badge bg-red-100 text-red-700 font-bold">{group}</span>
                    </td>
                    {COMPONENTS.map((comp) => {
                      const count = stockMap[group]?.[comp] ?? 0;
                      const isLow = count > 0 && count < 3;
                      const isEmpty = count === 0;
                      return (
                        <td key={comp} className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold
                              ${isEmpty ? "text-slate-300 bg-slate-50" : isLow ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}
                          >
                            {count}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lowStockCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} combination(s) have less than 3 units — consider collecting donations
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring soon */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-500" />
              Expiring in Next 3 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringSoon.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No units expiring soon 🎉</p>
            ) : (
              <div className="space-y-2">
                {expiringSoon.slice(0, 8).map((unit) => {
                  const daysLeft = differenceInDays(new Date(unit.expiresAt), new Date());
                  return (
                    <div key={unit.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-2">
                        <span className="blood-group-badge bg-red-100 text-red-700 text-xs">{unit.bloodGroup}</span>
                        <span className="text-xs text-slate-600 capitalize">{COMPONENT_LABELS[unit.component]}</span>
                        <span className="text-xs text-slate-400">BU-{String(unit.id).padStart(6, "0")}</span>
                      </div>
                      <span className={`text-xs font-semibold ${daysLeft <= 1 ? "text-red-600" : "text-amber-600"}`}>
                        {daysLeft <= 0 ? "Today!" : `${daysLeft}d`}
                      </span>
                    </div>
                  );
                })}
                {expiringSoon.length > 8 && (
                  <p className="text-xs text-slate-400 text-center pt-1">+{expiringSoon.length - 8} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.slice(0, 6).map((req) => (
                  <Link key={req.id} href={`/requests/${req.id}`} className="block">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{req.patientName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {req.bloodGroup} · {COMPONENT_LABELS[req.component]} · {req.unitsRequested}u
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.urgency === "urgent" && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                        <span className="text-xs text-slate-400">REQ-{req.id}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-slate-500" />
                Recent Activity
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/activity">View all →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No activity recorded yet</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{entry.message}</span>
                    </div>
                    <span className="text-xs text-slate-400 ml-4 flex-shrink-0">
                      {format(new Date(entry.createdAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
