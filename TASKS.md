# Who's In? — Technical Task Tracker

**Stack:** React + Vite + TypeScript, Tailwind CSS + shadcn/ui, Supabase (Postgres + Realtime + Edge Functions), Vercel (hosting + Cron)
**Admin auth:** PIN via `ADMIN_PIN` Vercel env var, hashed and verified in Edge Function, returns short-lived JWT
**Cron host:** Vercel Cron calling Supabase Edge Functions
**Stats/past sessions:** publicly visible (no PIN required)

---

## Placeholders to resolve before or during build

- [x] **App name** — "Who's In?"
- [x] **ADMIN_PIN** — decided; set as `ADMIN_PIN` in Vercel environment variables (never committed to repo)
- [x] **Template defaults:**
  - weekday: Friday (5)
  - start_time: `20:00`
  - end_time: `22:00`
  - location: `BV` (short for Badminton Vancouver; matches existing WhatsApp style `@BV`)
  - max_spots: `12`
  - waitlist_size: `null` (unlimited)
  - cutoff_offset_hrs: `38` (Thursday 6am = 38 hours before Friday 8pm)
  - launch_lead_days: `3` (session created Tuesday for Friday)
  - auto_launch: `true`
- [ ] **Roster seed** — add names via the admin panel after first deploy (no seed script needed)

---

## Milestone 1 — Scaffold

- [x] `npm create vite` with React + TypeScript template
- [x] Install and configure Tailwind CSS v4
- [x] Install and configure shadcn/ui (components.json, CSS variables, utils)
- [x] Install `@supabase/supabase-js` and create `src/lib/supabase.ts` client
- [x] Wire env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`.env.local`, `.env.example`)
- [x] Set up routing (React Router v7): `/`, `/s/:slug`, `/admin`, `/stats`, `/history`
- [x] Add `vite-plugin-pwa` with basic manifest (name, icons, display: standalone)
- [x] Initialize git repo
- [ ] Push to GitHub and deploy to Vercel, add Supabase env vars in Vercel project settings
- [ ] Confirm live URL resolves and env vars are injected

---

## Milestone 2 — Data layer

- [ ] Create `session_template` table (see PRD §6 schema)
- [ ] Create `session` table with `public_slug` unique index
- [ ] Create `roster` table
- [ ] Create `signup` table with FK indexes on `session_id`, `roster_id`, `host_signup_id`
- [ ] Create `activity_log` table with FK index on `session_id`
- [ ] Write RLS policies:
  - `session`, `signup`, `roster`, `activity_log`: public SELECT
  - `signup` INSERT: allowed when session status is `open` or `removal_locked`
  - `signup` DELETE: allowed when session status is `open` (public) OR requester holds admin JWT (any status)
  - `session_template`, attendance writes, roster mutations, post-cutoff removal: admin JWT required
- [ ] Seed one `session_template` row with agreed defaults (leave as nulls until placeholders resolved)
- [ ] Test RLS: confirm public client can add/remove in `open`, cannot remove in `removal_locked`

---

## Milestone 3 — Core sign-up (live session screen)

- [ ] `SessionHeader` component: date, time, location, spots remaining, cutoff countdown (live clock)
- [ ] Fetch current session (most recent `open` or `removal_locked` by date)
- [ ] Ordered signup query: pinned positions first, then `created_at` ASC; split confirmed vs waitlist
- [ ] `SignupList` component: numbered list with confirmed (1..N) then Waitlist section
- [ ] Roster picker panel: alphabetical roster buttons, tap to join
- [ ] Add-newcomer text input (creates a signup with no `roster_id`)
- [ ] Leave/remove button scoped to entries matching `device_token` in localStorage
- [ ] Device token: generate UUID on first visit, store in `localStorage`, attach to INSERT as `device_token`
- [ ] "You" highlight on list items that match device token
- [ ] Supabase Realtime channel on `signup` table for this session → re-fetch or patch local state
- [ ] Supabase Realtime channel on `activity_log` table for this session

---

## Milestone 4 — Cap and waitlist

- [ ] Server-side cap check before confirming a signup (Edge Function or DB trigger): if `confirmed_count >= max_spots`, insert with implied waitlist position
- [ ] Auto-promotion: on DELETE of a confirmed signup, promote oldest waitlist `created_at` to confirmed
- [ ] Renumbering: purely display-side — render position as index within confirmed/waitlist arrays
- [ ] "X spots left" counter in header (derived from `max_spots - confirmed_count`)
- [ ] Acceptance test: adding the N+1th player routes to waitlist; removing a confirmed player promotes top waitlister

---

## Milestone 5 — Guests and tentative

- [ ] Guest add control per signup row ("+Guest" button visible on device-owned rows)
- [ ] Guest INSERT sets `is_guest=true`, `host_signup_id`, `guest_index` (max existing + 1 per host)
- [ ] Optional guest name input; default display is `+N` under host
- [ ] Guest renders inline in list: e.g. "10. Adrian (Sid +1)"
- [ ] Guests count toward cap math (confirmed + guests_of_confirmed < max_spots)
- [ ] Guest removal follows same cutoff rules as regular signups
- [ ] Tentative toggle (PUT on own signup): renders "(hopefully)" annotation beside name
- [ ] Tentative players still hold their slot in cap math

---

## Milestone 6 — Cutoff behavior

