import { semantics } from '@expo/ui/jetpack-compose/modifiers';

export function nativeAccessibilityLabel(label: string) { return [semantics({ contentDescription: label })]; }
