# Halovat · Expo

Expo SDK 57, React Native va TypeScript asosida Android/iOS uchun umumiy ilova. `@expo/ui` Android’da Jetpack Compose, iOS’da SwiftUI boshqaruvlarini beradi; qolgan ekranlar responsiv React Native layout’da qurilgan.

Joriy sinov versiyasi **1.0.6**, Android versionCode **7** (2026-10-20). [So‘nggi o‘zgarishlar va tekshiruvlar](./LATEST_RELEASE.md). Haqiqiy Redmi sinovi va Play release tayyorgarligining ochiq ishlari hali qolgan.

## Ishga tushirish

```powershell
npm ci
npx expo start
```

- Kompyuterda brauzer preview: Metro oynasida `w` ni bosing.
- Windows’da Android emulatorda: `powershell -ExecutionPolicy Bypass -File .\run-android.ps1`. Android Studio’dagi AVD va Android SDK o‘rnatilgan bo‘lishi kerak.
- iOS Simulator yoki iPhone uchun Mac va Xcode kerak; EAS Build orqali ham iOS binary tayyorlash mumkin.
- `android/` Expo prebuild yaratgan native loyiha. Native konfiguratsiyani `app.json` va Expo config plugin’lari orqali yuriting.

## Ilova ichidagi imkoniyatlar

- **Til tanlash:** welcome oldida foydalanuvchi HTML dizaynidagi 4 ta til tanlovi. «Davom etish» tanlangan tilni saqlab, 6 sahifali tanishtiruvni ochadi. Welcome, asosiy interfeys matnlari va mahalliy eslatmalar tanlangan tilga moslanadi. Profil → Ilova tili orqali qayta o‘zgartiriladi. Arabcha duo matnlari, shaxsiy ism va bank rekvizitlari saqlanadi.

- **Welcome:** foydalanuvchi bergan olti sahifali HTML tanishtiruvining matni, ranglari, rasmlari va animatsiyalari. «Keyingisi», gorizontal surish va 6 ta nuqta bilan boshqariladi; «Boshlash»dan keyin avtomatik ochilmaydi. Yangi olti sahifali versiya avvalgi foydalanuvchilarga yangilanishda bir marta ko‘rsatiladi. `/welcome` orqali qayta ko‘rish mumkin. Katta tizim shriftida sahifa vertikal suriladi, reduced-motion sozlamasida animatsiya o‘chiriladi.

- **Bugun:** keyingi namozgacha sanagich, bugungi besh vaqt, shahar va taqvim manbasi.
- **Namozlarim:** haftalik katakli jadval, hafta/oy/yil diagrammalari, qazo ro‘yxati. Katakni bosish o‘qildi → qazo → belgilanmagan holatlarni aylantiradi.
- **Namoz rejimi:** taymer; Android’da ruxsat berilganda qo‘ng‘iroqni jim qilish, DND va sessiya paytidagi kiruvchi qo‘ng‘iroqlar ro‘yxati.
- **Tasbeh:** beshta zikr; har 33 ta sanashda uzun vibratsiya va keyingi zikrga avtomatik o‘tish. “Orqaga” oxirgi sanashni, jumladan davra yakunini bekor qiladi. Jami zikr, davralar va davomiylik qurilmada saqlanadi. Har bosishdagi yengil tebranishni alohida o‘chirish mumkin.
- **Duolar:** reference’dagi to‘liq arabcha matn, transliteratsiya va tarjima. Saqlangan duolar ilova qayta ochilganda ham qoladi; arabcha shrift o‘lchami Profil’dan tanlanadi.
- **Masjidlar:** 2347 ta masjiddan iborat mahalliy O‘zbekiston katalogi, cache va OpenStreetMap/Overpass yangilanishidan foydalanadi. Ichki xarita, masofa va nom bo‘yicha filtr bor. Ayrim masjidlarning Wikimedia suratlari muallif/litsenziya havolalari bilan ko‘rsatiladi; barcha masjidlar uchun surat mavjud emas.
- **Qibla:** `expo-location` heading sensori va shahar/GPS koordinatalari bilan ishlaydi. Qora Ka’ba tepada joyida turadi, telefon yo‘nalishini strelka ko‘rsatadi. Har kirishda telefonni sakkiz shaklida aylantirish popupi chiqadi; sensor va GPS shu paytda ishga tushadi. Android’da heading uchun foreground joylashuv ruxsati kerak. Sensor ma’lumoti olinmasa, holat xabari chiqadi.
- **Profil:** ismni tahrirlash, arabcha shrift o‘lchami, shahar tanlovi, taqvim manbasi va uch xil eslatma. Android/iOS’da ilk ochilganda joylashuv ruxsati bir marta so‘ralib, eng yaqin qo‘llab-quvvatlanadigan shahar tanlanadi; qo‘lda tanlangan shahar saqlanadi.

