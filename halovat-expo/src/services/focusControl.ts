import { Platform } from 'react-native';
import HalovatFocus, { FocusCallEvent, QuietModeStatus } from '../../modules/halovat-focus/src';

export type { FocusCallEvent, QuietModeStatus };

export const focusControl = Platform.OS === 'android' ? HalovatFocus : null;
