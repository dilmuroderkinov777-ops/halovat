import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

// Other platforms use the universal controls' own sizing and appearance.
export function sheetAppearance(_scheme: 'light' | 'dark', _backgroundColor: string): ModifierConfig[] {
  return [];
}

export function largeActionModifiers(_variant: 'filled' | 'outlined' | 'text'): ModifierConfig[] {
  return [];
}

export function largeActionLabelModifiers(): ModifierConfig[] {
  return [];
}
