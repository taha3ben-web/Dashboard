# المرحلة 30 — Operations Intelligence Dashboard

## النطاق

إضافة طبقة رؤية تشغيلية لحظية إلى مركز العمليات الموجود في `/operations`، دون إعادة بناء Ops Center أو إضافة مصدر مالي بديل.

## البيانات الموحّدة

- `GET /dashboard/ops/*`: التسويات، DLQ، حوادث المطابقة، ومراجعات المخاطر.
- `GET /dashboard/operations`: حالة DB وRedis، السائقون المتاحون/المشغولون، الرحلات النشطة، الدعم، الشكاوى، والسحوبات المعلقة، مع أحدث الرحلات.

## الحوكمة

- العرض محمي بـ `reports.read` من المسار الموجود.
- إجراءات إعادة المحاولة والمطابقة وحل الحوادث تبقى خلف `payments.manage`، مع loading ومنع التكرار.
- لا تعديل مالي مباشر في Dashboard؛ التسوية والمطابقة تستدعي خدمات Backend القائمة وLedger يبقى مصدر الحقيقة.
- تحديث تلقائي كل 30 ثانية.

## الملفات

- `Dashboard/src/lib/ops.ts`: توسيع `OpsSnapshot` بـ `realtime` وربط `GET /dashboard/operations`.
- `Dashboard/src/app/(dashboard)/operations/page.tsx`: عرض مؤشرات الرؤية الحية وأحدث الرحلات.
- `Dashboard/OPERATIONS_INTELLIGENCE_STAGE30.md`: هذا التوثيق.

هذه الحزمة تنفّذ Stage30 فقط ولا تبدأ Stage31.
