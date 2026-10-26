import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FREQS, Freq, PERIODS, PER_FN, Period, Settings, State, formatDate, money, reviewActive } from './budget';
import { ACCENTS, SWATCHES, Swatch, ThemeContext, Theme } from './theme';
import { Button, Field, Seg, Swatches, hair, num } from './ui';

export type ItemForm = { name: string; amount: string; freq: Freq };
export type SectionForm = { name: string; type: 'in' | 'out'; split: number; color: Swatch };
export type SheetState =
  | { kind: 'item'; secId: string; id: string | null; confirm: boolean; err?: string; data: ItemForm }
  | { kind: 'heading'; secId: string; id: string | null; confirm: boolean; err?: string; data: { name: string } }
  | { kind: 'section'; id: string | null; confirm: boolean; err?: string; data: SectionForm }
  | { kind: 'settings' };

type Props = {
  theme: Theme;
  open: boolean;
  sheet: SheetState | null;
  state: State;
  onChange: (s: SheetState) => void;
  onClose: () => void;
  onDismissed: () => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onSettings: (patch: Partial<Settings>) => void;
  onReview: (on: boolean) => void;
  onAddHeading: (sectionId: string) => void;
  /** Replaces the budget with an exported one. Returns an error message, or null on success. */
  onImport: (text: string) => string | null;
};

export function Sheets({ theme: t, open, sheet, state, onChange, onClose, onDismissed, onSave, onDelete, onMove, onSettings, onReview, onAddHeading, onImport }: Props) {
  const title = !sheet
    ? ''
    : sheet.kind === 'settings'
      ? 'Settings'
      : (sheet.id ? 'Edit ' : 'New ') + (sheet.kind === 'item' ? 'item' : sheet.kind === 'heading' ? 'subheading' : 'section');

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismissed}>
      <ThemeContext.Provider value={t}>
        <View style={{ flex: 1, backgroundColor: t.surface }}>
          <View style={[styles.bar, { borderBottomColor: t.line }]}>
            <View style={styles.barSide}>
              {sheet && sheet.kind !== 'settings' && (
                <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
                  <Text style={{ fontSize: 17, color: t.accent }}>Cancel</Text>
                </Pressable>
              )}
            </View>
            <Text style={{ fontSize: 17, fontWeight: '600', color: t.ink }} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.barSide, { alignItems: 'flex-end' }]}>
              <Pressable onPress={sheet?.kind === 'settings' ? onClose : onSave} hitSlop={10} accessibilityRole="button">
                <Text style={{ fontSize: 17, fontWeight: '600', color: t.accent }}>{sheet?.kind === 'settings' ? 'Done' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {sheet && <Body t={t} sheet={sheet} state={state} onChange={onChange} onSave={onSave} onDelete={onDelete} onMove={onMove} onSettings={onSettings} onReview={onReview} onAddHeading={onAddHeading} onImport={onImport} />}
          </ScrollView>
        </View>
      </ThemeContext.Provider>
    </Modal>
  );
}

