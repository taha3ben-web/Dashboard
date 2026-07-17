# Stage 49 — صور الإشعارات والروابط الداخلية (Notification Media)

إضافة دعم صورة الإشعار (`imageUrl`) ورابط داخلي عند الضغط (`deepLink`)
يُداران بالكامل من لوحة التحكم، ويصلان إلى التطبيقين عبر Push وداخل التطبيق.

## النموذج (Prisma)
- `Notification`: أُضيف حقلان اختياريان `imageUrl String?` و`deepLink String?`.
- ترحيل: `prisma/migrations/20260715110000_notification_media/migration.sql`
  (إضافة عمودين TEXT — آمنة ومتوافقة مع السجلات القائمة).

## المسار الخلفي
- `SendNotificationDto`: حقلان اختياريان `imageUrl?` و`deepLink?` (نص حتى 2000 حرف).
- `NotificationsService.send`: يحفظ الحقلين (مع trim/تفريغ إلى null).
- `NotificationsService.deliver`: يمرر `imageUrl`/`deepLink` إلى الموزّع.
- `NotificationDispatcher` (`DispatchInput`):
  - **PUSH**: يمررهما إلى `PushProvider`.
  - **IN_APP**: يُرسلهما ضمن حدث `notification` عبر WebSocket.
- `PushProvider` (FCM): يضع `notification.image = imageUrl`، ويدمج `deepLink` داخل `data`
  ليلتقطه التطبيق عند الضغط.

## لوحة التحكم
- صفحة `/notifications`: حقلا إدخال جديدان (رابط الصورة + الرابط الداخلي)
  مع **معاينة حية** للصورة ومعالجة خطأ التحميل، ومصغّرة للصورة في عمود «النص» بالجدول.

## ملاحظات التشغيل
- بعد السحب: `npx prisma generate` ثم `npx prisma migrate deploy`.
- الحقلان اختياريان بالكامل؛ الحملات القائمة تبقى تعمل دون تغيير (توافق خلفي).
- إرسال Push الفعلي يتطلب ضبط `FCM_SERVER_KEY` (كما في السابق).
