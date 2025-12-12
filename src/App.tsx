import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useMemo } from "react";
import { Provider } from "react-redux";
import { store } from "./state/store";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import { SystemView } from "./gl/SystemView";
import { generateHomeSystem } from "./sim/homeSystem";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function Root() {
  // Generate home system once
  const homeSystem = useMemo(() => {
    const seed = Math.floor(Math.random() * 1e9);
    return generateHomeSystem(seed);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Nemus Obscurum — Homeworld</Text>
        <Text style={styles.sub}>
          System: {homeSystem.star.name} | Homeworld: {homeSystem.homeworld.name}
        </Text>
        <Text style={styles.sub}>
          Population: {homeSystem.homeworld.population.toLocaleString()} | Tech Level: {homeSystem.homeworld.techLevel}
        </Text>
      </View>

      <View style={styles.sceneWrap}>
        <SystemView homeSystem={homeSystem} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Drag to rotate • Pinch to zoom
        </Text>
        <Text style={styles.footerText}>
          Green orbit = Habitable world
        </Text>
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
  sub: { color: "#9fb0d2", marginTop: 2, fontSize: 12 },
  sceneWrap: {
    flex: 1,
    margin: 8,
    borderWidth: 2,
    borderColor: "#142618",
    borderRadius: 8,
    overflow: "hidden",
  },
  footer: {
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1f2a4b",
    backgroundColor: "#10162b",
  },
  footerText: {
    color: "#9fb0d2",
    fontSize: 11,
    textAlign: "center",
    marginVertical: 2,
  },
});
