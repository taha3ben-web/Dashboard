# المرحلة 40 — Dispatch Failure & Matching Intelligence

## النطاق

إضافة `/matching-intelligence` لتحليل أداء المطابقة وأسباب فشل التوجيه خلال آخر 7 أيام.

## Backend (إضافة قراءة فقط)

- `GET /trips/dispatch-metrics` بصلاحية `trips.read` + `reports.read` (موضوع قبل مسار `:id`).
- مشتق من `TripEvent`: `trip:requested`، `trip:no_drivers`، `trip:search_timeout`، `trip:accepted`، `trip:cancelled`.
- وقمع حالات الرحلات: إجمالي/مكتملة/ملغاة/قيد البحث.
- لا migration ولا تعديل على محرك المطابقة.

## الواجهة

- مؤشرات: الطلبات، نسبة المطابقة، نسبة الطلبات غير المخدومة، والبحث النشط.
- توزيع أحداث التوجيه وقمع الرحلات.
- أحدث إخفاقات المطابقة مع المدينة وRide Class.
- تحديث تلقائي كل 30 ثانية.

## الحوكمة

قراءة فقط؛ لا تدخل يدوي على المطابقة من هذه الصفحة.

هذه الحزمة تنفّذ Stage40 فقط ولا تبدأ Stage41.
