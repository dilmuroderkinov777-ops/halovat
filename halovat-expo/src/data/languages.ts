export type AppLanguage = 'uz' | 'uz-Cyrl' | 'ru' | 'en';

// Wording copied verbatim from the user's language-selection HTML.
export const LANGUAGES = [
  { id: 'uz', name: 'O‘zbekcha', greeting: 'Assalomu alaykum', title: 'Tilni tanlang', description: 'Ilovani o‘zingizga qulay tilda ishlating.', continue: 'Davom etish' },
  { id: 'uz-Cyrl', name: 'Ўзбекча', greeting: 'Ассалому алайкум', title: 'Тилни танланг', description: 'Иловани ўзингизга қулай тилда ишлатинг.', continue: 'Давом этиш' },
  { id: 'ru', name: 'Русский', greeting: 'Ассаламу алейкум', title: 'Выберите язык', description: 'Пользуйтесь приложением на удобном вам языке.', continue: 'Продолжить' },
  { id: 'en', name: 'English', greeting: 'Peace be upon you', title: 'Choose your language', description: 'Use the app in the language that feels right to you.', continue: 'Continue' },
] as const;

export const isAppLanguage = (value: unknown): value is AppLanguage => LANGUAGES.some(item => item.id === value);
