
import { z } from 'zod';

// Utility for eye prescription values
export const eyePrescriptionSchema = z.object({
  sphere: z.string().default('0.00'),
  cylinder: z.string().default('0.00'),
  axis: z.string().default('0'),
  addition: z.string().optional(),
  visualAcuity: z.string().optional(),
});

export const prescriptionSchema = z.object({
  date: z.string().or(z.date()).transform((val) => new Date(val).toISOString()),
  doctorName: z.string().optional(),
  od: eyePrescriptionSchema, // Right eye
  og: eyePrescriptionSchema, // Left eye
  pd: z.string().default('62'), // Pupillary distance
  notes: z.string().optional(),
});

export const clientSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateClientSchema = clientSchema.partial().extend({
  id: z.number(),
});

export type EyePrescription = z.infer<typeof eyePrescriptionSchema>;
export type Prescription = z.infer<typeof prescriptionSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
