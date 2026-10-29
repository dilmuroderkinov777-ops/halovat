import { buttonStyle, contentShape, controlSize, frame, padding, preferredColorScheme, presentationBackground, shapes, tint } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import { Colors } from '../ui/theme';

export function sheetAppearance(scheme: 'light' | 'dark', backgroundColor: string) {
  // A sheet is its own presentation and otherwise follows the device's appearance.
  // Earlier Expo Go builds read `color`; current SDK builds read the ShapeStyle payload.
  return [preferredColorScheme(scheme), { ...presentationBackground(backgroundColor), color: backgroundColor }];
}

export function actionModifiers(variant: 'filled' | 'outlined' | 'text', color: string, large = false) {
  const hasGlass = Number.parseInt(String(Platform.Version), 10) >= 26;
  return [
    buttonStyle(variant === 'filled' ? (hasGlass ? 'glassProminent' : 'borderedProminent')
      : variant === 'outlined' ? (hasGlass ? 'glass' : 'bordered') : 'plain'),
    tint(color),
    ...(large ? [controlSize('large')] : []),
  ];
}

export function largeActionModifiers(variant: 'filled' | 'outlined' | 'text', color = Colors.green) {
  return actionModifiers(variant, color, true);
}

export function largeActionLabelModifiers() {
  // Size the label inside the native button so its capsule fills the proposed width.
  return [frame({ maxWidth: Infinity })];
}

export function squareActionLabelModifiers() {
  return [frame({ width: 44, height: 44 }), contentShape(shapes.rectangle())];
}

export function minimalActionLabelModifiers(compact: boolean) {
  return [padding({ horizontal: 12 }), frame({ minHeight: 44, ...(compact ? {} : { maxWidth: Infinity }) }), contentShape(shapes.rectangle())];
}
