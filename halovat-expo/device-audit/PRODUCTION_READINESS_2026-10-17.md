# Halovat Android — production tayyorlik tekshiruvi, 2026-10-17

**Natija: production uchun tayyor emas.** Bu tekshiruv barcha funksiyalar yoki barcha qurilmalar sinovdan o'tdi degani emas. ADB ro'yxatida fizik telefon yo'q; foydalanuvchi oxirgi APKdagi kompas ishlamaganini xabar qilgan.

## Ochiq muammolar va tekshiruv chegaralari

1. **Kompas — foydalanuvchi tasdiqlagan ochiq xato.** `src/hooks/useCompass.ts` hali `expo-location.watchHeadingAsync` ishlatadi va sensorni boshlashdan oldin joylashuv ruxsatini kutadi. Boshqa ilovaning sensor arxitekturasi yoki yangi native kompas hali integratsiya qilinmagan. Ruxsatga bog'liqlik kuzatilgan kod holati; fizik Redmi muammosining aniq ildiz sababi hali o'lchanmagan.
2. **Namoz va masjid uchun ovozsiz rejim — qurilmada tasdiqlanmagan.** Oldingi kod tuzatishlari mavjud, ammo Redmi Note 8 va 10 Lite'da ekran qulflanganida ishga tushish, fon holati, qayta yuklash, masjidga kirish/chiqish va avvalgi ovozni tiklash bo'yicha yakuniy sinov natijasi yo'q. Jadval unit testlari Android ruxsatlari, DND va geofence ishlashini tasdiqlamaydi.
3. **GPS va tezlik — cheklangan tekshiruv.** GPS xizmatining boshqaruv mantiqi testdan o'tdi. Haqiqiy GPS topish vaqti, interfeys kadrlar tezligi, xotira va batareya sarfi mazkur Redmi qurilmalarida o'lchanmagan.
4. **Masjid suratlari to'liq emas.** `src/services/mosquePhotos.ts` faqat uchta mahalliy suratni moslaydi. Umumiy masjidlar uchun surat yetkazuvchi xizmat ulanmagan.
5. **Jadvalning muddati cheklangan.** `src/context/AppContext.tsx` Android namoz eslatmalari va avtomatik ovozsiz rejim uchun 30 kunlik jadval tuzadi. Ilova qayta ochilmasa ushbu jadval tugaydi. Native `HalovatAutoQuiet.refresh` mavjud oynalardan navbatdagi alarmni tanlaydi; yangi kunlarning namoz vaqtlarini hisoblab qo'shmaydi.
6. **Yuborilgan APK sinov kaliti bilan imzolangan.** `apksigner verify --print-certs` 14-oktabr APKsi uchun `CN=Android Debug` qaytardi. Mahalliy `android/app/build.gradle` release varianti ham debug signing config ishlatadi. EAS hisobidagi production credentials tekshirilmagan; ushbu APK production imzosi bor deb hisoblanmaydi.
7. **Expo versiya tekshiruvi o'tmadi.** Yakuniy `expo-doctor`: 20/21. To'qqiz paket uchun SDK tavsiya qilgan patch versiyasi bilan nomuvofiqlik bor: @expo/ui, expo, expo-constants, expo-dev-client, expo-linking, expo-location, expo-notifications, expo-router, expo-splash-screen. Bu ogohlantirishlar kompas xatosining sababi ekanini tasdiqlamaydi. Yangilash va regressiya tekshiruvi hali bajarilmagan.

## Shu tekshiruvda tuzatilgan xato

`.easignore` ichidagi `android/` va `ios/` qoidalari ichki local Expo modulini ham chiqarib tashlayotgan edi. Qoidalar `/android/` va `/ios/` bilan faqat loyiha ildiziga chegaralandi; modulning build, .gradle va .cxx chiqishlari alohida chiqariladi. Natijada native modul manbalari upload tarkibida qoladi.

Gitignore matcher bilan Android modulining Kotlin manbasi, manifesti, build.gradle va expo-module.config.json chiqarilmasligi, generated kataloglar chiqarilishi tekshirildi. `expo-doctor`dagi local module exclusion xatosi yo'qoldi: 19/21 dan 20/21 ga o'tdi. Bulut build ishga tushirilmagan.

Qoida manbasi: [Expo .easignore hujjati](https://docs.expo.dev/build-reference/easignore/).

## Bajarilgan tekshiruvlar

- `npm run typecheck`: muvaffaqiyatli.
- `npm run lint`: muvaffaqiyatli.
- `node scripts/check-location.cjs`: muvaffaqiyatli.
- `node scripts/check-mosques.cjs`: muvaffaqiyatli.
- `node scripts/check-map.cjs`: muvaffaqiyatli.
- `:halovat-focus:testReleaseUnitTest -PreactNativeArchitectures=arm64-v8a`: Gradle muvaffaqiyatli, test vazifasi UP-TO-DATE. Saqlangan XML: 5 test, 0 failure, 0 error; natija sanasi 2026-10-14. Bu yangi fizik qurilma testi emas.
- APK sertifikati o'qildi; ADB qurilmalar ro'yxati bo'sh.
- `npx --yes expo-doctor`: yakunda 20/21, exit code 1. Tafsilotlar `production-doctor-2026-10-17.log`da.

Yangi APK chiqarilmadi. `.easignore` tuzatishi allaqachon o'rnatilgan APKdagi kompas yoki ovozsiz rejimni o'zgartirmaydi. Ushbu tekshiruv ilovani ommaviy chiqarishga ruxsat beruvchi yakuniy qabul testi emas.
