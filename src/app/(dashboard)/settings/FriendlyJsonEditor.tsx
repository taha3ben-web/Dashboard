"use client";

type Field = { key: string; label: string; type?: "text" | "url" | "color" | "boolean" | "csv"; placeholder?: string };
type Definition = { title: string; description: string; fields: Field[] };

const DEFINITIONS: Record<string, Definition> = {
  "app.theme": { title: "هوية وألوان التطبيق", description: "اختر الألوان بصريًا بدل تعديل أكواد JSON.", fields: [
    { key: "primaryColor", label: "اللون الأساسي", type: "color" }, { key: "secondaryColor", label: "اللون الثانوي", type: "color" }, { key: "accentColor", label: "لون التمييز", type: "color" },
  ]},
  "app.general": { title: "اللغة والإعدادات العامة", description: "حدّد اللغة الافتراضية واللغات المتاحة.", fields: [
    { key: "defaultLocale", label: "اللغة الافتراضية", placeholder: "ar" }, { key: "supportedLocales", label: "اللغات المتاحة", type: "csv", placeholder: "ar, fr, en" },
  ]},
  "integrations.email": { title: "البريد الإلكتروني", description: "لا تضع كلمة المرور أو مفتاح API هنا؛ احفظ الأسرار في الخادم.", fields: [
    { key: "fromName", label: "اسم المرسل" }, { key: "fromEmail", label: "بريد المرسل" }, { key: "apiUrl", label: "عنوان خدمة الإرسال", type: "url" },
  ]},
  "integrations.firebase": { title: "إشعارات Firebase", description: "أدخل المعرّفات العامة فقط، وليس المفتاح الخاص.", fields: [
    { key: "projectId", label: "معرّف المشروع" }, { key: "appId", label: "معرّف التطبيق" }, { key: "senderId", label: "معرّف المرسل" },
  ]},
  "integrations.maps": { title: "الخرائط", description: "اختر مزوّد الخرائط وعنوان الطبقة إن استُخدم.", fields: [
    { key: "provider", label: "مزوّد الخرائط", placeholder: "google" }, { key: "tileUrl", label: "رابط طبقة الخريطة", type: "url" },
  ]},
  "integrations.notifications": { title: "قنوات الإشعارات", description: "فعّل القنوات التي تم إعدادها في Backend فقط.", fields: [
    { key: "fcmEnabled", label: "الإشعارات الفورية", type: "boolean" }, { key: "smsEnabled", label: "الرسائل النصية", type: "boolean" }, { key: "emailEnabled", label: "البريد الإلكتروني", type: "boolean" },
  ]},
  "integrations.sms": { title: "الرسائل النصية", description: "اترك مفتاح API في Secret Manager.", fields: [
    { key: "apiUrl", label: "عنوان خدمة SMS", type: "url" }, { key: "sender", label: "اسم المرسل" },
  ]},
  "app.legal": { title: "الشروط والخصوصية", description: "الروابط المنشورة في تطبيقات الركاب والسائقين.", fields: [
    { key: "termsUrl", label: "رابط شروط الاستخدام", type: "url" }, { key: "privacyUrl", label: "رابط سياسة الخصوصية", type: "url" },
  ]},
};

export function friendlySettingTitle(key: string): string | undefined { return DEFINITIONS[key]?.title; }
export function isFriendlySetting(key: string): boolean { return Boolean(DEFINITIONS[key]); }

function parse(draft: string | undefined): Record<string, unknown> {
  try { const value = JSON.parse(draft || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; }
}

export function FriendlyJsonEditor({ settingKey, draft, onChange }: { settingKey: string; draft?: string; onChange: (value: string) => void }) {
  const definition = DEFINITIONS[settingKey];
  const object = parse(draft);
  const update = (field: Field, raw: string | boolean) => {
    const value = field.type === "csv" && typeof raw === "string" ? raw.split(",").map((item) => item.trim()).filter(Boolean) : raw;
    onChange(JSON.stringify({ ...object, [field.key]: value }));
  };
  return <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-gray-950/40">
    <div><div className="font-semibold">{definition.title}</div><div className="mt-1 text-xs text-slate-500">{definition.description}</div></div>
    <div className="grid gap-3 sm:grid-cols-2">{definition.fields.map((field) => {
      const current = object[field.key];
      if (field.type === "boolean") return <label key={field.key} className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"><span>{field.label}</span><input type="checkbox" checked={Boolean(current)} onChange={(event) => update(field, event.target.checked)} className="h-5 w-5" /></label>;
      const value = Array.isArray(current) ? current.join(", ") : String(current ?? "");
      return <label key={field.key} className="space-y-1 text-xs text-slate-500"><span>{field.label}</span><div className="flex gap-2">{field.type === "color" ? <input type="color" value={value || "#2783de"} onChange={(event) => update(field, event.target.value)} className="h-11 w-12 rounded-lg border p-1" /> : null}<input type={field.type === "url" ? "url" : "text"} value={value} placeholder={field.placeholder} onChange={(event) => update(field, event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></div></label>;
    })}</div>
  </div>;
}
