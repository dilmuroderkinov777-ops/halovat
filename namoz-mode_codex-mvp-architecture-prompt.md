# Namoz Mode — Codex uchun MVP arxitektura prompti

Quyidagi promptni Android Studio loyihasi ochilgan Codex oynasiga to‘liq yuboring. Bo‘sh papkadan boshlayotgan bo‘lsangiz, avval uni Codex’da oching.

---

## CODEX PROMPT — boshlanishi

Sen senior Android engineer va product-minded software architect sifatida ishlaysan. Maqsad — Android uchun “Namoz Mode” ilovasining ishlaydigan, kichik, maxfiylikka e’tiborli MVP’sini shu repository ichida qurish. Faqat tavsiya yoki arxitektura hujjati bilan to‘xtama: repository’ni tekshir, implementatsiya qil, build va testlarni ishga tushir, natijani README’da yoz.

### 1. Ishni boshlashdan oldin

1. Repository tarkibi, README, AGENTS.md va mavjud build konfiguratsiyasini tekshir. Mavjud kod bo‘lsa, undan foydalan; kerakmasdan qayta yozma.
2. Build muhitidagi Android SDK, Gradle va JDK versiyalarini aniqlab, ularga mos barqaror kutubxonalarni tanla. Versiyalarni taxmin bilan eskirtirma.
3. Android platformasi va Google Play siyosatiga taalluqli noaniq joylarni implementatsiyadan oldin rasmiy Android Developers va Play Console hujjatlaridan tekshir. Ayniqsa CallScreeningService, AccessibilityService, DND access, fon joylashuvi, SMS/Call Log ruxsatlari va exact alarm talablarini tekshir.
4. Avval 5–10 bandli qisqa texnik reja chiqar, keyin shu turnning oʻzida ishni davom ettirib implementatsiya qil. Bloker boʻlmasa foydalanuvchidan ortiqcha savol soʻrama.

### 2. Mahsulot maqsadi

Ilova namoz vaqtida telefonning qo‘ng‘iroq va bildirishnomalari namozxonni chalg‘itmasligiga yordam beradi. Foydalanuvchi telefonni namoz boshlanishida qo‘lda jim qila oladi; masjid geofence’i yoqilgan bo‘lsa, tanlangan masjidga kirganda jim rejim avtomatik yoqiladi. Rejim tugagach, foydalanuvchiga shu vaqt oralig‘ida qo‘ng‘iroq qilganlar haqida qisqa xulosa chiqadi.

Muhim mahsulot konteksti: bunday jim rejim/geofence funksiyalariga ega ilovalar allaqachon bor. MVP’ning qiymati nusxa ko‘chirishda emas, o‘zbek foydalanuvchisi uchun ishonchli avtomatlashtirish, tushunarli ruxsatlar, mahalliy vaqt sozlamalari va namozdan keyingi qo‘ng‘iroq xulosasidadir. Boshqa ilovalarning kodi, nomi, ikonasi yoki dizaynini ko‘chirma.

### 3. MVP scope

#### Majburiy

- Android native ilova: Kotlin, Jetpack Compose, Material 3.
- O‘zbekcha va ruscha interfeys; inglizcha stringlar fallback bo‘lishi mumkin.
- Bosh sahifa: bugungi namoz vaqtlari, keyingi namoz countdown, “Jim rejimni yoqish” tugmasi va faol rejim qancha davom etishi.
- Namoz eslatmasi Android notification sifatida chiqadi; action tugmalari:
  - “20 daqiqa jim qilish”;
  - “10 daqiqadan keyin eslatish”;
  - “O‘tkazib yuborish”.
- Jim rejimni belgilangan muddatga yoqish va muddat tugaganda ilovaning qo‘shgan holatini tiklash.
- Foydalanuvchi avvaldan Do Not Disturb yoki silent holatida bo‘lsa, uni buzmaslik; oldingi rejimni saqlab, faqat ilova boshlagan rejim tugaganda ehtiyotkorlik bilan tiklash.
- Foydalanuvchi tanlagan masjid uchun geofence-based auto quiet mode. Joylashuvni fon rejimida kuzatish faqat user ushbu funksiyani alohida yoqqandan keyin so‘ralsin.
- Jim rejim faol bo‘lgan paytda kiruvchi qo‘ng‘iroqlarni lokal qayd etish. Rejim tugagach “Namoz vaqtida N ta qo‘ng‘iroq bo‘ldi” notification va ilova ichida raqam/vaqt ro‘yxatini ko‘rsatish.
- Qo‘ng‘iroq xulosasida raqamni bosib telefonning odatiy call action’ini ochish.
- Bir nechta jim rejim sabablari ustma-ust tushganda (qo‘lda, namoz vaqti, masjid) holatni to‘g‘ri boshqarish; bir rejim tugashi boshqasini muddatidan oldin o‘chirib yubormasin.
- Barcha foydalanuvchi sozlamalari va vaqtinchalik call summary lokal saqlansin. MVP’da login, server, cloud sync, reklama, analytics bo‘lmasin.

