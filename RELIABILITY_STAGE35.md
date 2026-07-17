# المرحلة 35 — Quality, Reliability & Incident Intelligence

## النطاق

إضافة `/reliability` كلوحة موحّدة للقراءة لحالة الخدمات، DLQ، وحوادث Ledger.

## البيانات

- `GET /dashboard/ops/overview`
- `GET /dashboard/operations`
- `GET /dashboard/ops/dead-letters`
- `GET /dashboard/ops/incidents?status=OPEN`

## الحوكمة

- المسار محمي بـ `reports.read`.
- صفحة Reliability لا تنفذ أي إصلاح مباشر؛ تحول إلى Operations وFinancial Control حيث تُطبّق RBAC وإجراءات التأكيد.
- تحديث تلقائي كل 30 ثانية.

هذه الحزمة تنفّذ Stage35 فقط ولا تبدأ Stage36.
