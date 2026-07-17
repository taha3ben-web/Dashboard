# المرحلة 39 — Trip Lifecycle & Dispatch Intelligence

## النطاق

إضافة `/dispatch-intelligence` كلوحة قراءة لدورة الرحلات والإلغاءات والتسويات المعلقة.

## البيانات

- `GET /trips`
- `GET /trips?unsettledOnly=true`

## الحوكمة

لا تنفذ اللوحة تغيرات حالة الرحلات أو إعادة التسوية؛ تبقى هذه الإجراءات في صفحة Trips وFinancial Control مع RBAC القائم.

هذه الحزمة تنفّذ Stage39 فقط ولا تبدأ Stage40.
