-- Helm Smart - Supabase schema (Secure KV Store)
-- الهدف: مزامنة بيانات النظام عبر Supabase بشكل آمن باستخدام Auth + RLS.
--
-- طريقة العمل:
-- 1) المستخدم يسجّل دخول Supabase (Email/Password أو أي Provider).
-- 2) التطبيق يرسل Authorization: Bearer <access_token>
-- 3) RLS يضمن أن كل مستخدم يرى/يعدل بياناته فقط.
--
-- ملاحظة:
-- - لا تستخدم Service Role Key داخل التطبيق نهائياً.
-- - إذا أردت وضع "مفتوح" بدون Auth (غير مُوصى به): عطّل RLS يدوياً على الجدول.

-- (اختياري) تنظيف كامل قبل إعادة الإنشاء:
-- drop table if exists public.kv_store cascade;
-- drop function if exists public.touch_updated_at cascade;

create table if not exists public.kv_store (
  owner uuid not null default auth.uid(),
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, key)
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_kv_store_updated_at on public.kv_store;
create trigger trg_kv_store_updated_at
before update on public.kv_store
for each row execute procedure public.touch_updated_at();

-- أمان: تفعيل RLS وسياسات "المالك فقط"
alter table public.kv_store enable row level security;

drop policy if exists kv_store_select_own on public.kv_store;
create policy kv_store_select_own
on public.kv_store
for select
to authenticated
using (owner = auth.uid());

drop policy if exists kv_store_insert_own on public.kv_store;
create policy kv_store_insert_own
on public.kv_store
for insert
to authenticated
with check (owner = auth.uid());

drop policy if exists kv_store_update_own on public.kv_store;
create policy kv_store_update_own
on public.kv_store
for update
to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

drop policy if exists kv_store_delete_own on public.kv_store;
create policy kv_store_delete_own
on public.kv_store
for delete
to authenticated
using (owner = auth.uid());

-- صلاحيات (غالباً موجودة افتراضياً، لكن وضعها يقلل مشاكل "permission denied")
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.kv_store to authenticated;
