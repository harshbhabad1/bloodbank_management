import { db, pool } from "./index";
import {
  donors,
  donations,
  bloodUnits,
  bloodRequests,
  activityLog,
} from "./schema";
import { eq, ilike, or, and, lt, sql, desc, asc, count, inArray } from "drizzle-orm";
import type { BloodGroup, Component } from "../rules";

// ── Param guards ─────────────────────────────────────────────
// URL params are untrusted; invalid ids/enum values would otherwise
// surface as Postgres errors (500s) instead of empty results / 404s.
export function isValidId(id: number) {
  return Number.isInteger(id) && id > 0 && id <= 2147483647;
}

function oneOf<T extends string>(values: readonly T[], v?: string): T | undefined {
  return v && (values as readonly string[]).includes(v) ? (v as T) : undefined;
}

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
          ilike(sql`${donors.bloodGroup}::text`, `%${search}%`)
        )
      )
      .orderBy(asc(donors.name));
  }
  return db.select().from(donors).orderBy(asc(donors.name));
}

export async function getDonor(id: number) {
  if (!isValidId(id)) return null;
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
  const group = oneOf(bloodUnits.bloodGroup.enumValues, filters?.group);
  const component = oneOf(bloodUnits.component.enumValues, filters?.component);
  const status = oneOf(bloodUnits.status.enumValues, filters?.status);
  return db.query.bloodUnits.findMany({
    where: and(
      group ? eq(bloodUnits.bloodGroup, group) : undefined,
      component ? eq(bloodUnits.component, component) : undefined,
      status ? eq(bloodUnits.status, status) : undefined
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
  return db.query.bloodUnits.findMany({
    where: and(
      eq(bloodUnits.status, "available"),
      lt(bloodUnits.expiresAt, sql`CURRENT_DATE + ${days}::int`)
    ),
    orderBy: [asc(bloodUnits.expiresAt)],
  });
}

// ── Requests ──────────────────────────────────────────────────
export async function listRequests(statusFilter?: string) {
  const status = oneOf(bloodRequests.status.enumValues, statusFilter);
  return db.query.bloodRequests.findMany({
    where: status ? eq(bloodRequests.status, status) : undefined,
    orderBy: [desc(bloodRequests.urgency), desc(bloodRequests.createdAt)],
  });
}

export async function getRequest(id: number) {
  if (!isValidId(id)) return undefined;
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
        inArray(bloodUnits.bloodGroup, allowedGroups)
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
