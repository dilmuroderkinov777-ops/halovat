import { AppLanguage } from '../data/languages';

// Uzbek source copy remains unchanged. Other languages are UI translations.
const entries: readonly (readonly [string, string, string])[] = [
  ['Eslatma chirog‘i', 'Вспышка напоминаний', 'Reminder flashlight'],
  ['Chiroq uchun ruxsat berish', 'Разрешить вспышку', 'Allow flashlight'],
  ['Mavjud emas', 'Недоступно', 'Unavailable'],
  ['Bildirishnoma kelganda kamera chirog‘i 10 soniya miltillashi uchun kamera ruxsati kerak. Surat yoki video olinmaydi.', 'Для мигания вспышки в течение 10 секунд при уведомлении нужен доступ к камере. Фото и видео не снимаются.', 'Camera access is needed to blink the flashlight for 10 seconds when a reminder arrives. No photos or videos are taken.'],
  ['Chiroq ruxsati berilmadi', 'Доступ к вспышке не предоставлен', 'Flashlight permission denied'],
  ['Vibratsiya va bildirishnomalar ishlaydi. Chiroq miltillashi uchun Halovatga kamera ruxsatini bering.', 'Вибрация и уведомления работают. Для мигания вспышки разрешите Halovat доступ к камере.', 'Vibration and notifications still work. Allow Halovat camera access to blink the flashlight.'],
  ['Eslatma kelganda telefon 10 soniya tebranadi va chiroq miltillaydi. Yopish tugmasi ikkalasini ham to‘xtatadi.', 'При напоминании телефон вибрирует, а вспышка мигает 10 секунд. Кнопка закрытия останавливает оба сигнала.', 'The phone vibrates and the flashlight blinks for 10 seconds. Close stops both.'],
  ['Qulf ekranida ko‘rsatish va fonda qalqib chiquvchi oynalar ruxsatini ham yoqing.', 'Также разрешите показ на экране блокировки и всплывающие окна в фоне.', 'Also allow display on the lock screen and background pop-up windows.'],
  ['Vibratsiyani tekshirish', 'Проверить вибрацию', 'Check vibration'],
  ['Vibratsiya motori', 'Вибромотор', 'Vibration motor'], ['Mavjud', 'Есть', 'Available'], ['Aniqlanmagan', 'Не обнаружен', 'Not detected'],
  ['Telefonning jim holati', 'Тихий режим телефона', 'Phone interruption mode'], ['Mutlaqo jim', 'Полная тишина', 'Total silence'],
  ['Alarmga ruxsat bor', 'Будильники разрешены', 'Alarms allowed'], ['Tanlangan eslatmalar', 'Приоритетные уведомления', 'Priority reminders'],
  ['Yangi APK kerak', 'Нужен новый APK', 'New APK needed'], ['Vibratsiya tuzatilgan yangi APKni o‘rnating.', 'Установите новый APK с исправлением вибрации.', 'Install the new APK with the vibration fix.'],
  ['Vibratsiya boshlanmadi', 'Вибрация не началась', 'Vibration did not start'], ['Vibratsiya sinovi', 'Проверка вибрации', 'Vibration check'],
  ['Telefon 10 soniya tebranishi kerak. To‘xtatish tugmasi uni darhol to‘xtatadi.', 'Телефон должен вибрировать 10 секунд. Кнопка остановки прервёт вибрацию сразу.', 'The phone should vibrate for 10 seconds. Stop ends it immediately.'],
  ['“Mutlaqo jim” rejimi vibratsiyani ham bloklaydi.', 'Режим полной тишины блокирует и вибрацию.', 'Total silence also blocks vibration.'],
  ['Vibratsiya · {seconds} soniya', 'Вибрация · {seconds} секунд', 'Vibration · {seconds} seconds'],
  ['Vibratsiya tugadi', 'Вибрация завершена', 'Vibration finished'],
  ['Eslatma oynasi ruxsati', 'Доступ к окну напоминания', 'Reminder screen access'],
  ['Eslatma oynasini sozlash', 'Настроить окно напоминания', 'Set up reminder screen'],
  ['Eslatmalarni tekshirish', 'Проверить напоминания', 'Check reminders'],
  ['Eslatmalar holati', 'Состояние напоминаний', 'Reminder status'],
  ['Pop-up bildirishnomalar', 'Всплывающие уведомления', 'Pop-up notifications'],
  ['Aniq vaqt ruxsati', 'Разрешение на точные сигналы', 'Exact alarm permission'],
  ['Bezovta qilmang ruxsati', 'Доступ к режиму «Не беспокоить»', 'Do Not Disturb access'],
  ['Ruxsat berilgan', 'Разрешено', 'Allowed'], ['Ruxsat kerak', 'Нужно разрешение', 'Permission needed'],
  ['Sozlash kerak', 'Нужно настроить', 'Setup needed'], ['Jadval yangilanmoqda…', 'Расписание обновляется…', 'Updating schedule…'],
  ['Sinov bildirishnomasi', 'Проверочное уведомление', 'Test notification'],
  ['Telefon sozlamalarini ochish', 'Открыть настройки телефона', 'Open phone settings'],
  ['Aniq vaqt ruxsatini sozlash', 'Настроить точные сигналы', 'Set up exact alarms'],
  ['Ovozsiz rejim ruxsatini sozlash', 'Настроить доступ к тихому режиму', 'Set up silent mode access'],
  ['Batareya cheklovlarini sozlash', 'Настроить ограничения батареи', 'Manage battery restrictions'],
  ['Halovat eslatmasi', 'Напоминание Halovat', 'Halovat reminder'],
  ['Bildirishnomalar ishlayapti. Bu sinov eslatmasi.', 'Уведомления работают. Это проверочное напоминание.', 'Notifications are working. This is a test reminder.'],
  ['Eslatma rejalashtirildi', 'Напоминание запланировано', 'Reminder scheduled'],
  ['Ruxsat berishdan tashqari, kerakli funksiyaning tugmasi ham yoqilgan bo‘lishi kerak.', 'Кроме разрешения, нужно включить переключатель нужной функции.', 'Enable the switch for each feature as well as granting permission.'],
  ['Sinov eslatmasi 10 soniyadan keyin keladi. Bezovta qilmang rejimi pop-up va ovozni cheklaydi.', 'Проверочное напоминание придёт через 10 секунд. Режим «Не беспокоить» ограничивает звук и всплывающие уведомления.', 'The test reminder arrives in 10 seconds. Do Not Disturb limits sound and pop-ups.'],
  ['10 soniyadan keyin bildirishnoma keladi. Ilovani yopib yoki ekranini qulflab ko‘rishingiz mumkin. Bezovta qilmang rejimi yoqilgan bo‘lsa, pop-up va ovoz cheklanadi.', 'Уведомление придёт через 10 секунд. Можно свернуть приложение или заблокировать экран. Режим «Не беспокоить» ограничивает звук и всплывающие уведомления.', 'A notification will arrive in 10 seconds. You can leave the app or lock the screen. Do Not Disturb limits sound and pop-ups.'],
  ['Telefon fon ishlarini cheklasa, Halovat uchun batareya cheklovini olib tashlang.', 'Если телефон ограничивает фоновую работу, снимите ограничения батареи для Halovat.', 'If your phone restricts background activity, remove battery restrictions for Halovat.'],
  ['Redmi / MIUI: Halovat uchun avtomatik ishga tushirishni va suzuvchi bildirishnomalarni ham yoqing. Batareya bo‘limida “Cheklovlarsiz”ni tanlang.', 'Redmi / MIUI: включите автозапуск и всплывающие уведомления для Halovat. В разделе батареи выберите «Без ограничений».', 'Redmi / MIUI: enable autostart and floating notifications for Halovat. Select no restrictions in battery settings.'],
  ['Namoz vaqtida ovozsiz rejim: o‘chirilgan', 'Тихий режим во время намаза: выключен', 'Prayer silent mode: off'],
  ['Eslatmalar 30 kun uchun saqlanadi.', 'Напоминания сохраняются на 30 дней.', 'Reminders are stored for 30 days.'],
  ['Namoz vaqti kirganda Halovat eslatadi', 'Halovat напомнит, когда наступит время намаза', 'Halovat reminds you when it is time to pray'],
  ['Telefoningiz avtomatik ovozsiz rejimga o‘tadi. Siz esa chalg‘imasdan, halovat bilan ibodat qilasiz.', 'Телефон автоматически перейдёт в беззвучный режим. Вы сможете молиться спокойно, не отвлекаясь.', 'Your phone automatically switches to silent mode, so you can pray peacefully without distractions.'],
  ['Namozlaringizni kuzating', 'Следите за своими намазами', 'Keep track of your prayers'],
  ['O‘qilgan namozlarni belgilang, qazo namozlarini qayd eting. Haftalik, oylik va yillik natijalarni ko‘ring.', 'Отмечайте выполненные и пропущенные намазы. Смотрите результаты за неделю, месяц и год.', 'Mark completed prayers and record missed ones. See your weekly, monthly and yearly results.'],
  ['Tasbeh va duolar — bir joyda', 'Тасбих и дуа — в одном месте', 'Tasbih and duas in one place'],
  ['Istagan zikringizni tanlang, qulay sanang va duolaringizni tez toping.', 'Выбирайте нужный зикр, считайте с удобством и быстро находите дуа.', 'Choose a dhikr, count comfortably and find your duas quickly.'],
  ['Qibla yo‘nalishini aniq toping', 'Определите направление киблы', 'Find the direction of the Qibla'],
  ['Halovat kompasi bilan namoz uchun Qibla tomonini bilib oling — qayerda bo‘lsangiz ham.', 'Компас Halovat поможет найти направление киблы для намаза — где бы вы ни находились.', 'Use the Halovat compass to find the Qibla for prayer, wherever you are.'],
  ['Eng yaqin masjidni toping', 'Найдите ближайшую мечеть', 'Find the nearest mosque'],
  ['Atrofingizdagi masjidlarni xaritadan toping va eng yaqinigacha masofani bilib oling.', 'Находите мечети рядом на карте и узнавайте расстояние до ближайшей.', 'Find nearby mosques on the map and see the distance to the closest one.'],
  ['Masjidda barchaga halovat', 'Спокойствие для всех в мечети', 'Peace for everyone in the mosque'],
  ['Masjid hududiga kirganingizda telefoningiz avtomatik ovozsiz rejimga o‘tadi. Shunda siz ham, atrofdagilar ham ibodatdan chalg‘imaysiz.', 'При входе на территорию мечети телефон автоматически перейдёт в беззвучный режим. Ничто не отвлечёт от молитвы ни вас, ни окружающих.', 'Your phone automatically switches to silent mode when you enter the mosque area, so you and those around you can pray without distractions.'],
  ['Keyingisi', 'Далее', 'Next'], ['Boshlash', 'Начать', 'Get started'], ['Davom etish', 'Продолжить', 'Continue'],
  ['Bosh sahifa', 'Главная', 'Home'], ['Namozlar', 'Намазы', 'Prayers'], ['Namoz', 'Намаз', 'Prayer'], ['Tasbeh', 'Тасбих', 'Tasbih'], ['Qibla', 'Кибла', 'Qibla'], ['Profil', 'Профиль', 'Profile'], ['Duolar', 'Дуа', 'Duas'], ['Masjidlar', 'Мечети', 'Mosques'],
  ['Assalomu alaykum', 'Ассаламу алейкум', 'Peace be upon you'], ['Halovat bilan har kun ibodatda', 'Каждый день с Halovat в поклонении', 'Worship every day with Halovat'],
  ['Bugungi namoz vaqtlari', 'Время намаза сегодня', 'Today’s prayer times'], ['To‘liq taqvim', 'Полный календарь', 'Full calendar'], ['Ibodat yo‘ldoshi', 'Спутник в поклонении', 'Your worship companion'], ['Tezkor xizmatlar', 'Быстрый доступ', 'Quick access'],
  ['Bomdod', 'Фаджр', 'Fajr'], ['Peshin', 'Зухр', 'Dhuhr'], ['Asr', 'Аср', 'Asr'], ['Shom', 'Магриб', 'Maghrib'], ['Xufton', 'Иша', 'Isha'], ['Tong', 'Рассвет', 'Dawn'],
  ['Peshin vaqti kirdi', 'Наступило время зухра', 'It is time for Dhuhr'], ['Ovozsiz rejim', 'Беззвучный режим', 'Silent mode'], ['Ovozsiz rejim yoqildi', 'Беззвучный режим включён', 'Silent mode is on'],
  ['Namozlar daftari', 'Дневник намазов', 'Prayer journal'], ['IBODAT HISOBI', 'УЧЁТ ПОКЛОНЕНИЯ', 'WORSHIP TRACKER'], ['Hafta', 'Неделя', 'Week'], ['Oy', 'Месяц', 'Month'], ['Yil', 'Год', 'Year'],
  ['Bugun', 'Сегодня', 'Today'], ['Bugun ·', 'Сегодня ·', 'Today ·'], ['Haftalik belgilash', 'Отметки за неделю', 'Weekly tracking'], ['Katakka bosing', 'Нажмите на ячейку', 'Tap a cell'],
  ['O‘qildi', 'Выполнен', 'Completed'], ['O‘qidim', 'Выполнил', 'Prayed'], ['Qazo', 'Пропущен', 'Missed'], ['Kutilmoqda', 'Не отмечен', 'Pending'],
  ['Haftalik natija', 'Результат за неделю', 'Weekly results'], ['Oylik natija', 'Результат за месяц', 'Monthly results'], ['Yillik natija', 'Результат за год', 'Yearly results'],
  ['Bajarilish darajasi', 'Уровень выполнения', 'Completion rate'], ['Kunlik taqsimot', 'Распределение по дням', 'Daily breakdown'], ['Haftalik taqsimot', 'Распределение по неделям', 'Weekly breakdown'], ['Oylik taqsimot', 'Распределение по месяцам', 'Monthly breakdown'],
  ['Qazo namozlar', 'Пропущенные намазы', 'Missed prayers'], ['Qazo namozlari', 'Пропущенные намазы', 'Missed prayers'], ['Qazo namozlar daftarchasi', 'Журнал пропущенных намазов', 'Missed prayer journal'],
  ['Qarzlarni o‘z vaqtida ado eting', 'Восполняйте пропущенные намазы вовремя', 'Make up missed prayers in time'], ['Batafsil hisob', 'Подробный учёт', 'View details'], ['Qazo namozlari hisobi', 'Учёт пропущенных намазов', 'Missed prayer record'],
  ['Hozircha qazo namozlar yo‘q.', 'Пока нет пропущенных намазов.', 'No missed prayers yet.'], ['Qazo qaydlari hozircha yo‘q', 'Пока нет записей о пропущенных намазах', 'No missed prayer records yet'],
  ['KUNNING OYATI KARIMASI', 'АЯТ ДНЯ', 'VERSE OF THE DAY'], ['«Ankavut» surasi, 45-oyat', 'Сура «Аль-Анкабут», аят 45', 'Surah Al-Ankabut, verse 45'],
  ['«Albatta, namoz fahsh va yomon ishlardan qaytarur. Allohning zikri esa, shubhasiz, eng buyukdir».', '«Воистину, молитва оберегает от мерзости и предосудительного. Но поминание Аллаха — гораздо важнее».', '“Indeed, prayer restrains from indecency and wrongdoing. And the remembrance of Allah is greater.”'],
  ['Zikr Va Tasbeh', 'Зикр и тасбих', 'Dhikr and Tasbih'], ['Raqamli Tasbeh', 'Цифровой тасбих', 'Digital Tasbih'], ['Kundalik Duolar', 'Ежедневные дуа', 'Daily Duas'], ['Zikr turini tanlang', 'Выберите зикр', 'Choose a dhikr'],
  ['Subhanalloh', 'Субханаллах', 'Subhanallah'], ['Alhamdulillah', 'Альхамдулиллях', 'Alhamdulillah'], ['Allohu akbar', 'Аллаху акбар', 'Allahu Akbar'], ['Astaghfirulloh', 'Астагфируллах', 'Astaghfirullah'], ['La ilaha illalloh', 'Ля иляха илляллах', 'La ilaha illallah'],
  ['Alloh barcha nuqsonlardan pok', 'Аллах пречист от недостатков', 'Glory be to Allah'], ['Barcha maqtovlar Allohgadir', 'Вся хвала принадлежит Аллаху', 'All praise is due to Allah'], ['Alloh eng buyukdir', 'Аллах превелик', 'Allah is the Greatest'], ['Allohdan mag‘firat so‘rayman', 'Прошу прощения у Аллаха', 'I seek forgiveness from Allah'], ['Allohdan o‘zga iloh yo‘q', 'Нет божества, кроме Аллаха', 'There is no deity except Allah'],
  ['SANASH UCHUN TEGING', 'НАЖМИТЕ ДЛЯ СЧЁТА', 'TAP TO COUNT'], ['33 tadan', 'Из 33', 'Out of 33'], ['Orqaga', 'Назад', 'Undo'], ['Qaytarish', 'Сбросить', 'Reset'], ['To‘liq davra', 'Полных кругов', 'Completed rounds'], ['Jami zikr', 'Всего зикров', 'Total dhikr'], ['Davomiylik', 'Длительность', 'Duration'], ['Har bosishda tebranish', 'Вибрация при нажатии', 'Vibrate on each tap'],
  ['Tavsiya etilgan duolar', 'Рекомендуемые дуа', 'Recommended duas'], ['Qur’on va sunnatdagi muhim zikrlar', 'Важные зикры из Корана и Сунны', 'Important dhikr from the Quran and Sunnah'], ["Qur'on va sunnatdagi muhim zikrlar", 'Важные зикры из Корана и Сунны', 'Important dhikr from the Quran and Sunnah'],
  ['Barchasi', 'Все', 'All'], ['Tonggi', 'Утренние', 'Morning'], ['Tungi', 'Ночные', 'Night'], ['Ilm', 'Знания', 'Knowledge'], ['Ertalabki duo', 'Утреннее дуа', 'Morning dua'], ['Uyqudan oldin', 'Перед сном', 'Before sleep'], ['Ilm so‘rash duosi', 'Дуа о знаниях', 'Dua for knowledge'],
  ['Tonggi zikr • Termiziy rivoyati', 'Утренний зикр • Ат-Тирмизи', 'Morning dhikr • Narrated by Tirmidhi'], ['Tungi zikr • Buxoriy rivoyati', 'Ночной зикр • Аль-Бухари', 'Night dhikr • Narrated by Bukhari'], ['Toha surasi, 114-oyat', 'Сура «Та Ха», аят 114', 'Surah Ta-Ha, verse 114'],
  ['«Allohim, Sening yordaming bilan tong ottirdik va Sening yordaming bilan kech kiritdik. Sening noming bilan tirilamiz va Sening xohishing bilan vafot etamiz. Qayta tirilish ham Faqat Sengadir.»', '«О Аллах, с Твоей помощью мы встретили утро и вечер. С Твоей помощью мы живём и умираем, и к Тебе воскресение».', '“O Allah, by You we enter the morning and evening, by You we live and die, and to You is the resurrection.”'],
  ['«Yo Alloh, Sening isming bilan vafot etaman (uxlayman) va Sening isming ila qayta tirilaman.»', '«О Аллах, с Твоим именем я умираю и оживаю».', '“O Allah, in Your name I die and live.”'], ['«Robbim, mening ilmimni yanada ziyoda qilgin!»', '«Господи, увеличь мои знания!»', '“My Lord, increase me in knowledge!”'],
  ['Kun hikmati', 'Мудрость дня', 'Wisdom of the day'], ['Ra’d surasi, 28-oyat', 'Сура «Ар-Раад», аят 28', 'Surah Ar-Rad, verse 28'], ['“Ogoh bo‘lingizkim, Allohning zikri ila qalblar orom olur.”', '«Воистину, поминанием Аллаха успокаиваются сердца».', '“Indeed, in the remembrance of Allah do hearts find rest.”'], ['Duolar va ma’nolari ma’lumot sifatida berilgan.', 'Дуа и их значения приведены для ознакомления.', 'Duas and meanings are provided for reference.'],
  ['Barcha duolarni ko‘rish', 'Все дуа', 'View all duas'], ['Saqlash', 'Сохранить', 'Save'], ['Saqlanganlardan olib tashlash', 'Убрать из сохранённых', 'Remove from saved'],
  ['Qibla kompas', 'Компас киблы', 'Qibla compass'], ['Makkai Mukarrama yo‘nalishi', 'Направление на Мекку', 'Direction to Makkah'], ['Telefonni Qibla tomoniga buring', 'Поверните телефон к кибле', 'Turn your phone toward the Qibla'], ['Qibla tomoni to‘g‘rilandi', 'Направление на киблу найдено', 'Aligned with the Qibla'],
  ['Janubi-g‘arb tomon', 'На юго-запад', 'Toward the southwest'], ['Kompasni sozlash', 'Калибровка компаса', 'Calibrate compass'], ['Kompasni qayta sozlash', 'Повторить калибровку', 'Recalibrate compass'], ['Kompas ulanmoqda', 'Подключение компаса', 'Connecting compass'], ['Kompas sensori topilmadi', 'Датчик компаса не найден', 'Compass sensor unavailable'], ['Kompas aniqligi past', 'Низкая точность компаса', 'Low compass accuracy'],
  ['Telefoningizni sakkiz (8) shaklida ohista aylantiring', 'Плавно двигайте телефон по форме восьмёрки (8)', 'Move your phone gently in a figure eight (8)'], ['Shahar bo‘yicha yo‘nalish', 'Направление для города', 'Direction based on your city'], ['Joylashuv topilmadi', 'Местоположение не найдено', 'Location not found'], ['Hozirgi joylashuv', 'Текущее местоположение', 'Current location'],
  ['Eng yaqin masjid', 'Ближайшая мечеть', 'Nearest mosque'], ['350 m · 4 daqiqa', '350 м · 4 минуты', '350 m · 4 minutes'], ['Yaqin masjidlar', 'Мечети рядом', 'Nearby mosques'], ['Yaqin atrofdagi masjidlar', 'Мечети поблизости', 'Nearby mosques'], ['Yaqin masjidlarni qidiring', 'Поиск мечетей рядом', 'Find nearby mosques'],
  ['Masjidlar qidirilmoqda', 'Поиск мечетей', 'Searching for mosques'], ['Masjidlarni filtrlash', 'Фильтр мечетей', 'Filter mosques'], ['Masjid nomi yoki manzil bo‘yicha...', 'Название мечети или адрес...', 'Mosque name or address...'], ['Nomi ko‘rsatilmagan masjid', 'Мечеть без названия', 'Unnamed mosque'],
  ['Masofa', 'Расстояние', 'Distance'], ['Eng yaqin', 'Ближайшие', 'Nearest'], ['Masofa bo‘yicha', 'По расстоянию', 'By distance'], ['Nom bo‘yicha', 'По названию', 'By name'], ['Saralash', 'Сортировка', 'Sort'], ['Qo‘llash', 'Применить', 'Apply'], ['Faqat saqlanganlar', 'Только сохранённые', 'Saved only'], ['5 km ichida', 'В пределах 5 км', 'Within 5 km'],
  ['Tahoratxona', 'Место для омовения', 'Ablution area'], ['Ayollar xonasi', 'Женская комната', 'Women’s area'], ['Avtoturargoh', 'Парковка', 'Parking'], ['Yo‘l', 'Маршрут', 'Route'], ['Yo‘nalish olish', 'Построить маршрут', 'Get directions'], ['Yana ko‘rsatish', 'Показать ещё', 'Show more'],
  ['Jonli xarita rejimi', 'Карта в реальном времени', 'Live map'], ['Joylashuvingiz atrofidagi masjidlar', 'Мечети рядом с вами', 'Mosques near your location'], ['Masjidlarni xaritada ko‘ring', 'Посмотреть мечети на карте', 'View mosques on the map'],
  ['Bu joyga yaqin masjid OpenStreetMap’da topilmadi.', 'В OpenStreetMap не найдены мечети рядом с этим местом.', 'No nearby mosques found in OpenStreetMap.'], ['Bu mezonlarga mos masjid topilmadi.', 'Нет мечетей по выбранным условиям.', 'No mosques match these filters.'], ['Masjidlarni yuklab bo‘lmadi.', 'Не удалось загрузить мечети.', 'Could not load mosques.'],
  ['Joylashuv va hisob-kitob', 'Местоположение и расчёт', 'Location and calculation'], ['O‘zgartirish', 'Изменить', 'Change'], ['GPS orqali avtomatik aniqlash', 'Определить автоматически по GPS', 'Detect automatically with GPS'], ['Shaharni tanlang', 'Выберите город', 'Choose a city'],
  ['Eslatmalar va Bildirishnomalar', 'Напоминания и уведомления', 'Reminders and notifications'], ['Namoz vaqti eslatmasi', 'Напоминание о намазе', 'Prayer time reminder'], ['5 vaqt uchun bildirishnoma', 'Уведомления о пяти намазах', 'Notifications for all five prayers'], ['Namozdan keyin so‘rash', 'Спросить после намаза', 'Check in after prayer'], ['O‘qidim yoki qazo deb hisobga olish', 'Отметить выполненный или пропущенный намаз', 'Mark as prayed or missed'],
  ['Tonggi va kechki zikrlar', 'Утренние и вечерние зикры', 'Morning and evening dhikr'], ['07:00 va 19:30 da sokin eslatma', 'Тихое напоминание в 07:00 и 19:30', 'A gentle reminder at 07:00 and 19:30'], ['Namoz vaqtida ovozsiz rejim', 'Беззвучный режим во время намаза', 'Silent mode at prayer time'], ['Har namoz vaqtida 25 daqiqaga', 'На 25 минут для каждого намаза', 'For 25 minutes at each prayer'],
  ['Masjid hududida ovozsiz rejim', 'Беззвучный режим в мечети', 'Silent mode in the mosque area'], ['Tanlangan masjidga kirganda', 'При входе в выбранную мечеть', 'When entering the selected mosque'],
  ['Ilova ko‘rinishi va qulayliklar', 'Внешний вид и удобство', 'Appearance and preferences'], ['Tungi rejim (Dark mode)', 'Тёмная тема (Dark mode)', 'Dark mode'], ['Ko‘zni asrash uchun qorong‘u fon', 'Тёмный фон для комфорта глаз', 'A dark background for eye comfort'], ['Ilova tili', 'Язык приложения', 'App language'], ['Lotin yozuvida o‘zbekcha', 'Узбекский на латинице', 'Uzbek in Latin script'],
  ['Arabcha matn o‘lchami', 'Размер арабского текста', 'Arabic text size'], ['Kichik', 'Маленький', 'Small'], ['O‘rta', 'Средний', 'Medium'], ['Katta', 'Большой', 'Large'], ['Ado etilgan namoz', 'Выполненные намазы', 'Completed prayers'], ['Tahrirlash', 'Изменить', 'Edit'], ['Profilni tahrirlash', 'Редактировать профиль', 'Edit profile'], ['Ismingiz', 'Ваше имя', 'Your name'],
  ['Halovatga hissa qo‘shing!', 'Поддержите Halovat!', 'Support Halovat!'], ['XOLISONA', 'ОТ ЧИСТОГО СЕРДЦА', 'SINCERELY'], ['Karta raqami', 'Номер карты', 'Card number'], ['Nusxa olish', 'Копировать', 'Copy'], ['Nusxa olindi!', 'Скопировано!', 'Copied!'], ['Nusxa olinmadi', 'Не удалось скопировать', 'Could not copy'],
  ['«Halovat» ilovamiz rivojlanishi va ko‘proq insonlarga manfaatli bo‘lishi uchun, bizning kichik jamoamizni qo‘llab-quvvatlashingiz mumkin.', 'Вы можете поддержать нашу небольшую команду, чтобы Halovat развивался и приносил пользу большему числу людей.', 'You can support our small team to help Halovat grow and benefit more people.'],
  ['Har bir hissa qadrli. U jamoamizga Halovatni rivojlantirish, texnik xarajatlarni qoplash va ilovani ko‘proq insonlarga yetkazishda yordam beradi.', 'Каждый вклад важен. Он помогает нашей команде развивать Halovat, покрывать технические расходы и делать приложение доступным большему числу людей.', 'Every contribution matters. It helps our team develop Halovat, cover technical costs and bring the app to more people.'],
  ['Halovat — Sokin va xolis hamroh', 'Halovat — спокойный и искренний спутник', 'Halovat — a peaceful, sincere companion'], ['Versiya: v1.0.0 (Yengil va reklamasiz)', 'Версия: v1.0.0 (Лёгкое приложение без рекламы)', 'Version: v1.0.0 (Lightweight and ad-free)'],
  ['Namoz vaqtidan keyin', 'После времени намаза', 'After prayer time'], ['Namoz vaqti eslatmalari 7 kun, namozdan keyingi savollar 3 kun uchun saqlanadi. Ilovani ochganingizda jadval yangilanadi.', 'Напоминания о намазе планируются на 7 дней, вопросы после намаза — на 3 дня. Расписание обновляется при открытии приложения.', 'Prayer reminders are scheduled for 7 days and check-ins for 3 days. The schedule refreshes when you open the app.'],
  ['Namoz paytidagi qo‘ng‘iroqlar', 'Звонки во время намаза', 'Calls during prayer'], ['Yashirin raqam', 'Скрытый номер', 'Private number'], ['Tarixni tozalash', 'Очистить историю', 'Clear history'], ['Yopish', 'Закрыть', 'Close'], ['Qayta urinish', 'Повторить', 'Try again'], ['Hozir emas', 'Не сейчас', 'Not now'], ['Ruxsat berish', 'Разрешить', 'Allow'], ['Sozlamalarni ochish', 'Открыть настройки', 'Open settings'], ['Tozalash', 'Очистить', 'Clear'],
  ['HALOVAT ESLATMASI', 'НАПОМИНАНИЕ HALOVAT', 'HALOVAT REMINDER'], ['Ha, o‘qidim', 'Да, выполнил', 'Yes, I prayed'], ['Yo‘q, qazo bo‘ldi', 'Нет, пропустил', 'No, I missed it'], ['Keyinroq belgilayman', 'Отмечу позже', 'Mark later'], ['Javobingiz namozlar jadvaliga qo‘shiladi.', 'Ответ будет добавлен в таблицу намазов.', 'Your answer will be added to your prayer record.'],
  ['Namoz eslatmalari', 'Напоминания о намазе', 'Prayer reminders'], ['Halovat eslatmalari', 'Напоминания Halovat', 'Halovat reminders'], ['Namoz vaqti haqida sokin eslatma.', 'Тихое напоминание о времени намаза.', 'A gentle prayer time reminder.'], ['Bugungi ibodatingizni belgilab qo‘ying.', 'Отметьте сегодняшние намазы.', 'Record today’s worship.'], ['Tonggi zikr va duolar', 'Утренние зикры и дуа', 'Morning dhikr and duas'], ['Kechki zikr va duolar', 'Вечерние зикры и дуа', 'Evening dhikr and duas'], ['Bir necha daqiqani zikr va duoga ajrating.', 'Уделите несколько минут зикру и дуа.', 'Take a few minutes for dhikr and dua.'],
  ['Ovozsiz namoz rejimi', 'Беззвучный режим намаза', 'Silent prayer mode'], ['Halovat vaqti', 'Время Halovat', 'Halovat time'], ['Qo‘ng‘iroqlar jim', 'Звонки без звука', 'Calls silenced'], ['Bildirishnomalar jim', 'Уведомления без звука', 'Notifications silenced'], ['Davom ettirish', 'Продолжить', 'Resume'], ['Pauza', 'Пауза', 'Pause'], ['Har bir namoz — qalbga yaqinlik', 'Каждый намаз — близость сердцем', 'Every prayer brings the heart closer'],
  ['Joylashuv ruxsati kerak', 'Нужен доступ к местоположению', 'Location permission required'], ['Joylashuv aniqlanmadi', 'Не удалось определить местоположение', 'Could not detect location'], ['Shahar aniqlanmadi', 'Город не определён', 'City not detected'], ['Bildirishnoma ruxsati', 'Разрешение на уведомления', 'Notification permission'], ['Bildirishnoma yoqilmadi', 'Уведомления не включены', 'Notifications were not enabled'], ['Ruxsat kerak', 'Нужно разрешение', 'Permission required'], ['Bu qurilmada qo‘llanmaydi', 'Не поддерживается на этом устройстве', 'Not supported on this device'],
  ['Android’da ishlaydi', 'Работает на Android', 'Available on Android'], ['Masjidni tanlang', 'Выберите мечеть', 'Choose a mosque'], ['Masjidlarni ochish', 'Открыть мечети', 'Open mosques'], ['Masjid hududini aniqlash', 'Определение территории мечети', 'Detect mosque area'], ['Aniq joylashuv kerak', 'Нужна точная геопозиция', 'Precise location required'], ['Masjid hududi ulanmagan', 'Территория мечети не подключена', 'Mosque area is not connected'], ['Ovozsiz rejim uchun ruxsat', 'Разрешение на беззвучный режим', 'Silent mode permission'], ['Namoz vaqtida aniq ishga tushirish', 'Точный запуск во время намаза', 'Start exactly at prayer time'],
  ['Toshkent', 'Ташкент', 'Tashkent'], ['Toshkent shahri', 'Город Ташкент', 'Tashkent city'], ['Toshkent viloyati', 'Ташкентская область', 'Tashkent region'], ['O‘zbekiston', 'Узбекистан', 'Uzbekistan'], ['Samarqand', 'Самарканд', 'Samarkand'], ['Buxoro', 'Бухара', 'Bukhara'], ['Andijon', 'Андижан', 'Andijan'], ['Farg‘ona', 'Фергана', 'Fergana'], ['Qo‘qon', 'Коканд', 'Kokand'], ['Jizzax', 'Джизак', 'Jizzakh'], ['Qarshi', 'Карши', 'Qarshi'], ['Navoiy', 'Навои', 'Navoi'], ['Namangan', 'Наманган', 'Namangan'], ['Nukus', 'Нукус', 'Nukus'], ['Termiz', 'Термез', 'Termez'], ['Urganch', 'Ургенч', 'Urgench'], ['Guliston', 'Гулистан', 'Gulistan'], ['Marg‘ilon', 'Маргилан', 'Margilan'], ['Angren', 'Ангрен', 'Angren'], ['Qoraqalpog‘iston', 'Каракалпакстан', 'Karakalpakstan'],
  ['Du', 'Пн', 'Mo'], ['Se', 'Вт', 'Tu'], ['Cho', 'Ср', 'We'], ['Pay', 'Чт', 'Th'], ['Ju', 'Пт', 'Fr'], ['Sha', 'Сб', 'Sa'], ['Ya', 'Вс', 'Su'], ['Sh', 'С', 'N'], ['Shq', 'В', 'E'], ['J', 'Ю', 'S'], ['G‘', 'З', 'W'],
  ['SOAT', 'ЧАСЫ', 'HOURS'], ['DAQIQA', 'МИНУТЫ', 'MINUTES'], ['SONIYA', 'СЕКУНДЫ', 'SECONDS'], ['daq.', 'мин.', 'min.'], ['daqiqa · soniya', 'минуты · секунды', 'minutes · seconds'], ['Hozir:', 'Сейчас:', 'Now:'], ['Keyingi namoz:', 'Следующий намаз:', 'Next prayer:'],
];

