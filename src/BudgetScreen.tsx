import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { FREQ_LABEL, PERIODS, Section, State, allItems, formatDate, headingTotal, isHeading, money, perPeriod, reviewActive, sectionTotal, signed, totals } from './budget';
import { mix, useTheme } from './theme';
import { Icon, hair, num } from './ui';

type Props = {
  state: State;
  onEditEntry: (sectionId: string, entryId: string) => void;
  onAddItem: (sectionId: string) => void;
  onTick: (entryId: string) => void;
  onEditSection: (sectionId: string) => void;
  onAddSection: () => void;
};

export function BudgetScreen({ state, onEditEntry, onAddItem, onTick, onEditSection, onAddSection }: Props) {
  const t = useTheme();
  const T = totals(state);
  const hide = state.ui.hide;
  return (
    <View style={{ gap: 18 }}>
      <ReviewBanner state={state} />
      <TotalCard state={state} />
      {state.sections.map((s) => (
        <SectionBlock key={s.id} s={s} state={state} onEditEntry={onEditEntry} onAddItem={onAddItem} onTick={onTick} onEditSection={onEditSection} />
      ))}
      <View style={[styles.overall, { backgroundColor: t.surface, borderColor: t.line }]}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: t.ink }}>Overall total</Text>
        <Text style={[num, { fontWeight: '700', fontSize: 18, color: T.left < 0 ? t.neg : t.pos }]}>{signed(Math.abs(T.left), T.left < 0, hide)}</Text>
      </View>
      <Pressable
        onPress={onAddSection}
        accessibilityRole="button"
        style={({ pressed }) => [styles.addSection, { borderColor: pressed ? t.accent : t.line }]}
      >
        <Icon.plus color={t.muted} size={15} />
        <Text style={{ color: t.muted, fontWeight: '600', fontSize: 15 }}>Add section</Text>
      </Pressable>
    </View>
  );
}

