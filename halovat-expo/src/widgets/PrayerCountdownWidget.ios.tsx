import { Circle, HStack, Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { background, clipShape, containerBackground, font, foregroundStyle, frame, layoutPriority, lineLimit, minimumScaleFactor, monospacedDigit, offset, padding, progressViewStyle, resizable, tint, widgetAccentedRenderingMode, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type PrayerCountdownProps = {
  city: string; nextLabel: string; nextName: string; currentLabel: string; until: string;
  startsAt: number; endsAt: number; colors: string[]; accent: string; imageUri?: string;
  units: string[]; openLabel: string;
};

function PrayerCountdown(props: PrayerCountdownProps) {
  'widget';
  const ready = props.endsAt > props.startsAt;
  return <ZStack alignment="topTrailing" modifiers={[
    frame({ maxWidth: Infinity, maxHeight: Infinity }),
    background({ type: 'linearGradient', colors: props.colors, startPoint: { x: 0.1, y: 0 }, endPoint: { x: 1, y: 1 } }),
    containerBackground({ type: 'linearGradient', colors: props.colors, startPoint: { x: 0.1, y: 0 }, endPoint: { x: 1, y: 1 } }, 'widget'),
    widgetURL('halovat-expo:///'),
  ]}>
    <Circle modifiers={[foregroundStyle(props.accent + '18'), frame({ width: 150, height: 150 }), offset({ x: 30, y: -100 })]} />
    <VStack alignment="leading" spacing={7} modifiers={[padding({ horizontal: 17, vertical: 10 })]}>
      <HStack spacing={6}>
        <HStack spacing={5} modifiers={[padding({ horizontal: 9, vertical: 4 }), background('#FFFFFF17'), clipShape('capsule')]}>
          <Image systemName="clock" color={props.accent} size={11} />
          <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(props.accent), lineLimit(1), minimumScaleFactor(0.7)]}>
            {ready ? props.nextLabel + ' ' : 'Halovat'}
            {ready ? <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.nextName}</Text> : null}
          </Text>
        </HStack>
        <Spacer />
        <Text modifiers={[font({ size: 9 }), foregroundStyle(props.accent), lineLimit(1), minimumScaleFactor(0.7)]}>{props.city}</Text>
      </HStack>
      <HStack spacing={5}>
        <VStack alignment="leading" spacing={1} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' }), layoutPriority(1)]}>
          {ready ? <>
            <Text timerInterval={{ lower: new Date(props.startsAt), upper: new Date(props.endsAt) }} countsDown
              modifiers={[font({ size: 40, weight: 'bold' }), foregroundStyle('#FFFFFF'), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.65)]} />
            <HStack spacing={0}>
              {props.units.map(unit => <Text key={unit} modifiers={[font({ size: 8, weight: 'medium' }), foregroundStyle(props.accent), frame({ maxWidth: Infinity }), lineLimit(1)]}>{unit}</Text>)}
            </HStack>
          </> : <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle('#FFFFFF'), lineLimit(3)]}>{props.openLabel}</Text>}
        </VStack>
        {props.imageUri ? <Image uiImage={props.imageUri} modifiers={[resizable(), frame({ width: 64, height: 64 }), widgetAccentedRenderingMode('fullColor')]} />
          : <Image systemName="moon.stars.fill" color={props.accent} size={48} modifiers={[frame({ width: 64, height: 64 })]} />}
      </HStack>
      {ready ? <VStack spacing={5}>
        <ProgressView timerInterval={{ lower: new Date(props.startsAt), upper: new Date(props.endsAt) }} countsDown={false}
          modifiers={[progressViewStyle('linear'), tint(props.accent)]} />
        <HStack>
          <Text modifiers={[font({ size: 9 }), foregroundStyle(props.accent), lineLimit(1)]}>{props.currentLabel}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{props.until}</Text>
        </HStack>
      </VStack> : null}
    </VStack>
  </ZStack>;
}

export default createWidget<PrayerCountdownProps>('HalovatPrayerCountdown', PrayerCountdown, {
  city: '', nextLabel: 'Keyingi namoz:', nextName: '', currentLabel: '', until: '', startsAt: 0, endsAt: 0,
  colors: ['#353D72', '#252C55', '#181E3D'], accent: '#CECCFF', units: ['SOAT', 'DAQIQA', 'SONIYA'],
  openLabel: 'Namoz vaqtlarini ko‘rish uchun Halovatni oching.',
});
