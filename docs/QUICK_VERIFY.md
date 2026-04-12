# ⚡ Quick Supabase Verification (5 minutes)

## Method 1: Visual Check in Supabase Dashboard

### Step 1: Check Tables (30 seconds)
1. Go to **Supabase Dashboard** → **Table Editor**
2. Verify you see these 8 tables:
   - ✅ `user_profiles`
   - ✅ `saved_lists`
   - ✅ `places`
   - ✅ `saved_list_items`
   - ✅ `route_history`
   - ✅ `recent_searches`
   - ✅ `notifications`
   - ✅ `user_preferences`

**If missing:** Re-run `supabase/schema.sql`

---

### Step 2: Check Storage (30 seconds)
1. Go to **Storage**
2. Verify `avatars` bucket exists
3. Verify it's set to **Public**

**If missing:** Create it (Storage → New bucket → Name: `avatars` → Public → Create)

---

### Step 3: Run Test Query (1 minute)
1. Go to **SQL Editor** → **New Query**
2. Paste and run this:

```sql
-- Quick verification query
SELECT 
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles', 'saved_lists', 'places', 
  'saved_list_items', 'route_history', 
  'recent_searches', 'notifications', 'user_preferences'
)

UNION ALL

SELECT 
  'RLS Policies' as check_type,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Functions' as check_type,
  COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_updated_at_column', 
  'update_saved_list_place_count'
)

UNION ALL

SELECT 
  'Triggers' as check_type,
  COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

**Expected Results:**
- Tables: `8`
- RLS Policies: `15+`
- Functions: `2`
- Triggers: `5+`

---

### Step 4: Verify API Keys (30 seconds)
1. Go to **Settings** → **API**
2. Compare with your `lib/supabase.ts`:
   - ✅ Project URL matches
   - ✅ Anon key matches

---

## Method 2: Automated Check (Optional)

If you have Node.js installed:

```bash
node scripts/verify-supabase.js
```

This will automatically check:
- ✅ Tables exist
- ✅ Storage bucket exists
- ✅ Authentication works

---

## ✅ Ready Checklist

Before running your app, ensure:

- [ ] All 8 tables exist in Table Editor
- [ ] `avatars` storage bucket exists and is public
- [ ] Test query returns expected counts
- [ ] API keys match in `lib/supabase.ts`

---

## 🚀 If Everything Checks Out

You're ready to run your app!

```bash
npm start
# or
expo start
```

Then:
1. Sign up a test user
2. Try creating a saved list
3. Check Supabase Dashboard → Table Editor to see data appear

---

## 🆘 If Something Fails

1. **Tables missing:** Re-run `supabase/schema.sql` in SQL Editor
2. **Storage missing:** Create `avatars` bucket manually
3. **RLS errors:** Check policies in Table Editor → Click table → Policies tab
4. **API errors:** Verify keys in Settings → API match `lib/supabase.ts`

See `SUPABASE_VERIFICATION.md` for detailed troubleshooting.
