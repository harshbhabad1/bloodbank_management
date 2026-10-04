import { db } from "@/lib/db/index";
import { donors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DonationForm from "@/components/donation-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Record Donation" };

export default async function NewDonationPage({ searchParams }: { searchParams: Promise<{ donorId?: string }> }) {
  const { donorId } = await searchParams;
  if (!donorId) notFound();

  const [donor] = await db.select().from(donors).where(eq(donors.id, Number(donorId)));
  if (!donor) notFound();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Record Donation</h1>
          <p>
            Donor: <strong>{donor.name}</strong> · {donor.bloodGroup} · {donor.weightKg}kg
          </p>
        </div>
      </div>
      <DonationForm donor={donor} />
    </div>
  );
}