const catalog = Object.fromEntries(entries.map(([uz, ru, en]) => [uz, { ru, en }]));
const templates: readonly (readonly [string, string, string])[] = [
  ['{count} ta eslatma rejalashtirilgan', 'Запланировано напоминаний: {count}', '{count} reminders scheduled'],
  ['Keyingi eslatma: {time}', 'Следующее напоминание: {time}', 'Next reminder: {time}'],
  ['Ovozsiz rejim: yoqilgan · {count} ta namoz vaqti', 'Тихий режим: включён · {count} времён намаза', 'Silent mode: on · {count} prayer times'],
  ['Halovat bilan {days} kundan beri birga', 'С Halovat уже {days} дней', 'With Halovat for {days} days'],
  ['{count} ta qoldi', 'Осталось: {count}', '{count} remaining'], ['{count} ta', '{count}', '{count}'], ['{count} ta qo‘ng‘iroq', 'Звонков: {count}', '{count} calls'],
  ['{count} / {total} namoz', '{count} / {total} намазов', '{count} / {total} prayers'], ['{count}% yakunlandi', '{count}% выполнено', '{count}% completed'],
  ['{count} / {total} to‘liq kun', '{count} / {total} полных дней', '{count} / {total} complete days'], ['{count}-davra • 33 talik marra', 'Круг {count} • цель 33', 'Round {count} • target 33'],
  ['{prayer} vaqti kirdi', 'Наступило время {prayer}', 'It is time for {prayer}'], ['{prayer} namozini o‘qidingizmi?', 'Вы выполнили намаз {prayer}?', 'Did you pray {prayer}?'], ['{prayer} namozi', 'Намаз {prayer}', '{prayer} prayer'], ['{prayer} vaqti', 'Время {prayer}', '{prayer} time'], ['{prayer} zikri', 'Зикр {prayer}', '{prayer} dhikr'],
  ['{city}, O‘zbekiston', '{city}, Узбекистан', '{city}, Uzbekistan'], ['{city} viloyati', '{city}ская область', '{city} region'],
  ['{time} gacha', 'До {time}', 'Until {time}'], ['{count} marotaba · {rest}', '{count} раз · {rest}', '{count} times · {rest}'],
  ['{mosque} · 150 m hudud', '{mosque} · зона 150 м', '{mosque} · 150 m area'],
];

