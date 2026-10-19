# Halovat 1.0.1 (versionCode 2) — tekshiruv hisoboti

Holat: haqiqiy telefon sinovi uchun release candidate. Google Play’ga yuklanmagan. “Barcha telefonlarda xatosiz” degan xulosa chiqarilmagan.

## Tuzatilganlar

- Android kompas Expo location heading o‘rniga native SensorManager orqali ishlaydi: rotation vector → geomagnetic vector → akselerometr + magnetometr. Sensor GPS ruxsatidan mustaqil; ekran aylanishi, magnit og‘ishi, tekis ushlash va sensor aniqligi hisobga olinadi.
- Runtime sinovda topilgan GPS ruxsat oynasi → foreground → qayta ruxsat so‘rash sikli to‘xtatildi. Ruxsat avval tekshiriladi, bitta fokus davomida qayta so‘ralmaydi. Qibla strelkasi telefon yo‘nalishiga nisbatan chiziladi.
- Android ochilishidagi majburiy 3.2 soniya animatsiya olib tashlandi. Avvalgi passdagi faol ekran soatlari, tablarni muzlatish va native switch optimizatsiyalari saqlandi.
- GPS so‘rovlari umumiy, muddatli; masjidlar uchun 2347 yozuvli mahalliy katalog, kesh va tarmoq fallback mavjud. Xarita Leaflet kodi ilova ichida.
- 29 ta OSM/Wikidata bilan bog‘langan Wikimedia surat yozuvi, muallif/litsenziya havolalari qo‘shildi. Eski 3 ta mahalliy surat saqlandi. Barcha masjidlarda surat mavjud emas.
- Surat serveri oddiy `okhttp/4.12.0` User-Agent bilan HTTP 403, ilova nomli User-Agent bilan HTTP 200 qaytargani tekshirildi. RN 0.86 Android Image single-object source headersini uzatmasligi ham aniqlandi; array-source orqali Halovat identifikatori uzatiladi. “Yangilash” tugmasi muvaffaqiyatsiz suratlarni ham qayta yuklaydi.
- Namoz jadvali 30 kun oldinga saqlanadi va WorkManager orqali yangilanadi. O‘zgarmagan eslatmalar har foreground’da qayta yozilmaydi. Yangi jadval xato bilan tugasa eski eslatmalar bekor qilinmaydi. Bildirishnoma/fon ro‘yxatdan o‘tish xatosi DND jadvalini bloklamaydi.
- Ekran qulflangan holda sinov va diagnostikani nusxalash qo‘shildi. Yangi release upload kaliti, release minify/shrink, build skripti va telefon tekshiruv jadvali tayyorlandi.

## Avtomatik tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| Expo Doctor | 21/21 PASS |
| ESLint + TypeScript | PASS |
| Kompas hook: ruxsat rad etilishi, permission resume, start/stop, kech eventlar | PASS |
| Scheduler: 30 kunni uzaytirish, quiet lead-in, check-in, eski jadvalni saqlash, fon registratsiyasi xatosi | PASS |
| GPS: kesh, aniqlik, timeout, cleanup, retry | PASS |
| Masjid: mahalliy katalog, radius/saralash, kesh, parallel so‘rovlar va fallback | PASS |
| Xarita/photo matching va URI decoder regressiyasi | PASS |
| Kotlin JUnit | 8/8 PASS (CompassMath 3, PrayerQuietSchedule 5) |
| Android release build + lintVital | PASS |

## Android API 36 emulatorda ko‘rilganlar

- Oldingi 1.0.0 APK ustidan 1.0.1 o‘rnatildi (`adb install -r`): profil/namoz hisobi saqlandi. Test APK sertifikati avvalgi 14-oktabr APK sertifikatiga mos.
- Kompas virtual magnit yo‘nalishi o‘zgarganda **6° → 276°** o‘zgardi, Toshkent qibla burchagi **240°** bo‘lib qoldi. Home → ilovaga qaytishdan keyin ham ko‘rsatkich ishladi.
- GPS ruxsatlari olib tashlanganda kompas **276°** ko‘rsatdi, tanlangan shahar asosida ishladi. GPS yoqilganda **±5 m** emulator fix qabul qilindi.
- Ekran qulflangandagi muddatli sinov: `zen_mode 0 → 3 → 0`; o‘rtada `mWakefulness=Asleep`. Demak ekran o‘chiq holatda alarm DNDni yoqdi va muddat tugagach tikladi. Bu haqiqiy Redmi audiosi/MIUI testi o‘rnini bosmaydi.
- Ilova fonda bo‘lganda WorkManager vazifasi ADB orqali majburan ishga tushirildi: `halovat-renew-prayer-schedule-v2`, `Task successfully finished`, `Worker result SUCCESS`. Bu kundalik OS scheduling vaqtini kafolatlamaydi.
- Buxoro koordinatalarida xarita tile va masjid markerlari ochildi, Kalon masjidi 0 m, yaqin masjidlar ro‘yxati ko‘rindi. Yakuniy tuzatishdan keyin Kalon masjidining Wikimedia surati, muallifi va CC BY 2.0 litsenziyasi ekranda ko‘rildi; surat bo‘yicha 403 loglari takrorlanmadi.
- Tekshirilgan seanslarda AndroidRuntime/ReactNativeJS xato loglari kuzatilmadi. Fizik kompas aniqligi, MIUI fon cheklovlari, haqiqiy qo‘ng‘iroq va masjid geofence o‘tishlari telefon tekshiruvida qoladi.

## Paket tekshiruvi

- Package `uz.halovat.expo`, versionName `1.0.1`, versionCode `2`, minSdk 24, targetSdk 36.
- ABI: arm64-v8a va x86_64. Universal APKning ikki ABI saqlashi fayl hajmini oshiradi; Play AABdan telefon uchun mos splitlarni beradi.
- APK imzosi va 16 KB ZIP alignment tekshirildi. APK/AABdagi 48 ta native kutubxonaning ELF LOAD alignmenti kamida 16 KB. AAB config: `PAGE_ALIGNMENT_16K`.
- `bundletool validate` va `jarsigner` muvaffaqiyatli. Android upload sertifikatining self-signed bo‘lishi kutilgan holat.
- Paketlarda keystore/credentials fayllari yo‘q. Aniq hajmlar va SHA-256: `release-manifest.json`.

## Nashr uchun qolganlar

`RELEASE_TEST_CHECKLIST_2026-10-18.md` va `PLAY_RELEASE_PREPARATION_2026-10-18.md`ga qarang: 2–3 telefonda test, maxfiylik siyosati/aloqa ma’lumotlari, Play listing/deklaratsiyalar. Dependency auditda build vositalariga tegishli 18 high ogohlantirish ochiq; ildizi ikkita advisory. Ular yashirilmadi va tafsilotlar tayyorgarlik hujjatida bor.
