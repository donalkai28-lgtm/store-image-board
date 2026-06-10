create table if not exists public.single_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists single_images_created_at_idx
  on public.single_images (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_single_images_updated_at on public.single_images;

create trigger set_single_images_updated_at
before update on public.single_images
for each row
execute function public.set_updated_at();

alter table public.single_images enable row level security;

drop policy if exists "Public read single images" on public.single_images;
create policy "Public read single images"
on public.single_images
for select
to anon
using (true);

drop policy if exists "Public insert single images" on public.single_images;
create policy "Public insert single images"
on public.single_images
for insert
to anon
with check (true);

drop policy if exists "Public update single images" on public.single_images;
create policy "Public update single images"
on public.single_images
for update
to anon
using (true)
with check (true);

drop policy if exists "Public delete single images" on public.single_images;
create policy "Public delete single images"
on public.single_images
for delete
to anon
using (true);
