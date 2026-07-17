# المرحلة 31 — City Scaling & Launch Control

## النطاق

لوحة `/city-scaling` لإدارة إطلاق المدن وسعتها، باستخدام `cities/scaling` الموجود في Backend.

## الواجهة

- قائمة المدن مع الاسم والدولة وعدد السائقين وحالة الإطلاق.
- حفظ حد السائقين النشطين، حد الرحلات اليومية، Ride Classes، Surge cap، وملاحظات التشغيل.
- فحص قبول رحلة دون إنشاء رحلة عبر `GET /cities/scaling/:cityId/acceptance`.
- تغيير حالة الإطلاق بتأكيد واضح وloading ومنع التكرار.
- تحديث تلقائي كل 30 ثانية وتحديث يدوي.

## الحوكمة والأمان

- أُضيف `PermissionsGuard` و`settings.manage` لكل `cities/scaling` endpoints.
- عمليات upsert وتغيير حالة الإطلاق تسجل `CITY_SCALING_CONTROL_UPDATED` و`CITY_LAUNCH_STATUS_CHANGED` في `AuditLog` مع actorId.
- Backend يبقى حارس الانتقالات؛ الواجهة لا تفترض انتقالاً قانونياً.
- لا توجد كتابة مالية أو تغيير Ledger ضمن هذه المرحلة.

## العقود

- `GET /cities`
- `GET /cities/scaling`
- `POST /cities/scaling`
- `PATCH /cities/scaling/:cityId/launch-status`
- `GET /cities/scaling/:cityId/acceptance?rideClass=ECONOMY`

هذه الحزمة تنفّذ Stage31 فقط ولا تبدأ Stage32.
