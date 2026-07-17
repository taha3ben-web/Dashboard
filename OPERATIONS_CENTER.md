# المرحلة 25 — مركز العمليات

أول مرحلة فعلية لتجهيز Dashboard وربطه بعقود Backend التشغيلية.

## نقاط النهاية المرتبطة

- `GET /dashboard/ops/overview`
- `GET /dashboard/ops/settlements`
- `POST /dashboard/ops/settlements/retry`
- `GET /dashboard/ops/dead-letters`
- `POST /dashboard/ops/dead-letters/:id/retry`
- `GET /dashboard/ops/incidents`
- `POST /dashboard/ops/incidents/:id/resolve`
- `POST /dashboard/ops/reconciliation/run`
- `GET /dashboard/ops/risk-reviews`

## سلوك الواجهة

- تحميل متوازٍ للوحات الأربع وتحديث تلقائي كل 30 ثانية.
- حالة صحية موحّدة: OK / WARN / CRITICAL.
- Drill-down للتسويات وDLQ وحوادث Ledger ومراجعات المخاطر.
- منع تكرار الإجراءات أثناء التنفيذ، وتحديث اللقطة بعد النجاح.
- العرض لمن يملك `reports.read`؛ إجراءات الإصلاح لمن يملك `payments.manage`.
- فهم مغلف الأخطاء `{ error: { code, message, details } }`.

هذه هي المرحلة 25 فقط؛ بقية صفحات Dashboard تُستكمل مرحلة بمرحلة.
