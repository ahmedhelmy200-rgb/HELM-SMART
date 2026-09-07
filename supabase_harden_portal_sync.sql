-- HELM Smart: harden an existing Supabase project before storing a full HELM Portal mirror.
-- Safe to run repeatedly.

begin;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

alter table if exists public.kv_store enable row level security;
alter table if exists public.kv_store force row level security;

revoke all on public.kv_store from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.kv_store to authenticated;

drop policy if exists kv_store_select_own on public.kv_store;
create policy kv_store_select_own
on public.kv_store
for select
to authenticated
using (
  owner = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists kv_store_insert_own on public.kv_store;
create policy kv_store_insert_own
on public.kv_store
for insert
to authenticated
with check (
  owner = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists kv_store_update_own on public.kv_store;
create policy kv_store_update_own
on public.kv_store
for update
to authenticated
using (
  owner = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
with check (
  owner = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists kv_store_delete_own on public.kv_store;
create policy kv_store_delete_own
on public.kv_store
for delete
to authenticated
using (
  owner = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

commit;
