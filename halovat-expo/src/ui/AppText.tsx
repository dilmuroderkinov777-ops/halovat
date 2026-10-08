import React from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const families = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

/** Keeps the Figma type scale while preserving each screen's existing Text API. */
export function Text({ style, children, translate: shouldTranslate = true, ...props }: TextProps & { translate?: boolean }) {
  const { t } = useLanguage();
  const localized = localizeChildren(children, shouldTranslate ? t : value => value);
  const cyrillic = hasCyrillic(localized);
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight === 'bold' ? 700 : Number(flattened?.fontWeight ?? 400);
  const family = cyrillic ? `Onest_${weight >= 800 ? '800ExtraBold' : weight >= 700 ? '700Bold' : weight >= 600 ? '600SemiBold' : weight >= 500 ? '500Medium' : '400Regular'}` : weight >= 800 ? families.extrabold : weight >= 700 ? families.bold : weight >= 600 ? families.semibold : weight >= 500 ? families.medium : families.regular;
  return <NativeText {...props} accessibilityLabel={props.accessibilityLabel && shouldTranslate ? t(props.accessibilityLabel) : props.accessibilityLabel} style={[style, { fontFamily: flattened?.fontFamily ?? family, fontWeight: 'normal' }]}>{localized}</NativeText>;
}

function localizeChildren(children: React.ReactNode, t: (text: string) => string): React.ReactNode {
  if (typeof children === 'string') return t(children);
  if (Array.isArray(children)) {
    if (children.every(child => typeof child === 'string' || typeof child === 'number')) return t(children.join(''));
    return children.map(child => localizeChildren(child, t));
  }
  return children;
}

function hasCyrillic(children: React.ReactNode): boolean {
  if (typeof children === 'string') return /[\u0400-\u04ff]/.test(children);
  if (Array.isArray(children)) return children.some(hasCyrillic);
  return React.isValidElement<{ children?: React.ReactNode }>(children) ? hasCyrillic(children.props.children) : false;
}
