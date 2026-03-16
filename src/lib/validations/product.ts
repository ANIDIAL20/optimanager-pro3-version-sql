import { z } from 'zod';

export const ProductFormSchema = z.object({
  id: z.string().optional(),
  reference: z.string().optional(),
  nomProduit: z.string().min(1, 'Nom du produit requis.'),
  prixAchat: z.coerce.number().optional().default(0),
  prixVente: z.coerce.number().min(0, 'Prix de vente requis.'),
  stockMin: z.coerce.number().optional().default(5),
  quantiteStock: z.coerce.number().optional().default(0),
  categorieId: z.string().min(1, 'Catégorie requise.'),
  marqueId: z.string().optional(),
  matiereId: z.string().optional(),
  couleurId: z.string().optional(),
  categorie: z.string().optional(),
  category: z.string().optional(),
  marque: z.string().optional(),
  brand: z.string().optional(),
  fournisseur: z.string().optional(),
  modele: z.string().optional(),
  couleur: z.string().optional(),
  fournisseurId: z.string().optional(),
  description: z.string().optional(),
  numFacture: z.string().optional(),
  details: z.string().optional(),
  isAchatTTC: z.boolean().default(false).optional(),
  imageUrl: z.string().optional(),
  hasTva: z.boolean().default(true).optional(),
  priceType: z.enum(['HT', 'TTC']).default('TTC').optional(),
  productType: z.string().optional(),
  isMedical: z.boolean().optional(),
  isStockManaged: z.boolean().optional(),
  tvaRate: z.coerce.number().optional(),
  exemptionNote: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;

export const BulkProductSchema = z.object({
    fournisseurId: z.string().optional(),
    numFacture: z.string().optional(),
    dateAchat: z.string().optional(),
    items: z.array(ProductFormSchema).min(1, "Il faut au moins un produit.")
});

export type BulkProductFormValues = z.infer<typeof BulkProductSchema>;
