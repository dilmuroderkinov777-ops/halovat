# Halovat dizayn manbasi

2026-10-08 ochilish va profil tuzatishlari:
- Telefon launcher ikonasi foydalanuvchi bergan 3-rasm: `assets/halovat-launcher.png` (asl PNG, o‘zgartirilmagan).
- Android adaptive ikonada to‘liq rasm ko‘rinishi uchun `withLauncherArtworkInset` config plugini ishlaydi.
- Splash: eski Expo placeholder o‘rniga Halovat belgisi, 160 dp, och yoki tungi fon. Native resurslar `expo prebuild` orqali yangilandi.
- Native splash shriftlar va saqlangan ma’lumotlar yuklangach, navigatorning birinchi layoutidan keyin yashiriladi.
- Profil ismi klaviaturaga moslashuvchi markaziy dialogda tahrirlanadi. Matn maydoni va «Saqlash» klaviatura ustida qoladi.

2026-10-06 til tanlash: `../Halovat — tilni tanlash.html` aynan `references/language-selection.html`ga saqlandi.
Til tanlash birinchi ekran; «Davom etish»dan keyin avvalgi 6 sahifa ochiladi (jami 7 bosqich).
O‘zbekcha, Ўзбекча, Русский va English nomlari, salomlashuv va tanlash matnlari HTML bilan bir xil.
Tanlov `halovat.expo.language.v1` kalitida saqlanadi; Profil → Ilova tili orqali o‘zgartiriladi.
Welcome va asosiy interfeys matnlari tarjima katalogidan olinadi; o‘zbekcha asl matnlar saqlanadi.
Kirill matni uchun reference’dagi Onest shriftidan foydalaniladi; ism va karta egasi tarjima qilinmaydi.
Til tanlanganda reference yulduzi aylanadi va matn yengil almashadi; reduced-motion sozlamasi saqlanadi.

2026-10-06 welcome ekrani: foydalanuvchi bergan `../Halovat — welcome screen 6 pages.html`.
Asl nusxa `references/welcome-six-pages.html`da, aynan ko‘chirilgan matnlar `src/data/welcome.ts`da.
6 sahifa native Expo/React Native UI va SVG bilan ko‘chirildi: quyosh, haftalik jadval,
tasbeh donalari, kompas, yaqin masjid xaritasi va masjid ovozsiz hududi animatsiyalari.
«Keyingisi», surish yoki pastdagi nuqtalar sahifani o‘zgartiradi; «Boshlash» yakunlanganini saqlaydi.
Yangi welcome versiyasi yangilangandan keyin bir marta ochiladi; namozlar va boshqa saqlangan ma’lumotlar saqlanadi.
Qurilmaning reduced-motion sozlamasida rasmlar yakuniy holatda ko‘rsatiladi.
Tanishtiruv rasmlaridagi vaqt, jadval va masofa HTML’dagi namunalardir; haqiqiy hisobga yozilmaydi.

Foydalanuvchi yuborgan birlashtirilgan HTML demo:
`../stitch-reference/combined-demo/halovat_namoz_va_ibodat_hamrohi.html`

Figma: https://www.figma.com/design/QA5H0N0aQnwGhwAhYTEA6r/Untitled

HTML ekranlarining Expo Router mosligi:

| Demo | Ilova |
| --- | --- |
| HomeScreen (`/`) | `src/app/(tabs)/index.tsx` |
| PrayersTrackerScreen (`/namozlar`) | `src/app/(tabs)/tracker.tsx` |
| TasbehScreen (`/tasbeh`) | `src/app/(tabs)/tasbeeh.tsx` |
| TasbehScreen (`?tab=duolar`) | `src/app/(tabs)/duas.tsx` |
| QiblaScreen (`/qibla`) | `src/app/(tabs)/qibla.tsx` |
| NearbyMosquesScreen (`/masjidlar`) | `src/app/(tabs)/mosque.tsx` |
| ProfileScreen (`/profil`) | `src/app/(tabs)/settings.tsx` |

Pastki navigatsiya tartibi: Bosh sahifa → Namozlar → Tasbeh → Qibla → Profil.
Duolar ekranida Tasbeh, masjidlar ekranida Qibla faol bo‘ladi.

Dizayn matnlari, ranglari va joylashuvi shu demo bilan solishtiriladi.
HTML ichidagi statik sana, vaqt, ism, statistika va koordinatalar ilovada haqiqiy ma’lumotdan olinadi.
Demo ovoz tugmalari beep chiqaradi; bu duo qiroati sifatida ko‘rsatilmaydi.
Demo karta raqami va test havolalari ishlab turgan to‘lov rekviziti sifatida ishlatilmaydi.
Foydalanuvchining har 33 zikrda uzun vibratsiya va keyingi zikrga o‘tish talabi saqlanadi.

2026-10-05 taqqoslash rasmlari bo‘yicha:
- Natija halqasi va kunlik taqsimot bir qatorda; qazo kartasida bitta yozuv, to‘liq ro‘yxat «Batafsil hisob» oynasida.
- Profil: ism bosh harflari, foydalanish kunlari, «Tahrirlash» oynasi va ixcham hisoblar.
- Eslatma oralig‘i, manba tafsilotlari va arabcha shrift o‘lchami ichki oynalarda.
- Tungi rejim qurilmada saqlanadi va asosiy ekranlar, sarlavha, pastki menyuga qo‘llanadi.
- Hissa rekvizitlari foydalanuvchi bergan UZCARD va VISA kartalari bilan `src/data/support.ts`da saqlanadi; har birida alohida nusxa olish tugmasi bor.
- «Halovatga hissa qo‘shing!» bo‘limi ostida foydalanuvchi bergan tushuntirish matni doim to‘liq ko‘rinadi. Eski oyat iqtibosi va «Ko‘proq / Kamroq» tugmasi olib tashlangan.
- Azon audio mavjud bo‘lmagani uchun eslatma matnida audio va’da qilinmaydi.

2026-10-06 profil tuzatishlari:
- Bosh sahifadagi «Namoz rejimini yoqish» kartasi foydalanuvchi talabiga ko‘ra olib tashlandi.
- «HANAFIY» yorlig‘i va namoz manbasi kartasi olib tashlandi; hisoblash va taqvim olish davom etadi.
- Eslatmalar kartasiga «Namoz vaqtida ovozsiz rejim» va «Masjid hududida ovozsiz rejim» switchlari qo‘shildi.
- Android namoz ovozsiz rejimi har namoz boshlanishidan 25 daqiqa davom etadi; 30 kunlik jadval ilovani ochganda yangilanadi.
- Masjid rejimi xaritada tanlangan masjidning 150 m geofence hududiga kirish/chiqishga ulanadi; aniq va fon joylashuv ruxsati talab etiladi.
- Manual sessiya, namoz jadvali va masjid rejimlari mustaqil: bittasi tugaganda qolgan faol rejim ovozsiz holatni saqlaydi.
- Android DND va aniq alarm ruxsatlari yoqish paytida so‘raladi. iOS/web switchlari yoqilmaydi va tushuntirish ko‘rsatiladi.
- Masjid fon hodisalari Google Play xizmatlari orqali yetkaziladi; joylashuv hodisasi kechikishi mumkin. Haqiqiy telefondagi kirish/chiqish hali tekshirilmagan.