function TotalCard({ state }: { state: State }) {
  const t = useTheme();
  const T = totals(state);
  const p = PERIODS[state.settings.period];
  const hide = state.ui.hide;
  const neg = T.left < 0;
  const [whole, cents] = money(Math.abs(T.left)).split('.');
  const perYear = (T.left / p.f) * 26;
  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.card} />
            <Stop offset="1" stopColor={t.card2} />
          </LinearGradient>
          <RadialGradient id="cardGlow" cx="100" cy="0" r="85" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={t.accent} stopOpacity={0.24} />
            <Stop offset="1" stopColor={t.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#cardBg)" />
        <Rect width="100" height="100" fill="url(#cardGlow)" />
      </Svg>
      <View>
        <Text style={{ color: t.cardMuted, fontSize: 13, fontWeight: '500' }}>
          {neg ? 'Short' : 'Left'} each {p.label}
        </Text>
        <Text style={[num, styles.big, { color: neg ? t.cardNeg : t.cardInk }]} adjustsFontSizeToFit numberOfLines={1}>
          {hide ? '$•••' : (neg ? '−' : '') + whole}
          {!hide && <Text style={{ fontSize: 26, color: t.cardMuted, fontWeight: '500', letterSpacing: -0.5 }}>.{cents}</Text>}
        </Text>
      </View>
      <View style={[styles.stats, { backgroundColor: t.cardLine }]}>
        {[
          ['In', money(T.inc, hide, 0)],
          ['Out', money(T.out, hide, 0)],
          ['Per year', money(perYear, hide, 0)],
        ].map(([k, v]) => (
          <View key={k} style={[styles.stat, { backgroundColor: t.cardCell }]}>
            <Text style={styles.statKey}>{k}</Text>
            <Text style={[num, styles.statVal, { color: t.cardInk }]} numberOfLines={1} adjustsFontSizeToFit>
              {v}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SectionBlock({ s, state, onEditEntry, onAddItem, onTick, onEditSection }: { s: Section; state: State } & Omit<Props, 'state' | 'onAddSection'>) {
  const t = useTheme();
  const period = state.settings.period;
  const hide = state.ui.hide;
  const out = s.type === 'out';
  const sc = t.sw[s.color];
  const total = sectionTotal(s, period);
  let underHeading = false;
  const active = reviewActive(state);
  const valueColor = out ? t.ink : t.pos;

  return (
    <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Pressable
        onPress={() => onEditSection(s.id)}
        accessibilityRole="button"
        accessibilityLabel={`Edit section ${s.name}`}
        style={({ pressed }) => [styles.secHead, { backgroundColor: mix(sc, t.surface, pressed ? 0.24 : 0.15) }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sc }} />
          <Text style={{ fontWeight: '700', fontSize: 16, color: t.ink, flexShrink: 1 }} numberOfLines={1}>
            {s.name}
          </Text>
          {s.split > 1 && <Tag text={`Split ÷${s.split}`} />}
          {!out && <Tag text="Income" />}
        </View>
        <Icon.more color={t.muted} />
      </Pressable>

      <View style={[styles.row, styles.colHead, { backgroundColor: t.sunk }]}>
        <Text style={[styles.colText, { color: t.muted }]}>Item</Text>
        <Text style={[styles.colText, { color: t.muted }]}>{PERIODS[period].col}</Text>
      </View>

      {s.items.length === 0 && <Text style={[styles.empty, { color: t.muted, borderTopColor: t.line }]}>No items yet</Text>}

      {s.items.map((e, i) => {
        if (isHeading(e)) {
          underHeading = true;
          return (
            <Pressable
              key={e.id}
              onPress={() => onEditEntry(s.id, e.id)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, { borderTopColor: t.line, paddingVertical: 10, backgroundColor: mix(sc, t.surface, pressed ? 0.14 : 0.07) }]}
            >
              <Text style={[styles.subhead, { color: mix(sc, t.ink, 0.7) }]} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={[num, { fontSize: 13, fontWeight: '600', color: t.muted }]}>{signed(headingTotal(s, i, period), out, hide)}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={e.id}
            onPress={() => onEditEntry(s.id, e.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, { borderTopColor: t.line }, pressed && { backgroundColor: t.sunk }]}
          >
            {active && <Tick on={!!state.review.checked[e.id]} label={e.name} onPress={() => onTick(e.id)} />}
            <View style={{ flex: 1, minWidth: 0, paddingLeft: underHeading ? 12 : 0 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '500', color: active && state.review.checked[e.id] ? t.muted : t.ink }} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={[num, { fontSize: 13, color: t.muted, marginTop: 1 }]}>
                {money(+e.amount, hide)} {FREQ_LABEL[e.freq]}
              </Text>
            </View>
            <Text style={[num, { fontSize: 15.5, fontWeight: '600', color: valueColor }]}>{signed(perPeriod(e, period), out, hide)}</Text>
          </Pressable>
        );
      })}

      <View style={[styles.adds, { borderTopColor: t.line }]}>
        <AddButton label="Item" onPress={() => onAddItem(s.id)} icon={<Icon.plus color={t.accent} size={15} />} />
      </View>

      <View style={[styles.row, { borderTopColor: t.line, backgroundColor: t.sunk }]}>
        <Text style={{ fontWeight: '700', fontSize: 15.5, color: t.ink }}>Total</Text>
        <Text style={[num, { fontWeight: '700', fontSize: 15.5, color: valueColor }]}>{signed(total, out, hide)}</Text>
      </View>
      {s.split > 1 && (
        <View style={[styles.row, { borderTopColor: t.line, backgroundColor: mix(sc, t.surface, 0.1) }]}>
          <Text style={{ fontWeight: '700', fontSize: 15.5, color: t.ink }}>Your share</Text>
          <Text style={[num, { fontWeight: '700', fontSize: 15.5, color: t.ink }]}>{signed(total / s.split, out, hide)}</Text>
        </View>
      )}
    </View>
  );
}

function ReviewBanner({ state }: { state: State }) {
  const t = useTheme();
  const box = [styles.review, { backgroundColor: t.surface, borderColor: mix(t.accent, t.line, 0.45) }];
  if (reviewActive(state)) {
    const items = allItems(state);
    const n = items.filter((e) => state.review.checked[e.id]).length;
    return (
      <View style={box}>
        <View style={styles.reviewTop}>
          <Text style={{ fontWeight: '600', fontSize: 15, color: t.ink }}>Quarterly review</Text>
          <Text style={[num, { fontSize: 13.5, color: t.muted }]}>
            {n} of {items.length} checked
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunk, overflow: 'hidden' }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.accent, width: `${(n / items.length) * 100}%` as `${number}%` }} />
        </View>
        <Text style={{ fontSize: 13, color: t.muted }}>Tick each amount once you've checked it.</Text>
      </View>
    );
  }
  const r = state.review;
  if (r.on && r.last && r.due && Date.now() - r.last < 864e5) {
    return (
      <View style={box}>
        <View style={styles.reviewTop}>
          <Text style={{ fontWeight: '600', fontSize: 15, color: t.ink }}>Review complete</Text>
          <Text style={{ fontSize: 13.5, color: t.muted }}>Next review {formatDate(r.due)}</Text>
        </View>
      </View>
    );
  }
  return null;
}

function Tick({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${label} checked`}
      style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
    >
      {on && <Icon.check color={t.accentInk} size={14} />}
    </Pressable>
  );
}

function Tag({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: t.muted }}>{text}</Text>
    </View>
  );
}

function AddButton({ label, onPress, icon }: { label: string; onPress: () => void; icon: React.ReactNode }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
      style={({ pressed }) => [{ flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }, pressed && { backgroundColor: t.sunk }]}
    >
      {icon}
      <Text style={{ color: t.accent, fontWeight: '600', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 20, gap: 16, overflow: 'hidden', borderWidth: hair, borderColor: 'rgba(255,255,255,0.12)' },
  big: { fontSize: 52, fontWeight: '600', letterSpacing: -2, marginTop: 2 },
  stats: { flexDirection: 'row', gap: hair, borderRadius: 13, overflow: 'hidden' },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, minWidth: 0 },
  statKey: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9BA1B5', fontWeight: '600' },
  statVal: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, marginTop: 1 },
  section: { borderRadius: 18, borderWidth: hair, overflow: 'hidden' },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: hair },
  colHead: { paddingVertical: 7, borderTopWidth: 0 },
  colText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  subhead: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  empty: { padding: 16, fontSize: 14, borderTopWidth: hair },
  adds: { flexDirection: 'row', borderTopWidth: hair },
  overall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderRadius: 16, borderWidth: hair },
  review: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, gap: 9 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  addSection: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
});
