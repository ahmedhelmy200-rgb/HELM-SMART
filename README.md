<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# HELM Legal Office (Web + Electron)

This repository contains the full source for the HELM Legal Office system (no AI services).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`


## Supabase Cloud Sync (Secure recommended)

### 1) Reset (مسح كل اللي في جدول المزامنة)
في Supabase Dashboard → SQL Editor:
- نفّذ الملف: `supabase_reset.sql`
- ثم نفّذ الملف: `supabase_schema.sql`

### 2) Auth
في Supabase Dashboard → Authentication:
- فعّل Email/Password
- أنشئ مستخدم (Email + Password) من صفحة Users أو Sign Up.

### 3) داخل التطبيق
Settings → البيانات والنسخ → التخزين السحابي:
- أدخل Supabase URL و Anon Key (من Project Settings → API)
- Cloud Auth: أدخل Email/Password واضغط "تسجيل دخول"
- ثم استخدم:
  - "رفع إلى السحابة" (على جهاز المصدر)
  - "استعادة من السحابة" (على جهاز آخر)

> إذا فعّلت RLS (كما في schema) لازم تسجيل الدخول قبل رفع/استعادة.
