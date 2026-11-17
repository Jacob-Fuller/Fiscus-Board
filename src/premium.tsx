// Premium through an Apple in-app purchase: a one-off lifetime unlock.
// Free: every feature, up to 3 sections with up to 6 items each. Premium removes the limits.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IAP from 'expo-iap';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { Button, Icon } from './ui';

export const PREMIUM_LIFETIME = 'com.fiscusboard.app.premium.lifetime';
export const FREE_SECTIONS = 3;
export const FREE_ITEMS = 6; // items per section (headings don't count)
const KEY = 'fiscusboard.premium';
const supported = Platform.OS === 'ios';

type Ctx = {
  locked: boolean;
  price: string;
  busy: boolean;
  error: string;
  buy: () => Promise<void>;
  restore: () => Promise<boolean>;
  paywall: (reason?: string) => void;
};
const PremiumCtx = createContext<Ctx | null>(null);
export const usePremium = () => {
  const c = useContext(PremiumCtx);
  if (!c) throw new Error('usePremium outside PremiumProvider');
  return c;
};

const owned = (list: any[]) => (list || []).some((p) => p.productId === PREMIUM_LIFETIME);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [price, setPrice] = useState('$4.99');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wall, setWall] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' });
  const connected = useRef(false);

  const save = useCallback((on: boolean) => {
    setActive(on);
    AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!supported || !connected.current) return;
    try {
      const list = await IAP.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      if (owned(list as any[])) save(true);
    } catch {}
  }, [save]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => v === '1' && setActive(true)).catch(() => {});
    if (!supported) return;
    let subs: { remove: () => void }[] = [];
    (async () => {
      try {
        await IAP.initConnection();
        connected.current = true;
        try {
          const p = ((await IAP.fetchProducts({ skus: [PREMIUM_LIFETIME], type: 'in-app' })) as any[]) || [];
          if (p[0] && p[0].displayPrice) setPrice(p[0].displayPrice);
        } catch {}
        subs.push(IAP.purchaseUpdatedListener(async (p: any) => {
          try { await IAP.finishTransaction({ purchase: p, isConsumable: false }); } catch {}
          if (p && p.productId === PREMIUM_LIFETIME) { save(true); setWall((w) => ({ ...w, open: false })); }
        }));
        subs.push(IAP.purchaseErrorListener(() => {}));
        await refresh();
      } catch {}
    })();
    return () => { subs.forEach((s) => s.remove()); subs = []; IAP.endConnection().catch(() => {}); };
  }, [refresh, save]);

  const buy = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true); setError('');
    try {
      await IAP.requestPurchase({ request: { apple: { sku: PREMIUM_LIFETIME } }, type: 'in-app' });
    } catch (e: any) {
      if (!IAP.isUserCancelledError(e)) setError("The purchase didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const restore = useCallback(async () => {
    if (!supported) return false;
    try { await IAP.restorePurchases(); } catch {}
    try {
      const on = owned(((await IAP.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })) as any[]) || []);
      if (on) { save(true); setWall((w) => ({ ...w, open: false })); }
      return on;
    } catch { return false; }
  }, [save]);

  // Premium is sold on iPhone; anywhere else everything is unlocked.
  const locked = supported && !active;
  const paywall = useCallback((reason = '') => setWall({ open: true, reason }), []);

  const value = useMemo<Ctx>(() => ({ locked, price, busy, error, buy, restore, paywall }), [locked, price, busy, error, buy, restore, paywall]);
  return (
    <PremiumCtx.Provider value={value}>
      {children}
      <Paywall open={wall.open} reason={wall.reason} onClose={() => setWall((w) => ({ ...w, open: false }))} />
    </PremiumCtx.Provider>
  );
}

const PERKS = ['Unlimited sections', 'Unlimited items in every section'];

function Paywall({ open, reason, onClose }: { open: boolean; reason: string; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { price, busy, error, buy, restore } = usePremium();
  const [note, setNote] = useState('');
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.band, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.muted, fontSize: 16, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: t.ink, textAlign: 'center', marginTop: 8 }}>Budget Board Premium</Text>
        {reason ? <Text style={{ fontSize: 15, color: t.muted, textAlign: 'center', marginTop: 6 }}>{reason}</Text> : null}
        <View style={{ marginTop: 24, backgroundColor: t.surface, borderRadius: 14, paddingHorizontal: 16 }}>
          {PERKS.map((p, i) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: i ? 0.5 : 0, borderTopColor: t.line }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Icon.check color={t.accentInk} size={13} />
              </View>
              <Text style={{ fontSize: 16, color: t.ink }}>{p}</Text>
            </View>
          ))}
        </View>
        <Button title={`Unlock Premium · ${price}`} onPress={buy} disabled={busy} style={{ marginTop: 24 }} />
        {error ? <Text style={{ color: t.neg, textAlign: 'center', marginTop: 10 }}>{error}</Text> : null}
        <Button kind="ghost" title="Restore Purchases" style={{ marginTop: 8 }} onPress={async () => setNote((await restore()) ? '' : 'No purchases found for this Apple ID')} />
        {note ? <Text style={{ color: t.muted, textAlign: 'center', marginTop: 4 }}>{note}</Text> : null}
        <Text style={{ marginTop: 16, fontSize: 12, lineHeight: 17, color: t.muted, textAlign: 'center' }}>A one-off purchase charged to your Apple ID. No subscription.</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 }}>
          <Text accessibilityRole="link" style={{ color: t.accent, fontSize: 13 }} onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>Terms of Use</Text>
          <Text accessibilityRole="link" style={{ color: t.accent, fontSize: 13 }} onPress={() => Linking.openURL('https://fiscusboard.app/privacy.html')}>Privacy Policy</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}
