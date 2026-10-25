import React from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

/** Localize content while preserving the platform's system font and text weights. */
export function Text({ style, children, translate: shouldTranslate = true, ...props }: TextProps & { translate?: boolean }) {
  const { t } = useLanguage();
  const localized = localizeChildren(children, shouldTranslate ? t : value => value);
  return <NativeText {...props} accessibilityLabel={props.accessibilityLabel && shouldTranslate ? t(props.accessibilityLabel) : props.accessibilityLabel} style={style}>{localized}</NativeText>;
}

function localizeChildren(children: React.ReactNode, t: (text: string) => string): React.ReactNode {
  if (typeof children === 'string') return t(children);
  if (Array.isArray(children)) {
    if (children.every(child => typeof child === 'string' || typeof child === 'number')) return t(children.join(''));
    return children.map(child => localizeChildren(child, t));
  }
  return children;
}
