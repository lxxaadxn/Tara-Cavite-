# 🔧 Fix Storage Upload Error

## Problem
You created the `avatars` bucket but it shows **"0 POLICIES"**. Supabase Storage requires policies to allow uploads, even for public buckets.

## ✅ Quick Fix (2 minutes)

### Step 1: Run Storage Policies SQL
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy the **entire contents** of `supabase/storage-policies.sql`
4. Paste into SQL Editor
5. Click **"Run"**

### Step 2: Verify Policies
1. Go to **Storage** → **Buckets** → Click on **"avatars"**
2. Click the **"Policies"** tab
3. You should now see **4 policies**:
   - ✅ Users can upload their own avatars
   - ✅ Users can update their own avatars
   - ✅ Users can delete their own avatars
   - ✅ Public can view avatars

### Step 3: Test Upload
1. Go back to your app
2. Try uploading an avatar again
3. It should work now! ✅

## What These Policies Do

- **Upload Policy**: Allows authenticated users to upload files to their own folder (`{user_id}/filename.jpg`)
- **Update Policy**: Allows users to replace their own avatars
- **Delete Policy**: Allows users to delete their own avatars
- **Public Read Policy**: Allows anyone to view avatars (since bucket is public)

## Alternative: Manual Policy Setup

If SQL doesn't work, you can create policies manually:

1. Go to **Storage** → **Buckets** → **avatars** → **Policies** tab
2. Click **"New Policy"**
3. For each policy:
   - **Policy Name**: "Users can upload their own avatars"
   - **Allowed Operations**: INSERT
   - **Target Roles**: authenticated
   - **Policy Definition**: 
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
4. Repeat for UPDATE, DELETE, and SELECT (public) operations

## Still Having Issues?

Check:
- ✅ Bucket name is exactly `avatars` (lowercase, no spaces)
- ✅ Bucket is set to **Public**
- ✅ Policies are created (should show 4 policies)
- ✅ You're logged in when trying to upload
- ✅ Check Supabase Dashboard → Logs for error details
