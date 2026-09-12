-- Per-project invoice recipient + payable details; optional invoice number / due date on finalize.

alter table public.projects
  add column if not exists invoice_to_company text,
  add column if not exists invoice_to_street text,
  add column if not exists invoice_to_city text,
  add column if not exists invoice_to_country text,
  add column if not exists invoice_to_postcode text,
  add column if not exists invoice_payable_to text;

alter table public.invoices
  add column if not exists due_date date;

drop function if exists public.finalize_invoice (uuid, uuid[]);

create or replace function public.finalize_invoice (
  p_project_id uuid,
  p_session_ids uuid[],
  p_invoice_number integer default null,
  p_due_date date default null
)
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
      and (s.user_id <> v_user or s.project_id <> p_project_id)
  ) then
    raise exception 'Invalid session in selection';
  end if;

  if (
    select count(*)
    from public.sessions s
    where s.id = any (p_session_ids)
  ) <> cardinality(p_session_ids) then
    raise exception 'Unknown session id in selection';
  end if;

  if p_invoice_number is not null then
    if p_invoice_number < 1 then
      raise exception 'Invalid invoice number';
    end if;
    v_next := p_invoice_number;
  else
    select coalesce(max(invoice_number), 0) + 1
      into v_next
    from public.invoices
    where user_id = v_user;
  end if;

  insert into public.invoices (user_id, project_id, invoice_number, total_amount, due_date)
  values (v_user, p_project_id, v_next, 0, p_due_date)
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

grant execute on function public.finalize_invoice (uuid, uuid[], integer, date) to authenticated;
