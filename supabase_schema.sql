-- Helm Smart - Supabase schema (Secure KV Store)
-- الهدف: مزامنة بيانات النظام عبر Supabase بشكل آمن باستخدام Auth + RLS.
--
-- طريقة العمل:
-- 1) المستخدم يسجّل دخول Supabase بحساب حقيقي (Email/Password أو Provider).
-- 2) التطبيق يرسل Authorization: Bearer <access_token>.
-- 3) RLS يضمن أن كل مستخدم يرى/يعدل بياناته فقط.
-- 4) جلسات Supabase Anonymous ممنوعة من الوصول لبيانات HELM Smart.
--
-- مهم:
-- - لا تستخدم Service Role Key داخل التطبيق نهائياً.
-- - لا تعطّل RLS ولا تستخدم وضعاً مفتوحاً مع بيانات مكتب قانوني.

create table if not exists public.kv_store (
  owner uuid not null default auth.uid(),
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, key)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_kv_store_updated_at on public.kv_store;
create trigger trg_kv_store_updated_at
before update on public.kv_store
for each row execute procedure public.touch_updated_at();

alter table public.kv_store enable row level security;
alter table public.kv_store force row level security;

-- إزالة أي وصول مباشر لدور anon.
revoke all on public.kv_store from anon;

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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.kv_store to authenticated;
