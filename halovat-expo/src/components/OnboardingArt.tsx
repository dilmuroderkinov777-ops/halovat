import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '../ui/AppText';
import { useLanguage } from '../context/LanguageContext';

const GREEN = '#064E3B';
const MINT = '#6ED3AC';
const LIGHT = '#C7EFDF';
const PAPER = '#FAF9F5';
const BODY = '#3E4540';
const RAD = Math.PI / 180;
const NAMES = ['Bomdod', 'Peshin', 'Asr', 'Shom', 'Xufton'];
function useArtLanguage() {
  const { language, t } = useLanguage();
  const prefix = language === 'ru' || language === 'uz-Cyrl' ? 'Onest' : 'PlusJakartaSans';
  return { t, FONT: { regular: `${prefix}_400Regular`, medium: `${prefix}_500Medium`, semibold: `${prefix}_600SemiBold`, bold: `${prefix}_700Bold`, extra: `${prefix}_800ExtraBold` } };
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;

type Props = { page: number; width: number; height: number; active: boolean; reducedMotion: boolean };

/** Reference illustrations are independent of real prayer, sensor and location data. */
export function OnboardingArt({ page, width, height, active, reducedMotion }: Props) {
  const [sunPillsHeight, setSunPillsHeight] = useState(58);
  const time = useIllustrationTime(active, reducedMotion, page === 4 ? 2.2 : page === 5 ? 6.6 : 0);
  const svgHeight = page === 0 ? 230 : page === 1 ? 268 : page === 3 ? 372 : 290;
  const pillsHeight = page === 0 ? sunPillsHeight : 0;
  const drawingWidth = Math.max(0, Math.min(width, (height - pillsHeight) * 334 / svgHeight));
  const drawingHeight = drawingWidth * svgHeight / 334;
  return <View pointerEvents="none" style={{ width }}>
    {page === 0 ? <SunArt width={drawingWidth} height={drawingHeight} time={time} onPillsHeight={setSunPillsHeight} /> : null}
    {page === 1 ? <WeekArt width={drawingWidth} height={drawingHeight} time={time} /> : null}
    {page === 2 ? <TasbeehArt width={drawingWidth} height={drawingHeight} time={time} /> : null}
    {page === 3 ? <QiblaArt width={drawingWidth} height={drawingHeight} time={time} /> : null}
    {page === 4 ? <NearbyArt width={drawingWidth} height={drawingHeight} time={time} reducedMotion={reducedMotion} /> : null}
    {page === 5 ? <MosqueZoneArt width={drawingWidth} height={drawingHeight} time={time} /> : null}
  </View>;
}

function useIllustrationTime(active: boolean, reducedMotion: boolean, loop: number) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!active || reducedMotion) return;
    let frame = 0;
    let start: number | undefined;
    let previous = -100;
    const tick = (now: number) => {
      start ??= now;
      const elapsed = (now - start) / 1000;
      // Cap React/SVG updates at 30 fps; pause all offscreen illustrations.
      if (now - previous >= 32 || (!loop && elapsed >= 5)) {
        setTime(loop ? elapsed % loop : Math.min(elapsed, 5));
        previous = now;
      }
      if (loop || elapsed < 5) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, loop, reducedMotion]);
  return !active || reducedMotion ? 5 : time;
}

type ArtProps = { width: number; height: number; time: number };
const svgStyle = { alignSelf: 'center' as const };

function MuteGlyph({ color = GREEN }: { color?: string }) {
  return <G fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 6h2.5L8 3v10L4.5 10H2z" /><Path d="M10.5 6l3.5 4M14 6l-3.5 4" />
  </G>;
}

