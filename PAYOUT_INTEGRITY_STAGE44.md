# المرحلة 44 — Driver Earnings & Payout Integrity

## النطاق
لوحة قراءة‑فقط `/payout-integrity` تطابق صافي أرباح كل سائق (`DriverEarning.net`) مع المسحوب فعليًا (PAID) والمعلّق (PENDING+APPROVED)، وتُبرز الفجوات والشذوذ.

## الفجوة
- أرباح السائقين (`DriverEarning`) لم تكن معروضة عبر أي متحكم.
- صفحة "الأرباح" الحالية تعرض السحوبات فقط دون مطابقتها بما استحقّه السائق.

## Backend (إضافي — متوافق خلفيًا)
- `GET /withdrawals/payout-integrity?limit` (`payments.read` / `payments.manage`) — `WithdrawalsService.payoutIntegrity`.
- تجميع: `driverEarning.groupBy` + `withdrawRequest.groupBy(driverId,status)` + ربط بالسائق/المستخدم.
- لكل سائق: netEarnings، paid، pending، available = net − paid − pending، gap = net − paid.
- إشارات: `PAID_EXCEEDS_EARNED`، `NEGATIVE_AVAILABLE`، `WITHDRAW_WITHOUT_EARNINGS`.
- لا تعديل على المخطط ولا على أي عقد قائم.

## الواجهة
- بطاقات إجمالية + جدول لكل سائق + فلتر "المُعلّمون فقط" + تحديث تلقائي كل 30 ثانية.
- روابط إلى طلبات السحب والأرباح للإجراء.

## الحوكمة
قراءة فقط؛ اعتماد/دفع/رفض السحوبات يبقى محكومًا بـ `payments.manage`. Ledger يبقى مصدر الحقيقة.

هذه الحزمة تنفّذ Stage44 فقط ولا تبدأ Stage45.
