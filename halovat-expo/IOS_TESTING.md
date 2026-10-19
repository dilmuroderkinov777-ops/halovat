# Halovat — iPhone sinovi

2026-10-10 holati: foydalanuvchi Expo Go’da ilova iPhone’da ochilganini tasdiqladi. Alohida imzolangan IPA tayyor emas; Mac’da native build sinovi bajarilmadi.

Foydalanuvchining test qurilmasi: iPhone 15 Pro Max, iOS 26.4. Expo CLI `dilmurodcg` akkauntiga kirgan; `8082` serveridagi iOS manifest HTTP 200 va SDK 57.0.0 bilan qaytdi. Foydalanuvchi qulf ekranida bildirishnoma kelganini, ammo vibratsiya/flash bo‘lmaganini bildirdi. Xarita ochilgan, masjidlar ro‘yxati esa bo‘sh bo‘lgan. Quyidagi tuzatishlarning fizik iPhone’dagi natijasi hali tasdiqlanmagan.

## Hozir: Expo Go

1. iPhone’ga App Store’dan Expo Go o‘rnating. Loyiha Expo SDK 57 bilan ishlaydi. Native Halovat buildining minimal tizimi — iOS 16.4.
2. https://expo.dev/signup orqali bepul Expo akkaunti yarating. Expo Go va kompyuterdagi Expo CLI bir xil akkauntga kirishi kerak.
3. Kompyuterda loyiha katalogidan `npx expo login --browser` orqali kiring. Parol, OTP yoki tokenni chatga yubormang.
4. `npm run iphone` bilan serverni ishga tushiring. Kompyuter va iPhone bir tarmoqda bo‘lsin. iPhone kamerasi bilan terminaldagi QR kodni skanerlang va Expo Go’da oching.
5. iOS so‘rasa, Expo Go uchun Local Network, joylashuv va bildirishnoma ruxsatlarini bering.

Expo Go testida ilova kompyuterdagi Metro serverga bog‘liq. Bu alohida Halovat IPA o‘rnatilishi yoki TestFlight buildi emas; ikonka va native splash ham Expo Go konteynerida tekshirilmaydi.

## Sinash mumkin bo‘lganlar

- Til tanlash, welcome sahifalari, bosh sahifa, profil va mavzular.
- Namoz jadvali, tracking/qazo va haftalik/oylik/yillik natijalar.
- Tasbeh: sanash, 33 da keyingi zikr, undo/reset va faol ilovadagi haptic signal.
- 25 duo, mavzular va saqlangan duolar.
- Haqiqiy iPhone’da GPS va heading sensori asosidagi kompas.
- O‘zbekistonning 2 347 haqiqiy OSM yozuvidan yaqin masjidlar ro‘yxati internet bo‘lmasa ham chiqadi; xarita plitkalari internet talab qiladi. “Yangilash” serverga so‘rov yuboradi, server xatosida ro‘yxat saqlanadi va ogohlantirish chiqadi. Ma’lumotlar manbasi va cheklovlari: `src/data/MOSQUE_DATA.md`.
- Mahalliy namoz eslatmalari, namozdan keyingi “O‘qidim/Qazo” amallari va zikr eslatmalari.

Profil → Eslatmalarni tekshirish → Sinov bildirishnomasi. Telefonni qulflab, 10 soniyadan keyingi eslatmani tekshiring. Notification Center’da namozdan keyingi bildirishnomani bosib ushlab turing va “O‘qidim/Qazo” amallarini sinang. Sozlamalarda banner, ovoz va qulf ekraniga ruxsat alohida ko‘rsatiladi.

2026-10-10 yangilanishi: Ka’ba tepada qotib turadigan kompasda strelka telefon yo‘nalishini Qiblaga nisbatan ko‘rsatadi (`heading − bearing`). Chapga burilganda strelka chapga, o‘ngga burilganda o‘ngga yuradi. N/E/S/W belgilari ham shu Qibla koordinatasida turadi. Strelka dastasi 16 dan 10, boshi 42 dan 28 SVG birlikka ingichkalashtirildi. Toshkent yo‘nalishi 240.30°; ±30° va 0/360° chegarasi hisoblash tekshiruvlaridan o‘tdi. Haqiqiy sensor yo‘nalishini iPhone’da qayta tasdiqlash kerak.

