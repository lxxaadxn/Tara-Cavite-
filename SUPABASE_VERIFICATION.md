# Supabase Setup Verification Checklist

## ✅ Pre-Flight Checklist

Run through this checklist to ensure everything is set up correctly before running your app.

### 1. Database Tables Verification

**Go to:** Table Editor → Check if these 8 tables exist:

- [ ] `user_profiles`
- [ ] `saved_lists`
- [ ] `places`
- [ ] `saved_list_items`
- [ ] `route_history`
- [ ] `recent_searches`
- [ ] `notifications`
- [ ] `user_preferences`

**If missing:** Re-run `supabase/schema.sql` in SQL Editor

---

### 2. Row Level Security (RLS) Verification

**Go to:** Table Editor → Click on each table → Check "RLS enabled" badge

All tables should show:
- ✅ Green shield icon
- ✅ "RLS enabled" text

**If RLS is disabled:** The schema should have enabled it, but if not:
```sql
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
```

---

### 3. Storage Bucket Verification

**Go to:** Storage → Check if bucket exists:

- [ ] `avatars` bucket exists
- [ ] `avatars` is set to **Public**

**If missing:** 
1. Click "New bucket"
2. Name: `avatars`
3. Toggle "Public bucket" ON
4. Click "Create bucket"

---

### 4. Test Queries (Run in SQL Editor)

#### Test 1: Check Tables Structure
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles', 'saved_lists', 'places', 
  'saved_list_items', 'route_history', 
  'recent_searches', 'notifications', 'user_preferences'
)
ORDER BY table_name;
```
**Expected:** Should return 8 rows

#### Test 2: Check RLS Policies
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected:** Should return multiple policy rows (at least 15+ policies)

#### Test 3: Check Indexes
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename;
```
**Expected:** Should return 8+ index rows

#### Test 4: Check Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_updated_at_column', 
  'update_saved_list_place_count'
);
```
**Expected:** Should return 2 rows

#### Test 5: Check Triggers
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```
**Expected:** Should return 5+ trigger rows

---

### 5. Authentication Setup Check

**Go to:** Authentication → Settings

Verify:
- [ ] Email authentication is enabled
- [ ] Confirm email is enabled (or disabled for testing)
- [ ] Site URL is set correctly

---

### 6. API Keys Check

**Go to:** Settings → API

Verify you have:
- [ ] Project URL (e.g., `https://xxxxx.supabase.co`)
- [ ] `anon` key (public key)
- [ ] `service_role` key (secret - keep safe!)

**Check your app's `lib/supabase.ts`:**
- [ ] URL matches your Project URL
- [ ] Anon key matches your `anon` key

---

### 7. Quick CRUD Test (After Sign Up)

After you sign up a test user in your app, run this in SQL Editor:

```sql
-- Check if user profile was created (replace with your user ID)
SELECT * FROM public.user_profiles 
WHERE id IN (SELECT id FROM auth.users LIMIT 1);

-- Try creating a test list (replace user_id with actual UUID)
INSERT INTO public.saved_lists (user_id, name, description, type)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Test List',
  'Testing CRUD operations',
  'private'
)
RETURNING *;

-- Check if list was created
SELECT * FROM public.saved_lists 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

---

## 🚨 Common Issues & Fixes

### Issue: "relation does not exist"
**Fix:** Re-run the entire `schema.sql` file

### Issue: "permission denied"
**Fix:** Check RLS policies are created correctly

### Issue: "function does not exist"
**Fix:** The schema should create functions automatically. Re-run schema.sql

### Issue: Storage upload fails
**Fix:** 
1. Verify `avatars` bucket exists and is public
2. Check Storage → Policies → Ensure public read access

### Issue: Can't insert into tables
**Fix:** 
1. Check RLS policies exist
2. Verify you're authenticated (check `auth.users` table)
3. Ensure user_id matches `auth.uid()`

---

## ✅ Final Checklist Before Running App

- [ ] All 8 tables exist
- [ ] RLS is enabled on all tables
- [ ] Storage bucket `avatars` exists and is public
- [ ] API keys are correct in `lib/supabase.ts`
- [ ] Test queries run successfully
- [ ] Authentication is configured

---

## 🎯 Ready to Run!

If all checks pass, your app should work correctly with Supabase!

**Next Steps:**
1. Run your app: `npm start` or `expo start`
2. Sign up a test user
3. Try creating a saved list
4. Check Supabase Dashboard → Table Editor to see data appear

---

## 📊 Monitoring

After running your app, monitor:
- **Table Editor:** See data being created
- **Logs:** Check for any errors (Settings → Logs)
- **API:** Monitor API usage (Dashboard → API)
