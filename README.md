# Halovat

Namoz va ibodat hamrohi. Joriy mahsulot **Expo SDK 57 + React Native 0.86 + TypeScript** asosida qurilgan. Bu repository 2026-10-08 dagi loyiha manbalari va dizayn resurslarini boshqa dasturchiga topshirish uchun tayyorlangan.

## Qayerdan boshlash kerak

- **[HANDOFF.md](./HANDOFF.md)** — joriy holat, build, muhim fayllar va hali fizik telefonda tasdiqlanmagan qismlar.
- **[halovat-expo/](./halovat-expo)** — ishlab chiqilishi davom ettiriladigan asosiy ilova.
- **[halovat-expo/README.md](./halovat-expo/README.md)** — funksiyalar va platforma chegaralari.
- **[design/](./design)** — original HTML, Stitch arxivi, rasmlar va screenshotlar.
- **[legacy-android/](./legacy-android)** — oldingi Kotlin/Jetpack Compose prototipi; joriy Expo ilovasining buildiga qo‘shilmaydi.
- **[Dastlabki arxitektura](./namoz-mode_codex-mvp-architecture-prompt.md)** — tarixiy talablar; joriy imkoniyatlar HANDOFF va Expo README bilan solishtiriladi.

## Tez ishga tushirish

```sh
git clone https://github.com/dilmuroderkinov777-ops/halovat.git
cd halovat/halovat-expo
npm ci
npx expo start --web
```

Android native funksiyalari uchun Android SDK/emulator yoki USB telefon kerak:

```sh
npx expo run:android
```

Expo Go va brauzer preview Android ovozsiz rejimi, qo‘ng‘iroq screening, kamera chirog‘i yoki native eslatma oynasini bajarmaydi. Bu funksiyalar `modules/halovat-focus` Kotlin modulida joylashgan.

Android install fayli private repositoryning **Releases** bo‘limiga alohida qo‘yiladi. Dasturchiga repository egasi GitHub **Settings → Collaborators** orqali kirish beradi.