function SunArt({ width, height, time, onPillsHeight }: ArtProps & { onPillsHeight: (height: number) => void }) {
  const { t, FONT } = useArtLanguage();
  const progress = ease(clamp(time / 3.8));
  const angle = 178 - 78 * progress;
  const minutes = Math.round(312 + 431 * progress);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const angles = [170, 100, 60, 28, 6];
  const passed = angles.reduce((last, marker, index) => angle <= marker + 1 ? index : last, -1);
  const sunX = 167 + 140 * Math.cos(angle * RAD);
  const sunY = 200 - 140 * Math.sin(angle * RAD);
  const ripple = clamp((time - 3.8) / 1.2);
  const reveal = clamp((time - 3.8) / 0.5);
  return <>
    <Svg width={width} height={height} viewBox="0 0 334 230" style={svgStyle}>
      <Line x1={0} y1={200} x2={334} y2={200} stroke={LIGHT} strokeWidth={2} />
      <Path d="M27 200A140 140 0 0 1 307 200" fill="none" stroke={LIGHT} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
      <Path d="M27 200A140 140 0 0 1 307 200" fill="none" stroke="#10B981" strokeWidth={3} strokeLinecap="round" strokeDasharray={`${(180 - angle) / 180 * Math.PI * 140} ${Math.PI * 140}`} />
      {angles.map((marker, index) => <G key={marker}>
        <Circle cx={167 + 140 * Math.cos(marker * RAD)} cy={200 - 140 * Math.sin(marker * RAD)} r={5} fill={index <= passed ? '#10B981' : PAPER} stroke={index <= passed ? '#10B981' : MINT} strokeWidth={1.5} />
        <SvgText x={167 + 104 * Math.cos(marker * RAD)} y={200 - 104 * Math.sin(marker * RAD) + 4} textAnchor="middle" fontFamily={index <= passed ? FONT.bold : FONT.medium} fontSize={11} fill={index <= passed ? GREEN : BODY}>{t(NAMES[index])}</SvgText>
      </G>)}
      <SvgText x={167} y={158} textAnchor="middle" fontFamily={FONT.extra} fontSize={40} fill={GREEN} letterSpacing={-1}>{clock}</SvgText>
      <SvgText x={167} y={182} textAnchor="middle" fontFamily={FONT.medium} fontSize={14} fill={BODY}>{t(passed < 0 ? 'Tong' : NAMES[passed])}</SvgText>
      <G transform={`translate(${sunX} ${sunY})`}>
        <Circle r={26} fill="#FDEBC8" />
        <Circle r={20 * (1 + 2.2 * ripple)} fill="none" stroke="#F59E0B" strokeWidth={2} opacity={time >= 3.8 ? 0.8 * (1 - ripple) : 0} />
        <Circle r={19} fill="#F59E0B" />
      </G>
    </Svg>
    <View onLayout={event => onPillsHeight(event.nativeEvent.layout.height + 20)} style={[styles.pills, { opacity: reveal, transform: [{ translateY: (1 - reveal) * 8 }] }]}>
      <View style={[styles.pill, styles.filledPill]}><Text style={[styles.pillText, { color: '#FFFFFF' }]}>Peshin vaqti kirdi</Text></View>
      <View style={[styles.pill, styles.outlinedPill]}><Svg width={16} height={16} viewBox="0 0 16 16"><MuteGlyph /></Svg><Text style={styles.pillText}>Ovozsiz rejim</Text></View>
    </View>
  </>;
}

function WeekArt({ width, height, time }: ArtProps) {
  const { t, FONT } = useArtLanguage();
  const { language } = useLanguage();
  const legendPositions = language === 'ru' ? [0, 105, 225] : language === 'en' ? [0, 110, 205] : language === 'uz-Cyrl' ? [0, 92, 172] : [0, 80, 152];
  const rows = ['1111110', '111q111', '11q1011', '1111q11', '111qnnn'];
  return <Svg width={width} height={height} viewBox="0 0 334 268" style={svgStyle}>
    {['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha', 'Ya'].map((day, index) => <SvgText key={day} x={78 + index * 40} y={12} fontFamily={index >= 4 && index !== 5 ? FONT.bold : FONT.medium} fontSize={12} fill={index === 4 ? '#006C49' : index === 6 ? GREEN : BODY} textAnchor="middle">{t(day)}</SvgText>)}
    {rows.map((row, rowIndex) => <G key={NAMES[rowIndex]}>
      <SvgText x={0} y={46 + rowIndex * 43} fontFamily={FONT.regular} fontSize={12} fill={BODY}>{t(NAMES[rowIndex])}</SvgText>
      {row.split('').map((state, column) => {
        const progress = clamp((time - (rowIndex * 7 + column) * 0.03) / 0.4);
        const scale = 0.2 + 0.8 * (1 - Math.pow(1 - progress, 3));
        const done = state === '1';
        const missed = state === 'q';
        return <G key={column} transform={`translate(${78 + column * 40} ${42 + rowIndex * 43}) scale(${scale})`} opacity={progress}>
          {missed ? <Circle r={20} fill="#FFDAD6" /> : null}
          <Circle r={16} fill={done ? '#006C49' : missed ? '#BA1A1A' : '#EFEEEA'} />
          <Path d={done ? 'M-6 0l4.5 4.5L7-5' : missed ? 'M-5-5 5 5M5-5-5 5' : 'M-5 0h10'} stroke={done || missed ? '#FFFFFF' : '#6B706B'} fill="none" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
        </G>;
      })}
    </G>)}
    {[['O‘qildi', '#006C49'], ['Qazo', '#BA1A1A'], ['Kutilmoqda', '#EFEEEA']].map(([label, color], index) => <G key={label} transform={`translate(${legendPositions[index]} 252)`}>
      <Circle cx={6} cy={-4} r={6} fill={String(color)} /><SvgText x={18} y={0} fontFamily={FONT.regular} fontSize={12} fill={BODY}>{t(String(label))}</SvgText>
    </G>)}
  </Svg>;
}

