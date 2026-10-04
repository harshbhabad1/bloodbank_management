// ============================================================
// lib/rules.ts — Blood bank eligibility & compatibility rules
// All thresholds live here so they can be changed in one place.
// ============================================================

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type Component = "whole_blood" | "prbc" | "platelets" | "plasma";

// ── Eligibility thresholds ──────────────────────────────────
export const ELIGIBILITY = {
  MIN_AGE: 18,
  MAX_AGE: 65,
  MIN_WEIGHT_KG: 45,
  MIN_WEIGHT_HIGH_VOLUME_KG: 55,
  HIGH_VOLUME_ML: 450,
  MIN_DAYS_BETWEEN_DONATIONS: 90,
  MIN_HEMOGLOBIN: 12.5,
} as const;

// ── Shelf life in days ──────────────────────────────────────
export const SHELF_LIFE_DAYS: Record<Component, number> = {
  whole_blood: 35,
  prbc: 42,
  platelets: 5,
  plasma: 365,
};

// ── Compatibility tables ────────────────────────────────────
// Red cells (whole_blood, prbc): recipient → allowed donor groups
const RED_CELL_COMPAT: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
};

// Plasma: recipient ABO → allowed donor ABO (Rh ignored)
// O ← O, A, B, AB · A ← A, AB · B ← B, AB · AB ← AB
const PLASMA_COMPAT_ABO: Record<string, string[]> = {
  O: ["O", "A", "B", "AB"],
  A: ["A", "AB"],
  B: ["B", "AB"],
  AB: ["AB"],
};

function aboOf(group: BloodGroup): string {
  return group.replace(/[+-]/, "");
}

/**
 * Returns the set of donor blood groups that are compatible
 * with a given recipient group and component.
 */
export function compatibleDonorGroups(
  recipientGroup: BloodGroup,
  component: Component
): BloodGroup[] {
  const allGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  if (component === "whole_blood" || component === "prbc") {
    return RED_CELL_COMPAT[recipientGroup] ?? [];
  }

  if (component === "plasma") {
    const allowedABO = PLASMA_COMPAT_ABO[aboOf(recipientGroup)] ?? [];
    return allGroups.filter((g) => allowedABO.includes(aboOf(g)));
  }

  // Platelets: exact group only in v1
  return [recipientGroup];
}

// ── Expiry date helper ──────────────────────────────────────
export function expiryDate(collectedAt: Date, component: Component): Date {
  // "YYYY-MM-DD" strings parse as UTC midnight, so do the math in UTC too.
  const d = new Date(collectedAt);
  d.setUTCDate(d.getUTCDate() + SHELF_LIFE_DAYS[component]);
  return d;
}

// ── Eligibility check ───────────────────────────────────────
export interface EligibilityInput {
  dateOfBirth: string; // ISO date "YYYY-MM-DD"
  weightKg: number;
  lastDonationAt: string | null; // ISO date or null
  hemoglobin?: number | null;
  donationDate: string; // ISO date "YYYY-MM-DD"
  volumeMl: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export function isEligible(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];

  const donation = new Date(input.donationDate);
  const dob = new Date(input.dateOfBirth);

  // Age
  let age = donation.getUTCFullYear() - dob.getUTCFullYear();
  const m = donation.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && donation.getUTCDate() < dob.getUTCDate())) age--;

  if (age < ELIGIBILITY.MIN_AGE || age > ELIGIBILITY.MAX_AGE) {
    reasons.push(`Donor age (${age}) must be between ${ELIGIBILITY.MIN_AGE} and ${ELIGIBILITY.MAX_AGE}.`);
  }

  // Weight
  const minWeight =
    input.volumeMl >= ELIGIBILITY.HIGH_VOLUME_ML
      ? ELIGIBILITY.MIN_WEIGHT_HIGH_VOLUME_KG
      : ELIGIBILITY.MIN_WEIGHT_KG;
  if (input.weightKg < minWeight) {
    reasons.push(
      `Donor weight (${input.weightKg} kg) must be ≥ ${minWeight} kg${
        input.volumeMl >= ELIGIBILITY.HIGH_VOLUME_ML ? " for 450 ml donations" : ""
      }.`
    );
  }

  // Interval
  if (input.lastDonationAt) {
    const last = new Date(input.lastDonationAt);
    const diffDays = Math.floor(
      (donation.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < ELIGIBILITY.MIN_DAYS_BETWEEN_DONATIONS) {
      reasons.push(
        `Only ${diffDays} day(s) since last donation; minimum is ${ELIGIBILITY.MIN_DAYS_BETWEEN_DONATIONS} days.`
      );
    }
  }

  // Hemoglobin
  if (input.hemoglobin != null && input.hemoglobin < ELIGIBILITY.MIN_HEMOGLOBIN) {
    reasons.push(
      `Hemoglobin (${input.hemoglobin} g/dL) is below the minimum of ${ELIGIBILITY.MIN_HEMOGLOBIN} g/dL.`
    );
  }

  return { eligible: reasons.length === 0, reasons };
}
