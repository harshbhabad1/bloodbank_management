import "./env";
import { db, pool } from "./index";
import { bloodUnits, donors, donations, bloodRequests, activityLog } from "./schema";
import type { BloodGroup, Component } from "../rules";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const shelfLife: Record<string, number> = {
  whole_blood: 35,
  prbc: 42,
  platelets: 5,
  plasma: 365,
};

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await pool.query(`
    TRUNCATE activity_log, blood_units, donations, blood_requests, donors RESTART IDENTITY CASCADE;
  `);

  const today = new Date();

  // ── Donors (15 across all groups) ──────────────────────────
  const donorData = [
    { name: "Arjun Sharma", phone: "9800000001", gender: "male", dob: "1990-03-15", bg: "A+", weight: 72, lastDon: fmtDate(addDays(today, -120)) },
    { name: "Priya Patel", phone: "9800000002", gender: "female", dob: "1995-07-22", bg: "B+", weight: 55, lastDon: null },
    { name: "Rahul Verma", phone: "9800000003", gender: "male", dob: "1988-11-10", bg: "O+", weight: 80, lastDon: fmtDate(addDays(today, -200)) },
    { name: "Sneha Gupta", phone: "9800000004", gender: "female", dob: "1992-01-05", bg: "AB+", weight: 60, lastDon: null },
    { name: "Kiran Mehta", phone: "9800000005", gender: "male", dob: "1985-05-18", bg: "O-", weight: 75, lastDon: fmtDate(addDays(today, -95)) },
    { name: "Anita Singh", phone: "9800000006", gender: "female", dob: "1998-09-30", bg: "A-", weight: 52, lastDon: null },
    { name: "Deepak Rao", phone: "9800000007", gender: "male", dob: "1975-12-25", bg: "B-", weight: 68, lastDon: null },
    { name: "Kavita Nair", phone: "9800000008", gender: "female", dob: "2000-06-14", bg: "AB-", weight: 48, lastDon: null },
    { name: "Suresh Kumar", phone: "9800000009", gender: "male", dob: "1993-04-08", bg: "A+", weight: 85, lastDon: null },
    { name: "Meera Joshi", phone: "9800000010", gender: "female", dob: "1987-08-20", bg: "O+", weight: 58, lastDon: fmtDate(addDays(today, -150)) },
    { name: "Rajesh Iyer", phone: "9800000011", gender: "male", dob: "1980-02-12", bg: "B+", weight: 90, lastDon: null },
    { name: "Nisha Desai", phone: "9800000012", gender: "female", dob: "1996-10-07", bg: "AB+", weight: 54, lastDon: null },
    { name: "Vikram Pillai", phone: "9800000013", gender: "male", dob: "1982-07-16", bg: "O-", weight: 70, lastDon: null },
    { name: "Sunita Agarwal", phone: "9800000014", gender: "female", dob: "1991-03-28", bg: "A-", weight: 62, lastDon: null },
    { name: "Mohan Das", phone: "9800000015", gender: "male", dob: "1978-11-03", bg: "B-", weight: 77, lastDon: null },
  ];

  const insertedDonors = await db.insert(donors).values(
    donorData.map((d) => ({
      name: d.name,
      phone: d.phone,
      gender: d.gender as "male" | "female" | "other",
      dateOfBirth: d.dob,
      bloodGroup: d.bg as BloodGroup,
      weightKg: d.weight,
      lastDonationAt: d.lastDon,
    }))
  ).returning();

  console.log(`✅ Inserted ${insertedDonors.length} donors`);

  // ── Donations ───────────────────────────────────────────────
  const donationEntries = [
    { donorIdx: 0, donatedAt: fmtDate(addDays(today, -120)), vol: 450 },
    { donorIdx: 2, donatedAt: fmtDate(addDays(today, -200)), vol: 350 },
    { donorIdx: 4, donatedAt: fmtDate(addDays(today, -95)), vol: 450 },
    { donorIdx: 9, donatedAt: fmtDate(addDays(today, -150)), vol: 350 },
    { donorIdx: 1, donatedAt: fmtDate(addDays(today, -10)), vol: 450 },
    { donorIdx: 3, donatedAt: fmtDate(addDays(today, -5)), vol: 350 },
    { donorIdx: 6, donatedAt: fmtDate(addDays(today, -3)), vol: 450 },
    { donorIdx: 7, donatedAt: fmtDate(addDays(today, -2)), vol: 350 },
    { donorIdx: 8, donatedAt: fmtDate(addDays(today, -15)), vol: 450 },
    { donorIdx: 10, donatedAt: fmtDate(addDays(today, -20)), vol: 350 },
  ];

  const insertedDonations = await db.insert(donations).values(
    donationEntries.map((e) => ({
      donorId: insertedDonors[e.donorIdx].id,
      donatedAt: e.donatedAt,
      volumeMl: e.vol,
      hemoglobin: "13.5",
    }))
  ).returning();

  console.log(`✅ Inserted ${insertedDonations.length} donations`);

  // ── Blood Units (~30 units, some expiring soon) ─────────────
  const unitEntries: Array<{
    donationIdx: number;
    component: Component;
    collectedAt: string;
    expiresAt: string;
    status: "available" | "expired" | "discarded";
  }> = [];

  for (let i = 0; i < insertedDonations.length; i++) {
    const don = donationEntries[i];
    const componentsToCreate: Component[] =
      i % 3 === 0 ? ["whole_blood", "prbc"] : i % 3 === 1 ? ["platelets", "plasma"] : ["prbc"];
    for (const comp of componentsToCreate) {
      const expires = addDays(new Date(don.donatedAt), shelfLife[comp]);
      unitEntries.push({
        donationIdx: i,
        component: comp,
        collectedAt: don.donatedAt,
        expiresAt: fmtDate(expires),
        status: expires < today ? "expired" : "available",
      });
    }
  }

  // Add some units expiring soon (within 3 days)
  for (let i = 0; i < 4; i++) {
    const donIdx = i;
    const collected = fmtDate(addDays(today, -32));
    unitEntries.push({
      donationIdx: donIdx,
      component: "whole_blood",
      collectedAt: collected,
      expiresAt: fmtDate(addDays(today, 2)),
      status: "available",
    });
  }

  const insertedUnits = await db.insert(bloodUnits).values(
    unitEntries.map((u) => ({
      donationId: insertedDonations[u.donationIdx].id,
      bloodGroup: insertedDonors[donationEntries[u.donationIdx].donorIdx].bloodGroup,
      component: u.component,
      volumeMl: donationEntries[u.donationIdx].vol,
      collectedAt: u.collectedAt,
      expiresAt: u.expiresAt,
      status: u.status,
    }))
  ).returning();

  console.log(`✅ Inserted ${insertedUnits.length} blood units`);

  // ── Blood Requests (3) ──────────────────────────────────────
  const insertedRequests = await db.insert(bloodRequests).values([
    {
      patientName: "Ravi Shankar",
      hospitalName: "City General Hospital",
      contactPhone: "9900001111",
      bloodGroup: "A+",
      component: "prbc",
      unitsRequested: 2,
      urgency: "urgent",
      status: "pending",
      notes: "Post-operative patient",
    },
    {
      patientName: "Lakshmi Bai",
      hospitalName: "Apollo Hospital",
      contactPhone: "9900002222",
      bloodGroup: "O-",
      component: "whole_blood",
      unitsRequested: 1,
      urgency: "normal",
      status: "pending",
    },
    {
      patientName: "Hari Prasad",
      hospitalName: "St. Mary's Clinic",
      contactPhone: "9900003333",
      bloodGroup: "B+",
      component: "platelets",
      unitsRequested: 3,
      urgency: "normal",
      status: "pending",
    },
  ]).returning();

  console.log(`✅ Inserted ${insertedRequests.length} blood requests`);

  // ── Activity Log ────────────────────────────────────────────
  await db.insert(activityLog).values([
    { action: "donor.created", entity: "donor", entityId: insertedDonors[0].id, message: `Donor ${insertedDonors[0].name} registered.` },
    { action: "donation.recorded", entity: "donation", entityId: insertedDonations[0].id, message: `Donation recorded for ${insertedDonors[0].name}.` },
    { action: "request.created", entity: "request", entityId: insertedRequests[0].id, message: `New request REQ-${insertedRequests[0].id} for ${insertedRequests[0].patientName}.` },
  ]);

  console.log("✅ Activity log seeded");
  console.log("\n🎉 Seeding complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
