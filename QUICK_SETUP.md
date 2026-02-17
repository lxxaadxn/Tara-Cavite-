# Quick Supabase Setup - Copy & Paste Guide

## ⚡ Quick Steps (2 minutes)

### Step 1: Copy the SQL
1. Open `supabase/schema.sql` in your editor
2. Select ALL (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)

### Step 2: Run in Supabase
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**
5. Paste the SQL (Ctrl+V / Cmd+V)
6. Click **"Run"** button (or press Ctrl+Enter)

### Step 3: Create Storage Bucket
1. Click **"Storage"** in left sidebar
2. Click **"New bucket"**
3. Name: `avatars`
4. Toggle **"Public bucket"** ON
5. Click **"Create bucket"**

## ✅ Done!

Your database is now ready for CRUD operations.

## Verify It Worked

Go to **"Table Editor"** - you should see 8 tables:
- ✅ user_profiles
- ✅ saved_lists
- ✅ places
- ✅ saved_list_items
- ✅ route_history
- ✅ recent_searches
- ✅ notifications
- ✅ user_preferences

---

**Note:** The SQL uses `IF NOT EXISTS` so it's safe to run multiple times.