## Namoz taqvimi

Ilova `https://namozvaqti.uz/uz/oylik/{oy}/{shahar}` ochiq HTML jadvalidagi kunlar va vaqtlarni o‘qiydi. Sahifaning ko‘rsatgan manbasi `Book Media Nashr` mahalliy taqvimi; jadval shahar/oy/yilga mosligi va kunlar soni tekshiriladi. Yuklangan oy `AsyncStorage`’da saqlanadi va tarmoq bo‘lmaganda qayta ishlatiladi. Toshkent uchun 2026-yil oktabr oylik jadvali ham offline boshlang‘ich nusxa sifatida qo‘shilgan: unda 3-oktabr vaqtlari **05:04, 12:17, 16:16, 18:03, 19:17**.

Manba jadvali olinmaganda `adhan` hisoblash kutubxonasi bilan MWL usuli va Hanafi Asr tanlovi qo‘llanadi. UI buni alohida “Hisoblangan jadval” deb ko‘rsatadi; bu natija mahalliy bosma jadvalga teng deb belgilanmaydi. Web preview’da brauzer CORS siyosati Namozvaqti.uz’ga bevosita so‘rovni to‘sishi mumkin; Android/iOS native fetch’da browser CORS yo‘q.

## Eslatma va maxfiylik

Namozdan keyingi savol standart holatda o‘chiq. Yoqilganda `expo-notifications` Android’da keyingi 30 kun, iOS’da keyingi 3 kun uchun mahalliy bildirishnomalar rejalashtiradi; foydalanuvchi “O‘qidim” yoki “Qazo” amali bilan belgilaydi. Android’da namozdan keyingi bildirishnoma native eslatma oynasida “O‘qidim” / “Qazo” amallarini ko‘rsatadi. iOS/web’da ilova ochiq turganida navbatdagi javobsiz namoz uchun ichki check-in ham ko‘rsatiladi. Qazo faqat foydalanuvchi shunday belgilagandagina qayd etiladi. Bildirishnomalar browser preview’da yuborilmaydi.

Namoz vaqti bildirishnomalari Android’da keyingi 30 kun, iOS’da keyingi 7 kun uchun, tonggi va kechki zikr eslatmalari esa 07:00 va 19:30 ga rejalashtiriladi. Namoz eslatmalarining jadvali ilova ochilganda va kun almashganda yangilanadi. Uzoq vaqt ilova ochilmasa, oldindan saqlangan namoz eslatmalari muddati tugaydi. Azon audio fayli qo‘shilmagan — telefonning standart bildirishnoma ovozi ishlatiladi. Eslatmalar ketma-ket, barqaror ID bilan yangilanadi; yangi jadval saqlanmaguncha eski jadval o‘chirilmaydi. Android’da HIGH v4 alarm kanallar ishlatiladi. Barcha namoz vaqti, namozdan keyingi, zikr va sinov eslatmalarida vibratsiya native Vibrator/VibrationEffect API va USAGE_ALARM orqali 10 soniyaga alohida boshlanadi; notification kanali bilan cheklanmaydi. Fon broadcast yakuni va qisqa wake lock effekt davomida process/CPU’ni ushlab turadi. Yopish amali foreground broadcast orqali yuboriladi. Eski Expo receiver manifestdan olib tashlangan, eslatmalar faqat Halovat native receiver orqali o‘tadi. Native eslatma oynasi ilova ochiq turganida chiqadi; ekran qulflanganda to‘liq ekran ruxsati bo‘lsa ochiladi. Boshqa ilova ishlatilayotganda Android heads-up banner ko‘rsatishi mumkin. “Yopish” tugmasi oynada va tizim bildirishnomasida bor; uni bosish yoki bildirishnomani surib yopish tizim bildirishnomasini va ilova boshqaradigan vibratsiyani to‘xtatadi. 10 soniyadan so‘ng vibratsiya tugaydi, eslatma foydalanuvchi yopguncha qoladi. “Yopish” namozni qazo deb belgilamaydi. Expo’ning native receiver/delegate hooks ishlatiladi; eski receiver alarm PendingIntentlari yangilanishda o‘chiriladi. Android notification kodining native dependency versiyasi o‘rnatilgan Expo module config’dan olinadi. iOS’da tizim bildirishi uchun ixtiyoriy 10 soniyalik vibratsiya boshqaruvi qo‘llanmaydi. Bildirishnoma va aniq alarm ruxsatlari alohida tekshiriladi. Ilovaga qaytilganda jadval yangilanadi; saqlash xatolari Profil → Eslatmalarni tekshirish oynasida ko‘rinadi. Bu oynadan 10 soniyalik sinov bildirishnomasi, tizim ruxsatlari va batareya sozlamalari ochiladi. Redmi/MIUI’da autostart, suzuvchi bildirishnomalar va batareya cheklovlari alohida ta’sir qilishi mumkin. Oddiy ruxsatlarni berish profil funksiyalarining o‘chiq tugmalarini avtomatik yoqmaydi.

