"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { donors, donations, bloodUnits, activityLog } from "@/lib/db/schema";
import { donorSchema, donationSchema } from "@/lib/validations";
import { isEligible, expiryDate } from "@/lib/rules";
import { logActivity } from "@/lib/activity";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── createDonor ───────────────────────────────────────────────
export async function createDonor(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = donorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const [donor] = await db.insert(donors).values({
      ...parsed.data,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    }).returning();

    await db.insert(activityLog).values({
      action: "donor.created",
      entity: "donor",
      entityId: donor.id,
      message: `Donor ${donor.name} (${donor.bloodGroup}) registered.`,
    });

    revalidatePath("/donors");
    return { ok: true, donorId: donor.id };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return { ok: false, error: "A donor with this phone number already exists.", fieldErrors: { phone: ["Phone number already registered"] } };
    }
    console.error(err);
    return { ok: false, error: "Failed to create donor" };
  }
}

// ── updateDonor ───────────────────────────────────────────────
export async function updateDonor(id: number, formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = donorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Check if donor has donations (cannot change blood group then)
  const existingDonations = await db.select().from(donations).where(eq(donations.donorId, id)).limit(1);
  const existing = await db.select().from(donors).where(eq(donors.id, id)).limit(1);

  if (existingDonations.length > 0 && existing[0]?.bloodGroup !== parsed.data.bloodGroup) {
    return { ok: false, error: "Cannot change blood group once donations have been recorded." };
  }

  try {
    await db.update(donors).set({
      ...parsed.data,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    }).where(eq(donors.id, id));

    await db.insert(activityLog).values({
      action: "donor.updated",
      entity: "donor",
      entityId: id,
      message: `Donor ${parsed.data.name} profile updated.`,
    });

    revalidatePath(`/donors/${id}`);
    revalidatePath("/donors");
    return { ok: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return { ok: false, error: "A donor with this phone number already exists." };
    }
    return { ok: false, error: "Failed to update donor" };
  }
}

// ── recordDonation ────────────────────────────────────────────
export async function recordDonation(formData: FormData) {
  await requireAdmin();

  const raw = {
    donorId: formData.get("donorId"),
    donatedAt: formData.get("donatedAt"),
    volumeMl: formData.get("volumeMl"),
    hemoglobin: formData.get("hemoglobin") || null,
    notes: formData.get("notes"),
    components: formData.getAll("components"),
  };

  const parsed = donationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Get donor
  const [donor] = await db.select().from(donors).where(eq(donors.id, parsed.data.donorId));
  if (!donor) return { ok: false, error: "Donor not found" };

  // Eligibility check
  const eligibility = isEligible({
    dateOfBirth: donor.dateOfBirth,
    weightKg: donor.weightKg,
    lastDonationAt: donor.lastDonationAt,
    hemoglobin: parsed.data.hemoglobin ?? null,
    donationDate: parsed.data.donatedAt,
    volumeMl: parsed.data.volumeMl,
  });

  if (!eligibility.eligible) {
    return { ok: false, error: "Donor is not eligible.", fieldErrors: { _: eligibility.reasons } };
  }

  // Single transaction
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Insert donation
      const [donation] = await tx.insert(donations).values({
        donorId: parsed.data.donorId,
        donatedAt: parsed.data.donatedAt,
        volumeMl: parsed.data.volumeMl,
        hemoglobin: parsed.data.hemoglobin ? String(parsed.data.hemoglobin) : null,
        notes: parsed.data.notes || null,
      }).returning();

      // 2. Insert blood units
      for (const comp of parsed.data.components) {
        const collected = new Date(parsed.data.donatedAt);
        const expires = expiryDate(collected, comp);
        await tx.insert(bloodUnits).values({
          donationId: donation.id,
          bloodGroup: donor.bloodGroup,
          component: comp,
          volumeMl: parsed.data.volumeMl,
          collectedAt: parsed.data.donatedAt,
          expiresAt: expires.toISOString().split("T")[0],
          status: "available",
        });
      }

      // 3. Update donor last_donation_at
      await tx.update(donors).set({ lastDonationAt: parsed.data.donatedAt }).where(eq(donors.id, parsed.data.donorId));

      // 4. Activity log
      await logActivity(tx, {
        action: "donation.recorded",
        entity: "donation",
        entityId: donation.id,
        message: `Donation recorded for ${donor.name} (${donor.bloodGroup}) — ${parsed.data.components.join(", ")} — ${parsed.data.volumeMl}ml.`,
      });

      return donation;
    });

    revalidatePath(`/donors/${parsed.data.donorId}`);
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, donationId: result.id };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Failed to record donation" };
  }
}