- [ ] `cutoff_at` computed on session creation: `start_time - cutoff_offset_hrs`
- [ ] Live countdown in session header (ticks every second client-side)
- [ ] RLS DELETE policy re-check: only allow public DELETE when `session.status = 'open'`
- [ ] UI: hide remove buttons for non-admin when `status = 'removal_locked'`
- [ ] Adds remain enabled for everyone regardless of status (`open` or `removal_locked`)
- [ ] Vercel Cron job (`/api/cron/session-status`): runs every 15 min, flips `open → removal_locked` when `NOW() >= cutoff_at`, flips `removal_locked → done` when `NOW() >= end_time`
- [ ] Cron route secured by `CRON_SECRET` header (Vercel built-in)

---

## Milestone 7 — Admin PIN

- [ ] On first deploy, seed `admin_pin_hash` in `session_template` by hashing `ADMIN_PIN` env var (Edge Function checks if hash is null and writes it once)
- [ ] Edge Function `POST /api/admin-login`: receives PIN, compares `bcrypt.compare(pin, admin_pin_hash)` from DB, returns signed JWT (1-hour expiry)
- [ ] PIN modal component: shown when user taps "Admin" anywhere; stores JWT in `sessionStorage`
- [ ] Admin panel screen (`/admin`):
  - [ ] Edit current session fields (date, time, location, max spots, cutoff)
  - [ ] Roster management: add name, deactivate, reorder (sort_hint)
  - [ ] Post-cutoff removal: remove any signup when admin JWT present
  - [ ] Cap/waitlist override: bump `max_spots` inline
  - [ ] Template editing: all session_template fields (weekday, times, location, max spots, waitlist size, cutoff offset, launch lead days, auto_launch toggle)
  - [ ] Change PIN: enter current PIN to verify, then set new PIN → hashes and updates `admin_pin_hash` in DB (no Vercel dashboard visit needed after initial setup)
  - [ ] Manual-launch a `draft` session → flip to `open`
- [ ] RLS: admin-protected routes verify JWT via Supabase `auth.jwt()` claim check or service-role bypass in Edge Function

---

## Milestone 8 — Activity log

- [ ] Write `activity_log` row on: signup add, signup remove, auto-promotion, guest add, guest remove, tentative toggle, session config edit, attendance marking
- [ ] Choose implementation: app-side write (after successful DB mutation) vs Postgres trigger — prefer app-side for clarity
- [ ] `ActivityFeed` component: compact list of recent entries, newest first, e.g. "Sid removed Mark", "Dan promoted from waitlist"
- [ ] Place feed below the signup list on live session screen (collapsible on mobile)
- [ ] Feed updates via existing Realtime channel on `activity_log`

---

## Milestone 9 — Recurrence

- [ ] Vercel Cron job (`/api/cron/auto-launch`): runs daily, reads `session_template`, creates next session if none exists within `launch_lead_days` and `auto_launch = true`
- [ ] Auto-launch: inserts session with status `open`, generates `public_slug` (nanoid, 8 chars)
- [ ] Manual-launch: inserts session as `draft`; admin panel shows draft notice + "Launch" button
- [ ] "Launch" button flips status `draft → open`
- [ ] Per-week field overrides: session fields are copied from template at creation time and editable without touching the template

---

## Milestone 10 — Attendance

- [ ] Attendance tab or section in admin panel (only visible for sessions with status `done`)
- [ ] Checklist of final confirmed signups + guests; tap to toggle `attended = true/false`
- [ ] Batch update via upsert or individual PATCH on signup rows
- [ ] Write `activity_log` entry: `type = 'attendance'` with summary of total marked
- [ ] Attendance count query: `COUNT(*) WHERE attended = true AND session.date >= start_of_year` grouped by `roster_id`

---

## Milestone 11 — Stats and history

**Stats screen (`/stats`) — public:**
- [ ] Per-player attendance count for current calendar year
- [ ] Lifetime attendance totals
- [ ] Optional: current attendance streak (consecutive sessions attended)
- [ ] Simple leaderboard (sorted by year count desc)

**Past sessions (`/history`) — public:**
- [ ] List of sessions with status `done`, sorted newest first
- [ ] Each row: date, location, attended count / confirmed count
- [ ] Detail view: final roster with guests, attendance checkmarks (read-only)

---

## Milestone 12 — WhatsApp output

- [ ] `generateCopyBlock(session, signups)`: produces the exact format from PRD §4
  - Header line: `{weekday} {month} {day}, {year} @{location} {start}-{end}:`
  - Numbered confirmed list with guest sub-lines
  - Waitlist section
- [ ] "Copy list" button: `navigator.clipboard.writeText(block)`
- [ ] "Share" button: `navigator.share({ text: block, url: liveLink })` with fallback to clipboard
- [ ] `generateReminderText(session)`: `"{hours} hours to cutoff… {spots_left} spots left. {live_link}"`
- [ ] Display reminder text block with its own copy button in admin panel or session header
- [ ] Public live link: `/s/:public_slug` resolves to the correct session

---

## Milestone 13 — Polish

- [ ] Empty state: no current session → friendly message, show next session date if known
- [ ] Removal-locked state: banner "Sign-ups locked — contact admin to remove"
- [ ] Done state: session over → prompt to view past sessions or stats
- [ ] Loading skeletons for signup list and header
- [ ] Error toast on failed Supabase mutations (shadcn/ui `toast`)
- [ ] Mobile touch target audit (min 44px hit areas)
- [ ] PWA install prompt / "Add to Home Screen" banner (deferred prompt)
- [ ] Basic offline fallback page (service worker cache)
- [ ] Lighthouse PWA audit pass (installable, manifest valid)
- [ ] Final cross-browser smoke test (iOS Safari, Android Chrome, desktop Chrome)
