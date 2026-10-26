import AsyncStorage from '@react-native-async-storage/async-storage';
import { blankState, normalise, State } from './budget';

const KEY = 'fiscusboard.v1';

export async function loadState(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? normalise(JSON.parse(raw)) : blankState();
  } catch {
    return blankState();
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: State | null = null;

function write() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!pending) return;
  const data = JSON.stringify(pending);
  pending = null;
  AsyncStorage.setItem(KEY, data).catch(() => {});
}

/** Saves shortly after the last change, so fast typing doesn't write on every key. */
export function saveState(state: State) {
  pending = state;
  if (timer) clearTimeout(timer);
  timer = setTimeout(write, 250);
}

/** Writes any unsaved change straight away (called when the app goes to the background). */
export const flushState = write;
