-- Migration: 0008_add_document_config
-- Adds the document_config JSONB column to shop_profiles if it doesn't already exist.
-- This column powers the Canva-like document template customization system.
-- The document_settings column (legacy) is kept untouched.

ALTER TABLE shop_profiles
  ADD COLUMN IF NOT EXISTS document_config JSONB DEFAULT '{}';