Namoz holati, shahar, tasbeh sanog‘i va saqlangan masjid `AsyncStorage`’da qurilmada turadi. Login va analitika yo‘q. Masjid sahifasi joylashuvdan 7 km ichidagi masjidlarni qidirish uchun koordinatani umumiy Overpass xizmatiga so‘rovda yuboradi; xarita ko‘rilganda OSM tile-serverga ko‘rilayotgan xarita bo‘laklari so‘raladi. Qibla ekrani ruxsat berilganda foreground joylashuvni aniq azimut uchun oladi. Ilova uzluksiz GPS ishlatmaydi. Joylashuv ruxsati berilmasa, masjid qidiruvi tanlangan shahar markazidan foydalanadi, qibla esa saqlangan shahar koordinatasidan foydalanadi.

Namoz rejimida Android foydalanuvchidan alohida ruxsat olgandan keyin qo‘ng‘iroq ovozini va bildirishnomalarni tizim darajasida jim qiladi. Bildirishnomalar uchun “Bezovta qilmang” ruxsati butun telefondagi bildirishnomalarga ta’sir qiladi; qo‘ng‘iroqlar uchun Android `CallScreeningService` roli va barcha raqamlarni filtrlash uchun kontaktlar ruxsati kerak. Halovat kontaktlar ro‘yxatini o‘qimaydi yoki ko‘chirmaydi; Android saqlangan kontaktlardan kelgan qo‘ng‘iroqlarni ham screening servisiga uzatishi uchun `READ_CONTACTS` ruxsatini talab qiladi. Sessiya tugaganda yoki pauzada Halovat avvalgi DND holatini qaytaradi; taymerdan tashqari zaxira qaytarish signali ham bor. Jim rejim yoqilgan paytda olingan kiruvchi qo‘ng‘iroq raqami va vaqti qurilmaning app-private SharedPreferences xotirasida saqlanadi, Profil sahifasida ko‘riladi va o‘chirib tashlanadi. Ilova qo‘ng‘iroqqa javob berilganini yoki o‘tkazib yuborilganini aniqlamaydi va `READ_CALL_LOG` so‘ramaydi.

## Hozirgi platforma chegaralari

