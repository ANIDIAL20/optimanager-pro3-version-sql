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

export const LensOrderSchema = z.object({
  clientId: z.number().int(),
  orderType: z.string().min(1),
  lensType: z.string().min(1),
  supplierId: z.string().uuid(),
  supplierName: z.string().min(1),
  
  // Right Eye
  sphereR: OpticalSpecSchema,
  cylindreR: OpticalSpecSchema,
  axeR: z.coerce.number().int().min(0).max(180).optional(),
  additionR: OpticalSpecSchema,
  hauteurR: z.coerce.number().optional(),
  
  // Left Eye
  sphereL: OpticalSpecSchema,
  cylindreL: OpticalSpecSchema,
  axeL: z.coerce.number().int().min(0).max(180).optional(),
  additionL: OpticalSpecSchema,
  hauteurL: z.coerce.number().optional(),
  
  sellingPrice: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1).default(1),
  treatment: z.string().optional(),
  notes: z.string().optional(),
});
