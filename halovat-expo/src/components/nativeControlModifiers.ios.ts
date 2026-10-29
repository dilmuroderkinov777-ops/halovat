import { buttonStyle, controlSize, frame, preferredColorScheme, presentationBackground } from '@expo/ui/swift-ui/modifiers';

export function sheetAppearance(scheme: 'light' | 'dark', backgroundColor: string) {
  // A sheet is its own presentation and otherwise follows the device's appearance.
  // Earlier Expo Go builds read `color`; current SDK builds read the ShapeStyle payload.
  return [preferredColorScheme(scheme), { ...presentationBackground(backgroundColor), color: backgroundColor }];
}

export function largeActionModifiers(_variant: 'filled' | 'outlined' | 'text') {
  return [
    buttonStyle('plain'),
    controlSize('large'),
  ];
}

export function largeActionLabelModifiers() {
  // Size the label inside the native button so its capsule fills the proposed width.
  return [frame({ maxWidth: Infinity })];
}
