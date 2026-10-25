import { buttonStyle, controlSize, frame, preferredColorScheme, presentationBackground } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';

export function sheetAppearance(scheme: 'light' | 'dark', backgroundColor: string) {
  // A sheet is its own presentation and otherwise follows the device's appearance.
  // Earlier Expo Go builds read `color`; current SDK builds read the ShapeStyle payload.
  return [preferredColorScheme(scheme), { ...presentationBackground(backgroundColor), color: backgroundColor }];
}

export function largeActionModifiers(variant: 'filled' | 'outlined' | 'text') {
  const liquidGlass = Number.parseInt(String(Platform.Version), 10) >= 26;
  return [
    buttonStyle(variant === 'text' ? 'plain'
      : variant === 'filled' ? (liquidGlass ? 'glassProminent' : 'borderedProminent')
        : (liquidGlass ? 'glass' : 'bordered')),
    controlSize('large'),
  ];
}

export function largeActionLabelModifiers() {
  // Size the label inside the native button so its capsule fills the proposed width.
  return [frame({ maxWidth: Infinity })];
}
