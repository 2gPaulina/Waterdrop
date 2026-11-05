-- Ejecutar en Supabase > SQL Editor
create table if not exists public.reportes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descripcion text not null,
  tipo text not null,
  gravedad text not null,
  estado text not null default 'pendiente',
  referencia text not null,
  latitud double precision,
  longitud double precision,
  foto_path text,
  creado_en timestamptz not null,
  actualizado_en timestamptz not null default now()
);

alter table public.reportes enable row level security;

create policy "ver propios" on public.reportes for select to authenticated using (auth.uid() = user_id);
create policy "crear propios" on public.reportes for insert to authenticated with check (auth.uid() = user_id);
create policy "editar propios" on public.reportes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "borrar propios" on public.reportes for delete to authenticated using (auth.uid() = user_id);

-- Bucket privado para fotos (carpeta = id del usuario)
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict (id) do nothing;

create policy "fotos propias" on storage.objects for all to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
