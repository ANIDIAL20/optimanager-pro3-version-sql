// ========================================
// EXAMPLE: Integration with Check Creation
// ========================================

/**
 * This shows how the reminder system auto-triggers when a shop owner
 * creates a supplier check in their dashboard.
 * 
 * Location: Anywhere you create checks (e.g., src/app/actions/checks-actions.ts)
 */

import { createCheckReminder } from '@/app/actions/reminder-actions';
import { getCurrentUser } from '@/lib/auth';

// Example function (you would already have something similar)
export async function createSupplierCheck(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  const userId = user.uid; // Shop owner ID
  
  // 1. Extract check data from form
  const checkData = {
    checkNumber: formData.get('checkNumber') as string,
    supplierName: formData.get('supplierName') as string,
    amount: parseFloat(formData.get('amount') as string),
    dueDate: new Date(formData.get('dueDate') as string),
  };
  
  // 2. Save check to database (your existing logic)
  const newCheck = await db.insert(checks).values({
    userId,
    checkNumber: checkData.checkNumber,
    supplierName: checkData.supplierName,
    amount: checkData.amount,
    dueDate: checkData.dueDate,
    status: 'PENDING',
  }).returning();
  
  // 3. 🔔 AUTO-TRIGGER: Create reminder for this check
  await createCheckReminder(userId, {
    checkId: newCheck[0].id,
    checkNumber: checkData.checkNumber,
    supplierName: checkData.supplierName,
    dueDate: checkData.dueDate,
    amount: checkData.amount,
  });
  
  return { success: true, check: newCheck[0] };
}

// ========================================
// RESULT IN DATABASE
// ========================================

/*
When shop owner creates Check #42 due on Feb 20, 2026:

Table: checks
┌────┬─────────┬───────────────┬────────────┬────────┬────────────┐
│ id │ user_id │ check_number  │ supplier   │ amount │  due_date  │
├────┼─────────┼───────────────┼────────────┼────────┼────────────┤
│ 42 │ user123 │ CHK-001       │ Supplier A │ 5000   │ 2026-02-20 │
└────┴─────────┴───────────────┴────────────┴────────┴────────────┘

Table: reminders (AUTO-CREATED)
┌────┬─────────┬────────────────────────────┬──────────────┬────────────┬───────────────────┬──────────────────┐
│ id │ user_id │ title                      │ target_date  │ notif_date │ related_type      │ related_id       │
├────┼─────────┼────────────────────────────┼──────────────┼────────────┼───────────────────┼──────────────────┤
│ 1  │ user123 │ Chèque #CHK-001 à Supp. A  │ 2026-02-20   │ 2026-02-18 │ CHECK             │ 42               │
└────┴─────────┴────────────────────────────┴──────────────┴────────────┴───────────────────┴──────────────────┘
                                                                ↑
                                                         2 days before!
*/

// ========================================
// CRON JOB BEHAVIOR
// ========================================

/*
Daily at 00:01 AM (Vercel Cron):

DATE: February 18, 2026 00:01 AM
┌────────────────────────────────────────────────────────────┐
│ CRON JOB EXECUTION                                         │
├────────────────────────────────────────────────────────────┤
│ 1. Query: Find reminders where notification_date <= NOW   │
│    ✓ Found: Reminder #1 (Check #CHK-001)                  │
│                                                            │
│ 2. Send Notification to user123:                          │
│    📱 IN_APP: "Chèque #CHK-001 à Supplier A"              │
│    📧 EMAIL: (if configured)                               │
│                                                            │
│ 3. Update: notification_sent = TRUE                       │
│                                                            │
│ 4. Shop Owner sees notification in dashboard!             │
└────────────────────────────────────────────────────────────┘
*/

// ========================================
// RECURRING REMINDER EXAMPLE
// ========================================

/*
Shop owner creates "Pay Rent" monthly recurring:

INITIAL CREATION:
{
  title: "Loyer Mensuel",
  reminderType: "RECURRING",
  targetDate: "2026-03-01",
  isRecurring: true,
  recurrenceInterval: 1,
  recurrenceUnit: "MONTHS"
}

WHAT HAPPENS:

March 1 → Shop owner clicks "Mark as Complete"
  ↓
  System calls updateReminderStatus()
  ↓
  Detects isRecurring = true
  ↓
  Automatically calls createNextRecurrence()
  ↓
  Calculates: March 1 + 1 MONTH = April 1
  ↓
  Creates NEW reminder for April 1
  ↓
  Links: March reminder.next_id = April reminder.id

Result:
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Reminder #1 (March)     │────▶│ Reminder #2 (April)     │────▶│ Reminder #3 (May)       │
│ Status: COMPLETED       │     │ Status: PENDING         │     │ (created after April    │
│ Target: 2026-03-01      │     │ Target: 2026-04-01      │     │  is completed)          │
│ next_id: 2              │     │ parent_id: 1            │     │ parent_id: 1            │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
       LINKED LIST PATTERN
*/

// ========================================
// DATA ISOLATION (Multi-Store Security)
// ========================================

/*
Database State:
┌────┬──────────┬──────────────────────┬─────────┬─────────────┐
│ id │ user_id  │ title                │ status  │ target_date │
├────┼──────────┼──────────────────────┼─────────┼─────────────┤
│ 1  │ store_A  │ Check #42 due        │ PENDING │ 2026-02-20  │
│ 2  │ store_A  │ Monthly Rent         │ PENDING │ 2026-03-01  │
│ 3  │ store_B  │ Tax Payment          │ PENDING │ 2026-02-25  │
│ 4  │ store_C  │ Supplier Contract    │ PENDING │ 2026-03-15  │
└────┴──────────┴──────────────────────┴─────────┴─────────────┘

When store_A owner logs in and calls getUpcomingReminders():

SELECT * FROM reminders
WHERE user_id = 'store_A'  ← CRITICAL: Data isolation
  AND status = 'PENDING'
ORDER BY target_date ASC;

Result: Only sees reminders #1 and #2
        NEVER sees store_B or store_C reminders!
*/
