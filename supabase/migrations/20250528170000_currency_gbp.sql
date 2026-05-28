-- Default and backfill project currency to GBP
alter table public.projects alter column currency set default 'GBP';

update public.projects
set currency = 'GBP'
where currency is null or currency = 'USD';
