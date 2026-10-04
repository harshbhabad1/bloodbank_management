import { z } from "zod";

export const donorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  weightKg: z.coerce.number().int().min(30, "Weight must be at least 30 kg").max(200),
  address: z.string().optional().or(z.literal("")),
});

export const donationSchema = z.object({
  donorId: z.coerce.number().int().positive(),
  donatedAt: z.string().min(1, "Donation date is required"),
  volumeMl: z.coerce.number().int().min(250).max(500),
  hemoglobin: z.coerce.number().min(5).max(25).optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
  components: z
    .array(z.enum(["whole_blood", "prbc", "platelets", "plasma"]))
    .min(1, "Select at least one component"),
});

export const requestSchema = z.object({
  patientName: z.string().min(2, "Patient name required"),
  hospitalName: z.string().min(2, "Hospital name required"),
  contactPhone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  component: z.enum(["whole_blood", "prbc", "platelets", "plasma"]),
  unitsRequested: z.coerce.number().int().min(1).max(10),
  urgency: z.enum(["normal", "urgent"]).default("normal"),
  notes: z.string().optional().or(z.literal("")),
});

export const discardUnitSchema = z.object({
  unitId: z.coerce.number().int().positive(),
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});
