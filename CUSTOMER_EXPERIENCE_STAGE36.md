# المرحلة 36 — Customer Experience Intelligence

## النطاق

إضافة `/customer-experience` للمتابعة الموحدة للتقييمات والشكاوى وتذاكر SLA المتجاوزة.

## البيانات

- `GET /ratings`
- `GET /support/complaints`
- `GET /support/tickets/breaching`

## الحوكمة

- قراءة فقط؛ لا تعدّل الصفحة التقييمات أو الشكاوى أو التذاكر.
- الوصول يحترم `support.manage` من Backend.
- تحديث تلقائي كل 30 ثانية.

هذه الحزمة تنفّذ Stage36 فقط ولا تبدأ Stage37.
