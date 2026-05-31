-- Studio Voodoo Timer schema: projects, sessions, invoices (per project), invoice lines.
-- Run in Supabase SQL editor or via supabase db push.

create extension if not exists "pgcrypto";

-- Projects -----------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  client_name text,
  client_email text,
  billing_address text,
  hourly_rate numeric(12, 2) not null default 0,
  currency text not null default 'GBP',
  avatar_color text,
  avatar_initial text,
  last_logged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_last_logged on public.projects (user_id, last_logged_at desc nulls last);

alter table public.projects
  add constraint projects_avatar_initial_len check (
    avatar_initial is null or char_length(avatar_initial) <= 1
  );

-- Invoices (always for a single project) ------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  invoice_number integer not null,
  total_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create index invoices_user_project on public.invoices (user_id, project_id);

-- Completed work sessions ----------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  description text not null default '',
  billing_status text not null default 'unbilled' check (billing_status in ('unbilled', 'billed')),
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now()
);

create index sessions_project_unbilled on public.sessions (project_id, billing_status);
create index sessions_user_created on public.sessions (user_id, created_at desc);

-- Invoice line items (snapshot of rate and hours) ----------------------------
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete restrict,
  hours numeric(14, 6) not null,
  rate numeric(12, 2) not null,
  line_total numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  unique (session_id)
);

create index invoice_lines_invoice on public.invoice_lines (invoice_id);

-- Atomic finalize: mark sessions billed, create invoice + lines --------------
create or replace function public.finalize_invoice (p_project_id uuid, p_session_ids uuid[])
  returns uuid
  language plpgsql
  set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invoice_id uuid;
  v_next int;
  v_total numeric(14, 2) := 0;
  v_rate numeric(12, 2);
  r record;
  v_hours numeric(14, 6);
  v_line numeric(14, 2);
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_ids is null or cardinality(p_session_ids) = 0 then
    raise exception 'No sessions selected';
  end if;

  select hourly_rate
    into v_rate
  from public.projects
  where id = p_project_id
    and user_id = v_user;

  if v_rate is null then
    raise exception 'Project not found';
  end if;

  if exists (
    select 1
    from public.sessions s
    where s.id = any (p_session_ids)
      and (
        s.user_id <> v_user
        or s.project_id <> p_project_id
        or s.billing_status <> 'unbilled'
      )
  ) then
    raise exception 'Invalid or already billed session in selection';
  end if;

  if (
    select count(*)
    from public.sessions s
    where s.id = any (p_session_ids)
  ) <> cardinality(p_session_ids) then
    raise exception 'Unknown session id in selection';
  end if;

  select coalesce(max(invoice_number), 0) + 1
    into v_next
  from public.invoices
  where user_id = v_user;

  insert into public.invoices (user_id, project_id, invoice_number, total_amount)
  values (v_user, p_project_id, v_next, 0)
  returning id into v_invoice_id;

  for r in
    select *
    from public.sessions
    where id = any (p_session_ids)
    order by started_at asc
  loop
    v_hours := (r.duration_seconds::numeric / 3600.0);
    v_line := round(v_hours * v_rate, 2);
    insert into public.invoice_lines (invoice_id, session_id, hours, rate, line_total)
    values (v_invoice_id, r.id, v_hours, v_rate, v_line);
    update public.sessions
    set
      billing_status = 'billed',
      invoice_id = v_invoice_id
    where id = r.id;
    v_total := v_total + v_line;
  end loop;

  update public.invoices
  set
    total_amount = v_total
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

grant execute on function public.finalize_invoice (uuid, uuid[]) to authenticated;

-- Row Level Security ---------------------------------------------------------
alter table public.projects enable row level security;
alter table public.sessions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

create policy projects_select on public.projects for select using (auth.uid() = user_id);
create policy projects_insert on public.projects for insert with check (auth.uid() = user_id);
create policy projects_update on public.projects for update using (auth.uid() = user_id);
create policy projects_delete on public.projects for delete using (auth.uid() = user_id);

create policy sessions_select on public.sessions for select using (auth.uid() = user_id);
create policy sessions_insert on public.sessions for insert with check (auth.uid() = user_id);
create policy sessions_update on public.sessions for update using (auth.uid() = user_id);
create policy sessions_delete on public.sessions for delete using (auth.uid() = user_id);

create policy invoices_select on public.invoices for select using (auth.uid() = user_id);
create policy invoices_insert on public.invoices for insert with check (auth.uid() = user_id);
create policy invoices_update on public.invoices for update using (auth.uid() = user_id);
create policy invoices_delete on public.invoices for delete using (auth.uid() = user_id);

create policy invoice_lines_select on public.invoice_lines for select using (
  exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
);
create policy invoice_lines_insert on public.invoice_lines for insert with check (
  exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
);
create policy invoice_lines_update on public.invoice_lines for update using (
  exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
);
create policy invoice_lines_delete on public.invoice_lines for delete using (
  exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
);

-- updated_at maintenance -----------------------------------------------------
create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_updated_at
before update on public.projects
for each row
execute procedure public.set_updated_at ();
