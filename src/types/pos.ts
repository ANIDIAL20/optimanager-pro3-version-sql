/**
 * POS extended types — augmentations de PosLineItem
 * pour les lignes issues de commandes verres (lensOrders).
 */
import type { PosLineItem } from '@/features/pos/utils/pricing';

/**
 * Ligne de panier POS enrichie avec les champs spécifiques
 * aux commandes verres (lensOrderId + avance déjà versée).
 */
export type PosLineItemWithAdvance = PosLineItem & {
  /** ID de la lensOrder liée (ex: 42) */
  lensOrderId?: number;
  /** Montant déjà versé comme avance lors de la commande */
  advanceAlreadyPaid?: number;
};
