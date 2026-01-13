
import { z } from 'zod';

export const productSchema = z.object({
  reference: z.string().optional(),
  nom: z.string().min(2, "Le nom du produit est requis"),
  designation: z.string().optional(),
  categorie: z.string().optional(),
  marque: z.string().optional(),
  fournisseur: z.string().optional(),
  
  // Prix
  prixAchat: z.string().transform((val) => val === '' ? '0' : val).optional(),
  prixVente: z.string().min(1, "Le prix de vente est requis"),
  prixGros: z.string().optional(),
  
  // Stock
  quantiteStock: z.number().int().default(0),
  seuilAlerte: z.number().int().default(5),
  
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = productSchema.partial().extend({
  id: z.number(),
});

export type ProductInput = z.infer<typeof productSchema>;
