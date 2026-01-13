'use server';

import { db } from '@/db';
import { reminders } from '@/db/schema';
import { secureAction } from '@/lib/secure-action';
import { eq, and, lte, gte, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ========================================
// TYPES
// ========================================
export type ReminderType = 'ONE_TIME' | 'RECURRING' | 'MANUAL';
export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED' | 'EXPIRED';
export type RecurrenceUnit = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
export type EntityType = 'SUPPLIER' | 'CHECK' | 'CONTRACT' | 'CLIENT' | 'PRODUCT' | 'SUPPLIER_ORDER';

interface CreateReminderInput {
  title: string;
  description?: string;
  reminderType: ReminderType;
  targetDate: Date;
  notificationOffsetDays?: number;
  isRecurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: RecurrenceUnit;
  relatedEntityType?: EntityType;
  relatedEntityId?: string;
  notificationChannels?: string[];
}

// ========================================
// AUTO-TRIGGER: Create Check Reminder
// ========================================
// Called automatically when shop owner creates a Check (payment to supplier)
export async function createCheckReminder(
  userId: string,
  checkData: {
    checkId: number;
    checkNumber: string;
    supplierName: string;
    dueDate: Date;
    amount: number;
  }
) {
  try {
    const notificationDate = new Date(checkData.dueDate);
    notificationDate.setDate(notificationDate.getDate() - 2); // Notify 2 days before
    
    const reminder = await db.insert(reminders).values({
      userId,
      title: `Chèque #${checkData.checkNumber} à ${checkData.supplierName}`,
      description: `Montant: ${checkData.amount} MAD - Échéance du chèque`,
      reminderType: 'ONE_TIME',
      status: 'PENDING',
      targetDate: checkData.dueDate,
      notificationDate,
      notificationOffsetDays: 2,
      isRecurring: false,
      relatedEntityType: 'CHECK',
      relatedEntityId: checkData.checkId.toString(),
      notificationChannels: ['IN_APP'],
      notificationSent: false,
    }).returning();
    
    console.log(`✅ Auto-created reminder for Check #${checkData.checkNumber}`);
    return { success: true, reminder: reminder[0] };
  } catch (error) {
    console.error('Failed to create check reminder:', error);
    return { success: false, error };
  }
}

// ========================================
// CREATE REMINDER (Manual or Recurring)
// ========================================
export const createReminder = secureAction(
  async (userId: string, user: any, input: CreateReminderInput) => {
    // Calculate notification date
    const notificationDate = new Date(input.targetDate);
    if (input.notificationOffsetDays) {
      notificationDate.setDate(notificationDate.getDate() - input.notificationOffsetDays);
    }
    
    const newReminder = await db.insert(reminders).values({
      userId,
      title: input.title,
      description: input.description,
      reminderType: input.reminderType,
      status: 'PENDING',
      targetDate: input.targetDate,
      notificationDate,
      notificationOffsetDays: input.notificationOffsetDays,
      isRecurring: input.isRecurring || false,
      recurrenceInterval: input.recurrenceInterval,
      recurrenceUnit: input.recurrenceUnit,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      notificationChannels: input.notificationChannels || ['IN_APP'],
      notificationSent: false,
    }).returning();
    
    revalidatePath('/dashboard');
    return { success: true, reminder: newReminder[0] };
  }
);

// ========================================
// GET UPCOMING REMINDERS (Shop Owner Dashboard)
// ========================================
export const getUpcomingReminders = secureAction(
  async (userId: string, user: any, limit = 10) => {
    const today = new Date();
    const upcoming = await db.query.reminders.findMany({
      where: and(
        eq(reminders.userId, userId),
        eq(reminders.status, 'PENDING'),
        gte(reminders.targetDate, today)
      ),
      orderBy: [asc(reminders.targetDate)],
      limit,
    });
    
    return upcoming;
  }
);

// ========================================
// GET OVERDUE REMINDERS
// ========================================
export const getOverdueReminders = secureAction(
  async (userId: string, user: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const overdue = await db.query.reminders.findMany({
      where: and(
        eq(reminders.userId, userId),
        eq(reminders.status, 'PENDING'),
        lte(reminders.targetDate, today)
      ),
      orderBy: [asc(reminders.targetDate)],
    });
    
    return overdue;
  }
);

// ========================================
// UPDATE REMINDER STATUS
// ========================================
export const updateReminderStatus = secureAction(
  async (userId: string, user: any, data: { id: number; status: ReminderStatus }) => {
    const now = new Date();
    
    // Get the reminder first to check if it's recurring
    const [reminder] = await db.query.reminders.findMany({
      where: and(
        eq(reminders.id, data.id),
        eq(reminders.userId, userId) // Security: Only owner can update
      ),
    });
    
    if (!reminder) {
      return { success: false, error: 'Reminder not found' };
    }
    
    // Update status
    const updated = await db.update(reminders)
      .set({
        status: data.status,
        completedAt: data.status === 'COMPLETED' ? now : undefined,
        dismissedAt: data.status === 'DISMISSED' ? now : undefined,
        updatedAt: now,
      })
      .where(and(
        eq(reminders.id, data.id),
        eq(reminders.userId, userId)
      ))
      .returning();
    
    // If completed and recurring, create next occurrence
    if (data.status === 'COMPLETED' && reminder.isRecurring) {
      await createNextRecurrence(userId, reminder);
    }
    
    revalidatePath('/dashboard');
    return { success: true, reminder: updated[0] };
  }
);

// ========================================
// CREATE NEXT RECURRENCE (THE CRITICAL FUNCTION)
// ========================================
async function createNextRecurrence(userId: string, completedReminder: any) {
  // Calculate next target date
  const currentDate = new Date(completedReminder.targetDate);
  let nextDate = new Date(currentDate);
  
  const interval = completedReminder.recurrenceInterval;
  const unit = completedReminder.recurrenceUnit;
  
  switch (unit) {
    case 'DAYS':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
      
    case 'WEEKS':
      nextDate.setDate(nextDate.getDate() + (interval * 7));
      break;
      
    case 'MONTHS':
      // Smart month addition (handles edge cases)
      const currentDay = currentDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + interval);
      
      // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
      const daysInNextMonth = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        0
      ).getDate();
      
      if (currentDay > daysInNextMonth) {
        nextDate.setDate(daysInNextMonth); // Set to last day of month
      } else {
        nextDate.setDate(currentDay); // Keep same day
      }
      break;
      
    case 'YEARS':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      // Handle leap year edge case (Feb 29 -> Feb 28)
      if (currentDate.getMonth() === 1 && currentDate.getDate() === 29) {
        const isLeapYear = (year: number) =>
          (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (!isLeapYear(nextDate.getFullYear())) {
          nextDate.setDate(28);
        }
      }
      break;
  }
  
  // Calculate next notification date
  const nextNotificationDate = new Date(nextDate);
  if (completedReminder.notificationOffsetDays) {
    nextNotificationDate.setDate(
      nextNotificationDate.getDate() - completedReminder.notificationOffsetDays
    );
  }
  
  // Determine parent ID (if this is parent, use its ID; otherwise inherit)
  const parentId = completedReminder.parentReminderId || completedReminder.id;
  
  // Create next occurrence
  const newReminder = await db.insert(reminders).values({
    userId,
    title: completedReminder.title,
    description: completedReminder.description,
    reminderType: completedReminder.reminderType,
    status: 'PENDING',
    targetDate: nextDate,
    notificationDate: nextNotificationDate,
    notificationOffsetDays: completedReminder.notificationOffsetDays,
    isRecurring: true,
    recurrenceInterval: completedReminder.recurrenceInterval,
    recurrenceUnit: completedReminder.recurrenceUnit,
    parentReminderId: parentId,
    relatedEntityType: completedReminder.relatedEntityType,
    relatedEntityId: completedReminder.relatedEntityId,
    notificationChannels: completedReminder.notificationChannels,
    notificationSent: false,
  }).returning();
  
  // Link completed reminder to next one (linked list)
  await db.update(reminders)
    .set({ nextReminderId: newReminder[0].id })
    .where(eq(reminders.id, completedReminder.id));
  
  console.log(
    `🔄 Created next recurrence: Reminder #${newReminder[0].id} scheduled for ${nextDate.toLocaleDateString('fr-FR')}`
  );
  
  return newReminder[0];
}

// ========================================
// GET ALL REMINDERS (with filters)
// ========================================
export const getReminders = secureAction(
  async (userId: string, user: any, filters?: { status?: ReminderStatus; type?: ReminderType }) => {
    const conditions = [eq(reminders.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(reminders.status, filters.status));
    }
    
    if (filters?.type) {
      conditions.push(eq(reminders.reminderType, filters.type));
    }
    
    const results = await db.query.reminders.findMany({
      where: and(...conditions),
      orderBy: [asc(reminders.targetDate)],
    });
    
    return results;
  }
);

// ========================================
// DELETE REMINDER
// ========================================
export const deleteReminder = secureAction(
  async (userId: string, user: any, reminderId: number) => {
    const deleted = await db.delete(reminders)
      .where(and(
        eq(reminders.id, reminderId),
        eq(reminders.userId, userId) // Security: Only owner can delete
      ))
      .returning();
    
    revalidatePath('/dashboard');
    return { success: true, deleted: deleted[0] };
  }
);
