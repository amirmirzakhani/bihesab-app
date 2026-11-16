# بی‌حساب — ساخت APK برای کافه‌بازار / مایکت

شناسه پکیج: `ir.amirzakhani.bihesab` (بعد از انتشار قابل تغییر نیست)

## پیش‌نیاز
- Node.js (نسخه ۲۰ یا بالاتر)
- Android Studio (آخرین نسخه، همراه با JDK داخلی‌اش)

## مراحل
1. داخل پوشه پروژه: `npm install`
2. همگام‌سازی فایل‌های وب با اندروید: `npx cap sync android`
3. باز کردن در Android Studio: `npx cap open android`
4. صبر کن تا Gradle Sync تمام شود (بار اول اینترنت لازم دارد).
5. ساخت keystore و خروجی امضاشده:
   Build ← Generate Signed Bundle / APK ← APK ← Create new keystore
   **فایل keystore و رمزها را جای امن نگه دار؛ آپدیت‌های بعدی باید با همان کلید امضا شوند.**
6. خروجی در `android/app/release/` ساخته می‌شود؛ همین APK را در پنل توسعه‌دهنده بازار/مایکت آپلود کن.

## بعد از هر تغییر در www/
`npx cap sync android` و دوباره Build.

## تغییر نسخه (برای آپدیت)
در `android/app/build.gradle`: `versionCode` را یکی زیاد کن و `versionName` را عوض کن.

## آیکون و splash
فایل‌های اصلی در پوشه `assets/` هستند. بعد از تغییرشان: `npm run icons`

## تست سریع در مرورگر
داخل `www/` اجرا کن: `python3 -m http.server`
