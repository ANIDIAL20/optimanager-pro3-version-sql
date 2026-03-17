import { notifications } from '@/db/schema/notifications';

/**
 * Inférence stricte et automatique via Drizzle.
 * Maintient le typage lié à la base de données sans redondance.
 */
export type NewNotification = typeof notifications.$inferInsert;

/**
 * Fonction utilitaire "Production-Ready" pour créer des notifications.
 *
 * @param tx - L'objet de transaction (issu de dbWithTransactions.transaction). L'imposer garantit que la
 *            notification sera incluse dans la même transaction que l'entité parente
 *            et annulée si l'opération globale échoue (Atomicité).
 * @param data - Les données strongly-typed de la notification.
 */
export async function createNotification(
  tx: any, // Typiquement Extract<typeof db, any> ou du Transaction type Drizzle
  data: NewNotification
) {
  // L'insertion se fait sans try/catch local : 
  // si elle échoue, l'erreur remonte et provoque le rollback de la transaction principale
  await tx.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    priority: data.priority ?? 'MEDIUM',
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId,
    // (Les timestamps createdAt et champs id/isRead sont gérés par la db)
  });
}
