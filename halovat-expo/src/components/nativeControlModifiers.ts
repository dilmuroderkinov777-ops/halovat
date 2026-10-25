import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

// Other platforms use the universal controls' own sizing and appearance.
export function sheetAppearance(_scheme: 'light' | 'dark'): ModifierConfig[] {
  return [];
}

export function largeActionModifiers(): ModifierConfig[] {
  return [];
}

export function largeActionLabelModifiers(_fontScale: number): ModifierConfig[] {
  return [];
}
