-- Recalculate invoice total_amount when line items change.
-- Cascade session delete → invoice_lines so totals stay in sync from the app.

alter table public.invoice_lines
  drop constraint if exists invoice_lines_session_id_fkey;

alter table public.invoice_lines
  add constraint invoice_lines_session_id_fkey
  foreign key (session_id)
  references public.sessions (id)
  on delete cascade;

create or replace function public.recalculate_invoice_total(p_invoice_id uuid)
  returns void
  language plpgsql
  set search_path = public
as $$
declare
  v_total numeric(14, 2);
begin
  select coalesce(sum(line_total), 0)::numeric(14, 2)
    into v_total
  from public.invoice_lines
  where invoice_id = p_invoice_id;

  update public.invoices
  set total_amount = v_total
  where id = p_invoice_id;
end;
$$;

create or replace function public.invoice_lines_recalc_total_trigger()
  returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recalculate_invoice_total(OLD.invoice_id);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    if OLD.invoice_id is distinct from NEW.invoice_id then
      perform public.recalculate_invoice_total(OLD.invoice_id);
    end if;
    perform public.recalculate_invoice_total(NEW.invoice_id);
    return NEW;
  else
    perform public.recalculate_invoice_total(NEW.invoice_id);
    return NEW;
  end if;
end;
$$;

drop trigger if exists invoice_lines_recalc_total on public.invoice_lines;

create trigger invoice_lines_recalc_total
after insert or update or delete on public.invoice_lines
for each row
execute function public.invoice_lines_recalc_total_trigger();

-- Backfill totals for any invoices already out of sync.
update public.invoices i
set total_amount = coalesce(
  (
    select sum(l.line_total)::numeric(14, 2)
    from public.invoice_lines l
    where l.invoice_id = i.id
  ),
  0
);
