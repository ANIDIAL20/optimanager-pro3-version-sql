# Backup Guide - Smart TVA Migration

This guide details the procedure for creating database backups before and after minimal or major system updates, specifically tailored for the Smart TVA migration.

## Prerequisites

Ensure you have PostgreSQL tools installed (`pg_dump`, `pg_restore`, `psql`).
If you are using Neon (Serverless Postgres), fetching your full connection string from the Neon Dashboard or your `.env.local` file is recommended.

**Connection String Format:**
`postgres://[user]:[password]@[host]/[dbname]?sslmode=require`

---

## 1. Before Migration (Pre-Migration Backup)

It is critical to capture the state of the database **before** running any migration scripts.

### Option A: Using Git Bash / Terminal (Linux/Mac)

```bash
# Export your connection string (replace with actual value)
export DATABASE_URL="your_connection_string_here"

# Create backup with timestamp
pg_dump $DATABASE_URL > backup_pre_tva_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file size
ls -lh backup_pre_tva_*.sql
```

### Option B: Using Windows PowerShell

```powershell
# Set connection string
$env:DATABASE_URL="your_connection_string_here"

# Get timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create backup
pg_dump $env:DATABASE_URL > "backup_pre_tva_$timestamp.sql"

# Verify
ls backup_pre_tva_*.sql
```

### Storage Recommendation

- **Store Safely:** Move the `.sql` file to a secure location (e.g., dedicated `backups/` folder, Cloud Storage).
- **Retention:** Keep this backup for at least 30 days.

---

## 2. After Migration (Post-Migration Backup)

Once the TVA migration scripts (`npm run db:push` and data migration) are successfully executed and verified, create a new snapshot.

### Bash / Terminal

```bash
pg_dump $DATABASE_URL > backup_post_tva_$(date +%Y%m%d_%H%M%S).sql
```

### PowerShell

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump $env:DATABASE_URL > "backup_post_tva_$timestamp.sql"
```

---

## 3. Restore Procedure (Emergency Only)

If a critical issue arises and the system state is corrupted, follow these steps to restore.

**⚠️ WARNING: This will overwrite the current database state.**

### Step 1: Stop the Application

Stop any running instances of the application (e.g., `Ctrl+C` in your terminal running `npm run dev`).

### Step 2: Drop & Re-create Schema (Optional but recommended for clean restore)

If using `psql`, you can drop the public schema and recreate it, or just drop all tables.
_Note: `pg_restore` with `--clean` option can also handle this if format is custom/directory, but for plain SQL dumps:_

Using `psql`:

```bash
# This connects to the DB and executes the SQL file
psql $DATABASE_URL < backup_pre_tva_YYYYMMDD_HHMMSS.sql
```

### Step 3: Verifying Data

Check a few key tables to ensure data is back to the pre-migration state.

```bash
# Example: Check product prices
psql $DATABASE_URL -c "SELECT COUNT(*), SUM(prix_vente) FROM products;"
```

### Step 4: Restart Application

```bash
npm run dev
```

---

## Troubleshooting

- **Permissions Error:** Ensure your database user has sufficient privileges.
- **Connection Timeout:** Neon is serverless; if the database is sleeping, the first connection might take a few seconds. Retry the command.
- **Version Mismatch:** Ensure your local `pg_dump` version is compatible with the server version (usually Postgres 14/15/16).