#### Alohida, opt-in va best effort: tezkor SMS javobi

Foydalanuvchi ilova ichida alohida yoqsa, namoz jim rejimida kiruvchi qo‘ng‘iroq kelganda Android telefon ilovasining mavjud “respond with message / quick response” interfeysidan belgilangan tayyor javobni tanlashga urinishi mumkin. Ilova o‘zidan SMS yozmasin va yubormasin.

Bu xususiyatning real cheklovlari:

- Android’da uchinchi tomon ilovasiga standart Phone ilovasidagi quick-response tugmasini chaqirish uchun universal, barqaror public API bor deb hisoblama. Android’ning ACTION_RESPOND_VIA_MESSAGE oqimi telefon ilovasi user quick reply’ni tanlaganda ishlaydi; CallScreeningService esa qoʻngʻiroqqa ruxsat berish, jim oʻtkazish yoki rad etishni boshqaradi, SMS matnini tanlamaydi.
- UI automation koʻrib chiqilsa, Android AccessibilityService faqat ochiq, tushunarli va alohida opt-in bilan ishlatilsin. Google Play’ning joriy AccessibilityService talablarini tekshir; foreground disclosure, user consent va Play Console declaration zarur boʻlsa bajar. Ilovani disability accessibility tool deb notoʻgʻri belgilama.
- Avtomatlashtirish faqat aniq qoida boʻlsin: “namoz jim mode aktiv + incoming-call UI aniqlandi + user funktsiyani yoqqan → user avval tanlagan quick-response action’ni bajar”. Belgisiz ekranda hech qanday bosish qilma.
- Faqat amaldagi default dialer package va tekshirilgan UI hierarchy’ga tayan; koordinata boʻyicha koʻr-koʻrona bosish, har qanday ilova oynasini oʻqish, overlay’larni aldash yoki accessibility’ni yashirincha yoqish mumkin emas.
- Android/Samsung/Xiaomi telefonlarida quick response UI bir xil boʻlmasligi mumkin. UI’da “Avtomatik javob shu telefonda tekshirilgan/tekshirilmagan” holatini koʻrsat. Ishonchli aniqlash boʻlmasa, javob yubormaslik va qoʻngʻiroqni normal qoldirish kerak.
- Ilovaning oʻziga arbitrary custom SMS matnini sistemaga API orqali qoʻshaman deb va’da qilma. MVP avval default dialer’da user sozlagan mavjud javobni tanlash mumkinligini tekshirsin. Agar bu ishlamasa, qoʻngʻiroqdan keyin user bosib joʻnatadigan manual quick-reply fallback qoldir.
- Har bir kiruvchi qoʻngʻiroq uchun ko‘pi bilan bitta javob; private/unknown raqam, favqulodda yoki xizmat raqami, qoʻllab-quvvatlanmaydigan dialer, allaqachon davom etayotgan qoʻngʻiroq yoki noaniq holatda avtomatik javob berma.
- SEND_SMS, READ_SMS, READ_CALL_LOG soʻrama va default SMS/Phone app rolini talab qilma. Agar ishlaydigan xavfsiz yoʻl bu shartlarsiz topilmasa, automation’ni MVP’da experimental/off-by-default qilib qoldir va manual fallback’ni ishlat.

### 4. Android roʻllari va qoʻngʻiroq ma’lumoti

