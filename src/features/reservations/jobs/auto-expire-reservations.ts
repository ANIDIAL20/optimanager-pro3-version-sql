import { db } from '@/db';
import { frameReservations } from '@/db/schema';
import { eq, and, lt, between } from 'drizzle-orm';
import { cancelFrameReservation } from '../services/cancel-frame-reservation';
import { logger } from '@/lib/logger';
import { createNotification } from '@/features/notifications/services/create-notification';
import { addDays, differenceInDays } from 'date-fns';

/**
 * Job pour faire expirer automatiquement les réservations en attente dont la date de validité est dépassée.
 */
export async function autoExpireFrameReservations() {
  const now = new Date();
  
  logger.info('Auto-expire job started', {
    jobName: 'autoExpireFrameReservations',
    timestamp: now.toISOString(),
  });
  
  // 1) جلب الحجوزات المنتهية الصلاحية التي لا تزال في حالة PENDING
  const expiredReservations = await db.query.frameReservations.findMany({
    where: and(
      eq(frameReservations.status, 'PENDING'),
      lt(frameReservations.expiryDate, now)
    ),
  });
  
  logger.info('Found expired reservations', {
    count: expiredReservations.length,
    reservationIds: expiredReservations.map(r => r.id),
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  // إلغاء كل واحدة لإرجاع المخزون وإنشاء تنبيه
  for (const res of expiredReservations) {
    try {
      // إنشاء تنبيه قبل الإلغاء
      await createNotification({
        userId: res.storeId, 
        type: 'RESERVATION_EXPIRED',
        title: 'Réservation expirée',
        message: `La réservation de ${res.clientName} a expiré (${(res.items as any[]).length} monture(s))`,
        priority: 'MEDIUM',
        relatedEntityType: 'reservation',
        relatedEntityId: res.id,
      });

      await cancelFrameReservation({
        reservationId: res.id,
        setExpired: true,
        reason: 'Expiration automatique (Cron)',
      });
      
      logger.info('Reservation expired successfully', {
        reservationId: res.id,
        clientId: res.clientId,
        clientName: res.clientName,
        itemsCount: (res.items as any[]).length,
        expiryDate: res.expiryDate,
      });

      successCount++;
    } catch (error: any) {
      logger.error('Failed to expire reservation', {
        reservationId: res.id,
        clientId: res.clientId,
        error: error.message,
        stack: error.stack,
      });
      errorCount++;
    }
  }

  // 2) إنشاء تنبيهات للحجوزات التي ستنتهي قريباً (خلال يومين)
  const expiringSoon = await db.query.frameReservations.findMany({
    where: and(
      eq(frameReservations.status, 'PENDING'),
      between(
        frameReservations.expiryDate,
        now,
        addDays(now, 2)
      )
    ),
  });

  for (const res of expiringSoon) {
    try {
      const daysLeft = differenceInDays(new Date(res.expiryDate), now);
      
      await createNotification({
        userId: res.storeId,
        type: 'RESERVATION_EXPIRING',
        title: 'Réservation expire bientôt',
        message: `La réservation de ${res.clientName} expire dans ${daysLeft === 0 ? "aujourd'hui" : daysLeft + " jour(s)"}`,
        priority: daysLeft === 0 ? 'HIGH' : 'MEDIUM',
        relatedEntityType: 'reservation',
        relatedEntityId: res.id,
      });
    } catch (err: any) {
      logger.error('Failed to create warning notification', {
        reservationId: res.id,
        error: err.message
      });
    }
  }
  
  logger.info('Auto-expire job completed', {
    totalProcessed: expiredReservations.length,
    successCount,
    errorCount,
    duration: Date.now() - now.getTime(),
  });

  return {
    success: true,
    processed: expiredReservations.length,
    successCount,
    errorCount,
  };
}