const escapeRegex = (text: string) => Array.from(text, character => '.*+?^${}()|[]'.includes(character) ? String.fromCharCode(92) + character : character).join('');
const compiledTemplates = templates.map(([uz, ru, en]) => {
  const names = [...uz.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
  const expression = '^' + uz.split(/\{\w+\}/).map(escapeRegex).join('(.+?)') + '$';
  return { regex: new RegExp(expression), names, ru, en };
});

const latinLetters: Record<string, string> = { a:'а', b:'б', d:'д', e:'е', f:'ф', g:'г', h:'ҳ', i:'и', j:'ж', k:'к', l:'л', m:'м', n:'н', o:'о', p:'п', q:'қ', r:'р', s:'с', t:'т', u:'у', v:'в', x:'х', y:'й', z:'з', c:'с' };
export function toUzbekCyrillic(text: string): string {
  return text.replace(/o[‘’ʻʼ']|g[‘’ʻʼ']|sh|ch|yo|yu|ya|ye|[a-z]|[‘’ʻʼ']/gi, (chunk, offset: number) => {
    const lower = chunk.toLowerCase();
    const mapped = /^o[‘’ʻʼ']$/.test(lower) ? 'ў' : /^g[‘’ʻʼ']$/.test(lower) ? 'ғ' : ({ sh:'ш', ch:'ч', yo:'ё', yu:'ю', ya:'я', ye:'е' } as Record<string, string>)[lower]
      ?? (lower === 'e' && (offset === 0 || /[\s«(]/.test(text[offset - 1])) ? 'э' : latinLetters[lower]) ?? (/[‘’ʻʼ']/.test(lower) ? 'ъ' : chunk);
    return chunk[0] === chunk[0].toUpperCase() && /[A-Z]/.test(chunk[0]) ? mapped[0].toUpperCase() + mapped.slice(1) : mapped;
  });
}

const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
const ruMonths = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function translate(text: string, language: AppLanguage): string {
  if (language === 'uz' || !text || text === 'Halovat' || !/[a-z]/i.test(text)) return text;
  if (language === 'uz-Cyrl') return toUzbekCyrillic(text);
  const source = text.trim();
  const exact = catalog[source]?.[language];
  if (exact) return text.replace(source, exact);
  for (const template of compiledTemplates) {
    const match = source.match(template.regex);
    if (!match) continue;
    let result = template[language];
    template.names.forEach((name, index) => { result = result.replace(`{${name}}`, translate(match[index + 1], language)); });
    return text.replace(source, result);
  }
  // Locale-dependent date labels produced by the existing prayer calendar.
  const date = source.match(/^(Bugun · )?(\d{1,2}) (\w+)( \d{4})?$/);
  if (date && months.includes(date[3].toLowerCase())) {
    const month = months.indexOf(date[3].toLowerCase());
    return `${date[1] ? translate('Bugun ·', language) + ' ' : ''}${date[2]} ${(language === 'ru' ? ruMonths : enMonths)[month]}${date[4] ?? ''}`;
  }
  return text;
}
