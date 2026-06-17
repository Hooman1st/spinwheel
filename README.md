# 🎡 چرخ و فلک جایزه

اپلیکیشن کامل چرخ و فلک جایزه با پنل مدیریت — Next.js 14 + Supabase

---

## ساختار پروژه

```
/
├── app/
│   ├── campaign/[slug]/         ← اپ موبایل کاربران
│   ├── admin/                   ← پنل مدیریت (وب)
│   └── api/campaigns/[id]/
│       ├── register/            ← API ثبت‌نام
│       └── spin/                ← API چرخش
├── components/SpinWheel.tsx     ← چرخ SVG با انیمیشن
├── lib/supabase.ts              ← کلاینت‌های Supabase
├── middleware.ts                ← محافظت از /admin
└── supabase/schema.sql          ← ساختار دیتابیس
```

---

## مراحل راه‌اندازی

### مرحله ۱ — ساخت پروژه Supabase

1. به supabase.com برو و یک حساب رایگان بساز
2. روی New Project کلیک کن
3. نام پروژه و رمز دیتابیس انتخاب کن
4. Region: Frankfurt (نزدیک‌ترین به ایران)
5. چند دقیقه صبر کن تا پروژه آماده بشه

### مرحله ۲ — اجرای Schema دیتابیس

1. توی Supabase به SQL Editor برو
2. محتوای فایل supabase/schema.sql رو کپی کن
3. Paste کن و Run بزن
4. باید ۴ جدول + داده‌های نمونه ساخته بشه

### مرحله ۳ — گرفتن کلیدهای API

توی Supabase به Settings > API برو و این ۳ مقدار رو کپی کن:
- Project URL  →  NEXT_PUBLIC_SUPABASE_URL
- anon public  →  NEXT_PUBLIC_SUPABASE_ANON_KEY
- service_role →  SUPABASE_SERVICE_ROLE_KEY

### مرحله ۴ — نصب لوکال

```bash
npm install
cp .env.example .env.local
```

فایل .env.local رو باز کن و پر کن:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ADMIN_PASSWORD=یک_رمز_قوی
```

```bash
npm run dev
```

- اپ موبایل:  localhost:3000/campaign/spring-2025
- پنل ادمین:  localhost:3000/admin  (user: admin / pass: همان ADMIN_PASSWORD)

### مرحله ۵ — دیپلوی روی Vercel

1. کد رو توی GitHub آپلود کن
2. به vercel.com برو و New Project بزن
3. ریپو رو انتخاب کن
4. توی Environment Variables همان ۴ متغیر .env.local رو وارد کن
5. Deploy بزن

بعد از دیپلوی:
- اپ موبایل:  https://your-app.vercel.app/campaign/spring-2025
- پنل ادمین:  https://your-app.vercel.app/admin

---

## پنل مدیریت

| بخش | کارها |
|-----|-------|
| جوایز | افزودن/حذف/ویرایش جایزه، احتمال، رنگ |
| تنظیمات | نام کمپین، slug، دعوت برای چرخش مجدد |
| متون | ویرایش تمام متن‌های اپ موبایل |
| آمار | تعداد ثبت‌نام، چرخش، رفرال، توزیع جوایز |

---

## نکات امنیتی

- انتخاب جایزه سمت سرور انجام می‌شود
- service_role_key فقط در API Routes استفاده می‌شود
- پنل ادمین با HTTP Basic Auth محافظت شده است
