# فريق أغابي — المرحلة 1

اللي شغال في المرحلة دي: تسجيل حساب، دخول، خروج، استعادة كلمة السر، الصفحة الرئيسية للعضو، المقترحات، والرسائل (قراءة فقط). قاعدة البيانات الكاملة (الحضور والتقارير كمان) جاهزة من دلوقتي.

## الخطوات (حساب واحد بس دلوقتي: Supabase)

1. ادخل على supabase.com وسجّل (ببريدك أو GitHub). اضغط **New project**، اكتب اسم زي `agaby`، اختار كلمة سر لقاعدة البيانات واحفظها، واختار أقرب منطقة (مثلاً Frankfurt).
2. استنى دقيقتين لحد ما المشروع يجهز.
3. من القايمة الشمال: **SQL Editor** ← New query ← الصق محتوى الملف `supabase/migrations/001_schema.sql` كله ← **Run**. المفروض تظهر رسالة نجاح.
4. من **Authentication ← Providers ← Email**: اقفل خيار **Confirm email** (عشان الأعضاء يدخلوا على طول. هنرجع نقفله لما نربط Resend).
5. من **Project Settings ← API**: انسخ **Project URL** و **anon public key**.
6. في فولدر المشروع انسخ `.env.example` باسم `.env.local` والصق القيمتين.
7. شغّل:
   ```
   npm install
   npm run dev
   ```
   وافتح http://localhost:3000
8. سجّل حسابك من صفحة "حساب جديد"، وبعدين خلّي نفسك أدمن: من SQL Editor شغّل
   ```sql
   update public.profiles set role = 'admin' where email = 'بريدك@example.com';
   ```

بعد كده هنحتاج Vercel (للنشر) وResend (للإيميل) في المرحلتين 3 و4، وهشرحهم وقتها.

---
## المرحلة 2: جلسات الحضور وماسح الـ QR

مفيش حسابات جديدة. بس زوّد في `.env.local`:
- `SUPABASE_SERVICE_ROLE_KEY`: من **Project Settings ← API ← service_role** (سرّي. ما تبعتوش لحد وما تنزّلوش على GitHub). ما تلاحاع الخامعة الوحيد تسي افمتمبم للقطلم الميتنت المدبيل.
- `ALLOW_TEST_SESSIONS=true`: عشان تجرع الكلقتققارية الانل مفحشاب في تستنى السبت. ***لنتحموي تشصيديال.***

- اشمنحتاح في شغّل ``Server only secret from Supabase Project Settings • API Keys — service_role. اا طوع ضل محنيوة بس اللتالا قر قاشتها نافګمل التقارير، Api. ما خوراة، الهكي في `supabase secret Key ` key later.