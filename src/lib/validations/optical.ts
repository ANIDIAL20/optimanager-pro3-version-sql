import { z } from 'zod';

/**
 * Common Optical Spec Schema with Coercion
 * Handles strings from forms and converts them to numbers with 0.25 steps.
 */
/**
 * Common Optical Spec Schema with Coercion
 * Handles strings from forms and converts them to numbers with 0.25 steps.
 */
export const OpticalSpecSchema = z
  .string()
  .refine((val) => val !== '', { 
    message: 'La valeur est requise' 
  })
  .pipe(
    z.coerce.number()
      .multipleOf(0.25, { message: "Le pas doit être de 0.25 (ex: 0.25, 0.50, 0.75)" })
      .min(-20, { message: "Minimum -20.00" })
      .max(20, { message: "Maximum +20.00" })
  );

export const OptionalOpticalSpecSchema = z
  .literal("")
  .transform(() => undefined)
  .or(
    z.coerce.number()
      .multipleOf(0.25)
      .min(-20)
      .max(20)
  )
  .optional();

// Helper for optional string/number fields that can be null
const NullableString = z.string().nullable().optional().or(z.literal(''));

export const LensOrderSchema = z.object({
  clientId: z.number().int(),
  prescriptionId: z.number().int().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  orderType: z.enum(['progressive', 'bifocal', 'unifocal', 'contact']),
  lensType: z.string().min(1),
  
  // Right Eye - Allow strings/nulls directly as they come from DB/Form
  sphereR: NullableString,
  cylindreR: NullableString,
  axeR: NullableString,
  additionR: NullableString,
  hauteurR: NullableString,
  
  // Left Eye
  sphereL: NullableString,
  cylindreL: NullableString,
  axeL: NullableString,
  additionL: NullableString,
  hauteurL: NullableString,
  
  ecartPupillaireR: NullableString,
  ecartPupillaireL: NullableString,
  diameterR: NullableString,
  diameterL: NullableString,
  
  // Material
  matiere: NullableString,
  indice: NullableString,
  
  sellingPrice: z.coerce.number().min(0),
  estimatedBuyingPrice: z.coerce.number().optional().default(0),
  unitPrice: z.coerce.number().min(0).optional(), // Legacy
  quantity: z.coerce.number().int().min(1).default(1),
  totalPrice: z.coerce.number().optional(), // Legacy

  treatment: NullableString,
  status: z.string().optional(),
  notes: NullableString,
});
