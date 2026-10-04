import { db, pool } from "./index";
import {
  donors,
  donations,
  bloodUnits,
  bloodRequests,
  activityLog,
} from "./schema";
import { eq, ilike, or, and, lt, sql, desc, asc, count } from "drizzle-orm";
import type { BloodGroup, Component } from "../rules";

// ── Expiry sweep ─────────────────────────────────────────────
export async function expireStaleUnits() {
  const result = await pool.query(
    `UPDATE blood_units SET status = 'expired'
     WHERE status = 'available' AND expires_at < CURRENT_DATE
     RETURNING id`
  );
  const n = result.rowCount ?? 0;
  if (n > 0) {
    await db.insert(activityLog).values({
      action: "unit.expired",
      entity: "unit",
      entityId: 0,
      message: `${n} unit(s) automatically marked as expired.`,
    });
  }
  return n;
}

// ── Donors ───────────────────────────────────────────────────
export async function listDonors(search?: string) {
  if (search) {
    return db
      .select()
      .from(donors)
      .where(
        or(
          ilike(donors.name, `%${search}%`),
          ilike(donors.phone, `%${search}%`),
          ilike(donors.bloodGroup, `%${search}%`)
        )
      )
      .orderBy(asc(donors.name));
  }
  return db.select().from(donors).orderBy(asc(donors.name));
}

export async function getDonor(id: number) {
  const donor = await db.query.donors.findFirst({
    where: eq(donors.id, id),
    with: {
      donations: {
        orderBy: [desc(donations.donatedAt)],
        with: { bloodUnits: true },
      },
    },
  });
  return donor ?? null;
}

// ── Inventory ─────────────────────────────────────────────────
export async function listBloodUnits(filters?: {
  group?: string;
  component?: string;
  status?: string;
}) {
  return db.query.bloodUnits.findMany({
    where: and(
      filters?.group ? eq(bloodUnits.bloodGroup, filters.group as BloodGroup) : undefined,
      filters?.component ? eq(bloodUnits.component, filters.component as Component) : undefined,
      filters?.status ? eq(bloodUnits.status, filters.status as "available" | "issued" | "expired" | "discarded") : undefined
    ),
    orderBy: [asc(bloodUnits.expiresAt)],
    with: { donation: { with: { donor: true } } },
  });
}

// ── Stock summary ─────────────────────────────────────────────
export async function getStockSummary() {
  const rows = await db
    .select({
      bloodGroup: bloodUnits.bloodGroup,
      component: bloodUnits.component,
      count: count(),
    })
    .from(bloodUnits)
    .where(eq(bloodUnits.status, "available"))
    .groupBy(bloodUnits.bloodGroup, bloodUnits.component);
  return rows;
}

export async function getExpiringSoon(days = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return db.query.bloodUnits.findMany({
    where: and(
      eq(bloodUnits.status, "available"),
      lt(bloodUnits.expiresAt, cutoff.toISOString().split("T")[0])
    ),
    orderBy: [asc(bloodUnits.expiresAt)],
  });
}

// ── Requests ──────────────────────────────────────────────────
export async function listRequests(status?: string) {
  return db.query.bloodRequests.findMany({
    where: status ? eq(bloodRequests.status, status as "pending" | "fulfilled" | "cancelled") : undefined,
    orderBy: [desc(bloodRequests.urgency), desc(bloodRequests.createdAt)],
  });
}

export async function getRequest(id: number) {
  return db.query.bloodRequests.findFirst({
    where: eq(bloodRequests.id, id),
    with: {
      bloodUnits: {
        with: { donation: { with: { donor: true } } },
        orderBy: [asc(bloodUnits.issuedAt)],
      },
    },
  });
}

export async function countMatchingStock(
  bloodGroup: BloodGroup,
  component: Component,
  allowedGroups: BloodGroup[]
) {
  const rows = await db
    .select({ count: count() })
    .from(bloodUnits)
    .where(
      and(
        eq(bloodUnits.status, "available"),
        eq(bloodUnits.component, component),
        sql`${bloodUnits.bloodGroup} = ANY(${sql.raw(`ARRAY[${allowedGroups.map((g) => `'${g}'`).join(",")}]::blood_group[]`)})`
      )
    );
  return rows[0]?.count ?? 0;
}

// ── Activity ──────────────────────────────────────────────────
export async function listActivity(page = 1, perPage = 50) {
  const offset = (page - 1) * perPage;
  const rows = await db.query.activityLog.findMany({
    orderBy: [desc(activityLog.createdAt)],
    limit: perPage,
    offset,
  });
  const totalRows = await db.select({ count: count() }).from(activityLog);
  return { rows, total: totalRows[0]?.count ?? 0 };
}
