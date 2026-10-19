# Halovat 1.0.5 (6) — 2026-10-19

Joriy Android sinov paketi va production imzoli AAB bir xil manbadan yig‘ilgan. GitHub’dagi sinov paketi: [1.0.5 Releases](https://github.com/dilmuroderkinov777-ops/halovat/releases/tag/v1.0.5-test). Google Play’ga nashr qilinmagan.

## So‘nggi holat

- 1.0.5: tanishtiruv rasmlaridagi SVG harflari/raqamlarining ichki bo‘shliqlari uchun `evenodd` qoidasi. Foydalanuvchi skrinshotidagi `4`, `a`, `A` muammosi chiqqan telefonda qayta tekshirilishi kerak; API 36 emulatorda eski versiyada ham bu buzilish qaytarilmagan.
- 1.0.4: Qibla sahifasiga har kirishda sakkiz shaklidagi kalibrlash animatsiyasi popupda chiqadi; avtomatik, tugma yoki Android Back bilan yopiladi.
- 1.0.3: Expo heading usuli qaytarildi; qora Ka’ba yuqorida joyida, telefon strelkasi aylanadi. GPS natijasini kutish sensorni ishga tushirishni to‘xtatmaydi.
- GPS uchun umumiy muddatli so‘rovlar, mahalliy masjid katalogi va suratlar, faol sahifadagi taymerlar, 30 kunlik namoz jadvali va fon yangilanishi, ovozsiz rejim holatini tiklash va diagnostika oldingi tuzatishlar tarkibida saqlangan.

## Tekshiruv va ochiq ishlar

Lint, TypeScript, kompas/joylashuv/masjid/xarita/jadval/URI decoder regressiya skriptlari mavjud. 1.0.5 APK/AAB yig‘ilishi, Android unit testlari, imzo va arxiv validatsiyalari o‘tgan; 48 native kutubxona 16 KB ELF alignment tekshiruvidan o‘tgan, APK/AAB ichidagi 52 kod fayli bir xil.

Haqiqiy Redmi Note 8, 10 Lite va uchinchi telefonda GPS, kompas, SVG yozuvlari, ekran qulflangandagi eslatma hamda masjidga kirish/chiqishni sinang. [To‘liq telefon tekshiruvi](./device-audit/RELEASE_TEST_CHECKLIST_1.0.5.md), [SVG tuzatishi](./device-audit/SVG_TEXT_1.0.5.md), [Play tayyorgarligi](./device-audit/PLAY_RELEASE_PREPARATION_2026-10-18.md).

Play uchun ochiq privacy URL/aloqa ma’lumoti, ruxsat deklaratsiyalari va listing ishlari saqlanadi. 2026-10-18 dependency auditidagi 18 high ogohlantirish ikki build-tool advisory (`braces`, `node-forge`) ta’siriga tegishli; bu masala yopilgan deb belgilanmagan.

## Qayta yig‘ish

```powershell
npm ci
npm run lint
npm run typecheck
node scripts/check-compass.cjs
node scripts/check-location.cjs
node scripts/check-mosques.cjs
node scripts/check-map.cjs
node scripts/check-scheduler.cjs
node scripts/check-uri-decoder.cjs
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -Mode test
```

Production AAB uchun `-Mode production -Credentials <loyihadan-tashqaridagi-credentials.json>` ishlatiladi. Upload kaliti va parollar Git’ga kiritilmaydi. Test APK va production AAB turli imzolar bilan imzolangan.