function TasbeehArt({ width, height, time }: ArtProps) {
  const { t, FONT } = useArtLanguage();
  const count = time >= 3 ? 27 : Math.round(26 * (1 - Math.pow(1 - clamp(time / 2.4), 2)));
  const press = clamp((time - 3) / 0.28);
  const scale = 1 - 0.14 * Math.sin(Math.PI * press);
  return <Svg width={width} height={height} viewBox="0 0 334 290" style={svgStyle}>
    {Array.from({ length: 33 }, (_, index) => {
      const angle = (index / 33 * 360 - 90) * RAD;
      const on = index < count;
      return <Circle key={index} cx={167 + 118 * Math.cos(angle)} cy={140 + 118 * Math.sin(angle)} r={on ? 8 : 6} fill={on ? '#10B981' : PAPER} stroke={on ? '#10B981' : MINT} strokeWidth={1.5} />;
    })}
    <SvgText x={167} y={158} textAnchor="middle" fontFamily={FONT.bold} fontSize={92} fill={GREEN} letterSpacing={-3}>{count}</SvgText>
    <SvgText x={167} y={190} textAnchor="middle" fontFamily={FONT.regular} fontSize={14} fill={BODY}>{t('33 tadan')}</SvgText>
    <G transform={`translate(167 257) scale(${scale}) translate(-167 -257)`}>
      <Rect x={127} y={238} width={80} height={38} rx={19} fill={GREEN} />
      <SvgText x={167} y={263} textAnchor="middle" fontFamily={FONT.semibold} fontSize={16} fill="#FFFFFF">+1</SvgText>
    </G>
  </Svg>;
}

function QiblaArt({ width, height, time }: ArtProps) {
  const { t, FONT } = useArtLanguage();
  const rotation = time >= 3 ? 113 : 113 + 130 * Math.exp(-2.4 * time) * Math.cos(7 * time);
  return <Svg width={width} height={height} viewBox="0 -12 334 372" style={svgStyle}>
    <G transform={`rotate(${rotation} 167 162)`}>
      {Array.from({ length: 72 }, (_, index) => {
        const angle = index * 5 * RAD;
        const major = index % 18 === 0;
        const length = major ? 16 : index % 2 === 0 ? 9 : 5;
        return <Line key={index} x1={167 + 130 * Math.sin(angle)} y1={162 - 130 * Math.cos(angle)} x2={167 + (130 - length) * Math.sin(angle)} y2={162 - (130 - length) * Math.cos(angle)} stroke={major ? GREEN : MINT} strokeWidth={major ? 2 : 1.3} />;
      })}
      {['Sh', 'Shq', 'J', 'G‘'].map((label, index) => {
        const x = 167 + 96 * Math.sin(index * Math.PI / 2);
        const y = 162 - 96 * Math.cos(index * Math.PI / 2);
        return <SvgText key={label} x={x} y={y} alignmentBaseline="central" transform={`rotate(${-rotation} ${x} ${y})`} textAnchor="middle" fontFamily={FONT.bold} fontSize={13} fill={index === 0 ? GREEN : BODY}>{t(label)}</SvgText>;
      })}
    </G>
    <Path d="M167 64 176 162 167 154 158 162Z" fill={GREEN} />
    <Circle cx={167} cy={162} r={6} fill={PAPER} stroke={GREEN} strokeWidth={2} />
    <Rect x={151} y={-10} width={32} height={32} rx={4} fill="#1B1C1A" /><Path d="M151 2h32" stroke="#F59E0B" strokeWidth={2.5} />
    <SvgText x={167} y={348} textAnchor="middle" fontFamily={FONT.bold} fontSize={30} fill={GREEN}>{`${Math.round((-rotation % 360 + 360) % 360)}°`}</SvgText>
  </Svg>;
}

function MapPin({ x, y, scale, color }: { x: number; y: number; scale: number; color: string }) {
  return <G transform={`translate(${x} ${y}) scale(${scale})`}>
    <Path d="M0 0C-16-18-16-42 0-42S16-18 0 0Z" fill={color} />
    <Path d="M-7-24a7 7 0 0 1 14 0ZM-7-24h14v3h-14Z" fill="#FFFFFF" />
  </G>;
}

