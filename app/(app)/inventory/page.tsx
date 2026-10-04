import { expireStaleUnits, listBloodUnits } from "@/lib/db/queries";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DiscardDialog from "@/components/discard-dialog";
import FilterBar from "@/components/inventory-filter-bar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inventory" };

const COMPONENT_LABELS: Record<string, string> = {
  whole_blood: "Whole Blood",
  prbc: "PRBC",
  platelets: "Platelets",
  plasma: "Plasma",
};

const STATUS_VARIANTS: Record<string, "success" | "info" | "destructive" | "secondary"> = {
  available: "success",
  issued: "info",
  expired: "destructive",
  discarded: "secondary",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; component?: string; status?: string }>;
}) {
  const { group, component, status } = await searchParams;

  await expireStaleUnits();

  const units = await listBloodUnits({
    group: group || undefined,
    component: component || undefined,
    status: status || undefined,
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Blood Inventory</h1>
          <p>{units.length} unit{units.length !== 1 ? "s" : ""} {status ? `(${status})` : "total"}</p>
        </div>
      </div>

      <FilterBar />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
        {units.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 text-sm">No units match the selected filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Code</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => {
                const daysToExpiry = differenceInDays(new Date(unit.expiresAt), new Date());
                const isCritical = unit.status === "available" && daysToExpiry <= 3;
                const donorName = (unit as { donation?: { donor?: { name?: string } } }).donation?.donor?.name;

                return (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono text-xs text-slate-600">
                      BU-{String(unit.id).padStart(6, "0")}
                    </TableCell>
                    <TableCell>
                      <span className="blood-group-badge bg-red-100 text-red-700">{unit.bloodGroup}</span>
                    </TableCell>
                    <TableCell className="text-slate-700">{COMPONENT_LABELS[unit.component]}</TableCell>
                    <TableCell className="text-slate-500">{unit.volumeMl}ml</TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {format(new Date(unit.collectedAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isCritical
                            ? "expiry-critical"
                            : unit.status === "available"
                            ? "text-slate-600"
                            : "text-slate-400"
                        }`}
                      >
                        {format(new Date(unit.expiresAt), "dd MMM yyyy")}
                        {isCritical && ` (${daysToExpiry}d)`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[unit.status] ?? "secondary"}>
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">{donorName ?? "—"}</TableCell>
                    <TableCell>
                      {unit.status === "available" && (
                        <DiscardDialog unitId={unit.id} unitCode={`BU-${String(unit.id).padStart(6, "0")}`} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