- Android’da call screening roli, kontaktlar va DND ruxsatlari tizimdan qo‘lda tasdiqlanadi; ruxsat berilmasa tegishli funksiya ishlamaydi. Android 10’dan oldingi versiyalarda CallScreeningService qo‘ng‘iroqni jim qila olmaydi. Raqami yashirilgan yoki operator tomonidan berilmagan ayrim qo‘ng‘iroqlar call screening’ga uzatilmasligi mumkin.
- iOS’da ilova boshqa ilovalarning bildirishnomalarini jim qilmaydi va oddiy telefon qo‘ng‘iroqlarini loglamaydi. Namoz rejimi uchun iOS Focus’ni foydalanuvchi qo‘lda yoqadi.
- Qo‘ng‘iroq xulosasi faqat sessiya paytidagi urinishlarni ko‘rsatadi; kontakt nomini ko‘rsatmaydi, javob holati va davomiyligini qayd etmaydi.
- Profil orqali Android’da namoz vaqtida avtomatik ovozsiz rejim (25 daqiqa, 30 kunlik jadval) va tanlangan masjidning 150 m fon geofence hududi yoqiladi. DND, namoz uchun aniq alarm, masjid uchun aniq va fon joylashuv ruxsati kerak. Hudud hodisalari Google Play xizmatlari orqali keladi va kechikishi mumkin. Manual sessiya tugasa ham boshqa faol avtomatik rejim ovozsiz holatni saqlaydi. Namoz boshlanishi bildirishnomasi yoqilgan bo‘lsa, ovozsiz rejim undan 10 soniya keyin boshlanadi va namoz boshlanganidan 25 daqiqa o‘tgach tugaydi. Namozdan keyingi savol ovozsiz rejimdan keyin kelishi uchun kamida 26 daqiqaga qo‘yiladi. Android 15+ da Halovat o‘z DND qoidasini faollashtiradi va yakunda faqat shu qoidani o‘chiradi; boshqa DND egalari holati saqlanadi. Aniq alarm yoki DND ruxsati berilganda native jadval qayta ulanadi. Telefonni qayta yoqishdan keyin jadval va masjid hududi qayta ulanadi. SMS quick-reply yo‘q. Redmi’da real hudud kirish/chiqishi hali tekshirilmagan.
- O‘zbekiston masjidlarining 2 347 haqiqiy OSM yozuvi ilovaga qo‘shilgan: yaqin masjidlar ro‘yxati internet bo‘lmasa ham chiqadi. Xarita plitkalari va Leaflet yuklanishi internet talab qiladi. “Yangilash” orqali yangi mahalliy ro‘yxat olinadi; server xatosida saqlangan ro‘yxat qoladi. Qamrov va nomlar OpenStreetMap ma’lumotlariga bog‘liq; barcha masjidlar va rasmlar to‘liq deb hisoblanmaydi. Manba/litsenziya: `src/data/MOSQUE_DATA.md`. Yo‘nalish tugmasi Google Maps’da marshrutni ochadi.
- Qibla kompasining heading sensori fizik telefonda tekshiriladi. Emulator magnitometr va haqiqiy koordinata bermasa, ko‘rsatkich GPS/shahar fallback’iga tushishi mumkin.
- Taqvimdagi shaharlar hozir O‘zbekistonning 16 shahri bilan cheklangan. Avtomatik aniqlash joyni shu ro‘yxat ichidagi eng yaqin shahar bilan bog‘laydi.
- Web preview Android/iOS ruxsatlari, mahalliy bildirishnoma, qo‘ng‘iroq sessiyasi va haptikani taqlid qilmaydi.
- `npm install` vaqtida dependency daraxtida 29 ta audit xabari (10 moderate, 19 high) chiqdi. Ular ichki npm tekshiruvining joriy natijasi; dependency’larni majburan yangilash qilinmadi, chunki SDK 57 mosligini buzishi mumkin.

## Texnik tekshiruvlar

Ikona yoki splash sozlamasi o‘zgarganda Android native resurslarini builddan oldin yangilang:
`npx expo prebuild --platform android --no-install`.
Faqat Metro yoki JavaScript bundle yangilash telefon ikonasi va native splashni yangilamaydi.
Launcher asl `assets/halovat-launcher.png` rasmini ishlatadi; Android maskaga mos inset config plugin orqali saqlanadi.

- `npx expo install --check` — dependency versiyalari SDK 57 bilan mos.
- `npx tsc --noEmit` — muvaffaqiyatli.
- `npx expo lint` — muvaffaqiyatli.
- `npx expo run:android` — muvaffaqiyatli; debug APK Android emulatorda ishga tushirildi va asosiy ekranlar ko‘rildi.

## Android vibratsiyasi — v4 tuzatish

