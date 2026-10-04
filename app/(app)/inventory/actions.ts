"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { bloodUnits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { discardUnitSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export async function discardUnit(formData: FormData) {
  await requireAdmin();

  const parsed = discardUnitSchema.safeParse({
    unitId: formData.get("unitId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [unit] = await db.select().from(bloodUnits).where(eq(bloodUnits.id, parsed.data.unitId));
  if (!unit) return { ok: false, error: "Unit not found" };
  if (unit.status !== "available") return { ok: false, error: "Only available units can be discarded" };

  await db.transaction(async (tx) => {
    await tx.update(bloodUnits)
      .set({ status: "discarded" })
      .where(eq(bloodUnits.id, parsed.data.unitId));

    await logActivity(tx, {
      action: "unit.discarded",
      entity: "unit",
      entityId: parsed.data.unitId,
      message: `Unit BU-${String(parsed.data.unitId).padStart(6, "0")} (${unit.bloodGroup} ${unit.component}) discarded. Reason: ${parsed.data.reason}`,
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}
