# المرحلة 47 — Feature Flags Health

## النطاق
لوحة قراءة‑فقط `/feature-flags-health` تقدّم نظرة دورة حياة وصحة لمفاتيح الميزات: الإيقاف العام، عدّادات، وإشارات صحة لكل مفتاح.

## الفجوة
- صفحة `/feature-flags` مدير CRUD كامل (إنشاء/تعديل/حذف/kill switch/preview) لكن لا توجد نظرة صحة مُجمّعة.
- `POST /feature-flags/preview` يحتاج سياق ويرجع قيمًا منطقية، لا إشارات دورة حياة.

## Backend (إضافي — متوافق خلفيًا)
- `GET /feature-flags/health` (`settings.manage`) — `FeatureFlagsService.health()`.
- يرجع: `control` (globalKillSwitch/reason)، `totals` (total/enabled/disabled/scheduled/expired/partialRollout/scoped/needsAttention/killed)، و`items[]` مع `effectivePercentage` (من `resolveRolloutPercentage`) و`health[]`.
- إشارات الصحة: `KILLED`، `EXPIRED`/`EXPIRED_ENABLED`، `SCHEDULED`، `ENDING_SOON` (7 أيام)، `PARTIAL_ROLLOUT`، `STALE` (60 يومًا دون تحديث).
- “تحتاج انتباهًا” = KILLED أو EXPIRED_ENABLED أو STALE.

## الواجهة
- لافتة الإيقاف العام (عند التفعيل) + بطاقات إجمالية + جدول بإشارات صحة ملوّنة.
- فلترة الكل / تحتاج انتباهًا + تحديث تلقائي كل 30 ثانية + رابط لإدارة المفاتيح.

## الحوكمة
قراءة فقط؛ التعديل/الإيقاف يبقى عبر مسارات `/feature-flags` الحالية (`settings.manage`).

هذه الحزمة تنفّذ Stage47 فقط ولا تبدأ Stage48.
