# المرحلة 28 — Risk & Security Dashboard

## النطاق

تحويل صفحات الأمان والمخاطر إلى Control Plane تشغيلي كامل مرتبط بـ risk.service، مع RBAC صارم وتسجيل كل إجراء.

## عقود Backend

| المسار | الصلاحية | الوصف |
|---|---|---|
| `GET /risk/events` | `risk.review` | سجل أحداث المخاطر (مُضاف Stage28) |
| `GET /risk/blacklist` | `risk.manage` | قائمة الحظر النشطة |
| `POST /risk/blacklist` | `risk.manage` | إضافة مدخل حظر |
| `DELETE /risk/blacklist` | `risk.manage` | رفع مدخل حظر |
| `GET /risk/holds` | `risk.manage` | قائمة الحجوز |
| `POST /risk/holds` | `risk.manage` | وضع حجز يدوي |
| `POST /risk/holds/:id/release` | `risk.manage` | رفع حجز |
| `GET /risk/reviews` | `risk.review` | طابور المراجعات |
| `POST /risk/reviews/:id/resolve` | `risk.review` | معالجة مراجعة (موافقة/رفض) |

## الحوكمة

- جميع الإجراءات تكتب في AuditLog عبر NestJS guards (actorId من JWT).
- الحجز والحظر قراءة فقط للمستخدمين بدون `risk.manage`.
- الرفض يُلزم سبباً (resolution مطلوب) — مطبّق في الواجهة.
- لا تعديل مباشر للرصيد — الاسترداد يمر عبر FinancialService.
- تحديث تلقائي كل 30 ثانية + يدوي.

## الملفات الجديدة

- Backend: `risk.service.ts` (listEvents)
- Backend: `risk.controller.ts` (GET /risk/events)
- Backend: `api-error.util.ts` (RISK_REVIEW_NOT_FOUND, RISK_HOLD_NOT_FOUND, BLACKLIST_ENTRY_NOT_FOUND)
- Dashboard: `src/app/(dashboard)/risk-reviews/page.tsx`
- Dashboard: `src/app/(dashboard)/blacklist/page.tsx`
- Dashboard: `src/app/(dashboard)/risk-holds/page.tsx`
- Dashboard: `src/app/(dashboard)/risk-events/page.tsx`
- Dashboard: `src/lib/permissions.ts` (4 مسارات جديدة)
- Dashboard: `RISK_STAGE28.md`

هذه الحزمة تنفّذ Stage28 فقط ولا تبدأ Stage29.