Halovat boshqaradigan DND rejimi `INTERRUPTION_FILTER_ALARMS` bilan qo‘ng‘iroq va oddiy bildirishnomalarni jim qiladi, alarm eslatmalariga ruxsat beradi. Avval foydalanuvchi o‘zi yoqqan mutlaqo jim rejim Android 14 va undan past versiyalarda saqlanadi; Android 15+ da boshqa DND qoidalari ustidan yozilmaydi. Global total silence bo‘lsa, vibratsiya so‘rovi xato holati bilan ko‘rsatiladi. Imtiyozli bypass flaglar, root yoki global ovoz darajasini majburan o‘zgartirish ishlatilmaydi.

Profil → Eslatmalarni tekshirish ichida motor, DND holati, eslatma versiyasi va oxirgi vibratsiya buyrug‘i/xatosi ko‘rsatiladi. “Vibratsiyani tekshirish” bildirishnomadan mustaqil 10 soniyalik motor so‘rovini yuboradi; “To‘xtatish” uni bekor qiladi. Android API so‘rovni qabul qilgani fizik motor tebranganini isbotlamaydi. Redmi’da haqiqiy natija foydalanuvchi sinovi bilan tasdiqlanadi.

## Android ekran va chiroq eslatmalari — v5

Vibratsiya foydalanuvchining Redmi sinovida tasdiqlandi. Endi barcha Halovat mahalliy eslatmalarida `HalovatReminderAttention` ekran va kamera chirog‘ini boshqaradi. Android 24–32 da ekran o‘chiq bo‘lsa, cheklangan display wake lock uni uyg‘otadi; Android 33+ da tizimning to‘liq ekran alarm oynasi va `setTurnScreenOn` ishlatiladi. Native eslatma oynasi ekranni faqat eslatmaning qolgan 10 soniyasi uchun ushlab turadi. Ekran qulfi olib tashlanmaydi va ekran majburan o‘chirilmaydi.

Kamera ruxsati berilganda orqa chiroq 300 ms yonib, 700 ms o‘chib turadi. Kamera ochilmaydi, surat/video olinmaydi. Har bir eslatma o‘z vaqt chegarasiga ega; 10 soniya tugashi, “Yopish”, bildirishnomani surib yopish yoki javob amali vibratsiya va chiroqni to‘xtatadi. Eski eslatmaning taymeri yangi eslatmani to‘xtatmaydi. Avvaldan yoqilgan chiroqning holati saqlanadi. Kamera band bo‘lsa yoki ruxsat berilmasa, chiroq xatosi qolgan eslatma yo‘llarini to‘xtatmaydi.

Profil → Eslatmalarni tekshirish → Chiroq uchun ruxsat berish, yoki Sinov bildirishnomasi orqali yangi kamera ruxsati beriladi. Kamera ruxsatini rad etish bildirishnomalarni o‘chirmaydi. Android 14+ to‘liq ekran ruxsati, Redmi/MIUI qulf ekranida ko‘rsatish va fon pop-up sozlamalari alohida boshqariladi. Ekran/chiroq xatolari shu diagnostika oynasida chiqadi. v5 ekran uyg‘onishi va chiroqning fizik telefon natijasi hali tasdiqlanmagan; native APK build va lint/typecheck natijalari fizik sinov o‘rnini bosmaydi.


### Mosque and compass corrections — 2026-10-09

- Mosque filters above the map and the manual quiet-mode banner were removed as requested. Sorting and saved places remain in the filter sheet.
- Native and web maps now share real geographic Leaflet markers. Marker updates no longer recreate the WebView; web markers move with map pan/zoom. The blue location marker appears only after obtaining a device location, not at the saved city centre.
- Mosque lookup has persistent regional caching (30 minutes fresh, up to 7 days stale on network failure), in-flight request sharing, current-origin distance calculation, conservative building/POI deduplication, and stale-response protection. Two bounded 8-second network attempts replace the former three 18-second attempts; rate limits stop retries.
- Names also read Uzbek Latin and official/alternate OSM tags. Missing photos use compact honest placeholders. General photo coverage remains unresolved; three existing bundled mosque photos are available. A map-tile change alone does not add place photos or names.
- The compass starts heading observation independently of GPS, cleans up on blur/background, restarts on foreground/calibration, smooths circular heading updates, rotates cardinal labels, and distinguishes unavailable/low-accuracy/magnetic-only readings. It does not claim alignment without a calibrated true-north reading. GPS acquisition is bounded and prefers a recent fix.
- Google Maps + Places is a possible replacement, but is NOT configured or active. It requires the owner's billing-enabled Google Cloud project, appropriately restricted Maps/Places credentials and a backend for Places web-service secrets. Google Places results shown on a map must use a Google map and preserve required attribution. Photos are only available where the service supplies them. See https://developers.google.com/maps/documentation/places/web-service/policies and https://developers.google.com/maps/documentation/places/web-service/usage-and-billing .
- Validation: TypeScript and Expo lint passed. Mocked service checks cover request sharing, POI deduplication/name merge, invalid coordinates, radius filtering, cache reuse, recomputed distances and regional cache isolation; map script syntax checked. Physical Redmi compass behavior has not been verified for this build.


