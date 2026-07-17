# المرحلة 29 — Growth & Analytics Dashboard

## النطاق

ترقية صفحة `/reports` من جداول تشغيلية إلى لوحة Growth Analytics مرئية، اعتماداً على `GET /statistics/*` الموجودة، مع إبقاء الـ Ledger مصدراً وحيداً لإيراد المنصة.

## ما أُضيف

- `GrowthTrendCharts`: مخطط Area للرحلات اليومية ومخطط Line لإيراد المنصة اليومي.
- تمرير الفترة (`from` / `to`) نفسها إلى جميع المؤشرات والمخططات.
- استخدام `money(value, currency)` في Tooltip لمخطط الإيراد.
- الإبقاء على الجداول التفصيلية: السلسلة الزمنية، أفضل السائقين، وأكثر المدن نشاطاً.
- لا endpoint جديد ولا migration: العقود الموجودة كافية.

## مصادر البيانات

| Endpoint | الاستخدام |
|---|---|
| `/statistics/overview` | Trips، completion، مستخدمون وسائقون جدد |
| `/statistics/revenue` | إيراد المنصة والعمولات وصافي السائقين؛ Ledger هو المصدر المالي |
| `/statistics/timeseries` | Trips + commission revenue لكل يوم |
| `/statistics/top-drivers` | أفضل السائقين حسب DriverEarning المبني من Ledger |
| `/statistics/top-cities` | المدن الأكثر نشاطاً |
| `/statistics/payment-ops`, `/settlement-ops`, `/withdrawal-ops` | مؤشرات العمليات المالية |

## الصلاحيات

كل endpoints تتطلب `reports.read` (وبعض المؤشرات المالية تسمح بصلاحيات مالية بديلة في Backend). مسار `/reports` محمي بـ `reports.read` في Dashboard.

هذه الحزمة تنفّذ Stage29 فقط ولا تبدأ Stage30.
