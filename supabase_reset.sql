-- Helm Smart - Supabase RESET (احذف كل البيانات والسياسات ثم أعد الإنشاء)
-- نفّذ هذا الملف في SQL Editor إذا تريد تصفير كامل.
begin;

drop table if exists public.kv_store cascade;
drop function if exists public.touch_updated_at cascade;

commit;

-- بعده مباشرة نفّذ ملف supabase_schema.sql (Secure KV Store)
