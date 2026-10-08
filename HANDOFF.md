# Halovat — dasturchiga topshirish

## Snapshot: 2026-10-08, Asia/Tashkent

Asosiy loyiha `halovat-expo/`. TypeScript UI, Expo Router, custom Android native modul, fontlar, rasmlar, taqvim cache namunasi, npm lockfile va config pluginlar to‘liq nusxalangan. Mahalliy build keshlar, node_modules, SDK yo‘llari va imzolash kalitlari repositoryga kiritilmaydi; ular mashinada qayta yaratiladi. Original lokal loyiha va uning Git indeksi saqlangan.

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
Set-Location android
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' --console=plain
```

Natija: `halovat-expo/android/app/build/outputs/apk/release/app-release.apk`.

`android/` va `ios/` Expo generatsiya qiladigan papkalar. Ularni qo‘lda tahrirlash o‘rniga `app.json` va `plugins/`ni o‘zgartiring. **`modules/halovat-focus/android/` esa custom Kotlin manbasi**, uni saqlash va tahrirlash kerak. SDK 57 Expo notifications’ni prebuilt Maven artifact sifatida ulashi mumkin; modulning `build.gradle` fayli bu holatni hisobga oladi.

Ilova versiyasi hozir `1.0.0`. Play Store/TestFlight tarqatish, production signing, versiya kodini oshirish va release konfiguratsiyasi alohida tayyorlanishi kerak. Topshirilgan APK lokal sinov buildidir; private signing kalitlari Git’ga joylanmaydi.

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
- Masjidlar OSM/Overpass orqali olinadi; ichki xarita ishlatiladi, marshrut tashqi Maps’da ochiladi. Masjid ovozsiz rejimi tanlangan masjid markazi atrofidagi 150 m geofence bilan bog‘langan.
- Qibla `expo-location` heading sensori va koordinatalardan foydalanadi; sensori yo‘q emulator haqiqiy telefon natijasini isbotlamaydi.
- Language selection va undan keyin 6 ta welcome sahifa bor. Dizayn matnlari foydalanuvchi HTML’lariga mos saqlanishi kerak.

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
- Foydalanuvchi Redmi Note 8’da **bildirishnoma vaqtida vibratsiya ishlayotganini tasdiqladi**.
- **v5 ekran uyg‘onishi va flashlight miltillashi fizik telefonda hali tasdiqlanmagan.** Yangi dasturchi birinchi bo‘lib ekran qulflangan holatda Sinov bildirishnomasi, Yopish va 10 soniyalik avtomatik to‘xtashni tekshirishi kerak.
- Masjidga haqiqiy kirish/chiqish, ishlab chiqaruvchi battery/autostart siyosatlari va sensor aniqligi fizik qurilmalarda tekshiriladi. Manba arxitekturasi borligi barcha telefonlarda ish tasdiqlanganini anglatmaydi.
- iOS’da boshqa app bildirishnomalarini jim qilish, Android call screening, qulf ekranida kamera chirog‘i/vibratsiyani shu tarzda boshqarish qo‘llanmaydi. iOS native binary bu Windows muhiti orqali yig‘ilmagan.

Redmi’da Profil → Eslatmalarni tekshirish → Sinov bildirishnomasi orqali kamera ruxsatini bering, keyin ekranni qulflang. MIUI autostart, battery “Cheklovlarsiz”, suzuvchi bildirishnomalar, qulf ekranida ko‘rsatish va fon pop-up ruxsatlari ta’sir qiladi. Android 14+ full-screen intent ruxsati alohida.

## Oxirgi APK

Private GitHub Releases’ga `Halovat-screen-flash-v5-2026-10-08.apk` qo‘yiladi.

SHA-256: `20FDE39741E96ADB5F3027D15C5CD8F57E062509C2808E0609ED9249162BF177`

## Dizayn manbalari

Figma: https://www.figma.com/design/QA5H0N0aQnwGhwAhYTEA6r/Untitled?node-id=0-1

`design/` ichidagi HTML’lar, Stitch ZIP va ochilgan frontend, hamda `halovat-expo/references/` ichidagi original welcome/language reference’lari saqlangan. Screenshotlar turli rivojlanish bosqichlariga tegishli; har biri oxirgi UI yoki fizik test tasdig‘i emas. Foydalanuvchi qo‘shimcha matn yaratmasdan berilgan reference UX/UI’ga mos ishlashni so‘ragan.
