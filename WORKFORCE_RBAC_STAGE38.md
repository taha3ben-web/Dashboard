# المرحلة 38 — Agent, Staff & RBAC Intelligence

## النطاق

إضافة `/workforce-intelligence` كلوحة قراءة للوكلاء والموظفين وسجل التدقيق.

## البيانات

- `GET /agents`
- `GET /staff`
- `GET /logs/audit`

## الحوكمة

لا تنفذ اللوحة أي تغيير على الأدوار أو كلمات المرور أو حالات الحسابات؛ تبقى هذه الإجراءات في صفحات Agents وAccess Control مع RBAC والتدقيق الموجودين.

هذه الحزمة تنفّذ Stage38 فقط ولا تبدأ Stage39.
