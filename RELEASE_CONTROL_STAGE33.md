# المرحلة 33 — Release, Feature Flags & App Version Control

## النطاق

إضافة `/release-control` كلوحة موحّدة للقراءة وقرار الإطلاق، تجمع مفاتيح الميزات والإصدارات النشطة وموافقات الإعدادات المعلّقة.

## البيانات

- `GET /feature-flags` و`GET /feature-flags/control`
- `GET /app-versions`
- `GET /setting-change-requests?status=PENDING`

## الحوكمة

- المسار محمي بـ `settings.manage`.
- مفتاح الإيقاف العام يظهر بوضوح مع رابط إدارة مباشر.
- لا تنفذ اللوحة إجراءات نشر أو حذف مباشرة؛ تُحوّل إلى الصفحات المتخصصة التي تطبق التأكيد وRBAC.
- تحديث تلقائي كل 30 ثانية مع تحديث يدوي.

## الملفات

- `Dashboard/src/app/(dashboard)/release-control/page.tsx`
- `Dashboard/src/lib/permissions.ts`
- `Dashboard/src/components/Sidebar.tsx`
- `Dashboard/RELEASE_CONTROL_STAGE33.md`

هذه الحزمة تنفّذ Stage33 فقط ولا تبدأ Stage34.
