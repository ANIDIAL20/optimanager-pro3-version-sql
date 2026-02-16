# Rollback Guide - Smart TVA Migration

This guide details the emergency procedure for reverting the database schema if critical issues are detected after the TVA migration.

## ⚠️ CRITICAL WARNING

**Executing this rollback will permanently delete:**

- All new pricing data (`salePriceHT`, `salePriceTVA`, `salePriceTTC`)
- All TVA configuration (`hasTva`, `priceType`, `exemptionNote`)
- Any price updates made since migration

**Ensure you have a backup before proceeding.** (See `BACKUP_GUIDE.md`)

## Rollback Procedure

### 1. Locate the Rollback Script

The SQL script is located at:
`src/db/migrations/rollback_0005_tva_system.sql`

### 2. Execute via PSQL/Terminal

You can run the script directly using `psql` or your preferred database client.

#### Using PSQL (Command Line)

```bash
# Export your connection string
export DATABASE_URL="your_connection_string_here"

# Execute the rollback script
psql $DATABASE_URL -f src/db/migrations/rollback_0005_tva_system.sql
```

#### Using Drizzle / Custom Runner (If configured)

If you have a custom migration runner, ensure it targets this specific file manually. Since this is a manual rollback script, it is not part of the standard `drizzle-kit` migration history.

### 3. Verify Rollback

After execution, verify that the columns have been removed:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'products'
  AND (column_name LIKE '%tva%' OR column_name LIKE 'sale_price%');
```

**Expected Result:** 0 rows returned.

### 4. Application Clean-up

after rolling back the database state:

1.  Revert code changes in `schema.ts`.
2.  Comment out or revert recently added fields in `products-actions.ts` and UI forms.
3.  Restart the application server (`npm run dev`).

---

**Status:** Rollback Complete. The database structure matches the pre-tva-migration state.