### Daily duas — 25 entries (2026-10-09)

`src/data/duas.ts` now bundles 25 unique entries with Arabic, Uzbek Latin readings, concise Uzbek meanings and individual source URLs. Both the tasbeeh dua section and the dedicated dua screen read the same catalogue. Existing bookmark titles are preserved. New topic filters cover evening, daily activities, food, mosque, prayer, protection and family, alongside the existing morning, night and knowledge topics. All reading content works offline; no API is added.

Sources were checked against the Arabic prayers in Hisn al-Muslim on Sunnah.com, Bukhari 6324, Muslim 713a, and Quran 20:114, 17:24 and 2:201. Meanings and readings were written for the app. Quran prayer excerpts are identified as excerpts. The evening protection prayer specifies three recitations; the after-prayer entry specifies three repetitions of seeking forgiveness. New titles, topic labels and meanings have Russian and English catalogue translations.

Validation: Expo lint and TypeScript passed. Data checks confirmed 25 unique titles, complete fields, valid categories, source URLs and preservation of the original three bookmark titles. No reminder scheduling or saved-prayer tracking behavior was changed.

### Background reminder setup — 2026-10-09

- Redmi testing confirmed vibration, flashlight, screen wake and close-to-stop behavior after the user removed battery restrictions. Tasbeeh's 33-count transition also passed with user observation. The complete device test status is in `device-audit/REDMI_TEST_REPORT.md`.
- First enabling reminders or automatic quiet mode now shows a one-time battery setup guide where needed. It can be reopened from Profile. The guide's saved marker only records that it was shown, never that a permission was granted.
- On Xiaomi/Redmi/Poco, the battery button opens Halovat's system app-details screen, with instructions for Battery saver → No restrictions and Autostart. Other Android devices open the standard battery optimization list, with app details as a fallback. Opening settings never changes permissions by itself.
- Android's `isIgnoringBatteryOptimizations` reports the standard Doze exemption. It does not prove MIUI's independent battery saver is unrestricted; the UI explicitly asks the user to verify a reminder with the screen off. No direct exemption permission or private MIUI API was added.
- Validation: TypeScript, Expo lint and `node device-audit/battery-guide-check.cjs` passed. The guide checks cover platform gating, one-time teaching, manual reopening, MIUI vs Doze distinction and concurrent enable requests. The new setup UI has not yet been tested on the physical Redmi.

### iPhone preparation — 2026-10-10

- iOS has EAS preview, simulator and production profiles, build number 1 and standard encryption metadata. `.easignore` excludes generated native folders, local secrets, exports and audit/log files from cloud upload.
- The iOS Profile shows supported notification settings and a Focus/LED Flash guide instead of Android automatic quiet switches. Welcome copy for the two automatic-quiet pages is adapted only on iOS; Android reference copy remains unchanged.
- Notification permission checks handle iOS provisional/ephemeral authorization. Diagnostics read the actual iOS banner, sound and lock-screen flags. Settings recovery uses the public app-settings link.
- TypeScript, lint, iOS Hermes export (3488 modules), iOS config introspection and permission/profile assertions passed. This is not an Xcode compilation or an installed IPA test. A physical iPhone is not connected.
- No Expo/Apple account was available. Browser-based Expo CLI login is pending user completion. Expo Go on physical iOS needs the same free Expo account on CLI and device. Signed ad hoc/TestFlight builds remain blocked by Apple Developer membership, provisioning and account setup. See `IOS_TESTING.md` for the exact setup and feature limits.
