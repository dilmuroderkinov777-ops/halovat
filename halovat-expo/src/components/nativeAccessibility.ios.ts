import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';

export function nativeAccessibilityLabel(label: string) { return [accessibilityLabel(label)]; }
