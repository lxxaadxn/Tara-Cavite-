# Supabase Database Setup Guide

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (or create a new one)

### 2. Run the SQL Schema
1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New Query"** button
3. Copy the **entire contents** of `supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)

### 3. Verify Tables Were Created
1. Go to **"Table Editor"** in the left sidebar
2. You should see these tables:
   - `user_profiles`
   - `saved_lists`
   - `places`
   - `saved_list_items`
   - `route_history`
   - `recent_searches`
   - `notifications`
   - `user_preferences`

### 4. Set Up Storage Bucket for Avatars
1. Go to **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Name it: `avatars`
4. Set it to **Public** (toggle the public switch)
5. Click **"Create bucket"**

### 5. (Optional) Set Up Storage Bucket for Place Images
1. In **"Storage"**, click **"New bucket"** again
2. Name it: `place-images`
3. Set it to **Public**
4. Click **"Create bucket"**

### 6. Email confirmation (password signups)

1. Go to **Authentication** → **Providers** → **Email**
2. Enable **Confirm email** so new password accounts must verify before login
3. Under **URL Configuration**, allow redirects used by the apps:
   - Web: `http://localhost:5173/**` (and your production web origin)
   - Mobile: `cavitour://**`, `exp://**`
4. Signup creates a row in `user_profiles` automatically (trigger `on_auth_user_created`) for both email and Google users

### 7. Verify Row Level Security (RLS)
1. Go to **"Authentication"** → **"Policies"**
2. You should see RLS policies for all tables
3. All tables should have the green shield icon indicating RLS is enabled

## What Gets Created

### Tables Created:
- ✅ **user_profiles** - Extended user information (username, avatar, address)
- ✅ **saved_lists** - User's saved lists (name, description, type)
- ✅ **places** - Tourist spots and locations
- ✅ **saved_list_items** - Links between lists and places
- ✅ **route_history** - User's travel history
- ✅ **recent_searches** - User's search history
- ✅ **notifications** - User notifications
- ✅ **user_preferences** - User preferences (travel modes, etc.)

### Security Features:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Users can only access their own data
- ✅ Public read access for places
- ✅ Proper foreign key constraints

### Performance Features:
- ✅ Indexes on frequently queried columns
- ✅ Auto-update triggers for timestamps
- ✅ Auto-update trigger for place_count

## Troubleshooting

### If you get errors:

1. **"extension uuid-ossp does not exist"**
   - This is normal, Supabase has it enabled by default
   - The `CREATE EXTENSION IF NOT EXISTS` will skip it if it exists

2. **"relation already exists"**
   - Tables might already exist
   - The `CREATE TABLE IF NOT EXISTS` should handle this
   - If issues persist, drop existing tables first

3. **"policy already exists"**
   - Policies might already exist
   - Drop existing policies first, then re-run the schema

### To Drop Everything and Start Fresh:
```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS public.saved_list_items CASCADE;
DROP TABLE IF EXISTS public.saved_lists CASCADE;
DROP TABLE IF EXISTS public.places CASCADE;
DROP TABLE IF EXISTS public.route_history CASCADE;
DROP TABLE IF EXISTS public.recent_searches CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
```

Then re-run the schema.sql file.

## Testing CRUD Operations

After setup, you can test CRUD operations:

### Create a User Profile (after user signs up):
```sql
INSERT INTO public.user_profiles (id, username, city, street)
VALUES (auth.uid(), 'testuser', 'Dasmarñas', 'Washington Place');
```

### Create a Saved List:
```sql
INSERT INTO public.saved_lists (user_id, name, description, type)
VALUES (auth.uid(), 'My Favorites', 'My favorite places', 'private');
```

### Read User's Lists:
```sql
SELECT * FROM public.saved_lists WHERE user_id = auth.uid();
```

## Next Steps

1. ✅ Database schema is ready
2. ✅ Storage buckets are set up
3. 🔄 Update your React Native components to use Supabase queries
4. 🔄 Test CRUD operations in your app

## Support

If you encounter any issues, check:
- Supabase Dashboard → Logs
- SQL Editor → Query History
- Table Editor → Verify table structure
