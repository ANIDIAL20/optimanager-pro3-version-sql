import { z } from 'zod';
import {
  SUPPORTED_FONTS,
  SUPPORTED_LAYOUTS,
  SUPPORTED_THEMES,
  SUPPORTED_LANGS,
} from '@/types/document-settings-types';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide');

export const documentSettingsBaseSchema = z.object({
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  fontFamily: z.enum(SUPPORTED_FONTS).optional(),
  layout: z.enum(SUPPORTED_LAYOUTS).optional(),
  theme: z.enum(SUPPORTED_THEMES).optional(),
  language: z.enum(SUPPORTED_LANGS).optional(),
  showLogo: z.boolean().optional(),
  showFooter: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showIce: z.boolean().optional(),
  showRc: z.boolean().optional(),
  showRib: z.boolean().optional(),
  showWatermark: z.boolean().optional(),
  showPageNumber: z.boolean().optional(),
  showSignature: z.boolean().optional(),
  footerText: z.string().max(300).optional(),
  watermarkText: z.string().max(50).optional(),
  logoPosition: z.enum(['left', 'center', 'right']).optional(),
  borderRadius: z.number().min(0).max(20).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
});

export const updateDocumentSettingsSchema = z.object({
  default: documentSettingsBaseSchema.optional(),
  overrides: z
    .object({
      facture: documentSettingsBaseSchema.optional(),
      devis: documentSettingsBaseSchema.optional(),
      bc: documentSettingsBaseSchema.optional(),
      bl: documentSettingsBaseSchema.optional(),
    })
    .optional(),
});

export type UpdateDocumentSettingsInput = z.infer<typeof updateDocumentSettingsSchema>;
