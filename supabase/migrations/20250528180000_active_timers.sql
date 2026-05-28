-- Cross-device active timer (one row per user)
create table public.active_timers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  phase text not null check (phase in ('running', 'paused')),
  wall_started_at timestamptz not null,
  accumulated_ms bigint not null default 0 check (accumulated_ms >= 0),
  run_started_at timestamptz,
  stop_draft jsonb,
  updated_at timestamptz not null default now()
);

create index active_timers_updated on public.active_timers (updated_at desc);

alter table public.active_timers enable row level security;

create policy active_timers_select on public.active_timers for select using (auth.uid() = user_id);
create policy active_timers_insert on public.active_timers for insert with check (auth.uid() = user_id);
create policy active_timers_update on public.active_timers for update using (auth.uid() = user_id);
create policy active_timers_delete on public.active_timers for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.active_timers;
