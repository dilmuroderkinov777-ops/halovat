---
name: Serene Islamic Lifestyle
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#404944'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#707974'
  outline-variant: '#bfc9c3'
  surface-tint: '#2b6954'
  primary: '#003527'
  on-primary: '#ffffff'
  primary-container: '#064e3b'
  on-primary-container: '#80bea6'
  inverse-primary: '#95d3ba'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#442800'
  on-tertiary: '#ffffff'
  tertiary-container: '#623c00'
  on-tertiary-container: '#f69f0d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0d6'
  primary-fixed-dim: '#95d3ba'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#0b513d'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  counter-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies spiritual tranquility, mindful devotion, and modern sophistication. Created as a peaceful Muslim daily companion, it replaces clutter and cognitive friction with serene whitespace, soft organic geometry, and a deliberate rhythm tailored to spiritual practices (Salah, Dhikr, Quran, and Qibla navigation).

### Design Movement & Aesthetic
The visual philosophy blends **Warm Organic Minimalism** with **Atmospheric Layering**:
- **Tranquil Presence:** Deep, grounded forest emerald greens anchor prayer routines, while warm ivory and soft mint surfaces evoke light and purity.
- **Micro-Atmospherics:** Soft radial ambient light mimics natural dawn and dusk (Fajr and Maghrib) subtly radiating behind primary hero modules.
- **Islamic Geometry & Contemplative Form:** Subtle architectural arch contours, soft rounded capsules, and refined vector compass elements give cultural resonance without heavy ornamentation.
- **Tactile Reverence:** Thoughtful haptic feedback cues, delicate borders (0.5px to 1px emerald tints), and smooth elevation steps build quiet confidence and sacred comfort.

## Colors

The palette balances the reverence of deep sacred green with the comfort of sunlit parchment and soft morning light.

### Color Hierarchy & Roles
- **Primary Emerald (`#064E3B` / `#047857`):** Represents grounded spiritual focus. Used for primary navigation states, active buttons, countdown hero cards, and Tasbeh meditative screens.
- **Secondary Mint / Sage (`#10B981` / `#ECFDF5` / `#F0FDF4`):** Represents life, completion, and renewal. Applied to completed prayer status badges, radial completion indicators, and active day highlights.
- **Tertiary Amber & Gold (`#F59E0B` / `#D97706` / `#FEF3C7`):** Signifies celestial light, sunset times, sacred timestamps, and prayer notifications.
- **Semantic Missed / Qazo (`#EF4444` / `#FEE2E2`):** Calm, non-alarmist soft rose red used to signal missed prayers with gentle accountability.
- **Canvas & Surfaces (`#FAF9F5` / `#FFFFFF`):** A warm off-white ivory canvas preventing the harsh glare of stark white, supporting night and dawn reading.
- **Text & Contrast (`#0F172A` / `#334155` / `#64748B`):** High legibility slate tones ensuring comfortable reading during low-light devotionals.

## Typography

Typography prioritizes open letterforms, human warmth, and supreme legibility across both Latin and Cyrillic transliterations as well as sacred Arabic scripts.

- **Primary Interface Typeface:** **Plus Jakarta Sans** provides friendly geometric clarity, soft terminals, and crisp rendering on OLED and retina screens.
- **Sacred Script Companion:** For Quranic ayat, tasbeh invocations, and duos, pair with **Amiri** or **Scheherazade New** (Naskh calligraphic proportions) with a 1.6x relative scale boost and elevated line height (180%) for diacritical mark (tashkeel) clarity.
- **Tabular Numerals:** Digital countdowns (`00:34:53`), prayer clock metrics, and Tasbeh tap counters enforce `font-variant-numeric: tabular-nums` to eliminate jitter during active updates.

## Layout & Spacing

The layout is built for native mobile ergonomics, placing high-frequency interactions within easy thumb reach.

