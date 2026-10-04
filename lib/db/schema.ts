import { pgEnum, pgTable, serial, text, integer, date, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────
export const bloodGroupEnum = pgEnum("blood_group", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
export const componentEnum = pgEnum("component", ["whole_blood", "prbc", "platelets", "plasma"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const unitStatusEnum = pgEnum("unit_status", ["available", "issued", "expired", "discarded"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "fulfilled", "cancelled"]);
export const urgencyEnum = pgEnum("urgency", ["normal", "urgent"]);

// ── donors ───────────────────────────────────────────────────
export const donors = pgTable("donors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  gender: genderEnum("gender").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  bloodGroup: bloodGroupEnum("blood_group").notNull(),
  weightKg: integer("weight_kg").notNull(),
  address: text("address"),
  lastDonationAt: date("last_donation_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── donations ────────────────────────────────────────────────
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  donorId: integer("donor_id")
    .notNull()
    .references(() => donors.id),
  donatedAt: date("donated_at").notNull(),
  volumeMl: integer("volume_ml").notNull(),
  hemoglobin: numeric("hemoglobin", { precision: 4, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── blood_requests ───────────────────────────────────────────
export const bloodRequests = pgTable("blood_requests", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  hospitalName: text("hospital_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  bloodGroup: bloodGroupEnum("blood_group").notNull(),
  component: componentEnum("component").notNull(),
  unitsRequested: integer("units_requested").notNull(),
  urgency: urgencyEnum("urgency").notNull().default("normal"),
  status: requestStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── blood_units ──────────────────────────────────────────────
export const bloodUnits = pgTable(
  "blood_units",
  {
    id: serial("id").primaryKey(),
    donationId: integer("donation_id")
      .notNull()
      .references(() => donations.id),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    component: componentEnum("component").notNull(),
    volumeMl: integer("volume_ml").notNull(),
    collectedAt: date("collected_at").notNull(),
    expiresAt: date("expires_at").notNull(),
    status: unitStatusEnum("status").notNull().default("available"),
    requestId: integer("request_id").references(() => bloodRequests.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    stockIdx: index("blood_units_stock_idx").on(t.status, t.bloodGroup, t.component, t.expiresAt),
  })
);

// ── activity_log ─────────────────────────────────────────────
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Relations ────────────────────────────────────────────────
export const donorsRelations = relations(donors, ({ many }) => ({
  donations: many(donations),
}));

export const donationsRelations = relations(donations, ({ one, many }) => ({
  donor: one(donors, {
    fields: [donations.donorId],
    references: [donors.id],
  }),
  bloodUnits: many(bloodUnits),
}));

export const bloodUnitsRelations = relations(bloodUnits, ({ one }) => ({
  donation: one(donations, {
    fields: [bloodUnits.donationId],
    references: [donations.id],
  }),
  bloodRequest: one(bloodRequests, {
    fields: [bloodUnits.requestId],
    references: [bloodRequests.id],
  }),
}));

export const bloodRequestsRelations = relations(bloodRequests, ({ many }) => ({
  bloodUnits: many(bloodUnits),
}));

