# Fix Authentication Loop

## Problem
After Google OAuth, the session isn't being created/retrieved, causing a redirect loop.

## Root Cause
The NextAuth database tables (`accounts`, `sessions`, `users`, `verification_tokens`) haven't been created in your SQLite database yet.

## Solution

### Step 1: Update Prisma Schema (Already Done ✅)
The schema has been updated with `@default(cuid())` on User.id

### Step 2: Sync Database with Schema

Run this command to create the missing tables:

```bash
npx prisma db push
```

If that fails, try:

```bash
npx prisma migrate dev --name add-nextauth-tables
```

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 4: Verify Tables

You can verify the tables were created:

```bash
node scripts/setup-auth-db.js
```

Or manually check:

```bash
npx prisma studio
```

### Step 5: Clear Cache and Restart

```bash
rm -rf .next
npm run dev
```

### Step 6: Test Authentication

1. Go to `http://localhost:3000`
2. You should be redirected to `/auth/signin`
3. Click "Sign in with Google"
4. Complete OAuth flow
5. You should be redirected back to dashboard
6. Check terminal for debug logs showing session creation

## Expected Terminal Output (Success)

```
[next-auth][debug] session: ...
[next-auth][debug] session saved
GET /api/auth/callback/google 302
GET / 200
GET /api/habits 200
```

## Expected Terminal Output (Failure)

```
Error: P2002: Unique constraint failed on the constraint: `accounts_provider_providerAccountId_key`
```

If you see this error, it means the tables exist but there's a data conflict. Clear the sessions table:

```bash
npx prisma studio
# Delete all records from accounts and sessions tables
```

## Still Not Working?

Run the diagnostic script and share the output:

```bash
node scripts/setup-auth-db.js
```
