# Halovat — birinchi Play release tayyorgarligi

## Tayyorlangan

- Package: `uz.halovat.expo`; versionName `1.0.1`; versionCode `2`.
- Android uchun native kompas, mahalliy masjid katalogi, muddatli GPS va 30 kunlik yangilanadigan namoz jadvali.
- Release minify/resource shrinking; test APK va yangi upload kalitli production AAB uchun build skripti.
- Upload kaliti loyiha tashqarisida `C:\Users\dilmu\Halovat-signing` papkasida. Keystore va credentials JSONni birga, xavfsiz zaxiralash kerak. Parollarni Git, chat yoki Play listingga qo‘ymang. Google Play App Signing yoqilganda bu upload kaliti bo‘ladi.

## Nashrdan oldingi ochiq ishlar

1. 2–3 haqiqiy telefonda test jadvalini to‘ldirish, ayniqsa Redmi kompas/DND/masjid kuzatuvi. Emulator bu natijalarni almashtirmaydi.
2. Ishlab chiquvchi nomi, aloqa emaili va ochiq maxfiylik siyosati URLini tasdiqlash. Quyidagi ma’lumotlar oqimi siyosat uchun texnik asosdir, tayyor yuridik tasdiq emas. Ilova ichidan ham siyosatga kirish bo‘lishi kerak.
   Wikimedia so‘rovining Halovat User-Agentiga ham tasdiqlangan aloqa URL/emailini qo‘shish: [Wikimedia User-Agent talabi](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).
3. Play Console’da Data safety, kontent reytingi, reklama holati, app access, screenshot/listing va tegishli ruxsat deklaratsiyalarini to‘ldirish.
4. Masjidga kirish/chiqishda ovozsiz qilish uchun background location deklaratsiyasi va haqiqiy ishlashni ko‘rsatadigan video. In-app disclosure ruxsat so‘rashdan oldin chiqadi. Google tasdiqlashi alohida jarayon: [Google talablari](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en).
5. `USE_FULL_SCREEN_INTENT` ishlatilgani uchun uning Play deklaratsiyasi va eligibility holatini tekshirish. To‘liq ekran ruxsati rad etilganda oddiy bildirishnoma ishlashini telefonda sinash: [Google talablari](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en).
6. Dependency auditning quyidagi qolgan build-tool ogohlantirishlarini release qarorida hisobga olish.

## Ma’lumotlar oqimi (manba kod bo‘yicha)

- Shahar, profil nomi, namoz belgilari, tasbeh va sozlamalar telefondagi mahalliy xotirada.
- GPS: yaqin shahar/masjid va qibla uchun. Tanlangan masjid geofencesi Android/Google Play services orqali fonda tekshiriladi.
- Online masjid yangilanishida atrof koordinatalari Overpass serveriga; xarita ko‘rsatilganda viewport tile so‘rovlari OpenStreetMap xizmatiga yuboriladi. Ushbu xizmatlar tarmoq so‘rovining IP manzilini ham ko‘rishi mumkin.
- Namoz kalendari shahar bo‘yicha namozvaqti.uz’dan olinadi; tarmoq ishlamasa mahalliy hisoblash ishlatiladi.
- Ayrim masjid suratlari Wikimedia serverlaridan yuklanadi; muallif/litsenziya havolalari ko‘rsatiladi.
- Ixtiyoriy qo‘ng‘iroqlarni jim qilish Android call screening roli/contacts ruxsatidan foydalanadi; jim qilingan qo‘ng‘iroq raqami/vaqti mahalliy tarixda saqlanadi, foydalanuvchi tarixni tozalashi mumkin.
- Kamera ruxsati eslatmadagi chiroqni yoqish uchun; foto/video yozish funksiyasi yo‘q.
- Kodda analytics/ad SDK yo‘q. Uchinchi tomon xizmatlari va Android backup xatti-harakatini Data safety formasi bilan alohida moslashtiring; “hech qanday ma’lumot uzatilmaydi” deb belgilamang.

## Dependency audit

`npm audit` 2026-10-18: **18 high, 0 moderate, 0 critical**; bu 18 alohida zaiflik emas, ikkita ildiz advisory va ularning transitive package ta’siri.

- `decode-uri-component` runtime DoS: upstream 0.5.0 kodi MIT litsenziyasi bilan vendorda, faqat CommonJS exportga moslangan. Query-string bilan regressiya testi bor.
- `xcode` build dependency’dagi `uuid` 11.1.1ga o‘tkazildi.
- Qolgan: `braces <=3.0.3` nested-pattern stack exhaustion va `node-forge <=1.4.0` RSA verification advisory. Hozirgi dependency graph’da Metro/CLI/code-signing build yo‘llari orqali keladi. Bu warninglar yashirilmadi. `npm audit fix --force` SDKni eskirgan Expo 44ga tushirishni taklif qiladi, shuning uchun qo‘llanilmadi.
- Yakuniy test build source mapida `braces` va `node-forge` modullari yo‘q; tuzatilgan vendor URI decoder bor. Bu build mashinasidagi ogohlantirishlarni bekor qilmaydi.
- Xom hisobot: `npm-audit-2026-10-18.json`. Noma’lum pattern/certification kiritmalarini build servisiga qabul qilmang; mos upstream patch chiqqanda yangilab tekshiring.

## Qayta build

```powershell
npm ci
npm run lint
npm run typecheck
node scripts/check-compass.cjs
node scripts/check-scheduler.cjs
node scripts/check-location.cjs
node scripts/check-mosques.cjs
node scripts/check-map.cjs
node scripts/check-uri-decoder.cjs
powershell -File scripts/build-android.ps1 -Mode test
powershell -File scripts/build-android.ps1 -Mode production -Credentials C:\Users\dilmu\Halovat-signing\credentials.json
```

`-SkipPrebuild` faqat joriy app.json/plugins/dependencies uchun prebuild allaqachon bajarilgan bo‘lsa ishlatiladi. CI/EAS’da mahalliy keystore yuborilmaydi; tegishli credentialni alohida sozlang. App background renewal OS rejalashtiruvchisiga bog‘liq: [Expo SDK 57 BackgroundTask](https://docs.expo.dev/versions/v57.0.0/sdk/background-task/).

Bu paketlar Play Marketga yuklanmagan. Nashr qarori telefon sinovi va ochiq ishlar tugagandan keyin beriladi.
