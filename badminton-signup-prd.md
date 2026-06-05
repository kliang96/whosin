# Weekly Badminton Sign-Up App, PRD

**Working title:** ShuttleList (placeholder, rename freely)
**Owner:** Kevin + co-organizers (admins)
**Status:** v1 scope, ready for build
**Target stack:** React + Vite, Supabase (Postgres + Realtime + Edge Functions), deployed on Vercel, installable as a PWA

---

## 1. Problem and goal

The group currently runs weekly badminton sign-ups by copy-pasting a numbered list in WhatsApp. It works but is manual, error-prone when adding or removing names, and has no enforcement of the cap or waitlist. Weekly parameters (date, time, location, max count) change and must be re-typed each week.

**Goal:** a mobile-first web app that owns the sign-up list as the single source of truth, enforces the cap and waitlist automatically, tracks attendance over time, preserves the group's numbered-list culture, and feeds WhatsApp through a one-tap shareable block plus a pinned live link. WhatsApp delivery stays manual or uses WhatsApp's own native scheduled-send. No grey-area account automation.

**Non-goals for v1:** payments, cost-splitting, push notifications, automatic posting into the WhatsApp group.

---

## 2. Users and roles

- **Player (no account):** opens the live link, taps their name from the roster to join or leave, can add a newcomer name, can add guests, can mark themselves tentative. Before the cutoff, any player can add or remove any name. After the cutoff, anyone can still add names, but only admins can remove names.
- **Admin (PIN only, no account):** unlocks admin actions with a shared PIN. Can edit the weekly session fields, manage the roster, remove names after the cutoff, mark attendance after a session, and override the cap or waitlist if needed. PIN is verified server-side and grants a short-lived admin session.

There is no user registration or login anywhere in v1. Identity is name-based plus an optional device token stored locally to highlight "you" in the list.

---

## 3. Core concepts and rules

### Session lifecycle
A session moves through: `draft` -> `open` -> `removal_locked` -> `done`.

- `draft`: created from the recurring template, awaiting auto-launch or manual launch.
- `open`: anyone can add or remove names.
- `removal_locked`: cutoff has passed. Anyone can still add names, but public removal is blocked and only admins can remove. Late additions still flow into open slots or the waitlist normally.
- `done`: session date has passed. Retained for history and attendance stats.

### Recurrence and auto-launch
- The group always plays weekly, so a single recurring **session template** holds the defaults: weekday, start time, end time, location, max spots, waitlist size, cutoff offset, and an `auto_launch` toggle.
- A scheduled job runs ahead of each week. If `auto_launch` is on, it creates the next session as `open` automatically. If off, it creates a `draft` an admin confirms with one tap.
- Every field is pre-filled from the template but editable per week, so a one-off change of venue or time does not touch the template.

### Cap, waitlist, and auto-promotion
- `max_spots` defines confirmed slots. Sign-ups beyond it go to the waitlist (size `waitlist_size`, can be unlimited).
- When a confirmed player is removed, the top waitlister is **auto-promoted** immediately and the list renumbers itself. This is the primary error-killer.
- Ordering is first-come by join time. Admins can optionally reorder or pin a player to a fixed position if ever needed.

### Guests
- A guest is attached to a host player and counts toward the cap.
- **No limit** on guests per host. They auto-number as +1, +2, +3, and so on under their host, and render inline in the existing style (for example "Adrian (Sid +1)").
- Guests can carry an optional name or stay as an anonymous "+N". Guests can sit on the waitlist and be promoted with normal rules.
- Guests are tracked the same as players, including attendance.

### Tentative status
- A player can flag themselves tentative, which renders the "(hopefully)" style annotation. Tentative players still hold a slot but are visually distinct.

### Cutoff behavior
- `cutoff_at` is computed from session start minus the template's cutoff offset (for example 4 hours before).
- Adding names is available to everyone at all times, before and after cutoff.
- Removing names is open to everyone before cutoff. After cutoff, removal is admin-only (PIN).

### Attendance tracking
- After a session, an admin marks who actually showed up (a simple checklist over the final confirmed list and guests, tap to mark attended).
- Attendance is recorded per sign-up, for both players and guests.
- The app surfaces a per-player **attendance count for the current year** (for example a small "27 this year" tag), plus lifetime totals. An optional current-attendance streak can be shown as a secondary stat.
- Because every session and its attendance are retained, these stats are computed, not manually maintained.

### Activity tracker
- Every meaningful change writes to an activity log: add, remove, auto-promotion, guest add or remove, tentative toggle, config edit, and attendance marking.
- The live session screen shows a compact activity feed (side panel or below the list) so it is easy to notice what changed and when, for example "Sid removed Mark" or "Dan auto-promoted from waitlist".

