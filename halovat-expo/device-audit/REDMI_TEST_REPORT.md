# Halovat — Redmi Note 8 sinov hisoboti

Sana: 2026-10-09. Qurilma: Redmi Note 8 (ginkgo), Android 11.
O‘rnatilgan ilova: uz.halovat.expo, versionName 1.0.0, versionCode 1.

## Tasdiqlangan natijalar

| Tekshiruv | Natija | Dalil / chegara |
| --- | --- | --- |
| USB orqali ADB ulanishi | O‘tdi | Qurilma `device` holatida ko‘rindi. |
| Sinov eslatmasida vibratsiya | O‘tdi | Foydalanuvchi haqiqiy telefonda tasdiqladi. Davomiylik alohida o‘lchanmagan. |
| Sinov eslatmasida flash | O‘tdi | Foydalanuvchi haqiqiy telefonda tasdiqladi. |
| Sinov eslatmasida ekran uyg‘onishi | O‘tdi | Foydalanuvchi ekran yoqilishini tasdiqladi. |
| “Yopish” bosilganda vibratsiya va flashni to‘xtatish | O‘tdi | Foydalanuvchi haqiqiy telefonda to‘xtashini tasdiqladi. |
| Tasbeh: 33 tadan keyin vibratsiya va keyingi zikr | O‘tdi | Foydalanuvchi haqiqiy telefonda tasdiqladi. |
| Bildirishnoma kanallari | O‘tdi | Android dumpsys: importance=4, vibrationEnabled=true, pattern=[0,10000]. |
| DND boshqarish ruxsati | Berilgan | enabled_notification_policy_access_packages ichida uz.halovat.expo tekshirildi. Bu avtomatik jim rejimning ishlashi testi emas. |
| TypeScript va lint | O‘tdi | npx tsc --noEmit va npx expo lint muvaffaqiyatli tugadi. |

## Topilgan muammo

- Masjidlar sahifasida “Xarita xizmati band. Birozdan so‘ng qayta urinib ko‘ring.” va 0 ta natija kuzatildi. UI XML dalillari: ui.xml, profile.xml. Asosiy sabab yakuniy aniqlanmagan.

## Hali tekshirilmagan

- Ta’sirlarning 10 soniyadan keyin avtomatik tugashi.
- Haqiqiy namoz vaqtida eslatma va namozdan keyingi savol.
- Avtomatik jim rejimga kirish va avvalgi ovoz holatini tiklash.
- Batareya tejash, telefon qayta yoqilishi va ilova uzoq vaqt ochilmasligi.
- Masjid hududiga haqiqiy kirish/chiqish va fon joylashuvi.
- Kompasning telefon aylantirilganda to‘g‘ri ishlashi.
- Qo‘ng‘iroqlarni jim qilish va ilova kuzatgan qo‘ng‘iroqlar xulosasi.
- Namoz va qazo holatlari, duolar, sozlamalar va saqlanishining qurilmadagi to‘liq UI sinovi.
- iOS funksiyalari.

## Sinov cheklovlari

- MIUI kompyuterdan ekran bosishlarini INJECT_EVENTS xatosi bilan blokladi. Qo‘shimcha USB xavfsizlik sozlamasi Mi akkaunt talab qilgani uchun qo‘lda hamkorlikdagi sinov ishlatildi.
- Foydalanuvchi eslatmaning vibratsiya, flash va ekran uyg‘onishi batareya cheklovi olib tashlangandan keyin ishlaganini bildirdi. Sinov muvaffaqiyati shu sozlangan holatga tegishli; cheklangan holatda mustaqil ishlashi tasdiqlanmagan.
- Oxirgi log tekshirish paytida ADB ro‘yxati bo‘sh edi; bildirilgan muvaffaqiyatli sinovning native loglari olinmadi.
- Yuqoridagi natijalar butun ilovaning productionga tayyorligini tasdiqlamaydi.
