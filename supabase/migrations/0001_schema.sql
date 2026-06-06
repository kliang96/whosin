-- EXTENSIONS
create extension if not exists "pgcrypto";

-- ============================================================
-- session_template
-- One row. Holds weekly defaults + admin PIN hash.
-- ============================================================
create table session_template (
  id                uuid        primary key default gen_random_uuid(),
  weekday           smallint    not null default 5,
  start_time        time        not null default '20:00:00',
  end_time          time        not null default '22:00:00',
  location          text        not null default 'BV',
  max_spots         int         not null default 12,
  waitlist_size     int                  default null,
  cutoff_offset_hrs int         not null default 38,
  launch_lead_days  int         not null default 3,
  auto_launch       boolean     not null default true,
  admin_pin_hash    text,
  updated_at        timestamptz not null default now()
);

alter table session_template enable row level security;

-- ============================================================
-- session
-- One row per weekly instance.
-- ============================================================
create table session (
  id            uuid        primary key default gen_random_uuid(),
  date          date        not null,
  start_time    time        not null,
  end_time      time        not null,
  location      text        not null,
  max_spots     int         not null,
  waitlist_size int         default null,
  cutoff_at     timestamptz not null,
  status        text        not null default 'open'
                            check (status in ('draft','open','removal_locked','done','cancelled')),
  public_slug   text        not null unique,
  created_at    timestamptz not null default now()
);

create index session_status_date_idx on session (status, date desc);
create index session_public_slug_idx on session (public_slug);

alter table session enable row level security;

create policy "session: public read"
  on session for select
  using (true);

-- ============================================================
-- roster
-- ============================================================
create table roster (
  id           uuid        primary key default gen_random_uuid(),
  display_name text        not null unique,
  sort_hint    int         default null,
  active       boolean     not null default true,
  created_at   timestamptz not null default now()
);

create index roster_active_sort_idx on roster (active, sort_hint nulls last, display_name);

alter table roster enable row level security;

create policy "roster: public read"
  on roster for select
  using (true);

-- ============================================================
-- signup
-- ============================================================
create table signup (
  id              uuid        primary key default gen_random_uuid(),
  session_id      uuid        not null references session (id) on delete cascade,
  roster_id       uuid                 references roster (id) on delete set null,
  display_name    text        not null,
  status          text        not null default 'confirmed'
                              check (status in ('confirmed', 'tentative')),
  is_guest        boolean     not null default false,
  host_signup_id  uuid                 references signup (id) on delete cascade,
  guest_index     int         default null,
  guest_name      text        default null,
  on_waitlist     boolean     not null default false,
  pinned_position int         default null,
  device_token    text        default null,
  attended        boolean     not null default false,
  attended_at     timestamptz default null,
  created_at      timestamptz not null default now()
);

create index signup_session_id_idx       on signup (session_id);
create index signup_roster_id_idx        on signup (roster_id);
create index signup_session_order_idx    on signup (session_id, on_waitlist, pinned_position nulls last, created_at);

create unique index signup_session_roster_unique
  on signup (session_id, roster_id)
  where roster_id is not null and is_guest = false;

alter table signup enable row level security;

create policy "signup: public read"
  on signup for select
  using (true);

create policy "signup: public insert when open"
  on signup for insert
  with check (
    exists (
      select 1 from session s
      where s.id = session_id
        and s.status in ('open', 'removal_locked')
    )
  );

create policy "signup: public delete when open"
  on signup for delete
  using (
    exists (
      select 1 from session s
      where s.id = session_id
        and s.status = 'open'
    )
  );

-- ============================================================
-- activity_log
-- ============================================================
create table activity_log (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references session (id) on delete cascade,
  type       text        not null
             check (type in ('add','remove','promote','guest_add','guest_remove',
                             'tentative','config','attendance')),
  actor      text        default null,
  summary    text        not null,
  created_at timestamptz not null default now()
);

create index activity_log_session_idx on activity_log (session_id, created_at desc);

alter table activity_log enable row level security;

create policy "activity_log: public read"
  on activity_log for select
  using (true);

-- ============================================================
-- SEED: one session_template row
-- ============================================================
insert into session_template (
  weekday, start_time, end_time, location,
  max_spots, waitlist_size, cutoff_offset_hrs,
  launch_lead_days, auto_launch
) values (
  5, '20:00:00', '22:00:00', 'BV',
  12, null, 38,
  3, true
);
