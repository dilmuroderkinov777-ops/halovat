# Halovat — dasturchiga topshirish

## Snapshot: 2026-10-19, Asia/Tashkent — 1.0.5 (6)

Asosiy loyiha `halovat-expo/`. Joriy Android sinov versiyasi **1.0.5**, versionCode **6**. TypeScript UI, Expo Router, custom Android modulining Kotlin manbalari/testlari, rasmlar/litsenziyalar, taqvim cache namunasi, npm lockfile, vendor URI decoder va config pluginlar yangilangan. Mahalliy build keshlar, node_modules, SDK yo‘llari va imzolash kalitlari repositoryga kiritilmaydi. Original lokal loyiha va uning Git indeksi saqlangan.

[So‘nggi o‘zgarishlar](./halovat-expo/LATEST_RELEASE.md) · [Telefon tekshiruvi](./halovat-expo/device-audit/RELEASE_TEST_CHECKLIST_1.0.5.md) · [GitHub sinov paketlari](https://github.com/dilmuroderkinov777-ops/halovat/releases/tag/v1.0.5-test)

## Ish muhiti va build

Node.js LTS, npm, Android Studio/Android SDK va Expo/Android Gradle versiyasiga mos JDK kerak. Native build uchun Windows’da qisqa checkout yo‘lini tanlang, masalan `C:\h\halovat`; CMake uzun yo‘lga sezgir. `plugins/withShortCmakeObjectPaths.js` qo‘shimcha cheklovni sozlaydi.

```powershell
git clone https://github.com/dilmuroderkinov777-ops/halovat.git C:\h\halovat
Set-Location C:\h\halovat\halovat-expo
npm ci
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
npx expo prebuild --platform android --no-install
npx expo run:android
```

Release APK uchun:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -Mode test
```

Natija: `halovat-expo/android/app/build/outputs/apk/release/app-release.apk`.

`android/` va `ios/` Expo generatsiya qiladigan papkalar. Ularni qo‘lda tahrirlash o‘rniga `app.json` va `plugins/`ni o‘zgartiring. **`modules/halovat-focus/android/` esa custom Kotlin manbasi**, uni saqlash va tahrirlash kerak. SDK 57 Expo notifications’ni prebuilt Maven artifact sifatida ulashi mumkin; modulning `build.gradle` fayli bu holatni hisobga oladi.

Ilova versiyasi `1.0.5` (Android code 6, iOS build 6). Test APK eski test kaliti, production AAB yangi upload kaliti bilan imzolangan. Production AAB uchun `scripts/build-android.ps1 -Mode production -Credentials <private-credentials.json>` ishlatiladi. Android unit testlari build skriptida bajariladi. `-SkipPrebuild` faqat native loyiha joriy konfiguratsiya uchun tayyorlanganida ishlatiladi. Play Store/TestFlight nashri bajarilmagan; private signing kalitlari Git’ga joylanmaydi.

## Kod xaritasi

| Yo‘l | Vazifasi |
| --- | --- |
| `src/app/` | Expo Router ekranlari va navigatsiya |
| `src/app/(tabs)/settings.tsx` | Profil, funksiyalarni yoqish va eslatma diagnostikasi |
| `src/context/AppContext.tsx` | Qurilmadagi holat, eslatma jadvali, tracking va tasbeh |
| `src/context/LanguageContext.tsx`, `src/i18n/` | Til saqlash va tarjimalar |
| `src/components/LoadingScreen.tsx` | Foydalanuvchi HTML loading animatsiyasining native talqini |
| `src/domain/prayers.ts` | Namoz jadvali, shaharlar, cache va hisoblash fallback |
| `src/services/reminders.ts` | Kanallar, exact alarm/full-screen va chiroq ruxsatlari |
| `src/services/automaticQuiet.ts` | Avtomatik ovozsiz rejim ruxsatlari |
| `modules/halovat-focus/` | Android DND, alarm, call screening, geofence, eslatma oynasi, vibratsiya va chiroq |
| `assets/`, `references/` | Bundled rasmlar va welcome reference’lar |

## Muhim funksiyalar va joriy holat

- Namoz vaqti `namozvaqti.uz` mahalliy HTML jadvalidan olinib cache qilinadi. Manba olinmasa `adhan` hisoblash fallback’i ishlatiladi; bu natija mahalliy jadval bilan bir xil deb talqin qilinmaydi. Shaharlar ro‘yxati hozir O‘zbekistonning 16 shahri bilan cheklangan.
- Android’da namoz vaqti va namozdan keyingi eslatmalar 30 kunga rejalashtiriladi. Ilovani yana ochganda va kun almashganda jadval yangilanadi. iOS’da limitlarga mos qisqaroq jadval qo‘llanadi.
- Qazo faqat foydalanuvchi “Qazo” deb belgilasa qayd etiladi. Javobsiz bildirishnoma avtomatik qazo hisoblanmaydi.
- Tasbeh har 33 ta sanashda uzun vibratsiya beradi va keyingi zikrga o‘tadi. Orqaga qaytarish oxirgi sanash/davra almashishini ham qaytaradi.
- Masjidlar 2347 ta yozuvli mahalliy O‘zbekiston katalogi, cache va OSM/Overpass yangilanishidan foydalanadi. Ichki xarita, ayrim masjidlar uchun Wikimedia suratlari va litsenziya havolalari bor. Marshrut tashqi Maps’da ochiladi. Masjid ovozsiz rejimi tanlangan masjid markazi atrofidagi 150 m geofence bilan bog‘langan.
- Qibla `expo-location` heading sensori va koordinatalardan foydalanadi. Qora Ka’ba tepada joyida, telefon strelkasi aylanadi. Android’da foreground joylashuv ruxsati kerak; GPS natijasini kutish watcher start’ini to‘xtatmaydi. Native compass moduli saqlangan, ammo joriy ekran undan foydalanmaydi. Har Qibla fokusida 5.2 soniyalik sakkiz animatsiyasi popupda chiqadi; sensor/GPS shu vaqtda ishga tushadi. Tugma yoki Android Back popupni darhol yopadi. Emulator haqiqiy telefon aniqligini isbotlamaydi.
- Language selection va undan keyin 6 ta welcome sahifa bor. Dizayn matnlari foydalanuvchi HTML’lariga mos saqlanishi kerak.
- 1.0.5 da tanishtiruv SVG matnlarining `4`, `a`, `A` ichki bo‘shliqlari uchun `evenodd` qoidasi qo‘shilgan. Muammo chiqqan haqiqiy telefonda qayta sinash kerak; API 36 emulatorda eski APK’da ham bu buzilish kuzatilmagan.
- Faol sahifadagi taymerlar, tab freeze, muddatli umumiy GPS so‘rovlari, Android DND/ringer holatini egalik qoidasi bilan tiklash va batareya/avtomatik rejim diagnostikasi saqlangan. Namoz jadvalini yangilovchi fon vazifasi tizim scheduler’iga bog‘liq; ilovani ochish ham jadvalni yangilaydi.

## Android eslatma engine v5

`HalovatNotificationsService` Expo notification delegate’larini saqlagan holda eslatmalarni qabul qiladi. Original Expo receiver library manifestda `tools:node="remove"` bilan olib tashlangan; ikki receiver bir eslatmani parallel bajarmasligi kerak. Mahalliy notification ID va javob metadata’larini o‘zgartirishda tracking amallarini ham hisobga oling.

- `HalovatReminderVibration.kt`: mustaqil 10 soniyalik `VibrationEffect`, alarm usage, identifier va deadline himoyasi.
- `HalovatReminderAttention.kt`: 10 soniya davomida chiroq 300 ms yonib/700 ms o‘chadi; Android 24–32 uchun ekran uyg‘otadigan cheklangan wake lock. Android 33+ tizim full-screen Activity yo‘lidan foydalanadi.
- `HalovatReminderActivity`: qulf ustida ko‘rsatiladigan native oyna, `setTurnScreenOn`, vaqtinchalik `KEEP_SCREEN_ON`, “Yopish” va tracking amallari.
- Yopish, notification swipe/dismiss yoki javob vibratsiya va chiroqni to‘xtatadi. Eski deadline yangi eslatmaga ta’sir qilmasligi kerak.
- Kamera faqat torch API orqali boshqariladi; surat/video olinmaydi. Kamera band, chiroq avvaldan yoqilgan yoki ruxsat yo‘q holatlarida sabab diagnostikada ko‘rinadi; qolgan signal yo‘llari ishlashda davom etadi.
- Halovat boshqaradigan DND `INTERRUPTION_FILTER_ALARMS` bilan oddiy qo‘ng‘iroq/bildirishnomalarni jim qiladi. Boshqa egaga tegishli total silence majburan chetlab o‘tilmaydi.

## Tasdiqlangan va hali tasdiqlanmagan natijalar

- Oxirgi manbada `npx expo lint`, `npx tsc --noEmit` va Android `assembleRelease` muvaffaqiyatli o‘tdi.
- 1.0.5 test APK va production AAB yig‘ilishi, Android unit testlari, imzo/bundletool tekshiruvlari o‘tgan. 48 native kutubxona 16 KB ELF alignment talabidan o‘tgan, APK/AAB ichidagi 52 kod fayli bir xil. Kompas, popup va tanishtiruv SVG matnlari API 36 emulatorda tekshirilgan.
- Foydalanuvchi Redmi Note 8’da **bildirishnoma vaqtida vibratsiya ishlayotganini tasdiqladi**.
- **v5 ekran uyg‘onishi va flashlight miltillashi fizik telefonda hali tasdiqlanmagan.** Yangi dasturchi birinchi bo‘lib ekran qulflangan holatda Sinov bildirishnomasi, Yopish va 10 soniyalik avtomatik to‘xtashni tekshirishi kerak.
- Masjidga haqiqiy kirish/chiqish, ishlab chiqaruvchi battery/autostart siyosatlari va sensor aniqligi fizik qurilmalarda tekshiriladi. Manba arxitekturasi borligi barcha telefonlarda ish tasdiqlanganini anglatmaydi.
- iOS’da boshqa app bildirishnomalarini jim qilish, Android call screening, qulf ekranida kamera chirog‘i/vibratsiyani shu tarzda boshqarish qo‘llanmaydi. iOS native binary bu Windows muhiti orqali yig‘ilmagan.

Redmi’da Profil → Eslatmalarni tekshirish → Sinov bildirishnomasi orqali kamera ruxsatini bering, keyin ekranni qulflang. MIUI autostart, battery “Cheklovlarsiz”, suzuvchi bildirishnomalar, qulf ekranida ko‘rsatish va fon pop-up ruxsatlari ta’sir qiladi. Android 14+ full-screen intent ruxsati alohida.

## Joriy paketlar va ochiq release ishlari

Private [GitHub Releases 1.0.5](https://github.com/dilmuroderkinov777-ops/halovat/releases/tag/v1.0.5-test): `Halovat-1.0.5-test.apk`, `Halovat-1.0.5-production.aab` va production mapping. Hash/o‘lchamlar [manifest](./releases/1.0.5/release-manifest.json)da. APK/AAB source commitga qo‘shilmaydi.

Redmi Note 8, 10 Lite va uchinchi telefonda [sinov jadvali](./halovat-expo/device-audit/RELEASE_TEST_CHECKLIST_1.0.5.md) to‘ldiriladi. Play uchun privacy URL, aloqa ma’lumoti, listing va ruxsat deklaratsiyalari ochiq. [Tayyorgarlik hisoboti](./halovat-expo/device-audit/PLAY_RELEASE_PREPARATION_2026-10-18.md) tarixiy 1.0.1 holatini ham o‘z ichiga oladi; native compass haqidagi band joriy engine’ni bildirmaydi.

2026-10-18 auditida 18 high build-tool ogohlantirishi ikki ildiz advisory (`braces`, `node-forge`) ta’siri sifatida qolgan. Runtime URI decoder tuzatilgan; build-tool masalalari yopilgan deb belgilanmagan. `device-audit/` dagi sana/versiyali oldingi hisobotlar tarixiy dalillardir; joriy holat uchun ushbu fayl va `LATEST_RELEASE.md` asos bo‘ladi.

## Dizayn manbalari

Figma: https://www.figma.com/design/QA5H0N0aQnwGhwAhYTEA6r/Untitled?node-id=0-1

`design/` ichidagi HTML’lar, Stitch ZIP va ochilgan frontend, hamda `halovat-expo/references/` ichidagi original welcome/language reference’lari saqlangan. Screenshotlar turli rivojlanish bosqichlariga tegishli; har biri oxirgi UI yoki fizik test tasdig‘i emas. Foydalanuvchi qo‘shimcha matn yaratmasdan berilgan reference UX/UI’ga mos ishlashni so‘ragan.
