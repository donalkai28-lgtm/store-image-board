create table if not exists public.icon_records (
  id uuid primary key default gen_random_uuid(),
  app_id text,
  product_url text,
  product_alias text,
  category text,
  icon_url text not null,
  captured_date date default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists icon_records_created_at_idx
  on public.icon_records (created_at desc);

create index if not exists icon_records_category_idx
  on public.icon_records (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_icon_records_updated_at on public.icon_records;

create trigger set_icon_records_updated_at
before update on public.icon_records
for each row
execute function public.set_updated_at();

alter table public.icon_records enable row level security;

drop policy if exists "Public read icon records" on public.icon_records;
create policy "Public read icon records"
on public.icon_records
for select
to anon
using (true);

drop policy if exists "Public insert icon records" on public.icon_records;
create policy "Public insert icon records"
on public.icon_records
for insert
to anon
with check (true);

drop policy if exists "Public update icon records" on public.icon_records;
create policy "Public update icon records"
on public.icon_records
for update
to anon
using (true)
with check (true);

drop policy if exists "Public delete icon records" on public.icon_records;
create policy "Public delete icon records"
on public.icon_records
for delete
to anon
using (true);
