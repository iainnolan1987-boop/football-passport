# Football Passport — Local Setup Guide

Complete step-by-step guide. Follow in order. Nothing skipped.

---

## Prerequisites

Open Terminal (Mac/Linux) or Command Prompt (Windows) and run:

```bash
node --version   # needs v18 or higher
npm --version    # comes with Node
git --version    # for version control
```

If any fail:
- **Node.js**: nodejs.org → download LTS → install
- **Git**: git-scm.com → download → install

---

## Step 1 — Copy the project files

Copy the `football-passport/` folder you downloaded to wherever you keep projects, then:

```bash
cd football-passport
npm install
```

This installs all dependencies. Takes 1–2 minutes.

---

## Step 2 — Create your Supabase project

1. Go to **supabase.com** and sign up (free)
2. Click **New Project**
3. Fill in:
   - **Name**: `football-passport`
   - **Database Password**: create a strong one and save it somewhere safe
   - **Region**: pick nearest to you
4. Click **Create new project** — takes about 90 seconds to spin up

---

## Step 3 — Run the database schema

In your Supabase project:
1. Click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the entire SQL below and click **Run**

```sql
-- ─────────────────────────────────────────────────
-- FOOTBALL PASSPORT — DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────

-- Player profiles (owned by parent/guardian accounts)
CREATE TABLE players (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  age_group    TEXT NOT NULL DEFAULT 'U14',
  position     TEXT NOT NULL DEFAULT 'Striker',
  club         TEXT NOT NULL DEFAULT '',
  strong_foot  TEXT NOT NULL DEFAULT 'Right' CHECK (strong_foot IN ('Left','Right','Both')),
  bio          TEXT DEFAULT '',
  privacy      TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('public','private','link_only')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Video clips linked to players
CREATE TABLE clips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  uploaded_by      UUID NOT NULL REFERENCES auth.users(id),
  match_date       DATE NOT NULL,
  opponent         TEXT,
  clip_type        TEXT NOT NULL DEFAULT 'Goal'
                     CHECK (clip_type IN ('Goal','Assist','Save','Skill','Tackle','Team Move')),
  caption          TEXT,
  video_url        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  parent_consent   BOOLEAN NOT NULL DEFAULT FALSE,
  quality_score    INTEGER,
  quality_data     JSONB,
  dev_tags         TEXT[] DEFAULT '{}',
  primary_drill_id INTEGER,
  likes_count      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_user    ON players(user_id);
CREATE INDEX idx_clips_player    ON clips(player_id);
CREATE INDEX idx_clips_status    ON clips(status);
CREATE INDEX idx_clips_uploaded  ON clips(uploaded_by);

-- ─────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips   ENABLE ROW LEVEL SECURITY;

-- PLAYERS policies

-- Owners can read their own players
CREATE POLICY "players_select_own"
  ON players FOR SELECT
  USING (user_id = auth.uid());

-- Public players can be read by anyone logged in
CREATE POLICY "players_select_public"
  ON players FOR SELECT
  USING (privacy = 'public');

-- Only the owner can insert players
CREATE POLICY "players_insert_own"
  ON players FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only the owner can update players
CREATE POLICY "players_update_own"
  ON players FOR UPDATE
  USING (user_id = auth.uid());

-- Only the owner can delete players
CREATE POLICY "players_delete_own"
  ON players FOR DELETE
  USING (user_id = auth.uid());

-- CLIPS policies

-- Users can read clips they uploaded
CREATE POLICY "clips_select_own"
  ON clips FOR SELECT
  USING (uploaded_by = auth.uid());

-- Users can read clips for players they own
CREATE POLICY "clips_select_player_owner"
  ON clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = clips.player_id
        AND players.user_id = auth.uid()
    )
  );

-- Approved clips on public profiles are readable by all logged-in users
CREATE POLICY "clips_select_approved_public"
  ON clips FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM players
      WHERE players.id = clips.player_id
        AND players.privacy = 'public'
    )
  );

-- Only logged-in users can insert clips
CREATE POLICY "clips_insert_own"
  ON clips FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Only the uploader can update the clip (e.g. add tags)
CREATE POLICY "clips_update_own"
  ON clips FOR UPDATE
  USING (uploaded_by = auth.uid());

-- Only the uploader (or player owner) can delete
CREATE POLICY "clips_delete_own"
  ON clips FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = clips.player_id
        AND players.user_id = auth.uid()
    )
  );
```

You should see **Success. No rows returned** — that means it worked.

---

## Step 4 — Create the Storage bucket

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**
3. **Name**: `clips`
4. Toggle **Public bucket** → ON
5. Click **Create bucket**

Then set the storage policy so logged-in users can upload:

1. Click on the `clips` bucket
2. Click **Policies** tab
3. Click **Add policies** → **For full customization**
4. Paste each policy below one at a time:

### Storage Policy 1 — Authenticated users can upload

```sql
CREATE POLICY "Authenticated users can upload clips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clips');
```

### Storage Policy 2 — Users can read their own clips

```sql
CREATE POLICY "Users can read own clips"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'clips' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Storage Policy 3 — Public read for all clips (for the video player)

```sql
CREATE POLICY "Public read for clips bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clips');
```

### Storage Policy 4 — Users can delete their own files

```sql
CREATE POLICY "Users can delete own clips"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clips' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Step 5 — Configure Auth settings