function Body({ t, sheet, state, onChange, onSave, onDelete, onMove, onSettings, onReview, onAddHeading, onImport }: { t: Theme; sheet: SheetState } & Pick<Props, 'state' | 'onChange' | 'onSave' | 'onDelete' | 'onMove' | 'onSettings' | 'onReview' | 'onAddHeading' | 'onImport'>) {
  const input = [styles.input, { backgroundColor: t.bg, borderColor: t.line, color: t.ink }];

  if (sheet.kind === 'settings') {
    const st = state.settings;
    return (
      <>
        <Field label="Budget name">
          <TextInput style={input} value={st.title} onChangeText={(v) => onSettings({ title: v })} maxLength={28} placeholder="Fiscus Board" placeholderTextColor={t.muted} returnKeyType="done" />
        </Field>
        <Field label="Show amounts per">
          <Seg<Period> value={st.period} options={[['week', 'Week'], ['fortnight', 'Fortnight'], ['month', 'Month']]} onChange={(v) => onSettings({ period: v })} />
        </Field>
        <Field label="Appearance">
          <Seg<Settings['theme']> value={st.theme} options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} onChange={(v) => onSettings({ theme: v })} />
        </Field>
        <Field label="Accent">
          <Swatches keys={ACCENTS} value={st.accent} onChange={(v) => onSettings({ accent: v })} />
        </Field>
        <Field label="Review every 3 months">
          <Seg<'off' | 'on'> value={state.review.on ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => onReview(v === 'on')} />
          {state.review.on && !reviewActive(state) && state.review.due ? (
            <Text style={{ fontSize: 13, color: t.muted }}>Next review {formatDate(state.review.due)}</Text>
          ) : null}
        </Field>
        <ImportField t={t} onImport={onImport} />
      </>
    );
  }

  const list = sheet.kind === 'section' ? state.sections : state.sections.find((s) => s.id === sheet.secId)?.items ?? [];
  const index = sheet.id ? list.findIndex((x) => x.id === sheet.id) : -1;
  const footer = (
    <>
      {sheet.err ? <Text style={{ color: t.neg, fontSize: 14 }}>{sheet.err}</Text> : null}
      {sheet.id && (
        <Field label="Position">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Move up" kind="ghost" onPress={() => onMove(-1)} disabled={index <= 0} style={{ flex: 1 }} />
            <Button title="Move down" kind="ghost" onPress={() => onMove(1)} disabled={index < 0 || index >= list.length - 1} style={{ flex: 1 }} />
          </View>
        </Field>
      )}
      {sheet.id && (
        <Button
          title={sheet.confirm ? 'Confirm delete' : 'Delete'}
          kind={sheet.confirm ? 'danger' : 'ghost'}
          onPress={() => (sheet.confirm ? onDelete() : onChange({ ...sheet, confirm: true }))}
          style={{ marginTop: 8 }}
        />
      )}
    </>
  );

  if (sheet.kind === 'heading') {
    return (
      <>
        <Field label="Name">
          <TextInput
            style={input}
            value={sheet.data.name}
            onChangeText={(name) => onChange({ ...sheet, err: undefined, data: { name } })}
            autoFocus={!sheet.id}
            maxLength={40}
            placeholder="e.g. Bills"
            placeholderTextColor={t.muted}
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
        </Field>
        {footer}
      </>
    );
  }

  if (sheet.kind === 'item') {
    const d = sheet.data;
    const sec = state.sections.find((s) => s.id === sheet.secId);
    const p = PERIODS[state.settings.period];
    const pf = (parseFloat(d.amount.replace(',', '.')) || 0) * PER_FN[d.freq] * p.f;
    const set = (patch: Partial<ItemForm>) => onChange({ ...sheet, err: undefined, data: { ...d, ...patch } });
    return (
      <>
        <Field label="Name">
          <TextInput style={input} value={d.name} onChangeText={(name) => set({ name })} autoFocus={!sheet.id} maxLength={60} placeholder="e.g. Rent" placeholderTextColor={t.muted} returnKeyType="next" />
        </Field>
        <Field label="Amount">
          <TextInput style={[input, num]} value={d.amount} onChangeText={(amount) => set({ amount })} keyboardType="decimal-pad" placeholder="$0.00" placeholderTextColor={t.muted} />
        </Field>
        <Field label="How often">
          <Seg<Freq> value={d.freq} options={FREQS} onChange={(freq) => set({ freq })} wrap />
        </Field>
        <Text style={[num, { fontSize: 14, color: t.muted }]}>
          {p.col} <Text style={{ color: t.ink, fontWeight: '600' }}>{money(pf)}</Text>
          {sec && sec.split > 1 ? (
            <>
              {'  ·  '}Your share <Text style={{ color: t.ink, fontWeight: '600' }}>{money(pf / sec.split)}</Text>
            </>
          ) : null}
        </Text>
        {footer}
      </>
    );
  }

  const d = sheet.data;
  const set = (patch: Partial<SectionForm>) => onChange({ ...sheet, err: undefined, data: { ...d, ...patch } });
  return (
    <>
      <Field label="Name">
        <TextInput style={input} value={d.name} onChangeText={(name) => set({ name })} autoFocus={!sheet.id} maxLength={40} placeholder="e.g. Household" placeholderTextColor={t.muted} returnKeyType="done" />
      </Field>
      <Field label="Type">
        <Seg<'out' | 'in'> value={d.type} options={[['out', 'Expenses'], ['in', 'Income']]} onChange={(type) => set({ type, split: type === 'in' ? 1 : d.split })} />
      </Field>
      {d.type === 'out' && (
        <Field label="Split between">
          <Seg<number> value={d.split} options={[[1, 'Just me'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']]} onChange={(split) => set({ split })} />
        </Field>
      )}
      <Field label="Colour">
        <Swatches keys={SWATCHES} value={d.color} onChange={(color) => set({ color })} />
      </Field>
      {sheet.id && <Button title="Add subheading" kind="ghost" onPress={() => onAddHeading(sheet.id as string)} />}
      {footer}
    </>
  );
}

function ImportField({ t, onImport }: { t: Theme; onImport: (text: string) => string | null }) {
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = () => {
    if (!confirm) return setConfirm(true);
    const err = onImport(text);
    setConfirm(false);
    if (err) setMsg({ ok: false, text: err });
    else {
      setText('');
      setMsg({ ok: true, text: 'Budget imported.' });
    }
  };
  return (
    <Field label="Import budget">
      <TextInput
        style={[styles.input, { backgroundColor: t.bg, borderColor: t.line, color: t.ink, minHeight: 90, fontSize: 13, textAlignVertical: 'top' }]}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setConfirm(false);
          setMsg(null);
        }}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="Paste the text from Export in the web app"
        placeholderTextColor={t.muted}
      />
      <Button title={confirm ? 'Replace my budget' : 'Import'} kind={confirm ? 'danger' : 'ghost'} onPress={run} disabled={!text.trim()} />
      {msg && <Text style={{ fontSize: 13, color: msg.ok ? t.pos : t.neg }}>{msg.text}</Text>}
    </Field>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: hair },
  barSide: { width: 80 },
  body: { padding: 20, gap: 20, paddingBottom: 48 },
  input: { borderWidth: hair, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17 },
});
