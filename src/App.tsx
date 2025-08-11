import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { SafeAreaView, View, Text, Button, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { setStats } from './features/sim/simSlice';
import { GLScene } from './gl/Scene';
import { Engine } from './sim/engine';
import type { EngineParams } from './sim/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function Root() {
  const params = useAppSelector(s => s.params);
  const stats  = useAppSelector(s => s.sim);
  const dispatch = useAppDispatch();
  const engineRef = useRef<Engine | null>(null);
  if (!engineRef.current) engineRef.current = new Engine({ ...params } as unknown as EngineParams, Math.floor(Math.random()*1e9));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Dark Grove — GL Advanced</Text>
        <Text style={styles.sub}>
          t={stats.step} | alive {stats.alive}/{stats.totalCivs} | r={stats.radius.toFixed(2)} | fps~{stats.fps}
        </Text>
        <Text style={styles.sub}>
          reveals b:{stats.revealsB} s:{stats.revealsS} r:{stats.revealsR} | kills+{stats.killsThisStep} (Σ {stats.totalKills})
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <GLScene
          engine={engineRef.current!}
          maxStars={params.maxStars}
          maxCivs={params.maxCivs}
          onFps={(fps) => {
            const s = engineRef.current!.snapshot();
            if (s.step % 15 === 0) {
              dispatch(setStats({
                step: s.step, time: s.time, radius: s.radius,
                alive: s.alive, totalCivs: s.totalCivs,
                revealsB: s.revealsB, revealsS: s.revealsS, revealsR: s.revealsR,
                killsThisStep: s.killsThisStep, totalKills: s.totalKills,
                fps,
              }));
            }
          }}
        />
      </View>

      <View style={styles.toolbar}>
        <Button title="Reset world" onPress={() => engineRef.current?.reset()} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Root />
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1020' },
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1f2a4b' },
  title: { color: '#e6efff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#9fb0d2', marginTop: 2 },
  toolbar: { padding: 8, flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1f2a4b', backgroundColor: '#10162b' }
});
