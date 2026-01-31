# 🚀 Quick Start - Auth.js Setup

## ⚡ 3 Steps to Get Running

### Step 1: Generate AUTH_SECRET

Choose ONE method:

**PowerShell (Windows):**

```powershell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**OpenSSL (if available):**

```bash
openssl rand -base64 32
```

Copy the output!

---

### Step 2: Update .env.local

Add these lines to `.env.local`:

```env
# Paste the secret from Step 1
AUTH_SECRET=<paste-here>

# Required for production
AUTH_TRUST_HOST=true
```

Save the file!

---

### Step 3: Create Your First Admin User

Edit `scripts/create-admin-user.ts` (lines 15-19):

```typescript
const adminData = {
  name: "Your Name",
  email: "your.email@example.com",
  password: "YourSecurePassword123!", // ⚠️ CHANGE THIS
  role: "admin" as const,
};
```

Then run:

```bash
tsx scripts/create-admin-user.ts
```

---

## ✅ Test It!

```bash
# Start dev server
npm run dev
```

1. Go to http://localhost:3000/login
2. Enter your email and password
3. Click "Se connecter"
4. You should redirect to /dashboard

---

## 🎉 That's It!

Your authentication is now powered by Auth.js with secure bcrypt password hashing!

---

## 🐛 Troubleshooting

**"Module not found" errors:**

- Run `npm install`

**Login fails:**

- Check console for errors
- Verify `AUTH_SECRET` is set
- Ensure user was created successfully

**TypeScript errors:**

- Run `npm run typecheck` to see details
- Most are legacy issues, won't affect runtime

**Database errors:**

- Verify `DATABASE_URL` is set correctly
- Re-run `npm run db:push`

---

## 📚 More Info

See [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed configuration options.
See [walkthrough.md](./.gemini/antigravity/brain/b9e31277-25b7-4b16-a804-00e38929e36b/walkthrough.md) for full migration details.
