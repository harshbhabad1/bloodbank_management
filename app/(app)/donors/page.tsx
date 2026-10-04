import { listDonors } from "@/lib/db/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users } from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Donors" };

export default async function DonorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const donorList = await listDonors(q);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Donors</h1>
          <p>{donorList.length} donor{donorList.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Button asChild>
          <Link href="/donors/new"><Plus className="h-4 w-4" />Add Donor</Link>
        </Button>
      </div>

      {/* Search */}
      <form className="mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, group…"
            className="pl-9"
            id="donor-search"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {donorList.length === 0 ? (
          <div className="empty-state">
            <Users />
            <h3>No donors found</h3>
            <p>{q ? `No results for "${q}"` : "Get started by adding your first donor"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donorList.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell>
                    <Link href={`/donors/${donor.id}`} className="font-medium text-slate-900 hover:text-red-600 transition-colors">
                      {donor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600">{donor.phone}</TableCell>
                  <TableCell>
                    <span className="blood-group-badge bg-red-100 text-red-700">{donor.bloodGroup}</span>
                  </TableCell>
                  <TableCell className="capitalize text-slate-600">{donor.gender}</TableCell>
                  <TableCell className="text-slate-600">{donor.weightKg} kg</TableCell>
                  <TableCell>
                    {donor.lastDonationAt ? (
                      <span className="text-slate-600">{format(new Date(donor.lastDonationAt), "dd MMM yyyy")}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {format(new Date(donor.createdAt), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