### Layout Grid & Bounds
- **Mobile Fluidity:** A unified vertical column container with `16px` outer margins (`margin: 1rem`) on phone displays, expanding to safe max-width bounds of `440px` centered on larger displays and tablets.
- **Horizontal Scrolling Sequences:** Prayer row modules and weekday calendar timelines utilize compact `gutter` spacing of `8px` to `12px` to allow rapid scanning without visual noise.
- **Breathing Cadence:** Major functional units (Hero Next Prayer card, Prayer Slots, Quick Utility grid, and Weekly Tracker) maintain a persistent `20px` to `24px` vertical gap (`space-lg` to `space-xl`), establishing calm pacing and preventing information overload.

## Elevation & Depth

Visual hierarchy relies on quiet tonal layering and soft ambient diffusions rather than heavy dropped shadows.

### Elevation Hierarchy
1. **Canvas (Base Level 0):** `#FAF9F5` warm ivory surface; ground layer for the entire application.
2. **Surface Containers (Level 1):** Solid `#FFFFFF` cards framed with a subtle border stroke (`rgba(6, 78, 59, 0.06)`), complemented by an ultra-soft ambient bloom: `box-shadow: 0 4px 20px -2px rgba(6, 78, 59, 0.04)`.
3. **Hero & Focus Modules (Level 2):** Rich forest emerald surfaces (`#064E3B`) layered with a radial gradient glow (`radial-gradient(circle at top right, #047857 0%, #064E3B 100%)`).
4. **Floating Action Sheets & Compass Dials (Level 3):** Frosted glass finishes (`rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(16px)`), combined with soft directional lighting (`0 12px 32px -4px rgba(6, 78, 59, 0.08)`).
5. **Interactive Pressed States:** Depth softly recedes inwards via slight scale-down (`scale(0.98)`) and opacity shifts rather than hard bevels.

## Shapes

The shape system employs generous, organic radii inspired by traditional Islamic domes and modern fluid ergonomics.

- **Primary Cards & Containers:** Apply `rounded-2xl` (16px) to `rounded-3xl` (24px) corner radii, softening transitions and delivering a welcoming, human feel.
- **Segmented Controls & Action Pills:** Full capsule geometry (`rounded-full` / `9999px`) for interactive pill triggers, toggle states, and status badges.
- **Compass & Counter Circles:** Perfect geometric circles (`rounded-full`) with concentric nested rings (delicate 1px borders) to direct devotional focus towards center points.

## Components

### Buttons & Quick Triggers
- **Primary Devotional Button:** Capsule-shaped (`height: 52px`), deep emerald green background (`#064E3B`), crisp white centered text with an integrated play/start icon. Gentle active tap transformation (`transform: scale(0.98)`).
- **Secondary Ghost / Bordered Buttons:** Capsule outline with a `1.5px` border in `#064E3B` and `#064E3B` typography, resting on transparent or subtle `#F0FDF4` backgrounds.
- **Quick Access Tiles:** Squircle containers (`rounded-2xl`, background `#F3F0FF` or `#ECFDF5`), holding single monoline icons with centered label text underneath.

### Prayer Time Slots & Status Cards
- **Slot Geometry:** Vertical modular cards with soft borders (`1px solid #E2E8F0` or `#ECFDF5`).
- **Active / Current Slot:** Framed in deep emerald border (`1.5px solid #064E3B`), elevated by a soft pale sage fill (`#ECFDF5`).
- **Completed Prayer:** Light mint tag featuring an emerald checkmark badge (`#10B981` pill with check).
- **Missed / Qazo Prayer:** Light rose tag (`#FEE2E2`) with a subtle red cross badge (`#EF4444`).

### Countdown & Tasbeh Hero Surfaces
- **Hero Prayer Countdown Card:** Deep emerald green `#064E3B` card with high-radius corners (`28px`). Displays the upcoming prayer title in clean bold type, next to an ambient sun/moon weather indicator, followed by tabular large-format countdown numerals (`00:34:53`).
- **Tasbeh Counter:** Immersive full-screen dark forest emerald canvas (`#064E3B`). Concentric touch rings with haptic responsive feedback, large counter typography (`counter-xl`), cycle progress chips (`0 / 33`), and a floating dropdown selector for Dhikr phrases.

### Navigation Bar
- **Bottom Navigation Dock:** Clean ivory/white floating bar with top border stroke (`1px solid rgba(6, 78, 59, 0.05)`). Active tab features an emerald icon with matching label text; inactive tabs use muted slate (`#94A3B8`).