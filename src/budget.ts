import type { Swatch } from './theme';

export type Freq = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';
export const FREQS: [Freq, string][] = [
  ['weekly', 'Weekly'],
  ['fortnightly', 'Fortnightly'],
  ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'],
  ['yearly', 'Yearly'],
];
export const FREQ_LABEL = Object.fromEntries(FREQS) as Record<Freq, string>;
/** How many times each frequency lands in one fortnight (26 fortnights a year). */
export const PER_FN: Record<Freq, number> = { weekly: 2, fortnightly: 1, monthly: 12 / 26, quarterly: 4 / 26, yearly: 1 / 26 };

export type Period = 'week' | 'fortnight' | 'month';
export const PERIODS: Record<Period, { f: number; label: string; col: string }> = {
  week: { f: 0.5, label: 'week', col: 'Per week' },
  fortnight: { f: 1, label: 'fortnight', col: 'Per fortnight' },
  month: { f: 26 / 12, label: 'month', col: 'Per month' },
};

export type Item = { id: string; kind?: 'item'; name: string; amount: number; freq: Freq };
export type Heading = { id: string; kind: 'heading'; name: string };
export type Entry = Item | Heading;
export type Section = { id: string; name: string; type: 'in' | 'out'; split: number; color: Swatch; items: Entry[] };
export type Settings = { theme: 'system' | 'light' | 'dark'; accent: Swatch; period: Period; title: string };
export type View = 'budget' | 'insights';
export type Review = { on: boolean; due: number | null; last: number | null; checked: Record<string, 1> };
export type State = { v: 3; settings: Settings; sections: Section[]; review: Review; ui: { view: View; hide: boolean } };

export const DEFAULT_REVIEW: Review = { on: false, due: null, last: null, checked: {} };

export const DEFAULT_SETTINGS: Settings = { theme: 'system', accent: 'brass', period: 'fortnight', title: 'Fiscus Board' };

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const r2 = (x: number) => Math.round(x * 100) / 100;

export function blankState(settings?: Settings): State {
  return {
    v: 3,
    settings: settings ?? { ...DEFAULT_SETTINGS },
    review: { ...DEFAULT_REVIEW, checked: {} },
    ui: { view: 'budget', hide: false },
    sections: [
      { id: uid(), name: 'Expenses', type: 'out', split: 1, color: 'blue', items: [] },
      { id: uid(), name: 'Income', type: 'in', split: 1, color: 'green', items: [] },
    ],
  };
}

export const isHeading = (e: Entry): e is Heading => e.kind === 'heading';
export const perFortnight = (e: Entry) => (isHeading(e) ? 0 : (+e.amount || 0) * PER_FN[e.freq]);
export const perPeriod = (e: Entry, period: Period) => perFortnight(e) * PERIODS[period].f;
export const sectionTotal = (s: Section, period: Period) => s.items.reduce((a, e) => a + perPeriod(e, period), 0);
export const sectionShare = (s: Section, period: Period) => sectionTotal(s, period) / (s.split || 1);

/** Sum of the items under a subheading, up to the next subheading. */
export function headingTotal(s: Section, index: number, period: Period) {
  let sum = 0;
  for (let j = index + 1; j < s.items.length && !isHeading(s.items[j]); j++) sum += perPeriod(s.items[j], period);
  return sum;
}

export function totals(state: State) {
  const p = state.settings.period;
  const inc = state.sections.filter((s) => s.type === 'in').reduce((a, s) => a + sectionShare(s, p), 0);
  const out = state.sections.filter((s) => s.type === 'out').reduce((a, s) => a + sectionShare(s, p), 0);
  return { inc, out, left: inc - out };
}

/* money */
function group(n: string) {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function money(v: number, hide = false, decimals = 2) {
  if (hide) return '$•••';
  const neg = v < 0;
  const [whole, cents] = Math.abs(v).toFixed(decimals).split('.');
  return (neg ? '−' : '') + '$' + group(whole) + (cents ? '.' + cents : '');
}
/** Expenses read as negative, like a ledger. */
export function signed(v: number, out: boolean, hide = false) {
  if (hide) return '$•••';
  return (out && v > 0.004 ? '−' : '') + money(Math.abs(v));
}

/** Repairs anything loaded from storage so the screens can trust its shape. */
export function normalise(raw: unknown): State {
  const s = raw as Partial<State> | null;
  if (!s || !Array.isArray(s.sections)) return blankState();
  const settings = { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) };
  return {
    v: 3,
    settings,
    review: {
      on: !!s.review?.on,
      due: typeof s.review?.due === 'number' ? s.review.due : null,
      last: typeof s.review?.last === 'number' ? s.review.last : null,
      checked: s.review?.checked && typeof s.review.checked === 'object' ? { ...s.review.checked } : {},
    },
    ui: { view: s.ui?.view === 'insights' ? 'insights' : 'budget', hide: !!s.ui?.hide },
    sections: s.sections.map((sec) => ({
      id: sec.id || uid(),
      name: sec.name || 'Section',
      type: sec.type === 'in' ? 'in' : 'out',
      split: Math.max(1, Math.floor(+sec.split || 1)),
      color: sec.color || (sec.type === 'in' ? 'green' : 'blue'),
      items: (Array.isArray(sec.items) ? sec.items : [])
        .filter((e) => e && typeof e.name === 'string')
        .map((e): Entry =>
          e.kind === 'heading'
            ? { id: e.id || uid(), kind: 'heading', name: e.name }
            : { id: e.id || uid(), name: e.name, amount: r2(+(e as Item).amount || 0), freq: (e as Item).freq in PER_FN ? (e as Item).freq : 'fortnightly' },
        ),
    })),
  };
}

/** Reads a budget exported from the web app (or a backup). Returns null if the text isn't one. */
export function parseImport(text: string): State | null {
  try {
    const raw = JSON.parse(text.trim());
    if (!raw || !Array.isArray(raw.sections)) return null;
    return normalise(raw);
  } catch {
    return null;
  }
}

/* quarterly review */
export const allItems = (s: State) => s.sections.flatMap((sec) => sec.items.filter((e) => !isHeading(e)));
export const reviewActive = (s: State, now = Date.now()) => s.review.on && s.review.due != null && now >= s.review.due && allItems(s).length > 0;
export function plus3Months(ms: number) {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + 3);
  return d.getTime();
}
export function formatDate(ms: number) {
  const d = new Date(ms);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}
/** Ticks or unticks an item; when every item is ticked, the review completes and the next is set for 3 months on. */
export function toggleReviewTick(s: State, id: string, now = Date.now()): State {
  const checked = { ...s.review.checked };
  if (checked[id]) delete checked[id];
  else checked[id] = 1;
  let review: Review = { ...s.review, checked };
  if (reviewActive(s, now) && allItems(s).every((e) => checked[e.id])) review = { ...review, last: now, due: plus3Months(now), checked: {} };
  return { ...s, review };
}
export function setReviewOn(s: State, on: boolean, now = Date.now()): State {
  if (on && !s.review.on) return { ...s, review: { on: true, due: now, last: null, checked: {} } };
  return { ...s, review: { ...s.review, on } };
}
