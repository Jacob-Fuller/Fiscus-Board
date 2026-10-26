import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { PERIODS, State, isHeading, money, perPeriod, sectionShare, totals } from './budget';
import { Swatch, useTheme } from './theme';
import { hair, num } from './ui';

type Part = { name: string; v: number; color: string };

export function InsightsScreen({ state }: { state: State }) {
  const t = useTheme();
  const period = state.settings.period;
  const p = PERIODS[period];
  const hide = state.ui.hide;
  const T = totals(state);
  const outSecs = state.sections.filter((s) => s.type === 'out');

  // Where your pay goes
  const parts: Part[] = outSecs.map((s) => ({ name: s.name + (s.split > 1 ? ' (your share)' : ''), v: sectionShare(s, period), color: t.sw[s.color] }));
  if (T.left > 0) parts.push({ name: 'Left over', v: T.left, color: t.pos });
  const base = Math.max(T.inc, T.out) || 1;

  // Biggest expenses
  const items: { name: string; v: number }[] = [];
  outSecs.forEach((s) => s.items.forEach((e) => !isHeading(e) && items.push({ name: e.name, v: perPeriod(e, period) / (s.split || 1) })));
  items.sort((a, b) => b.v - a.v);
  const DONUT: Swatch[] = ['blue', 'teal', 'brass', 'rose', 'violet', 'green'];
  const slices: Part[] = items.slice(0, 6).map((x, i) => ({ ...x, color: t.sw[DONUT[i]] }));
  const rest = items.slice(6).reduce((a, x) => a + x.v, 0);
  if (rest > 0) slices.push({ name: 'Everything else', v: rest, color: t.other });
  const sliceTotal = slices.reduce((a, x) => a + x.v, 0) || 1;
  const R = 56;
  const C = 2 * Math.PI * R;
  let acc = 0;

  // Over time
  const perFortnight = (v: number) => v / p.f;
  const rows: [string, number, string][] = [
    ['In', T.inc, t.pos],
    ['Out', T.out, t.neg],
    ['Left', T.left, T.left < 0 ? t.neg : t.ink],
  ];

  return (
    <View style={{ gap: 22 }}>
      <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, color: t.ink }}>Insights</Text>

      <Block title="Where your pay goes">
        {parts.length === 0 ? (
          <Text style={{ color: t.muted }}>No expenses yet</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', gap: 2, backgroundColor: t.sunk }}>
              {parts.map((x, i) => (
                <View key={i} style={{ width: `${Math.max((x.v / base) * 100, 0.6)}%` as `${number}%`, backgroundColor: x.color }} />
              ))}
            </View>
            <Legend parts={parts} total={T.inc} hide={hide} />
          </>
        )}
      </Block>

      <Block title="Biggest expenses">
        {slices.length === 0 ? (
          <Text style={{ color: t.muted }}>No expenses yet</Text>
        ) : (
          <View style={{ alignItems: 'center', gap: 18 }}>
            <Svg width={170} height={170} viewBox="0 0 150 150" accessibilityLabel="Biggest expenses">
              <Circle cx={75} cy={75} r={R} fill="none" stroke={t.sunk} strokeWidth={18} />
              {slices.map((x, i) => {
                const len = (x.v / sliceTotal) * C;
                const el = (
                  <Circle
                    key={i}
                    cx={75}
                    cy={75}
                    r={R}
                    fill="none"
                    stroke={x.color}
                    strokeWidth={18}
                    strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`}
                    strokeDashoffset={-acc}
                    rotation={-90}
                    origin="75, 75"
                  />
                );
                acc += len;
                return el;
              })}
              <SvgText x={75} y={70} textAnchor="middle" fill={t.muted} fontSize={11}>
                {p.col}
              </SvgText>
              <SvgText x={75} y={91} textAnchor="middle" fill={t.ink} fontSize={18} fontWeight="600">
                {money(T.out, hide, 0)}
              </SvgText>
            </Svg>
            <View style={{ alignSelf: 'stretch' }}>
              <Legend parts={slices} total={sliceTotal} hide={hide} />
            </View>
          </View>
        )}
      </Block>

      <Block title="Over time">
        <View style={styles.tRow}>
          <Text style={[styles.tLabel, { color: t.muted }]} />
          {['Week', 'Fortnight', 'Month', 'Year'].map((h) => (
            <Text key={h} style={[styles.tHead, { color: t.muted }]} numberOfLines={1}>
              {h}
            </Text>
          ))}
        </View>
        {rows.map(([label, v, color], i) => {
          const fn = perFortnight(v);
          return (
            <View key={label} style={[styles.tRow, { borderTopWidth: hair, borderTopColor: t.line, paddingTop: 10 }]}>
              <Text style={[styles.tLabel, { color: t.ink, fontWeight: i === 2 ? '700' : '600' }]}>{label}</Text>
              {[fn / 2, fn, (fn * 26) / 12, fn * 26].map((x, j) => (
                <Text key={j} style={[num, styles.tCell, { color, fontWeight: i === 2 ? '700' : '500' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {money(x, hide, 0)}
                </Text>
              ))}
            </View>
          );
        })}
      </Block>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 9 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted, paddingHorizontal: 4 }}>{title}</Text>
      <View style={{ backgroundColor: t.surface, borderColor: t.line, borderWidth: hair, borderRadius: 18, padding: 18, gap: 10 }}>{children}</View>
    </View>
  );
}

function Legend({ parts, total, hide }: { parts: Part[]; total: number; hide: boolean }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      {parts.map((x, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: x.color }} />
          <Text style={{ flex: 1, fontSize: 14.5, color: t.ink }} numberOfLines={1}>
            {x.name}
          </Text>
          <Text style={[num, { fontSize: 14.5, color: t.ink }]}>{money(x.v, hide)}</Text>
          <Text style={[num, { width: 40, textAlign: 'right', fontSize: 12.5, color: t.muted }]}>{total ? Math.round((x.v / total) * 100) : 0}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10 },
  tLabel: { width: 42, fontSize: 14.5 },
  tHead: { flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  tCell: { flex: 1, textAlign: 'right', fontSize: 14 },
});
