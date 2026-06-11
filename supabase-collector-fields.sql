alter table public.asset_records
  add column if not exists collector_id text,
  add column if not exists collector_name text;

alter table public.icon_records
  add column if not exists collector_id text,
  add column if not exists collector_name text;

alter table public.single_images
  add column if not exists collector_id text,
  add column if not exists collector_name text;

create index if not exists asset_records_collector_id_idx
  on public.asset_records (collector_id);

create index if not exists icon_records_collector_id_idx
  on public.icon_records (collector_id);

create index if not exists single_images_collector_id_idx
  on public.single_images (collector_id);