iOS eslatmalari umumiy yordamchi orqali `sound: default`, `interruptionLevel: active` bilan yaratiladi. Ilova ochiq paytda kelgan Halovat eslatmalariga haptic feedback qo‘shildi. Profil qo‘llanmasi va tekshiruv panelidagi “Vibratsiyani tekshirish” faqat faol ilovadagi haptic feedback’ni sinaydi; bu qulf ekranidagi vibratsiya ishlashini tasdiqlamaydi. Provisional ruxsat, o‘chirilgan Sounds/banner/Lock Screen uchun ogohlantirish ko‘rsatiladi. Tizimdagi global vibratsiya va flash sozlamalari ilovadan o‘qilmaydi yoki o‘zgartirilmaydi. Foydalanuvchi qulf ekranida vibratsiya/flash hali ishlamaganini bildirdi; fizik qayta sinov natijasi kutilmoqda.

iOS rejasi: namoz vaqti uchun 7 kun, namozdan keyingi savollar uchun 3 kun; ilovani ochishda yangilanadi. 35 + 15 + 2 kundalik eslatma va 1 sinov so‘rovi eng ko‘pi 53 ta bo‘ladi. Kelajakda reja muddatini uzaytirishda iOS pending notification chegarasini hisobga olish kerak.

## iOS imkoniyatlari

- Halovat iPhone’dagi umumiy ovozsiz/Focus rejimini avtomatik yoqmaydi; masjid geofence orqali ovozsiz rejim ham iOS’da amalga oshirilmagan.
- Ilova qo‘ng‘iroqlar tarixini o‘qimaydi yoki tizim qo‘ng‘iroqlarini jim qilmaydi.
- Qulf ekranidagi banner, ovoz, vibratsiya va uyg‘onishni iOS sozlamalari boshqaradi. Android’dagi maxsus to‘liq ekran oynasi hamda 10 soniya vibratsiya/flash iOS’da amalga oshirilmagan.
- Vibratsiya: Settings → Sounds & Haptics → Haptics → Always Play. Settings → Accessibility → Touch → Vibration ham yoqilgan bo‘lsin. Bildirishnomalar uchun Expo Go (alohida buildda Halovat) → Sounds va Lock Screen yoqilganini tekshiring.
- Flash: Settings → Accessibility → Audio & Visual → Flash for Alerts → LED Flash yoki Both. Jim rejimda Flash in Silent Mode’ni ham yoqing; ochiq ekran uchun Flash While Unlocked kerak. Profil → Vibratsiya, chiroq va Focus bo‘limida ko‘rsatmalar va Apple havolalari bor. Bu sozlamalar tizim darajasida foydalanuvchi tomonidan yoqiladi.
- Focus paytida eslatma kerak bo‘lsa, Focus’ning ruxsat berilgan ilovalariga Halovatni (Expo Go testida Expo Go’ni) qo‘shing.

## Keyin: alohida o‘rnatiladigan Halovat

Windows’da mahalliy Xcode kompilyatori yo‘q. EAS Build orqali macOS build xizmatidan foydalanish mumkin; CLI Expo akkauntiga kirgan, EAS projectId hali belgilanmagan. EAS uchun kerakli manbalar `.easignore` bilan ajratilgan; mahalliy log, audit XML, generatsiya qilingan native papkalar va imzolash fayllari uploadga kirmaydi.

Apple Developer Program a’zoligi bilan:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
npm run build:ios:preview
```

`device:create` orqali iPhone ro‘yxatdan o‘tkaziladi. Preview IPA faqat uning provisioning profiliga kiritilgan qurilmalarga o‘rnatiladi. Keyin o‘rnatish havolasi iPhone’da ochiladi.

TestFlight uchun `npm run build:ios:production`, so‘ng App Store Connect sozlangach `npx eas-cli@latest submit --platform ios --latest` ishlatiladi. Apple a’zolik, sertifikat/profil va App Store Connect sozlamalari hali bajarilmagan. Akkauntni loyihaga ulashda haqiqiy owner/projectId ishlatilsin; namuna ID qo‘yilmasin.

Hujjatlar:

- https://docs.expo.dev/get-started/start-developing/
- https://docs.expo.dev/build/internal-distribution/
- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://support.apple.com/guide/iphone/flash-indicator-light-screen-notifications-iph79ced06b1/ios
- https://support.apple.com/en-mide/guide/iphone/iph07c867f28/26/ios/26
- https://support.apple.com/en-au/guide/iphone/iphd722c9100/ios
- https://support.apple.com/en-us/105112
