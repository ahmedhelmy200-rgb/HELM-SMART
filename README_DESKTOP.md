# HELM Legal Office — Desktop (Windows)

هذه النسخة تحول مشروعك الحالي (Vite/React) إلى برنامج Desktop (Electron) مع تخزين محلي SQLite (WASM) بدون أي إعدادات شبكة.

## التشغيل (للتجربة)
من داخل مجلد المشروع:

```powershell
npm install
npm run electron:dev
```

## إخراج EXE (تجميعة Windows)
```powershell
npm run electron:build
```

سيتم إنشاء ملفات التثبيت داخل:
`release/`

## قاعدة البيانات
تُحفظ تلقائيًا داخل مسار بيانات التطبيق (AppData):
`%APPDATA%\HELM Legal Office\db\helm.sqlite`

## واجهة التخزين داخل الواجهة
تم توفير API في الـ renderer عبر:
`window.HELM_DB`

وملف مساعد:
`services/desktopDb.ts`
