/**
 * Document Adapters — barrel export
 *
 * Usage:
 *   import { factureAdapter, devisAdapter, bonCommandeAdapter, recuAdapter } from '@/lib/documents/adapters';
 *
 * Each adapter exposes:
 *   toStandardDocument(rawData) → StandardDocumentData
 *
 * Shared helpers also re-exported for downstream use:
 *   normalizeSaleItem  — maps a raw sale line item to DocumentItem
 *   normalizeShop      — maps raw shopProfile settings to StandardDocumentData['shop']
 */

export * as factureAdapter from './facture.adapter';
export * as devisAdapter from './devis.adapter';
export * as bonCommandeAdapter from './bon-commande.adapter';
export * as recuAdapter from './recu.adapter';

// Shared utilities
export { normalizeSaleItem, normalizeShop } from './facture.adapter';
