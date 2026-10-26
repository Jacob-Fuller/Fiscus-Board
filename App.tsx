import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { BudgetScreen } from './src/BudgetScreen';
import { InsightsScreen } from './src/InsightsScreen';
import { SheetState, Sheets } from './src/Sheets';
import { Entry, Item, Section, Settings, State, View as Tab, isHeading, parseImport, r2, setReviewOn, toggleReviewTick, uid } from './src/budget';
import { flushState, loadState, saveState } from './src/storage';
import { SWATCHES, ThemeContext, makeTheme } from './src/theme';
import { Icon, IconButton, Logo, Seg } from './src/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [state, setState] = useState<State | null>(null);
  const system = useColorScheme();

  useEffect(() => {
    loadState().then((s) => {
      // Appearance is Light or Dark only; a first launch takes the phone's current setting.
      if (s.settings.theme === 'system') s = { ...s, settings: { ...s.settings, theme: system === 'light' ? 'light' : 'dark' } };
      setState(s);
      SplashScreen.hideAsync().catch(() => {});
    });
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && flushState());
    return () => sub.remove();
  }, []);

  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const mode = !state || state.settings.theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : state.settings.theme;
  const theme = useMemo(() => makeTheme(mode, state?.settings.accent ?? 'brass'), [mode, state?.settings.accent]);

  if (!state) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Main state={state} update={update} />
    </ThemeContext.Provider>
  );
}

function Main({ state, update }: { state: State; update: (fn: (s: State) => State) => void }) {
  const insets = useSafeAreaInsets();
  const t = React.useContext(ThemeContext);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [open, setOpen] = useState(false);

  const show = (s: SheetState) => {
    setSheet(s);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const findSection = (s: State, id: string) => s.sections.find((x) => x.id === id);

  /* opening sheets */
  const editEntry = (secId: string, id: string) => {
    const e = findSection(state, secId)?.items.find((x) => x.id === id);
    if (!e) return;
    if (isHeading(e)) show({ kind: 'heading', secId, id, confirm: false, data: { name: e.name } });
    else show({ kind: 'item', secId, id, confirm: false, data: { name: e.name, amount: String(e.amount), freq: e.freq } });
  };
  const addItem = (secId: string) => show({ kind: 'item', secId, id: null, confirm: false, data: { name: '', amount: '', freq: 'fortnightly' } });
  const addHeading = (secId: string) => show({ kind: 'heading', secId, id: null, confirm: false, data: { name: '' } });
  const editSection = (id: string) => {
    const s = findSection(state, id);
    if (s) show({ kind: 'section', id, confirm: false, data: { name: s.name, type: s.type, split: s.split, color: s.color } });
  };
  const addSection = () =>
    show({ kind: 'section', id: null, confirm: false, data: { name: '', type: 'out', split: 1, color: SWATCHES[state.sections.length % SWATCHES.length] } });

  /* saving */
  const save = () => {
    if (!sheet || sheet.kind === 'settings') return close();
    const name = sheet.data.name.trim();
    if (!name) return setSheet({ ...sheet, err: 'Add a name.' });

    if (sheet.kind === 'section') {
      const d = sheet.data;
      const split = d.type === 'in' ? 1 : d.split;
      update((s) => {
        if (sheet.id) return { ...s, sections: s.sections.map((x) => (x.id === sheet.id ? { ...x, name, type: d.type, split, color: d.color } : x)) };
        const rec: Section = { id: uid(), name, type: d.type, split, color: d.color, items: [] };
        const sections = [...s.sections];
        const firstIncome = sections.findIndex((x) => x.type === 'in');
        if (d.type === 'out' && firstIncome >= 0) sections.splice(firstIncome, 0, rec);
        else sections.push(rec);
        return { ...s, sections };
      });
      return close();
    }

    let rec: Entry;
    if (sheet.kind === 'item') {
      const amount = parseFloat(sheet.data.amount.replace(',', '.'));
      if (!(amount > 0)) return setSheet({ ...sheet, err: 'Enter an amount above $0.' });
      rec = { id: sheet.id ?? uid(), name, amount: r2(amount), freq: sheet.data.freq } as Item;
    } else {
      rec = { id: sheet.id ?? uid(), kind: 'heading', name };
    }
    update((s) => ({
      ...s,
      sections: s.sections.map((x) =>
        x.id !== sheet.secId ? x : { ...x, items: sheet.id ? x.items.map((e) => (e.id === sheet.id ? rec : e)) : [...x.items, rec] },
      ),
    }));
    close();
  };

  const remove = () => {
    if (!sheet || sheet.kind === 'settings' || !sheet.id) return;
    const id = sheet.id;
    if (sheet.kind === 'section') update((s) => ({ ...s, sections: s.sections.filter((x) => x.id !== id) }));
    else update((s) => ({ ...s, sections: s.sections.map((x) => (x.id === sheet.secId ? { ...x, items: x.items.filter((e) => e.id !== id) } : x)) }));
    close();
  };

  const move = (dir: -1 | 1) => {
    if (!sheet || sheet.kind === 'settings' || !sheet.id) return;
    const id = sheet.id;
    const swap = <T extends { id: string }>(list: T[]) => {
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    };
    if (sheet.kind === 'section') update((s) => ({ ...s, sections: swap(s.sections) }));
    else update((s) => ({ ...s, sections: s.sections.map((x) => (x.id === sheet.secId ? { ...x, items: swap(x.items) } : x)) }));
  };

  const setSettings = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const setTab = (view: Tab) => update((s) => ({ ...s, ui: { ...s.ui, view } }));
  const toggleHide = () => update((s) => ({ ...s, ui: { ...s.ui, hide: !s.ui.hide } }));
  const tick = (id: string) => update((s) => toggleReviewTick(s, id));
  const setReview = (on: boolean) => update((s) => setReviewOn(s, on));
  const importBudget = (text: string) => {
    const next = parseImport(text);
    if (!next) return "That text isn't a Fiscus Board backup. Copy it again and paste the whole thing.";
    update((s) => ({ ...next, ui: s.ui }));
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: t.bg }]}>
        <View style={styles.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <Logo />
            <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.5, color: t.ink, flexShrink: 1 }} numberOfLines={1}>
              {state.settings.title.trim() || 'Fiscus Board'}
            </Text>
          </View>
          <IconButton onPress={toggleHide} label={state.ui.hide ? 'Show amounts' : 'Hide amounts'}>
            {state.ui.hide ? <Icon.eyeOff color={t.ink} /> : <Icon.eye color={t.ink} />}
          </IconButton>
          <IconButton onPress={() => show({ kind: 'settings' })} label="Settings">
            <Icon.gear color={t.ink} />
          </IconButton>
        </View>
        <Seg<Tab> value={state.ui.view} options={[['budget', 'Budget'], ['insights', 'Insights']]} onChange={setTab} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          {state.ui.view === 'budget' ? (
            <BudgetScreen state={state} onEditEntry={editEntry} onAddItem={addItem} onTick={tick} onEditSection={editSection} onAddSection={addSection} />
          ) : (
            <InsightsScreen state={state} />
          )}
        </View>
      </ScrollView>

      <Sheets
        theme={t}
        open={open}
        sheet={sheet}
        state={state}
        onChange={setSheet}
        onClose={close}
        onDismissed={() => !open && setSheet(null)}
        onSave={save}
        onDelete={remove}
        onMove={move}
        onSettings={setSettings}
        onReview={setReview}
        onAddHeading={addHeading}
        onImport={importBudget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
