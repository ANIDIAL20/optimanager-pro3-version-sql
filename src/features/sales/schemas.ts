
import { z } from 'zod';

export const saleItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, "Nom du produit requis"),
  quantity: z.number().min(1, "Quantité minimum 1"),
  price: z.number().min(0, "Prix invalide"),
  total: z.number().min(0)
});

export const saleSchema = z.object({
  clientId: z.number().optional(),
  clientName: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "La vente doit contenir au moins un article"),
  
  // Financial
  totalHT: z.number().min(0),
  totalTVA: z.number().min(0),
  totalTTC: z.number().min(0),
  totalPaid: z.number().min(0).default(0),
  paymentMethod: z.enum(['ESPECES', 'CARTE', 'VIREMENT', 'CHEQUE', 'AUTRE']).default('ESPECES'),
  
  notes: z.string().optional(),
  status: z.enum(['PAYE', 'IMPAYE', 'PARTIEL']).default('PAYE')
});

export type SaleInput = z.infer<typeof saleSchema>;
