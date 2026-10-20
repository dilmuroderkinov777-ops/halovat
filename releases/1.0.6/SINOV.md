# Halovat 1.0.6 (7) — 2026-10-20

Uchta foydalanuvchi regressiyasi birga tuzatildi. Bu sinov paketi; haqiqiy Redmi natijasi hali olinmagan.

## O‘zgarishlar

- Welcome rasmlaridagi yozuvlar SVG glyph/path orqali chizilmaydi. Shrift, matn va o‘lchamlar saqlanib, oddiy native Text qatlamiga o‘tkazildi. Oldingi `evenodd` urinishi olib tashlandi. Matn baseline’i native metrika bilan moslanadi.
- Kompas Expo heading usulida qoldi. 4° ichidagi mayda sensor/qo‘l shovqini ushlab turiladi, ataylab burilish circular filtr va native strelka animatsiyasi bilan ravon ko‘rsatiladi. Shimoldan o‘tish yoki Qibla-relative burchak o‘ralishida to‘liq aylanish yo‘q. Expo boshqa event bermasa ham oxirgi burilish yakunlanadi; timer va watcher sahifadan chiqishda to‘xtaydi. Qora Ka’ba tepada joyida.
- Android uchun loading animatsiyasini majburan o‘chiradigan kod olib tashlandi. Ochilish va haqiqiy background → active qaytishda animatsiya qayta boshlanadi; faqat inactive dialog uni takrorlatmaydi. Intro kamida asl 3.2 soniyalik bosqichlarni tugatadi va animatsiya completion’i kelmaguncha kesilmaydi. Eski completion yangi intro’ni yopmaydi.
- Kalibrlash popupi loading davomida yashirinadi va taymeri pauza qiladi; loading tugagach ko‘rsatma davom etadi. Tizimning Reduce motion tanlovi saqlangan.

## Bajarilgan tekshiruvlar

- Lint va TypeScript o‘tdi.
- Kompas, launch, location, masjidlar, xarita, namoz jadvali va URI decoder — 7 regressiya skripti o‘tdi. Kompas testlari siyrak shovqin, shimoldan o‘tish va bitta sensor eventidan keyingi yakunlanishni ham tekshiradi.
- Android unit testlari, test APK va production AAB yig‘ilishi o‘tdi.
- API 36 va Android 11/API 30 emulatorda native welcome yozuvlari ko‘rildi. Android 11’da olti sahifa o‘zbekcha va ruscha tekshirildi; `Asr`, `247°`, `350 m · 4 daqiqa`, kirill yozuvlari va matn joylashuvi ko‘rildi.
- Yakuniy Android 11 build’iga ±3° shovqin bilan 70 ta sensor qiymati berildi. Olingan 4 kadrda strelka centroid’i bir xil: x=540.850, spread=0.000 px. Keyingi bitta burilish qiymatidan so‘ng strelka yangi tomonga o‘tdi. Bu sun’iy sensor testi, Redmi magnetometrining real aniqlik kafolati emas.
- Android 11’da kalibrlash popupi ochiq paytda Home → qaytish sinovi: avval loading bosqichlari, keyin popup. Sovuq ochilishda ham arka/quyosh/harflar bosqichlari va keyingi ekran ko‘rildi. Tekshirilgan seanslarda ReactNativeJS/AndroidRuntime xatosi yo‘q.

## Telefonda sinash

1. `Halovat-1.0.6-test.apk`ni eski test ilovasi ustidan o‘rnating; avval o‘chirmang.
2. Ilovani yoping/oching va Home orqali fonga olib qayting: loading to‘liq ko‘rinsin. Tizim animatsiyalari o‘chirilgan bo‘lsa, Reduce motion tanlovi qo‘llanadi.
3. Welcome’dagi yozuvlarni tekshiring: `4`, `a`, `A`, daraja raqami va masjid kartasi buzilmasin.
4. Kompasda telefonni tekis tutib tinch ushlang, so‘ng sekin buring: mayda titrash bo‘lmasin, strelka burilishga ergashsin, qora Ka’ba tepada qolsin.
5. Popup ochiq paytda Home → qaytish: loading va popup ustma-ust chiqmasin. Qayta sozlash, Back va davom etish tugmalarini tekshiring.

Redmi Note 8, 10 Lite va uchinchi telefonda qayta sinash kerak. Oldingi GPS/masjid/ovozsiz rejim va Play release ochiq ishlari saqlanadi. APK test kaliti, AAB alohida upload kaliti bilan imzolangan. Play Marketga yuklanmagan.
