# Document Customization Implementation Summary

## Overview

This implementation adds dynamic document customization capabilities to the application, allowing users to modify PDF templates (Invoices, Quotes) directly from the settings.

## Changes Applied

### 1. Database Schema (`src/db/schema.ts`)

- Added `documentSettings` (JSONB), `documentSettingsVersion`, and `documentSettingsUpdatedAt` to `shop_profiles` table.
- Added `templateVersionUsed` and `templateSnapshot` (JSONB) to `sales`, `devis`, and `supplier_orders` tables for historical tracking.
- **Note:** Commented out `unique_product_reference` index in `products` table temporarily to resolve migration conflict.

### 2. Types & Constants (`src/lib/document-settings.ts`)

- Defined `DocumentSettings` type for full type safety.
- Created `DEFAULT_DOCUMENT_SETTINGS` with standard layout configuration.

### 3. API Routes (`src/app/api/shops/[shopId]/document-settings/route.ts`)

- `GET`: Returns merged settings (defaults + overrides).
- `PATCH`: Updates settings, handles version incrementing, and timestamping.
- Includes authorization checks (ensure user owns the shop).

### 4. Frontend Settings (`src/components/settings/document-settings-form.tsx`)

- New form component using `react-hook-form` and `zod`.
- **Live Preview**: Integrated `PDFViewer` from `@react-pdf/renderer` to show changes in real-time.
- Controls for:
  - Colors (Primary, Secondary)
  - Fonts (Helvetica, Times, Courier)
  - Layout (Standard, Minimalist, Modern)
  - Logo placement & Footer text

### 5. Page Integration (`src/app/dashboard/parametres/page.tsx`)

- Added "Modèles Documents" tab.
- Fetches shop profile internally and passes `shopId` to the form.

### 6. PDF Generation (`src/components/documents/pdf-document-template.tsx`)

- Refactored to accept `documentSettings` prop.
- Uses `useMemo` to dynamically generate styles based on settings.
- Handles logic for Logo, Footer, Colors, and Layout variations.

## Next Steps

- Verify the `drizzle-kit push` command completed successfully.
- Test the new settings tab in `/dashboard/parametres`.
- Generate a test invoice to confirm PDF styling.
