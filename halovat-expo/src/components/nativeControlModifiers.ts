import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

// Other platforms use the universal controls' own sizing and appearance.
export function sheetAppearance(_scheme: 'light' | 'dark', _backgroundColor: string): ModifierConfig[] {
  return [];
}

export function largeActionModifiers(_variant: 'filled' | 'outlined' | 'text', _color?: string): ModifierConfig[] {
  return [];
}

export function actionModifiers(_variant: 'filled' | 'outlined' | 'text', _color: string, _large = false): ModifierConfig[] {
  return [];
}

export function largeActionLabelModifiers(): ModifierConfig[] {
  return [];
}

export function squareActionLabelModifiers(): ModifierConfig[] {
  return [];
}

export function minimalActionLabelModifiers(_compact: boolean): ModifierConfig[] {
  return [];
}