---

## 4. WhatsApp integration

No automatic posting into the WhatsApp group in v1. Three legitimate touchpoints:

1. **Pinned live link.** A stable read-and-join URL per session (`/s/{public_slug}`). Pin it once in the group. It always shows the current list, so the group rarely needs a fresh paste.
2. **One-tap copy block.** A "Copy list" button generates the exact formatted block (see template below) for pasting into the chat. A "Share" button opens the native share sheet as an alternative.
3. **Cutoff reminder via native scheduled send.** The app generates a short reminder text containing the live link. The organizer pastes it into WhatsApp and uses WhatsApp's built-in schedule-send to fire it a few hours before cutoff. Because the message carries the live link, the static text stays accurate even though it was composed earlier. The app does not send this itself.

### Message templates

**Kickoff block (matches current format):**
```
{weekday} {month} {day}, {year} @{location} {start}-{end}:
1. {name}
2. {name}
...
{max}. {name}
Waitlist:
{n}. {name}
```
Guests render under or beside their host, for example "10. Adrian (Sid +1)".

**Cutoff reminder (for native scheduled send):**
```
{hours} hours to cutoff for {weekday} badminton @{location}.
{spots_left} spots left. View and sign up: {live_link}
```

---

## 5. Features in v1

- Recurring template with editable weekly fields and an auto-launch toggle
- Sign-up by tapping a name from the seeded roster, plus add-newcomer
- Guests with no limit, auto-numbered +1, +2, +3, counting toward the cap and tracked like players
- Tentative flag ("hopefully" style)
- Automatic cap enforcement, waitlist, and auto-promotion on removal
- First-come ordering with optional admin reorder
- Cutoff behavior: adds open to all at all times, removal locked to admins after cutoff
- Admin PIN unlock for config, roster, post-cutoff removal, and attendance marking
- **Attendance tracking** with per-player yearly count and lifetime totals
- **Activity feed** showing adds, removals, promotions, and other changes
- **Past sessions page** listing previous weeks with their final roster, guests, and attendance (read-only)
- Pinned live link (read and join), copy block, and share
- Generated cutoff-reminder text for native scheduled send
- Real-time updates so a tap reflects for everyone without refresh
- Mobile-first PWA, installable, no app store

### Explicitly deferred (future phases)
- Cost-splitting per head and "paid" tracking
- Push or in-app notifications
- Any automatic posting into the WhatsApp group (gateway or bot)
- Multiple concurrent weekly slots or multiple groups

---

## 6. Data model (Supabase / Postgres)

```
session_template
  id                uuid pk
  weekday           int            -- 0..6
  start_time        time
  end_time          time
  location          text
  max_spots         int
  waitlist_size     int            -- null = unlimited
  cutoff_offset_hrs int            -- hours before start that removal locks
  launch_lead_days  int            -- how many days ahead to create the session
  auto_launch       bool
  admin_pin_hash    text
  updated_at        timestamptz

session
  id            uuid pk
  date          date
  start_time    time
  end_time      time
  location      text
  max_spots     int
  waitlist_size int
  cutoff_at     timestamptz
  status        text               -- draft | open | removal_locked | done
  public_slug   text unique
  created_at    timestamptz

roster
  id            uuid pk
  display_name  text
  sort_hint     int                -- optional manual ordering
  active        bool
  created_at    timestamptz

signup
  id              uuid pk
  session_id      uuid fk -> session
  roster_id       uuid fk -> roster   -- null for newcomers and guests
  display_name    text                -- denormalized, supports newcomers and guests
  status          text                -- confirmed | tentative
  is_guest        bool
  host_signup_id  uuid fk -> signup   -- set when is_guest, points to host
  guest_index     int                 -- 1,2,3... per host (the +N)
  guest_name      text                -- optional name for a guest
  pinned_position int                 -- null unless admin-pinned
  device_token    text                -- optional, marks who added it
  attended        bool                -- set during attendance marking
  attended_at     timestamptz
  created_at      timestamptz         -- drives first-come ordering

activity_log
  id           uuid pk
  session_id   uuid fk -> session
  type         text                   -- add | remove | promote | guest_add | guest_remove | tentative | config | attendance
  actor        text                   -- 'admin' or a short device label
  summary      text                   -- human-readable line for the feed
  created_at   timestamptz
```

**Ordering rule:** confirmed list = pinned positions first, then by `created_at`. Waitlist = remaining by `created_at`. Promotion = oldest waitlist `created_at` fills the freed slot.

