import { buttonBorderShape, controlSize, font, frame, multilineTextAlignment, preferredColorScheme } from '@expo/ui/swift-ui/modifiers';

export function sheetAppearance(scheme: 'light' | 'dark') {
  // A sheet is its own presentation and otherwise follows the device's appearance.
  return [preferredColorScheme(scheme)];
}

export function largeActionModifiers() {
  return [controlSize('large'), buttonBorderShape('capsule')];
}

export function largeActionLabelModifiers(fontScale: number) {
  // Size the label inside the native button so its capsule fills the proposed width.
  return [
    font({ size: 17 * fontScale, weight: 'semibold' }),
    multilineTextAlignment('center'),
    frame({ maxWidth: Infinity, minHeight: 24 * fontScale }),
  ];
}
