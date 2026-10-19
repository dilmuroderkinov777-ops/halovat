# Halovat 1.0.5 — SVG matnlarining ichki bo‘shliqlari

Android versionCode: 6. Sana: 2026-10-19.

Foydalanuvchi yuborgan tanishtiruv skrinshotlarida `4`, `a` va `A` ichidagi bo‘shliqlar rang bilan yopilib qolgan. Bu yozuvlar `OnboardingArt.tsx` ichida SVG matni sifatida chizilgan; oddiy ilova matnlari boshqa komponent orqali chiziladi.

Tanishtiruvdagi SVG yozuvlar uchun umumiy `ArtText` komponenti qo‘shildi. `fillRule="evenodd"` harf va raqamlarning ichki konturlarini bo‘sh qoldiradi. Shrift va uning o‘lchamlari saqlandi. O‘zgarish barcha tanishtiruv rasmlaridagi yozuvlarga tatbiq qilindi. 1.0.4 dagi kompas va kalibrlash popupi o‘zgartirilmadi.

API 36 emulatordagi eski versiyada bu buzilish qaytarilmadi: unda `4` ichki bo‘shlig‘i avval ham ochiq edi. Eski va yangi ko‘rinish solishtirildi; yangi versiyada `247°`, `350 m · 4 daqiqa`, `Asr`, haftalik jadval va boshqa lotin yozuvlari to‘g‘ri ko‘rindi. Yuborilgan skrinshotdagi telefonlarda qayta tekshirish zarur.

Lint, TypeScript, Android unit testlari hamda test/production yig‘ilishi o‘tdi. API 36 seansida ReactNativeJS/AndroidRuntime xatosi kuzatilmadi. APK/AAB imzolari, bundletool validatsiyasi, ZIP alignment va 48 native kutubxonaning 16 KB ELF alignment tekshiruvi o‘tdi. APK/AAB ichidagi 52 kod fayli bir xil.

## Telefonda sinash

1. Halovat-1.0.5-test.apk faylini oldingi test ilovasi ustidan o‘rnating.
2. Tanishtiruvdagi Qibla rasmida `247°`, masjid xaritasidagi `350 m · 4 daqiqa` va namoz jadvalidagi `Asr` yozuvlarini tekshiring.
3. `4` ichidagi uchburchak, `a` va `A` ichidagi bo‘sh joylar ochiq bo‘lsin. Qolgan harflarda yangi teshiklar yoki buzilish bo‘lmasin.
4. Rus yoki kirill tili tanlansa, tanishtiruvdagi matnlar to‘g‘ri chizilishini ham tekshiring.

Google Play’ga yuklash bu o‘zgarish doirasida bajarilmaydi. Haqiqiy telefon sinovi hali kerak.
