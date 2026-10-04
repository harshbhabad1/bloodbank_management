"use server";

import { requireAdmin } from "@/lib/auth";
import { db, pool } from "@/lib/db/index";
import { bloodUnits, bloodRequests, activityLog } from "@/lib/db/schema";
import { requestSchema } from "@/lib/validations";
import { compatibleDonorGroups } from "@/lib/rules";
import { logActivity } from "@/lib/activity";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { BloodGroup, Component } from "@/lib/rules";

// ── createRequest ─────────────────────────────────────────────
export async function createRequest(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [req] = await db.insert(bloodRequests).values(parsed.data).returning();

  await db.insert(activityLog).values({
    action: "request.created",
    entity: "request",
    entityId: req.id,
    message: `New request REQ-${req.id} for ${req.patientName} (${req.bloodGroup} ${req.component} × ${req.unitsRequested}).`,
  });

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { ok: true, requestId: req.id };
}

// ── issueRequest ──────────────────────────────────────────────
export async function issueRequest(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get("requestId"));
  const allowSubstitutes = formData.get("allowSubstitutes") === "true";

  const [req] = await db.select().from(bloodRequests).where(eq(bloodRequests.id, requestId));
  if (!req) return { ok: false, error: "Request not found" };
  if (req.status !== "pending") return { ok: false, error: "Request is not pending" };

  const allowedGroups = allowSubstitutes
    ? compatibleDonorGroups(req.bloodGroup as BloodGroup, req.component as Component)
    : [req.bloodGroup];

  try {
    await db.transaction(async (tx) => {
      // Find available units using FOR UPDATE SKIP LOCKED (raw SQL for this)
      const groupPlaceholders = allowedGroups.map((_, i) => `$${i + 3}`).join(",");
      const rawUnits = await pool.query(
        `SELECT id FROM blood_units
         WHERE status = 'available'
           AND component = $1
           AND expires_at >= CURRENT_DATE
           AND blood_group IN (${groupPlaceholders})
         ORDER BY
           CASE WHEN blood_group = $2 THEN 0 ELSE 1 END,
           expires_at ASC
         LIMIT ${req.unitsRequested}
         FOR UPDATE SKIP LOCKED`,
        [req.component, req.bloodGroup, ...allowedGroups]
      );

      const unitIds: number[] = rawUnits.rows.map((r: { id: number }) => r.id);

      if (unitIds.length < req.unitsRequested) {
        const shortBy = req.unitsRequested - unitIds.length;
        throw new Error(`SHORT_BY:${shortBy}`);
      }

      // Mark units as issued
      await tx.update(bloodUnits)
        .set({ status: "issued", requestId, issuedAt: new Date() })
        .where(inArray(bloodUnits.id, unitIds));

      // Fulfill request
      await tx.update(bloodRequests)
        .set({ status: "fulfilled", fulfilledAt: new Date() })
        .where(eq(bloodRequests.id, requestId));

      await logActivity(tx, {
        action: "request.fulfilled",
        entity: "request",
        entityId: requestId,
        message: `Request REQ-${requestId} for ${req.patientName} fulfilled — ${req.unitsRequested} unit(s) of ${req.bloodGroup} ${req.component} issued.`,
      });

      return unitIds;
    });

    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("SHORT_BY:")) {
      const n = msg.split(":")[1];
      return { ok: false, error: `Insufficient stock — short by ${n} unit(s). No changes made.` };
    }
    console.error(err);
    return { ok: false, error: "Failed to issue request" };
  }
}

// ── cancelRequest ─────────────────────────────────────────────
export async function cancelRequest(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get("requestId"));
  const [req] = await db.select().from(bloodRequests).where(eq(bloodRequests.id, requestId));
  if (!req) return { ok: false, error: "Request not found" };
  if (req.status !== "pending") return { ok: false, error: "Only pending requests can be cancelled" };

  await db.transaction(async (tx) => {
    await tx.update(bloodRequests).set({ status: "cancelled" }).where(eq(bloodRequests.id, requestId));
    await logActivity(tx, {
      action: "request.cancelled",
      entity: "request",
      entityId: requestId,
      message: `Request REQ-${requestId} for ${req.patientName} cancelled.`,
    });
  });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { ok: true };
}