1. In Supabase, click **Authentication** → **Settings** (or **Providers**)
2. Under **Email**, make sure it is enabled
3. For local testing: turn **Confirm email** OFF (saves you needing to click a link for every test account)
4. Set **Site URL** to `http://localhost:3000`
5. Under **Redirect URLs**, add `http://localhost:3000`

---

## Step 6 — Get your API keys

1. In Supabase, click **Project Settings** (gear icon, bottom left)
2. Click **API**
3. Note down:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public** key — a long `eyJ...` string

---

## Step 7 — Create your environment file

In the project root, create a file called `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyYOUR_ANON_KEY_HERE
```

Replace both values with your real keys from Step 6.

**Important**: No spaces around the `=` sign. No quotes around the values.

---

## Step 8 — Run the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

You should see a redirect to the login page.

---

## Step 9 — Create your first account

1. Click **Sign up**
2. Fill in name, email, password
3. If email confirmation is OFF (Step 5), you can sign in immediately
4. If email confirmation is ON, check your inbox and click the link

---

## Complete User Flow (once running)

```
1. Sign up / Log in
2. Dashboard → "Add Player" → fill in details → Create
3. Click player card to view their passport
4. Click "Upload Clip" button
5. Drop a video file
6. Fill in match date, clip type, optional caption
7. Tick consent checkbox
8. Click "Upload & Analyse Clip"
   → Video uploads to Supabase Storage
   → Smart checker runs (file size, duration, orientation, resolution)
   → Quality report appears with score out of 100
   → Clear fix messages for any issues found
9. Click "Add Development Tags"
   → Select skills shown in the clip
   → Click "Get My Drill Recommendation"
   → Drill recommendation appears with full instructions
10. Click "View Player Passport"
    → Clip appears in the timeline with score, tags, drill
    → Click the clip to expand full quality report + insights
    → Watch the clip (direct link to Supabase Storage)
```

---

## Troubleshooting

### Upload fails with "row level security" error

Your RLS policies aren't set correctly. Check:
- The clips table has RLS enabled
- The `clips_insert_own` policy exists
- You are logged in (not anonymous)

Quick fix — temporarily disable RLS for testing:
```sql
ALTER TABLE clips DISABLE ROW LEVEL SECURITY;
```
Re-enable once you confirm the upload works, then fix the policy.

### Upload fails with "Bucket not found"

The storage bucket name must be exactly `clips` (lowercase). Check:
1. Supabase → Storage → bucket name
2. Your code uses `supabase.storage.from('clips')`

### Upload fails with "new row violates check constraint"

One of the values you're inserting is failing a database constraint. Common causes:
- `clip_type` value not in the allowed list — must be exactly: `Goal`, `Assist`, `Save`, `Skill`, `Tackle`, `Team Move`
- `status` not in `pending`, `approved`, `rejected`
- `strong_foot` not in `Left`, `Right`, `Both`

### Video uploads but appears broken / won't play

The bucket must be set to **Public**. In Supabase → Storage → click your bucket → Settings → toggle Public ON.

Also check the `publicUrl` being generated. Add this to the upload function temporarily:
```typescript
console.log('Public URL:', publicUrl)
```
Paste it in your browser. If it opens, the URL is correct.

### Duration check says "Could not read video duration"

This happens with some obscure video formats. The clip still uploads fine — this check is non-blocking. Convert the video to MP4 (H.264) using HandBrake (free) for best compatibility.

### "Not authenticated" error on upload

Your session expired or cookies aren't being set. Try:
1. Sign out and sign back in
2. Make sure `.env.local` has the correct Supabase URL and anon key
3. Make sure `middleware.ts` is in `src/` not in the root

### Clip shows in timeline but video won't play

1. Check the `video_url` in your Supabase database (Table Editor → clips → video_url column)
2. Paste the URL directly in a browser tab — if it 404s, the upload path is wrong
3. Make sure the bucket is public (see above)

### npm install fails

```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules
npm install
```

If you get peer dependency errors, try:
```bash
npm install --legacy-peer-deps
```

### Port 3000 already in use

```bash
npm run dev -- -p 3001
# then open http://localhost:3001
```

### Environment variables not loading

- File must be named exactly `.env.local` (not `.env` or `.env.local.example`)
- Must be in the project root (same folder as `package.json`)
- Restart `npm run dev` after creating or changing the file
- Variable names must start with `NEXT_PUBLIC_` to be available in the browser

---

## Deploying to Vercel (when ready)

```bash
npm install -g vercel
vercel
```

Then in the Vercel dashboard → your project → Settings → Environment Variables:
- Add `NEXT_PUBLIC_SUPABASE_URL`
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

In Supabase → Auth → Settings:
- Add your Vercel URL to both **Site URL** and **Redirect URLs**

---

## Adding Real AI Video Analysis Later

The `src/lib/analyseClip.ts` file is designed so you can swap in real frame analysis without changing anything else.

The simulated scores come from this block:
```typescript
const clarity       = simScore(42, 98, 1)
const lighting      = simScore(38, 97, 2)
// etc.
```

To add real analysis:
1. On the server (API route), use `ffmpeg` to extract 5 frames from the video
2. Convert frames to base64
3. Send to Claude Vision API: `POST https://api.anthropic.com/v1/messages` with image content blocks
4. Ask Claude to score each dimension out of 100 and return JSON
5. Replace the `simScore` values with Claude's actual scores
6. Everything else (the checks, the report UI, the database save) stays exactly the same
