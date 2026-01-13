import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reminders } from '@/db/schema';
import { and, lte, eq } from 'drizzle-orm';

/**
 * CRON JOB: Daily Reminder Notifications
 * 
 * This endpoint runs every morning (00:01 AM) to:
 * 1. Find pending reminders that are due for notification
 * 2. Send notifications to the specific shop owner
 * 3. Auto-expire old reminders
 * 
 * Triggered by Vercel Cron or external cron service
 */
export async function GET(request: NextRequest) {
  // 🔒 Security: Check cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const now = new Date();
  const processedReminders: number[] = [];
  
  try {
    console.log('🔔 [CRON] Starting daily reminder check...');
    
    // ========================================
    // STEP 1: Find reminders ready to notify
    // ========================================
    const dueReminders = await db.query.reminders.findMany({
      where: and(
        lte(reminders.notificationDate, now),
        eq(reminders.status, 'PENDING'),
        eq(reminders.notificationSent, false)
      ),
      orderBy: (reminders, { asc }) => [asc(reminders.notificationDate)],
    });
    
    console.log(`📊 Found ${dueReminders.length} reminders to notify`);
    
    // ========================================
    // STEP 2: Send notifications
    // ========================================
    for (const reminder of dueReminders) {
      try {
        // Send notification to the specific shop owner (userId)
        await sendNotificationToUser(reminder);
        
        // Mark as sent
        await db.update(reminders)
          .set({
            notificationSent: true,
            notificationSentAt: now,
            updatedAt: now,
          })
          .where(eq(reminders.id, reminder.id));
        
        processedReminders.push(reminder.id);
        console.log(`✅ Notified: "${reminder.title}" for user ${reminder.userId}`);
        
      } catch (error) {
        console.error(`❌ Failed to notify reminder ${reminder.id}:`, error);
      }
    }
    
    // ========================================
    // STEP 3: Auto-expire old reminders
    // ========================================
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expired = await db.update(reminders)
      .set({ 
        status: 'EXPIRED',
        updatedAt: now,
      })
      .where(and(
        lte(reminders.targetDate, thirtyDaysAgo),
        eq(reminders.status, 'PENDING'),
        eq(reminders.isRecurring, false) // Only expire non-recurring
      ))
      .returning();
    
    console.log(`🗑️ Auto-expired ${expired.length} old reminders`);
    
    // ========================================
    // RETURN SUMMARY
    // ========================================
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      stats: {
        notificationsSent: processedReminders.length,
        remindersExpired: expired.length,
      },
      processedIds: processedReminders,
    });
    
  } catch (error) {
    console.error('💥 [CRON] Error in reminder job:', error);
    return NextResponse.json(
      { 
        error: 'Internal error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Send notification to a specific shop owner
 * Channels: IN_APP, EMAIL, SMS (based on reminder.notificationChannels)
 */
async function sendNotificationToUser(reminder: any) {
  const channels = reminder.notificationChannels || ['IN_APP'];
  
  // Prepare notification payload
  const payload = {
    userId: reminder.userId,
    title: reminder.title,
    message: reminder.description || `Échéance: ${new Date(reminder.targetDate).toLocaleDateString('fr-FR')}`,
    type: reminder.reminderType,
    targetDate: reminder.targetDate,
    relatedEntity: {
      type: reminder.relatedEntityType,
      id: reminder.relatedEntityId,
    },
  };
  
  // Send via each configured channel
  for (const channel of channels) {
    switch (channel) {
      case 'IN_APP':
        // TODO: Create in-app notification in 'notifications' table
        console.log(`📱 [IN_APP] ${payload.title} → User ${reminder.userId}`);
        break;
        
      case 'EMAIL':
        // TODO: Send email via Resend
        console.log(`📧 [EMAIL] ${payload.title} → User ${reminder.userId}`);
        break;
        
      case 'SMS':
        // TODO: Send SMS via Twilio
        console.log(`💬 [SMS] ${payload.title} → User ${reminder.userId}`);
        break;
    }
  }
  
  return true;
}
