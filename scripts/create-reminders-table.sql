-- ========================================
-- UNIVERSAL REMINDER SYSTEM - TABLE CREATION
-- Execute this on Neon SQL Editor
-- ========================================

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL, -- 'ONE_TIME', 'RECURRING', 'MANUAL'
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'DISMISSED', 'EXPIRED'
  
  -- Timing Configuration
  target_date TIMESTAMP NOT NULL,
  notification_date TIMESTAMP NOT NULL,
  notification_offset_days INTEGER,
  
  -- Recurrence Configuration
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_interval INTEGER,
  recurrence_unit TEXT, -- 'DAYS', 'WEEKS', 'MONTHS', 'YEARS'
  parent_reminder_id INTEGER,
  next_reminder_id INTEGER,
  
  -- Polymorphic Relationship
  related_entity_type TEXT, -- 'SUPPLIER', 'CHECK', 'CONTRACT', etc.
  related_entity_id TEXT,
  
  -- Notification Tracking
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMP,
  notification_channels JSON,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  dismissed_at TIMESTAMP
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_status 
  ON reminders(user_id, status, target_date);

CREATE INDEX IF NOT EXISTS idx_reminders_notification 
  ON reminders(notification_date, status, notification_sent);

CREATE INDEX IF NOT EXISTS idx_reminders_entity 
  ON reminders(related_entity_type, related_entity_id);

CREATE INDEX IF NOT EXISTS idx_reminders_parent 
  ON reminders(parent_reminder_id);

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'reminders' 
ORDER BY ordinal_position;
