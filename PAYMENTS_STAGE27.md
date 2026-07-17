# المرحلة 27 — Dashboard المدفوعات والاستردادات

## النطاق

تحويل `/payments` و`/refunds` إلى Control Plane تشغيلي مرتبط بحالة الدفع، أحداث المزوّد، Ledger reversal، وإشارات المخاطر في تفاصيل الدفعة.

## عقود Backend

- `GET /payments`
- `GET /payments/summary`
- `GET /payments/:id`
- `GET /payments/refunds`
- `POST /payments/:id/capture`
- `POST /payments/:id/refund`
- `POST /payments/:id/cancel`

القراءة تتطلب `payments.read` أو `payments.manage`، والإجراءات الحساسة تتطلب `payments.manage`.

## الحوكمة المالية

- آلة الحالات موحّدة في Backend (`payment-transitions.ts`) وتنعكس في الواجهة (`lib/payment.ts`).
- `REFUNDED` و`CANCELED` نهائيتان، والاسترداد المكرر يُرفض بكود `INVALID_PAYMENT_TRANSITION`.
- كل انتقال إداري يكتب `PAYMENT_STATUS_CHANGED` في `AuditLog` مع actorId.
- الاسترداد يمر عبر `FinancialService.refundPayment()` وينشئ Ledger reversal متوازنًا؛ لا تعدّل الواجهة الرصيد.
- شاشة الاستردادات تكشف غياب القيد العكسي إن وجدت فجوة (MISSING).
- أضيف الكودان `PAYMENT_NOT_FOUND` و`INVALID_PAYMENT_TRANSITION` باللغات ar/en/fr.

## الواجهة

- عرض الحالة والطريقة والمزوّد والمبلغ والعملة والرحلة والمستخدم والمرجع وسبب الحالة والتوقيتات.
- صفحة التفاصيل تعرض PaymentEvent وLedger entries/reversal وإشارات المخاطر.
- تأكيد موحّد (Modal) للإجراءات، سبب إلزامي للإلغاء والاسترداد، loading، منع النقر المتكرر، ورسائل تعتمد على كود API لا على النص فقط.
- الإجراءات تظهر فقط عندما يكون الانتقال مسموحًا (`availablePaymentActions`).
- تحديث يدوي وتلقائي كل 30 ثانية.
- استخدام `money(value, currency)`.

## الملفات الرئيسية

- Backend: `payment-transitions.ts` (+spec)، `payments.controller.ts`، `payments.service.ts`، `api-error.util.ts`.
- Dashboard: `lib/payment.ts`، `components/PaymentActionDialog.tsx`، `payments/page.tsx`، `refunds/page.tsx`، `lib/api.ts` (getApiErrorCode)، `lib/permissions.ts` (/refunds).

هذه الحزمة تنفّذ Stage27 فقط ولا تبدأ Stage28.
