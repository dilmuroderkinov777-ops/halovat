# Halovat 1.0.6 (7) — telefon sinovi

Maqsad: Redmi Note 8, 10 Lite va imkon bo‘lsa boshqa ishlab chiqaruvchining telefonida quyidagi tekshiruvlardan o‘tkazish. Emulator tekshiruvi haqiqiy kompas, MIUI batareya cheklovlari va masjidga kirish/chiqishni tasdiqlamaydi.

## O‘rnatish

- `Halovat-1.0.6-test.apk` — telefonga o‘rnatiladigan, release optimizatsiyali sinov paketi. Oldingi Halovat test APKsi ustidan yangilang; avval ilovani o‘chirmang.
- `Halovat-1.0.6-production.aab` — yangi upload kaliti bilan imzolangan Play Console paketi. Telefon uni to‘g‘ridan to‘g‘ri o‘rnatmaydi.
- Sinov APKsi va Play versiyasi imzolari har xil. Keyingi Play versiyasiga o‘tishda test ilovasini o‘chirish talab qilinishi mumkin; undagi mahalliy hisoblar avtomatik ko‘chmaydi.
- Profil → Eslatmalar holatidan DND (“Bezovta qilmang”), aniq budilnik va bildirishnoma ruxsatlarini tekshiring. Masjid avtomatik rejimi uchun aniq joylashuv va “Har doim ruxsat berish” kerak.
- Redmi: Halovat uchun batareya cheklovini olib tashlang va mavjud bo‘lsa avtomatik ishga tushirishni yoqing. Ilovadagi ko‘rsatmaga amal qiling.

## Har bir telefon uchun

| Sinov | Kutilgan natija | Note 8 | 10 Lite | 3-telefon |
|---|---|---|---|---|
| Eski APK ustidan yangilash | Profil, tanlangan shahar va hisoblar saqlanadi | ☐ | ☐ | ☐ |
| Sovuq ochish, 5 marta | Ilova ochiladi; ochilish animatsiyasi to‘liq tugaydi, qotish/crash yo‘q | ☐ | ☐ | ☐ |
| Tablarni tez almashtirish va scroll | Sezilarli pauza yo‘q; 5–10 daqiqadan so‘ng ham barqaror | ☐ | ☐ | ☐ |
| Kompas, joylashuv ruxsati rad etilgan | Kompas uchun ruxsat kerakligi ko‘rsatiladi; cheksiz yuklanish yoki crash yo‘q | ☐ | ☐ | ☐ |
| Kompas, tashqarida GPS bilan | Telefonni tekis ushlab aylantirganda qibla yo‘nalishi izchil; metall/magnitdan uzoqda tekshiring | ☐ | ☐ | ☐ |
| Qibla popupi | Har kirishda sakkiz animatsiyasi chiqadi; avtomatik/tugma/Back bilan yopiladi | ☐ | ☐ | ☐ |
| Welcome yozuvlari | Tanishtiruvdagi 247°, 4 daqiqa, a/A ichki bo‘shliqlari to‘g‘ri | ☐ | ☐ | ☐ |
| Kompasdan chiqish, Home, qaytish | Sensor qayta ishlaydi, eski ko‘rsatkichda qolmaydi | ☐ | ☐ | ☐ |
| GPS o‘chiq/ruxsat rad etilgan | Tushunarli holat; cheksiz yuklanish yo‘q | ☐ | ☐ | ☐ |
| Masjid, internet o‘chiq | Mahalliy katalogdan yaqin masjidlar chiqadi; xarita fonini internet talab qilishi mumkin | ☐ | ☐ | ☐ |
| Masjid, internet yoqilgan | Xarita/yangilash ishlaydi; surat manbasi bor masjidning surati ochiladi | ☐ | ☐ | ☐ |
| 15 soniyalik ovozsiz sinov | DND yoqiladi, muddatdan so‘ng oldingi holat tiklanadi | ☐ | ☐ | ☐ |
| Ekran qulflangandagi sinov | 15 s keyin boshlanadi, 30 s ishlaydi, so‘ng tiklanadi | ☐ | ☐ | ☐ |
| Haqiqiy namoz vaqti, ekran qulflangan | Rejim boshlanadi va 25 daqiqadan keyin tugaydi; eslatma yoqilsa dastlabki 10 s eslatma uchun ajratiladi | ☐ | ☐ | ☐ |
| Masjid avtomatik rejimi | Tanlangan masjidning 150 m hududiga kirganda jim; chiqqanda tiklanadi (OS kechiktirishi mumkin) | ☐ | ☐ | ☐ |
| Ikki rejim ustma-ust | Bittasi tugaganda ikkinchisi faol bo‘lsa telefon jim qoladi | ☐ | ☐ | ☐ |
| Oldindan DND/vibratsiya yoqilgan | Halovat tugagach foydalanuvchining oldingi holati buzilmaydi | ☐ | ☐ | ☐ |
| Telefonni qayta yoqish | Ruxsatlar saqlanadi; jadval va masjid kuzatuvi qayta tiklanadi | ☐ | ☐ | ☐ |
| Rejimlarni o‘chirish | Yangi avtomatik jim qilish to‘xtaydi; boshqa faol rejim bo‘lmasa ovoz tiklanadi | ☐ | ☐ | ☐ |
| Namoz eslatma/vibratsiya, tasbeh, duolar, til | Asosiy funksiyalar ishlaydi | ☐ | ☐ | ☐ |

Force stop Android tomonidan fon vazifalarini to‘xtatadi: undan keyin ilovani qayta oching. 30 kunlik jadval saqlanadi, fon vazifasi uni yangilashga urinadi; tizim ruxsat bermasa ilovani ochish ham jadvalni yangilaydi. Barcha masjidlarga ochiq surat topilmagan; rasm yo‘qligi alohida xato emas.

## Xato xabari

Profil → Eslatmalar holati → **Diagnostikani nusxalash**. Shu matnni quyidagilar bilan yuboring:

- Telefon modeli, Android va MIUI/HyperOS versiyasi.
- Qaysi qadam, kutilgan va haqiqiy natija, aniq vaqt.
- Ekran qulflanganmi, internet/GPS/batareya tejash holati.
- Imkon bo‘lsa ekran videosi. Telefon raqami kabi shaxsiy ma’lumotlarni yashiring.

Kamida bir sutka, jumladan haqiqiy namoz vaqti, qayta yuklash va masjidga borish sinovlaridan keyin release qarorini qabul qiling.