- DND boshqaruvi uchun NotificationManager access holatini tekshir; user’ni system settings sahifasiga tushunarli onboarding orqali olib bor. Ruxsat berilmagan boʻlsa, jim mode’ni yoqilgan deb koʻrsatma.
- Qoʻngʻiroq roʻyxati uchun CallScreeningService’ni ixtiyoriy opt-in sifatida arxitekturaga kirit. Foydalanuvchi ilovani user-selected call-screening app sifatida belgilamasa, qoʻngʻiroq metadata’sini olaman deb va’da qilma.
- Android hujjatlariga koʻra CallScreeningService ba’zi hollarda contact’da saqlangan raqamlarni READ_CONTACTS berilmaguncha service’ga uzatmasligi mumkin; private/unavailable raqam ham ochilmasligi mumkin. Buni SDK/documentation va real qurilmada tekshir. Kontakt roʻyxatini koʻchirma yoki server’ga yuborma.
- Agar barcha raqamlarni olish uchun READ_CONTACTS kerak boʻlsa, uni faqat “namozdan keyin qoʻngʻiroq xulosasi” foydalanuvchi tomonidan yoqilganda, alohida sabab bilan soʻra. Rad etilganda gracefully degrade qil va qaysi raqamlar aniqlanmasligini tushuntir.
- READ_CALL_LOG bilan keyin telefon jurnalini skanerlama; faqat aktiv namoz session davrida kelgan live call event’larni lokal saqla. Rol berilmagan boʻlsa, “qoʻngʻiroq xulosasi ishlamaydi” deb ochiq koʻrsat.
- CallScreeningService har bir incoming call uchun Android talab qilgan vaqt ichida (hozirgi API talabini tekshir) tez javob bersin; default behavior qoʻngʻiroqni reject qilish boʻlmasin.

### 5. Texnologik arxitektura

Ortiqcha microservice/module qilma. Bir app module etarli; kodni feature/platform/data/domain boʻyicha toza ajrat.

- **Presentation:** Compose screens, ViewModel, immutable UI state, one-way data flow.
- **Domain:** PrayerScheduleProvider, QuietModeCoordinator, PrayerReminderScheduler, MosqueGeofenceManager, CallSessionRecorder, Permission/Capability status.
- **Data:** DataStore preferences; kerak boʻlsa Room’da mahalliy masjid va call event ma’lumoti.
- **Platform adapters:** Android NotificationManager/DND, AlarmManager yoki talabga mos scheduler, Geofencing API, CallScreeningService, AccessibilityService.
- **Concurrency:** Kotlin coroutines/Flow; platform service’lardan UI’ga state’ni xavfsiz etkazish.
- **Dependency injection:** loyiha kattaligiga mos engil echim; keraksiz freymvork qoʻshma.
- **Prayer times:** PrayerTimeProvider interfeysi yarat. Oflayn hisoblaydigan, hozir ham qoʻllab-quvvatlanadigan library/algoritmni rasmiy manbadan tekshirib tanla; calculation method, Hanafi/Shafi Asr, timezone va user correction’ni sozlanadigan qil. Tashkent uchun natijani ishonchli mahalliy jadval bilan solishtirish usulini README’da yoz. API key talab qiladigan serverga bogʻlab qoʻyma.
- **Mosque map:** jim qilish uchun Google Maps API majburiy emas; geofence koordinatadan ishlaydi. MVP’da user masjidni joylashuvi bilan tanlay oladi yoki xaritadan pin qoʻyadi; yoʻnalishni installed maps app’ga intent/deep link bilan och. Google Maps SDK yoki qimmat Places integratsiyasini mahsulot zarurati tasdiqlanmaguncha qoʻshma.
- Ishonchli brend nomi hali belgilanmagan boʻlsa, app title va applicationId’ni bitta joydan almashtirish mumkin qilib, development placeholder ishlat.

### 6. Asosiy domain model va holatlar

Quyidagi kontseptsiyalarni aniq modellashtir:

- **QuietSession:** id, source (MANUAL/PRAYER/MOSQUE), startedAt, endsAt, status, call summary capability/state.
- **QuietModeCoordinator:** sabablar/lease’larni hisobga oladi; birinchi lease boshlanganda avvalgi DND holatini yozadi; oxirgi lease tugaganda faqat oʻzi boshlatgan oʻzgarishni tiklaydi.
- **CallEvent:** id, normalizedNumber (mumkin boʻlsa), receivedAt, sessionId, replyAttempted/replySent state. Private yoki berilmagan raqamni placeholder bilan saqla.
- **MosquePlace:** id, displayName, latitude, longitude, radius, enabled.
- **PrayerPreferences:** city/location, calculation method, madhhab, per-prayer reminder, quiet duration, reminder snooze, mosque automation, call summary, auto quick reply.

State transition’lar idempotent boʻlsin. Reboot, app process kill, notification action takroran kelishi va geofence enter/exit ortiqcha DND toggle’ga olib kelmasin. Geofence’dan chiqqanidan keyin yoki safety timeout’dan keyin quiet mode tiqilib qolmasin. User system’da DND’ni qoʻlda oʻzgartirsa, ilova uni qayta-qayta bosib yozmasin.

### 7. Privacy va UX talablari

