import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Swatch, useTheme } from './theme';

export const hair = StyleSheet.hairlineWidth;
export const num: TextStyle = { fontVariant: ['tabular-nums'] };

/* icons */
type IconProps = { size?: number; color: string };
export const Icon = {
  plus: ({ size = 16, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  heading: ({ size = 16, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M5 6h14M5 12h9M5 18h9" />
    </Svg>
  ),
  check: ({ size = 14, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  ),
  more: ({ size = 18, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.8} />
      <Circle cx={12} cy={12} r={1.8} />
      <Circle cx={19} cy={12} r={1.8} />
    </Svg>
  ),
  eye: ({ size = 21, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  ),
  eyeOff: ({ size = 21, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Svg>
  ),
  sliders: ({ size = 21, color }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <Circle cx={16} cy={7} r={2} />
      <Circle cx={10} cy={17} r={2} />
    </Svg>
  ),
};

export function Logo({ size = 26 }: { size?: number }) {
  const t = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={7} fill={t.ink} />
      <Path d="M6.5 16 L10.2 11.5 L13.4 13.8 L17.5 8" stroke={t.accent} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconButton({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, pressed && { backgroundColor: t.band }]}
    >
      {children}
    </Pressable>
  );
}

/** Segmented control. */
export function Seg<T extends string | number>({ value, options, onChange, wrap }: { value: T; options: [T, string][]; onChange: (v: T) => void; wrap?: boolean }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: t.band, borderRadius: 12, padding: 3, gap: 2 }, wrap && { flexWrap: 'wrap' }]}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable
            key={String(v)}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              { flexGrow: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center' },
              on && { backgroundColor: t.surface, shadowColor: '#000', shadowOpacity: t.mode === 'dark' ? 0.3 : 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
            ]}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: on ? t.ink : t.muted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Swatches({ keys, value, onChange }: { keys: readonly Swatch[]; value: Swatch; onChange: (s: Swatch) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {keys.map((k) => {
        const on = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="button"
            accessibilityLabel={k}
            accessibilityState={{ selected: on }}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? t.sw[k] : 'transparent' }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.sw[k] }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: t.muted }}>{label}</Text>
      {children}
    </View>
  );
}

export function Button({ title, onPress, kind = 'accent', disabled, style }: { title: string; onPress: () => void; kind?: 'accent' | 'ghost' | 'danger'; disabled?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const bg = kind === 'accent' ? t.accent : kind === 'danger' ? t.neg : t.band;
  const fg = kind === 'accent' ? t.accentInk : kind === 'danger' ? '#FFFFFF' : t.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={{ color: fg, fontWeight: '600', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}
