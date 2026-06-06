# Who's In? — Setup & Deployment Guide

## What's been built

| Milestone | Status | Description |
|-----------|--------|-------------|
| M1 | ✅ Done | React + Vite + TypeScript scaffold, routing, PWA config |
| M2 | ✅ Done | Database schema, sign-up flow, Edge Functions, realtime list |
| M3+ | ⏳ Pending | Admin panel, cron jobs, stats/history, attendance, guests |

The app is deployed on Vercel at your project URL but **is not functional yet** — the Supabase steps below must be completed first.

---

## One-time Supabase setup (do this before the app will work)

### 1. Run the database migration

Go to [Supabase](https://supabase.com) → your project → **SQL Editor**.
Paste the full contents of `supabase/migrations/0001_schema.sql` and click **Run**.

This creates the following tables: `session_template`, `session`, `roster`, `signup`, `activity_log`.

Verify it worked:
```sql
SELECT * FROM session_template;
```
You should see one seed row with the default Friday 8–10pm settings.

### 2. Enable Realtime on the `signup` table

Supabase dashboard → **Database → Replication** → find `signup` in the table list → toggle it on.

This powers the live update when someone signs up while you're viewing the page.

### 3. Deploy the Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't have it, then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy signup
supabase functions deploy withdraw
```

Your `PROJECT_REF` is the subdomain in your Supabase URL — e.g. `abcdefghijklmn` from `https://abcdefghijklmn.supabase.co`.

The Edge Functions handle:
- **signup** — validates the session is open, checks for duplicates, enforces the 12-player cap, places overflow on the waitlist
- **withdraw** — removes a signup and automatically promotes the top waitlister

---

## Vercel environment variables

Go to Vercel → your project → **Settings → Environment Variables** and add:

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `ADMIN_PIN` | Choose any PIN — this will be your admin password |

After adding variables, go to **Deployments** and click **Redeploy** on the latest deployment.

---

## Create your first session

The app shows "No active session" until there's a row in the `session` table. Insert one manually in Supabase → **Table Editor → session**:

| Column | Value |
|--------|-------|
| `date` | e.g. `2026-06-13` |
| `start_time` | `20:00:00` |
| `end_time` | `22:00:00` |
| `location` | `BV` |
| `max_spots` | `12` |
| `waitlist_size` | leave null |
| `cutoff_at` | e.g. `2026-06-11T06:00:00+00:00` (Thursday 6am) |
| `status` | `open` |
| `public_slug` | e.g. `2026-06-13` |

Then visit your Vercel URL — you should see the sign-up page with an empty list.

---

## Add players to the roster

Roster is managed via the admin panel (not built yet — coming in a future milestone). For now, insert rows directly in Supabase → **Table Editor → roster**:

| Column | Value |
|--------|-------|
| `display_name` | Player's name |
| `active` | `true` |

Players will appear in the sign-up dropdown once added.

---

## Local development

```bash
npm install
# create .env.local with:
# VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
npm run dev
```

---

## What's next (future milestones)

- **Admin panel** — PIN login, roster management, manual session creation, mark attendance
- **Cron jobs** — auto-create sessions each week, auto-close at cutoff
- **Stats & history** — past session attendance, streaks
- **Guests** — allow players to bring +1s
- **Tentative** — sign up as "hopefully" rather than confirmed