- Ruxsatlarni app birinchi ochilishida birdaniga soʻrama. Avval feature’ni tushuntir; foydalanuvchi uni yoqqanda kerakli ruxsat’ni soʻra.
- Location: prayer time’ni hisoblash uchun foreground/one-time yoki shahar tanlash usuli; background location faqat masjid auto mode uchun.
- Phone number’larni faqat namoz session’ida yoz; default local-only; hech qaerga upload qilma. Call event’larni user oʻchira oladi va avtomatik retention policy boʻlsin (masalan, 24 soatdan keyin yoki xulosa koʻrilgach).
- Lock screen notification’da raqamlarni ochiq chiqarmaslik; user’ga privacy preview setting ber yoki faqat sonini koʻrsat.
- Auto-reply, call summary, mosque geofence va DND uchun alohida toggle/status boʻlsin. Qaysi feature uchun qaysi permission/role berilmagani aniq koʻrinsin.
- Notification va permission matnlari bosim oʻtkazmasin; masalan: “Namoz vaqti. Telefonni 20 daqiqaga jim qilamizmi?”
- Feature ishlamaganida “muvaffaqiyatli ishlayapti” deb koʻrsatma; diagnostic status’da trigger vaqti, ruxsat va oxirgi xatoni tushunarli koʻrsat.

### 8. Ekranlar

MVP’da kamida:

1. **Home:** keyingi namoz vaqti/countdown, bugungi jadval, manual quiet-mode button, active timer.
2. **Setup:** location/city, calculation method, timezone, Asr madhhab va prayer-time adjustment.
3. **Mosques:** saved mosque list, add pin/search, radius, geofence toggle va background location status.
4. **After-prayer summary:** raqam, vaqt, javob berilgan/berilmagan holat; tap-to-call.
5. **Settings/permissions:** DND, notifications, exact scheduling capability, call-screening role, contacts permission, accessibility auto-reply status va each feature’ning pause/toggle holati.
6. **Permission rationale screens:** ruxsat soʻrashdan oldin app nima uchun kerakligini aniq tushuntirish.

### 9. Test va qabul mezonlari

Kamida ma’noli unit test’lar qoʻsh:

- Qoʻlda va geofence session’lar bir-birini oʻchirib yubormasligi.
- Oldindan DND yoqilgan boʻlsa, session tugaganda ham DND saqlanishi.
- Notification snooze/dismiss amallari toʻgʻri vaqtda qayta scheduled boʻlishi.
- Bir incoming call takroriy event’dan ikki marta saqlanmasligi yoki ikki javobga sabab boʻlmasligi.
- Retention policy va private number placeholder toʻgʻri ishlashi.
- Prayer schedule timezone/day-boundary/correction testlari.

Qurilmada qoʻlda tekshirish chek-listi yoz: notifications allowed/denied, DND access allowed/denied, background location denied/granted, app process killed, reboot, overlapping geofences, private caller, contact caller, unknown caller, native dialer quick response UI, auto-reply off/on. Kamida Samsung A55 va mavjud boʻlsa Xiaomi/Redmi’da tekshir; qoʻllab-quvvatlanmagan qurilmada avtomatik javobni oʻchir.

### 10. Definition of Done

- Debug APK build boʻladi; compile error qolmaydi.
- Unit test va lint/static checks ishga tushirilgan; natijalar README’da yozilgan.
- Qoʻlda “Jim rejim” yoqib, taymer bilan tugatish ishlaydi.
- Namoz reminder notification va action button’lar ishlaydi.
- DND permission berilmasa, UI feature’ni disabled/status message bilan koʻrsatadi.
- Masjid geofence, call summary va accessibility quick-reply uchun alohida user opt-in/permission status bor.
- Call summary lokal; READ_CALL_LOG va SEND_SMS yoʻq.
- Auto quick reply ishlamagan qurilmada app qoʻngʻiroqni tasodifan rad etmaydi va xato holatni ochiq koʻrsatadi.
- README’da arxitektura, build/run yoʻriqnomasi, permission matrix, known limitations va manual device-test qadamlari bor.
- Agar real qurilma yoki Google Play policy approval kerak boʻlgan qismni tekshirib boʻlmasa, uni “tested” deb yozma; nimasi prototip, nimasi ishonchli ekanini alohida qayd et.

Ishni repo holatini qisqacha bayon qilishdan boshla, keyin kodni amaliy tarzda yakunla. Build yoki test muvaffaqiyatsiz boʻlsa, sababini topib tuzatishga urina; ishlamaydigan pseudo-code yoki soxta permission status bilan MVP tayyor deb hisoblama.

## CODEX PROMPT — tugashi
