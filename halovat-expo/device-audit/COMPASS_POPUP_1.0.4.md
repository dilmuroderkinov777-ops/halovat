# Halovat 1.0.4 — kompas va popup

Android versionCode: 5. Sana: 2026-10-19.

1.0.3 dagi kompas saqlandi: qora Ka’ba tepada joyida turadi, telefon yo‘nalishini strelka ko‘rsatadi. Sensor va yo‘nalish hisobi o‘zgartirilmadi.

Qibla sahifasi har fokus olganda popup telefonni sakkiz shaklida aylantirishni ko‘rsatadi. Animatsiya ikki aylanishdan keyin taxminan 5.2 soniyada yopiladi; “Kompasga o‘tish” yoki Android Back bilan darhol yopish mumkin. “Kompasni qayta sozlash” popupni qayta ochadi. Sensor va GPS popup bilan bir vaqtda ishlay boshlaydi.

Animatsiya native driver bilan ishlaydi, yangi kutubxona qo‘shilmadi. Ilova fonga o‘tganda animatsiya va taymer to‘xtaydi. Tizimda harakatni kamaytirish yoqilsa, sakkiz chizmasi va tushuntirish harakatsiz ko‘rsatiladi. Matnlar ilovaning tillariga tarjima qilingan.

## Telefonda sinash

1. Halovat-1.0.4-test.apk faylini oldingi test ilovasi ustidan o‘rnating.
2. Qibla sahifasiga kiring: popupda telefon rasmi sakkiz shaklida harakatlansin. “Kompasga o‘tish” tugmasini sinang.
3. Boshqa sahifaga o‘tib qayting: popup yana chiqsin. Bu safar avtomatik yopilishini kuting.
4. Telefonni burib, strelka aylanishini va qora Ka’ba tepada joyida turishini tekshiring. Qiblaga mos kelganda yashil tasdiq chiqsin.
5. Qayta sozlash tugmasi va popup vaqtida ilovani fonga olib qayta ochishni sinang.

## Tekshiruv natijalari

- Lint, TypeScript va mavjud kompas regressiya tekshiruvi o‘tdi. Sensor faylining SHA-256 qiymati 1.0.3 bilan bir xil.
- Android unit testlari, test APK va production AAB yig‘ilishi muvaffaqiyatli.
- API 36 emulatorda animatsiyaning turli kadrlari ko‘rildi; qayta kirish, qayta sozlash, avtomatik yopilish, davom etish tugmasi va Android Back ishladi.
- Popup vaqtida Home bosilib, 6 soniyadan keyin qaytilganda ko‘rsatma davom etdi.
- Popupdan keyin telefon yo‘nalishi 180°, 276° va 241° qiymatlariga o‘zgardi. Ka’ba tepada qoldi, Qibla 240° yaqinida yashil tasdiq chiqdi. ReactNativeJS/AndroidRuntime xatosi kuzatilmadi.
- APK/AAB imzolari, bundletool validatsiyasi, ZIP alignment va 48 native kutubxonaning 16 KB ELF alignment tekshiruvi o‘tdi. APK va AAB ichidagi 52 kod fayli bir xil; shaxsiy imzo kalitlari arxivga kirmagan.

Haqiqiy Redmi Note 8, 10 Lite va uchinchi telefonda tekshirish hali kerak. Test APK eski test kaliti bilan, production AAB alohida upload kaliti bilan imzolangan. Google Play’ga yuklanmadi; oldingi release talablarini saqlang.
