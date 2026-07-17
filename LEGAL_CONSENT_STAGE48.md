# Stage 48 — الشروط القانونية والخصوصية والموافقة (Legal & Consent)

إدارة كاملة من لوحة التحكم للمستندات القانونية (الخصوصية/الشروط/اتفاقية السائق…)
وتتبّع موافقة المستخدمين عليها في تطبيقَي الراكب والسائق.

## النماذج الجديدة (Prisma)
- `LegalDocument`: مستند لكل (نوع + جمهور + لغة)، بحقول مسوّدة/منشور منفصلة
  (`title/body` مقابل `publishedTitle/publishedBody`)، `status` (WorkflowStatus)،
  `version` (المسودة) و`publishedVersion` (المنشور)، `requiresAcceptance`،
  `effectiveAt`، `isActive`.
- `LegalDocumentVersion`: لقطة تاريخية لكل نشر (`documentId + version` فريدة).
- `UserConsent`: سجل موافقة موثّق لكل مستخدم/مستند/إصدار مع `ipAddress`،
  `userAgent`، `source`، وربط اختياري بلقطة الإصدار.
- ترحيل: `prisma/migrations/20260715100000_legal_documents_consent/migration.sql`.
- أُضيفت العلاقة العكسية `consents UserConsent[]` إلى نموذج `User`.

## مسارات الـ API
### إدارة اللوحة (STAFF + settings.manage)
- `GET /legal-documents?type=&audience=` — قائمة كل المستندات.
- `GET /legal-documents/:id` — مستند مع آخر 10 إصدارات وعدد الموافقات.
- `GET /legal-documents/:id/versions` — سجل الإصدارات المنشورة.
- `POST /legal-documents` — إنشاء مسودة (فريدة بالنوع+الجمهور+اللغة).
- `PATCH /legal-documents/:id` — تعديل؛ أي تغيير للمحتوى يعيد الحالة إلى DRAFT
  ويزيد `version`.
- `POST /legal-documents/:id/publish` — نشر: ينسخ المحتوى إلى الحقول المنشورة،
  يزيد `publishedVersion`، ويسجّل لقطة `LegalDocumentVersion`.

### مستخدم التطبيق (JWT)
- `GET /legal-documents/pending` — المستندات الإلزامية المنشورة غير الموافق عليها
  بأحدث إصدار، مفلترة حسب دور المستخدم (راكب/سائق + ALL).
- `POST /legal-documents/:id/accept` — تسجيل موافقة على الإصدار المنشور الحالي
  (idempotent عبر فريدة `userId+documentId+version`)، يلتقط IP/User-Agent.

### عام (بدون مصادقة)
- `GET /public/legal?audience=&locale=` — المستندات المنشورة والمفعّلة لعرضها
  في شاشة الموافقة الأولى قبل تسجيل الدخول.

## لوحة التحكم
- صفحة `/legal-documents` ضمن مجموعة «الإدارة والأمان» (أيقونة BookOpen):
  بطاقات إجمالية + جدول + نموذج إنشاء/تعديل + تأكيد نشر.
- الصلاحية: `/legal-documents` = `settings.manage` (قبل قاعدة `/settings`).

## ملاحظات التشغيل
- بعد السحب: `npx prisma generate` ثم `npx prisma migrate deploy` لتفعيل النماذج
  والجداول الجديدة.
- الموافقة تُربط بـ `publishedVersion` الحالي؛ أي نشر جديد يتطلب موافقة جديدة.
