# NOVA Ride — لوحة التحكم (Admin Dashboard)

لوحة تحكم إدارية حديثة لمنصة NOVA Ride، مبنية بـ **Next.js 14 + TypeScript + Tailwind**، تتصل مباشرة بالـ Backend (NestJS) عبر REST API و WebSocket.

> **ملاحظة عن المراحل**: هذه واجهة **المرحلة الأولى**: الدخول + الإحصائيات الحية + الخريطة الحية + إدارة السائقين/الركاب/الرحلات. الأقسام الأخرى (الأرباح، الكوبونات، الإشعارات، الدعم، الإعدادات) موجودة كصفحات جاهزة تُربَط عند بناء وحداتها في الـ Backend.

## المميزات

- 🔐 دخول آمن للموظفين (STAFF فقط) مع JWT + تجديد تلقائي للجلسة.
- 🌗 **الوضع الليلي والنهاري** (Dark/Light) قابل للتبديل.
- 📱 تصميم **متجاوب** (Responsive) واجهة عربية RTL.
- 📊 بطاقات إحصائية حية + رسم بياني للإيرادات (اليوم/الأسبوع/الشهر).
- 🗺️ **خريطة حية** (OpenStreetMap مجانية) تعرض السائقين وتتحدّث لحظيًا عبر WebSocket.
- 🚗 إدارة السائقين: بحث، فلترة، قبول/رفض/تعليق/حظر.
- 👥 إدارة الركاب: بحث، تفعيل/تعليق/حظر.
- 🧭 الرحلات: فلترة حسب الحالة، تفاصيل، تغيير الحالة (إلغاء).

## التقنيات

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **next-themes** (Dark/Light)
- **Recharts** (الرسوم البيانية)
- **React-Leaflet + OpenStreetMap** (الخريطة الحية — مجانية بدون مفاتيح)
- **socket.io-client** (اللحظي) + **axios** (REST)

## التشغيل محليًا

يتطلب أن يكون الـ Backend يعمل (المنفذ 4000).

```bash
npm install
cp .env.example .env      # عدّل العناوين إن لزم
npm run dev
# افتح http://localhost:3000
```

سجّل الدخول بحساب المدير المُنشأ في الـ Backend (seed):
الهاتف `0000000000` — الكلمة `admin1234`.

## متغيرات البيئة

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api   # عنوان REST API
NEXT_PUBLIC_WS_URL=http://localhost:4000        # عنوان WebSocket
```

عند النشر، ضع عنوان دومينك، مثلاً:

```
NEXT_PUBLIC_API_URL=https://api.novaride.app/api
NEXT_PUBLIC_WS_URL=https://api.novaride.app
```

## البناء للإنتاج

```bash
npm run build
npm run start        # يشغّل على المنفذ 3000
```

## النشر على VPS (مختصر)

1. ارفع المجلد إلى الخادم (git clone أو scp).
2. `npm install && npm run build`.
3. شغّل عبر PM2: `pm2 start "npm run start" --name nova-dashboard`.
4. ضع Nginx كـ reverse proxy أمام المنفذ 3000 مع شهادة SSL (Let's Encrypt).
5. تأكد أن `NEXT_PUBLIC_API_URL` و `NEXT_PUBLIC_WS_URL` يشيران لدومين الـ Backend.

## البنية

```
src/
  app/
    login/               صفحة الدخول
    (dashboard)/
      layout.tsx         الهيكل (Sidebar) + حماية الدخول
      page.tsx           الرئيسية (إحصائيات + رسوم + خريطة + آخر الرحلات)
      drivers/           إدارة السائقين
      passengers/        إدارة الركاب
      trips/             الرحلات
      live-map/          الخريطة الحية بملء الشاشة
      earnings|coupons|notifications|support|settings/  صفحات جاهزة للربط
  components/            Sidebar, Topbar, StatCard, DataTable, LiveMap, RevenueChart...
  providers/             ThemeProvider (Dark/Light) + AuthProvider (JWT)
  lib/                   api.ts (axios+تجديد) + socket.ts + format.ts
```

## كيف تتصل باللوحة مع الـ Backend

- REST: كل الطلبات تمرّ عبر `src/lib/api.ts` الذي يرفق التوكن ويجدّده تلقائيًا عند انتهائه.
- WebSocket: `src/lib/socket.ts` يفتح اتصالًا بـ `{ auth: { token } }` ويستقبل `driver:moved` لتحديث الخريطة، و `trip:status` لتحديث حالات الرحلات.
- نقاط اللوحة في الـ Backend: `/api/dashboard/summary`, `/earnings`, `/latest`, `/live-map` (تتطلب حساب STAFF).
