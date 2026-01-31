# Auth.js Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file:

```env
# ========================================
# AUTH.JS CONFIGURATION
# ========================================

# Generate with: openssl rand -base64 32
# Or in PowerShell: [System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
AUTH_SECRET=your-secret-here

# Set to true for production deployments (Vercel, etc.)
AUTH_TRUST_HOST=true

# ========================================
# EXISTING VARIABLES (Keep these)
# ========================================

# Database
DATABASE_URL=your-neon-db-url

# Other existing vars...
```

## Generate AUTH_SECRET

### Option 1: Using OpenSSL (Linux/Mac/Windows with WSL)

```bash
openssl rand -base64 32
```

### Option 2: Using PowerShell (Windows)

```powershell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Option 3: Using Node.js

```javascript
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## What to Remove

Delete these Clerk variables (if present):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`

## Important Notes

1. **Never commit** `.env.local` to Git
2. **Regenerate** `AUTH_SECRET` for each environment (dev, staging, prod)
3. **Keep it secret** - treat it like a password
4. The secret must be **at least 32 characters** long