function NearbyArt({ width, height, time, reducedMotion }: ArtProps & { reducedMotion: boolean }) {
  const { t, FONT } = useArtLanguage();
  const pulse = reducedMotion ? 0 : clamp(time / 2.2);
  return <Svg width={width} height={height} viewBox="0 0 334 290" style={svgStyle}>
    <Defs><ClipPath id="welcome-nearby-map"><Rect y={10} width={334} height={250} rx={30} /></ClipPath></Defs>
    <G clipPath="url(#welcome-nearby-map)">
      <Rect y={10} width={334} height={250} fill="#ECF8F2" />
      <Path d="M0 92C80 82 110 132 190 122S300 92 334 112V138C300 120 220 152 190 144S70 108 0 120Z" fill={LIGHT} />
      <G fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round">
        <Path d="M10 232 120 178 215 218 330 162" /><Path d="M60 30 100 165 140 270" /><Path d="M232 20 215 218" /><Path d="M0 64 334 72" />
      </G>
    </G>
    <Path d="M100 165C130 150 160 122 230 112" fill="none" stroke={GREEN} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
    <MapPin x={62} y={86} scale={0.8} color={MINT} /><MapPin x={292} y={205} scale={0.8} color={MINT} /><MapPin x={285} y={58} scale={0.8} color={MINT} /><MapPin x={230} y={112} scale={1.3} color={GREEN} />
    <Circle cx={100} cy={165} r={16 * (0.5 + 2.1 * pulse)} fill={GREEN} opacity={0.5 * (1 - pulse)} />
    <Circle cx={100} cy={165} r={8} fill={GREEN} stroke="#FFFFFF" strokeWidth={3} />
    <Rect x={22} y={210} width={172} height={46} rx={23} fill={GREEN} />
    <SvgText x={44} y={228} fontFamily={FONT.regular} fontSize={11} fill={LIGHT}>{t('Eng yaqin masjid')}</SvgText>
    <SvgText x={44} y={246} fontFamily={FONT.bold} fontSize={15} fill="#FFFFFF">{t('350 m · 4 daqiqa')}</SvgText>
  </Svg>;
}

function MosqueZoneArt({ width, height, time }: ArtProps) {
  const { t, FONT } = useArtLanguage();
  const points = [[64, 70, 70], [276, 222, 74], [270, 76, 68], [60, 215, 108]];
  const opacity = time < 0.3 ? time / 0.3 : time > 6 ? Math.max(0, (6.5 - time) / 0.5) : 1;
  return <Svg width={width} height={height} viewBox="0 0 334 290" style={svgStyle}>
    <Circle cx={167} cy={140} r={130} fill="#ECF8F2" /><Circle cx={167} cy={140} r={92} fill={LIGHT} /><Circle cx={167} cy={140} r={54} fill={MINT} />
    <Path d="M20 200C70 170 90 215 140 190S230 120 320 160M30 90C90 110 120 70 180 60S280 60 320 40" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
    <Circle cx={167} cy={140} r={54} fill="none" stroke={GREEN} strokeWidth={2} strokeDasharray="3 6" /><Circle cx={167} cy={140} r={92} fill="none" stroke={GREEN} strokeWidth={1.5} strokeDasharray="3 6" opacity={0.6} />
    <G fill={GREEN}><Path d="M147 154v-14a20 20 0 0 1 40 0v14Z" /><Rect x={141} y={124} width={5} height={30} /><Rect x={188} y={124} width={5} height={30} /><Path d="M167 111v-9" stroke={GREEN} strokeWidth={2} /></G>
    {points.map(([startX, startY, radius], index) => {
      const dx = startX - 167;
      const dy = startY - 140;
      const distance = Math.hypot(dx, dy);
      const progress = ease(clamp((time - 0.4 - index * 0.55) / 2.4));
      const x = startX + (167 + dx / distance * radius - startX) * progress;
      const y = startY + (140 + dy / distance * radius - startY) * progress;
      const inside = Math.hypot(x - 167, y - 140) < 92;
      return <G key={index} transform={`translate(${x} ${y})`} opacity={opacity}>
        <Circle r={inside ? 12 : 6} fill={GREEN} />
        {inside ? <Path d="M-7-2.5h3L0-6v12l-4-3.5h-3ZM3-3l5 6M8-3l-5 6" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </G>;
    })}
    <Rect x={57} y={236} width={220} height={38} rx={19} fill={GREEN} /><G transform="translate(77 247)"><MuteGlyph color="#FFFFFF" /></G>
    <SvgText x={101} y={260} fontFamily={FONT.semibold} fontSize={13.5} fill="#FFFFFF">{t('Ovozsiz rejim yoqildi')}</SvgText>
  </Svg>;
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  pill: { height: 38, paddingHorizontal: 13, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filledPill: { backgroundColor: GREEN }, outlinedPill: { borderWidth: 1.5, borderColor: GREEN },
  pillText: { fontSize: 13.5, fontWeight: '600', color: GREEN },
});
