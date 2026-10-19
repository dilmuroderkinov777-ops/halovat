# Halovat 1.0.2 (3): kompasni o‘rgatuvchi animatsiya

Qibla sahifasi har fokus olganda telefonni sakkiz shaklida aylantirish ko‘rsatmasi chiqadi. Telefon rasmi sakkiz yo‘li bo‘ylab ikki marta harakatlanadi, so‘ng ko‘rsatma taxminan 5.2 soniyada yopiladi. Kompas sensori va GPS shu paytda ishlay boshlaydi.

- “Kompasga o‘tish” tugmasi ko‘rsatmani darhol yopadi. Android Back ham yopadi.
- “Kompasni qayta sozlash” ko‘rsatmani yana ochadi va sensorni qayta boshlaydi.
- Animatsiya native driver orqali ishlaydi; yangi kutubxona yoki video fayli qo‘shilmadi.
- Ilova fonga o‘tganda animatsiya/taymer to‘xtaydi; ko‘rsatma tugamagan bo‘lsa qaytganda qayta boshlanadi.
- Reduce motion sozlamasida harakatsiz sakkiz chizmasi va tushuntirish saqlanadi.
- O‘zbek lotin/kirill, rus va ingliz tillari hamda mavjud rang mavzusiga mos.
- Ko‘rsatmaning tugashi kalibrlash muvaffaqiyatli bo‘lganini bildirmaydi: undan keyin kompasning haqiqiy aniqlik holati ko‘rsatiladi.

## Tekshirilgan

ESLint, TypeScript, mavjud kompas regressiya tekshiruvi va Android release build o‘tdi.

Android API 36 emulatorda:

1. Animatsiya davomida telefon rasmi ikki kadrda turli holatda ko‘rindi.
2. SensorService’da Halovatning rotation vector sensori ko‘rsatma vaqtida faol edi. Ko‘rsatma yopilganda darhol telefon yo‘nalishi ko‘rindi.
3. Qibla → Profil → Qibla o‘tishida ko‘rsatma qayta chiqdi (freezeOnBlur yoqilgan).
4. Avtomatik yopilish, Back, “Kompasga o‘tish” va qayta sozlash ishladi.
5. Ko‘rsatma vaqtida Home → 6 soniya kutish → qaytishda ko‘rsatma hali ochiq bo‘lib, animatsiya qayta boshlandi.
6. Ko‘rsatma vaqtida boshqa sahifaga deep link bilan o‘tilganda yopildi.
7. Android animation scale 0 holatida ko‘rsatma va davom etish tugmasi ishladi; sozlama tekshiruvdan keyin tiklandi.
8. Tekshirilgan seansda AndroidRuntime/ReactNativeJS xato loglari yo‘q.

## Telefonda tekshirish

`Halovat-1.0.2-test.apk`ni oldingi APK ustidan o‘rnating. Qibla sahifasiga bir necha marta kirib chiqing, ko‘rsatmani kuting yoki tugma bilan yoping. Telefonni metall/magnitlardan uzoqda havoda sakkiz shaklida aylantirib, keyin tekis tuting. Qayta sozlash tugmasini ham tekshiring.

Asosiy GPS/masjid/ovozsiz rejim tekshiruvlari oldingi release ro‘yxatida saqlanadi. Haqiqiy Redmi sinovi va avval qayd qilingan Play release ishlari hali talab qilinadi. Bu yangilanish Google Play’ga yuklanmagan.
