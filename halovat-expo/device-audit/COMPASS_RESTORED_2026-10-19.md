# Halovat 1.0.3 — kompas qaytarildi

Android versionCode: 4. Sana: 2026-10-19.

Qora Ka’ba belgisi kompasning yuqorisida joyida turadi. Telefon yo‘nalishini strelka ko‘rsatadi; telefon Qiblaga qaraganda strelka tepaga qaraydi va yashil tasdiq chiqadi. Oldingi Expo Location heading usuli qaytarildi. GPS natijasini kutish kompasni ishga tushirishni kechiktirmaydi. Har kirishda ochiladigan avtomatik animatsiya olib tashlandi; qo‘lda qayta sozlash tugmasi qoldi.

## Bajarilgan tekshiruvlar

- Lint, TypeScript va kompas regressiya tekshiruvi o‘tdi.
- Android unit testlari, test APK va production AAB yig‘ilishi muvaffaqiyatli.
- API 36 emulatorda telefon 180°, 270° va Qibla yaqinidagi 241° yo‘nalishlarda tekshirildi: Ka’ba joyida, strelka harakatda, Qibla 240° yaqinida yashil tasdiq chiqdi.
- Boshqa sahifadan qaytish va ilovani backgrounddan qayta ochishda sensor qayta ishladi. ReactNativeJS/AndroidRuntime xatosi kuzatilmadi.
- APK imzosi, ZIP alignment, AAB imzosi va bundletool validatsiyasi tekshirildi. Ikkala arxivdagi 48 native kutubxona 16 KB ELF alignment talabidan o‘tdi; shaxsiy imzo kalitlari arxivga kirmagan.

## Telefonda sinash

1. Halovat-1.0.3-test.apk faylini oldingi test ilovasi ustidan o‘rnating.
2. Qibla sahifasida joylashuv ruxsatini bering. Telefonni tekis ushlab, kerak bo‘lsa sakkiz shaklida ohista aylantiring.
3. Chapga/o‘ngga burilganda strelka harakatini va qora Ka’baning tepada joyida qolishini tekshiring. Qiblaga qaraganda yashil tasdiq chiqishini tekshiring.
4. Boshqa sahifaga o‘tib qayting; ilovani backgroundga olib, qayta ochib sinang.
5. Redmi Note 8 va 10 Lite hamda uchinchi telefondagi natijalarni solishtiring. Haqiqiy qurilmalardagi sinov hali bajarilmagan.

Test APK eski test imzosi bilan, production AAB alohida upload kaliti bilan imzolangan. AAB Play Marketga yuklanmadi. Ushbu o‘zgarish kompasni qaytarishga tegishli; avval hujjatlashtirilgan release talablari va haqiqiy telefon sinovlari saqlanadi.
