import { db } from '@/db';
import { notifications } from '@/db/schema';

interface CreateNotificationInput {
  userId?: string; // Optional, if not provided maybe it's for all admins?
  type: 'RESERVATION_EXPIRING' | 'RESERVATION_EXPIRED' | 'LOW_STOCK' | 'OTHER';
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  relatedEntityType?: string;
  relatedEntityId?: number;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority ?? 'MEDIUM',
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    })
    .returning();
  
  return notification;
}
