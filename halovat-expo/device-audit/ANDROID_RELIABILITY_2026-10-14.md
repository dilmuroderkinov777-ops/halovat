# Android tekshiruvi — 2026-10-14

Foydalanuvchi Redmi Note 8 va 10 Lite’da sekin ishlash, GPS, masjidlar/suratlar va avtomatik ovozsiz rejim muammolarini bildirdi. Bu sessiyada fizik telefon ADB orqali ulanmagan.

## Kiritilgan o‘zgarishlar

- Bosh sahifadagi soniyalik taymer faqat sanagich matnini yangilaydi. Taymerlar boshqa sahifaga o‘tilganda va ilova fonga tushganda to‘xtaydi. Umumiy kontekst endi har 15 soniyada barcha ekranlarni yangilamaydi.
- Kompas ekranining yangilanishi soniyasiga 5 martaga cheklandi. Profilning alohida Compose hostlari oddiy native Switch bilan almashtirildi. Tasbeh holatini saqlash 300 ms davomida jamlanib, fon holatida darhol yozish navbatiga uzatiladi.
- GPS olish shahar, masjid va qibla uchun umumiy xizmatga o‘tkazildi. Bitta so‘rov bir necha ekran bilan bo‘lishiladi; aniqlik va eski koordinatalar tekshiriladi, 12 soniyalik kutishdan keyin native kuzatuvchi olib tashlanadi. GPS o‘chiq bo‘lsa sabab ko‘rsatiladi.
- Leaflet 1.9.4 skripti va CSS APK ichida, litsenziyasi saqlangan. Xarita CDN javobini kutmaydi; OSM plitkalari hali internet talab qiladi. Masjidlar ro‘yxatining mahalliy qidiruvi qayta ishlatiladi va geografik saralash optimallashtirildi.
- Minorning kirillcha OSM nomi va uzun nom variantlari mahalliy surat bilan moslanadi. Suratlar geografik joy bilan tekshiriladi. Boshqa shahardagi nomdosh masjidga Toshkent surati qo‘yilmaydi. Barcha masjidlar uchun haqiqiy surat manbasi mavjud emas.
- Android 14 va undan pastda DND bilan birga ringer ovozsiz holatga o‘tkaziladi; avvalgi holat saqlanadi va yakunda qaytariladi. Android 15+ ilova DND qoidasi orqali ishlashda davom etadi. Foydalanuvchi o‘zgartirgan ovoz/DND holati qaytarishda hisobga olinadi.
- Masjid geofence xatosi saqlangan sozlamani izohsiz o‘chirmaydi. Qayta ochish va joylashuv provayderi o‘zgarganda ulanish qayta uriniladi; sabab diagnostikada ko‘rsatiladi. Yangi, aniq koordinata dastlabki hudud hodisasini kutayotganda holatni aniqlay oladi.
- Namoz rejimi taymeri haqiqiy tugash vaqtiga asoslanadi, fonda o‘tgan vaqtni hisoblaydi. Profil → Eslatmalarni tekshirish’da 15 soniyalik ovozsiz rejim sinovi bor; native qaytarish alarmi saqlanadi.

## Tekshiruvlar

- `npm run typecheck`, `npm run lint`.
- `node scripts/check-location.cjs`: kesh/aniqlik, yangi GPS, umumiy so‘rov, timeout, kech kelgan kuzatuvchini to‘xtatish, eski/noto‘g‘ri koordinata, GPS o‘chiq, xato va qayta urinish.
- `node scripts/check-mosques.cjs`: offline katalog, masofa, saralash, kesh, xizmat xatolari, mirror, timeout va birlashtirilgan so‘rovlar.
- `node scripts/check-map.cjs`: lokal Leaflet, HTML skript sintaksisi, kirillcha/uzun nomlar va suratning geografik mosligi.
- `:halovat-focus:testReleaseUnitTest`: 5 test, 0 xato. Boshlanish/tugash, 10 soniyalik eslatma oralig‘i, shu oraliqda qayta ochish, ustma-ust vaqtlar, bo‘sh/tugagan jadval.
- `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a`: muvaffaqiyatli. Redmi uchun APK: `C:\Users\dilmu\Desktop\Halovat\Halovat-Android-tuzatilgan-2026-10-14.apk`.
- Android 36 x86_64 emulatorda universal build o‘rnatildi va ishga tushdi; app process saqlandi va ReactNativeJS/AndroidRuntime logida Halovat crash’i kuzatilmadi. Bu MIUI’dagi fizik GPS yoki DND natijasini tasdiqlamaydi.

## Redmi’da natijani tasdiqlash

1. APKni mavjud ilovaning yangilanishi sifatida o‘rnating. Profil’da namoz vaqtida ovozsiz rejimni yoqing, DND va aniq alarm ruxsatlarini bering.
2. MIUI’da Halovat uchun batareya → Cheklovlarsiz va avtomatik ishga tushirishni yoqing. Profil → Eslatmalarni tekshirish → Ovozsiz rejimni tekshirish: ovoz 15 soniyadan keyin qaytishini tekshiring.
3. Masjidni tanlang va masjid hududida ovozsiz rejimni yoqing. Aniq joylashuv va “Har doim ruxsat berish” kerak. Telefon qulflangan holda haqiqiy kirish/chiqish sinovi hali bajarilmagan.

Geofence fon hodisasi Android’da kechikishi mumkin: [Android geofencing hujjati](https://developer.android.com/develop/sensors-and-location/location/geofencing). Ringer va DND ruxsati: [AudioManager hujjati](https://developer.android.com/reference/android/media/AudioManager.html). Qo‘llangan Expo API’lari: [SDK 57 Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).