**Attendance count rule:** for each roster player, count `signup` rows where `attended = true` and the session date falls in the current calendar year. Named guests can be aggregated the same way by `guest_name`.

---

## 7. Architecture notes

- **Realtime:** Supabase Realtime on the `signup` and `activity_log` tables so all open clients update live, including the activity feed.
- **Auto-launch job:** Supabase scheduled function (pg_cron) or a Vercel Cron hitting an Edge Function. Runs daily, checks the template, and creates the upcoming session when within `launch_lead_days`.
- **Status job:** the same or a second cron flips `open` -> `removal_locked` at `cutoff_at`, and `removal_locked` -> `done` after the session ends. The UI also enforces removal-lock client-side as a fast path.
- **Admin auth:** Edge Function verifies the PIN against `admin_pin_hash` and returns a short-lived JWT. Admin-only writes (config, roster, post-cutoff removal, attendance) are guarded by Row Level Security checking that token. Public adds are allowed in `open` and `removal_locked`; public removal only in `open`.
- **Activity log:** written app-side or via Postgres triggers on `signup` changes, whichever is cleaner for Claude Code to implement consistently.
- **Identity:** a random `device_token` in localStorage lets the UI highlight entries this device added and offer a quick "remove mine", without any account.
- **Slug:** `public_slug` is a short unguessable string for the live link.

---

## 8. Screens

1. **Live session (default, public):** header with date, time, location, spots remaining, and cutoff countdown. Numbered confirmed list with guests inline, then waitlist. Tap-to-join from roster, add-newcomer field, guest control, tentative toggle. A compact activity feed alongside the list. Copy and Share buttons. After cutoff, adds stay enabled and removal controls hide for non-admins.
2. **Admin panel (PIN):** edit this week's fields, manage roster (add, deactivate, reorder), remove names post-cutoff, mark attendance after a session, toggle and edit the recurring template, manual-launch a draft.
3. **Stats:** per-player attendance count this year and lifetime totals, a simple leaderboard, optional current streak. Read-only.
4. **Past sessions:** list of previous sessions, each opening to its final roster, guests, and attendance. Read-only.

---

## 9. Build milestones (suggested order for Claude Code)

1. **Scaffold:** Vite + React + Supabase client, env wiring, Vercel deploy, PWA manifest.
2. **Data layer:** create tables and RLS, seed one `session_template` and the roster.
3. **Core sign-up:** live session screen, tap-to-join, leave, newcomer add, first-come ordering, realtime sync.
4. **Cap and waitlist:** enforcement, auto-promotion on removal, renumbering.
5. **Guests and tentative:** unlimited guests with auto +N numbering, guest model, tentative flag, correct cap math and rendering.
6. **Cutoff behavior:** `cutoff_at`, adds-always-open, removal-locked-after-cutoff, status cron.
7. **Admin PIN:** Edge Function auth, admin panel, post-cutoff removal, template editing, roster management.
8. **Activity log:** write events and render the live feed.
9. **Recurrence:** auto-launch cron and manual-launch flow.
10. **Attendance:** post-session marking UI and `attended` writes.
11. **Stats and history:** yearly attendance counts, stats screen, past-sessions page.
12. **WhatsApp output:** copy block, share, live link, generated reminder text.
13. **Polish:** PWA install, empty and locked states, mobile spacing, share-sheet edge cases.

---

## 10. Acceptance criteria (v1)

- Adding an 18th confirmed player when max is 17 routes them to the waitlist automatically.
- Removing a confirmed player promotes the top waitlister and the numbers re-sequence with no manual edit.
- A host can add unlimited guests, each auto-numbered +1, +2, +3, and each counts toward the cap.
- Before cutoff, anyone can add or remove. After cutoff, anyone can still add, but removal is blocked for non-admins and allowed for PIN-admins.
- An admin can mark attendance after a session, and a player's yearly attendance count reflects it immediately.
- Removing or adding a name writes a line to the activity feed visible to everyone in near real time.
- The past-sessions page shows a completed session's final roster, guests, and attendance.
- The copy block output matches the current WhatsApp format exactly.
- Two browsers on the same session see each other's changes within ~1 second.
- With `auto_launch` on, next week's session appears automatically without admin action.

---

## 11. Placeholders to fill before or during build

- **Roster:** seed names (the regulars). Currently empty, add via admin panel or a seed script.
- **App name:** Who's In?
- **Template defaults:** Friday 8pm-10pm, location BV (Badminton Vancouver), max 12 spots, cutoff Thursday 6am (38h offset), auto_launch on.
- **Admin PIN:** set as ADMIN_PIN in Vercel environment variables.
- **Cost-split and payment values:** out of scope for v1, captured here only as future phase inputs.
