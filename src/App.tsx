import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useCallback, useRef, useState } from "react";
import { Provider } from "react-redux";
import { store } from "./state/store";
import { SafeAreaView, View, Text, StyleSheet, Pressable } from "react-native";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { setStats } from "./features/sim/simSlice";
import { GLScene, GLSceneHandle } from "./gl/Scene";
import { POIBar } from "./ui/POIBar";
import { Engine } from "./sim/engine";
import type { EngineParams } from "./sim/types";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function Root() {
  const params = useAppSelector((s) => s.params);
  const stats = useAppSelector((s) => s.sim);
  const dispatch = useAppDispatch();

  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<GLSceneHandle>(null);

  const items = [
    { key: "home", label: "Home", onPress: () => sceneRef.current?.home() },
    {
      key: "random",
      label: "Random Civ",
      onPress: () => sceneRef.current?.focusRandom(),
    },
  ];

  const [paused, setPaused] = useState(false);
  const [violenceOn, setViolenceOn] = useState(true);
  const [expansionOn, setExpansionOn] = useState(true); // NEW

  if (!engineRef.current) {
    engineRef.current = new Engine(
      { ...params } as unknown as EngineParams,
      Math.floor(Math.random() * 1e9)
    );
    // initialize runtime switches to state
    engineRef.current.paused = paused;
    engineRef.current.violence = violenceOn;
    engineRef.current.expansion = expansionOn; // NEW
  }

  const handleTogglePause = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.paused = !engineRef.current.paused;
    setPaused(engineRef.current.paused);
  }, []);

  const handleToggleViolence = useCallback(() => {
    if (!engineRef.current) return;
    const next = !violenceOn;
    engineRef.current.violence = next;
    setViolenceOn(next);
  }, [violenceOn]);

  const handleToggleExpansion = useCallback(() => {
    if (!engineRef.current) return;
    const next = !expansionOn;
    engineRef.current.expansion = next;
    setExpansionOn(next);
  }, [expansionOn]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Dark Grove — GL Advanced</Text>
        <Text style={styles.sub}>
          t={stats.step} | alive {stats.alive}/{stats.totalCivs} | r=
          {stats.radius.toFixed(2)} | fps~{stats.fps}
        </Text>
      </View>

      <View style={styles.sceneWrap}>
        <GLScene
          ref={sceneRef}
          engine={engineRef.current!}
          maxStars={params.maxStars}
          maxCivs={params.maxCivs}
          onFps={(fps) => {
            const s = engineRef.current!.snapshot();
            if (s.step % 15 === 0) {
              dispatch(
                setStats({
                  step: s.step,
                  time: s.time,
                  radius: s.radius,
                  alive: s.alive,
                  totalCivs: s.totalCivs,
                  revealsB: s.revealsB,
                  revealsS: s.revealsS,
                  revealsR: s.revealsR,
                  killsThisStep: s.killsThisStep,
                  totalKills: s.totalKills,
                  fps,
                })
              );
            }
          }}
        />
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: 6, alignSelf: "center" }}
        >
          <POIBar items={items} />
        </View>
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.toolButton} onPress={handleTogglePause}>
          <Text style={styles.toolText}>{paused ? "Resume" : "Pause"}</Text>
        </Pressable>

        <Pressable style={styles.toolButton} onPress={handleToggleViolence}>
          <Text style={styles.toolText}>
            {violenceOn ? "Violence On" : "Violence Off"}
          </Text>
        </Pressable>

        {/* NEW: Pause/Resume Expansion */}
        <Pressable style={styles.toolButton} onPress={handleToggleExpansion}>
          <Text style={styles.toolText}>
            {expansionOn ? "Expansion On" : "Expansion Off"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.toolButton}
          onPress={() => engineRef.current?.reset()}
        >
          <Text style={styles.toolText}>Reset</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      {/* @ts-ignore children prop not recognized in current type defs */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Root />
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  header: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f2a4b",
  },
  title: { color: "#e6efff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#9fb0d2", marginTop: 2 },
  sceneWrap: {
    flex: 1,
    margin: 8,
    borderWidth: 2,
    borderColor: "#142618",
    borderRadius: 8,
    overflow: "hidden",
  },
  toolbar: {
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1f2a4b",
    backgroundColor: "#10162b",
  },
  toolButton: {
    backgroundColor: "#17203a",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#2a3c66",
  },
  toolText: { color: "#cfe1ff", fontWeight: "600", fontSize: 12 },
});
