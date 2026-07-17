# المرحلة 46 — Settings Governance Overview

## النطاق
لوحة قراءة‑فقط `/settings-governance` تقدّم نظرة حوكمة موحّدة لمنظومة الإعدادات: عدّادات، مسودّات بانتظار النشر، طلبات تغيير معلّقة، وسجل تغييرات موحّد عبر جميع المفاتيح.

## الفجوة
- منظومة الإعدادات (settings/feature-flags/cities/zones + موافقات) غنية، لكن لم يكن هناك endpoint مُجمّع يعرض الحالة الكلية.
- المراجعات كانت متاحة لكل مفتاح على حدة (`GET /settings/:key/revisions`) دون سجل موحّد.

## Backend (إضافي — متوافق خلفيًا)
- `GET /settings/governance/overview?limit` (`settings.manage`) — `SettingsService.governanceOverview`.
- مُسجّل قبل `GET /settings/:key` لتجنّب تعارض المسارات.
- يرجع: `totals` (إجمالي/منشور/مسودّات/عامّة/حساسة/طلبات معلّقة)، `pendingDrafts`، `pendingRequests`، `recentChanges` (من `SettingRevision` عبر كل المفاتيح).
- يستثني المفتاح الداخلي `system.configVersion`.

## الواجهة
- بطاقات إجمالية + جدول المسودّات + قائمتا الطلبات المعلّقة وأحدث التغييرات + تحديث تلقائي كل 30 ثانية.
- روابط إلى الإعدادات والموافقات للإجراء.

## الحوكمة
قراءة فقط؛ النشر/الاعتماد/التراجع يبقى محكومًا بمساراته الحالية (`settings.manage`) مع SettingRevision/AuditLog.

هذه الحزمة تنفّذ Stage46 فقط ولا تبدأ Stage47.
