import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./state/store";
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { SystemView } from "./gl/SystemView";
import { generateHomeSystem } from "./sim/homeSystem";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function Root() {
  // Generate home system once
  const homeSystem = useMemo(() => {
    const seed = Math.floor(Math.random() * 1e9);
    return generateHomeSystem(seed);
  }, []);

  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(
    null
  );
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [renameText, setRenameText] = useState("");

  useEffect(() => {
    setSelectedPlanetId(homeSystem.homeworld.id);
  }, [homeSystem.homeworld.id]);

  useEffect(() => {
    if (!selectedPlanetId) return;
    const planet = homeSystem.planets.find((p) => p.id === selectedPlanetId);
    if (planet) {
      setRenameText(customNames[planet.id] ?? planet.name);
    }
  }, [customNames, homeSystem.planets, selectedPlanetId]);

  const handlePlanetFocus = useCallback((planetId: string) => {
    setSelectedPlanetId(planetId);
  }, []);

  const commitRename = useCallback(() => {
    if (!selectedPlanetId) return;
    const trimmed = renameText.trim();
    if (!trimmed) return;

    setCustomNames((prev) => ({
      ...prev,
      [selectedPlanetId]: trimmed,
    }));
  }, [renameText, selectedPlanetId]);

  const focusedPlanet = useMemo(() => {
    if (!selectedPlanetId) return null;
    return homeSystem.planets.find((p) => p.id === selectedPlanetId) ?? null;
  }, [homeSystem.planets, selectedPlanetId]);

  const getPlanetName = useCallback(
    (planetId: string) => {
      const base = homeSystem.planets.find((p) => p.id === planetId);
      if (!base) return "";
      return customNames[planetId] ?? base.name;
    },
    [customNames, homeSystem.planets]
  );

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
        <SystemView homeSystem={homeSystem} onPlanetFocus={handlePlanetFocus} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Drag to rotate • Pinch to zoom
        </Text>
        <Text style={styles.footerText}>
          Green orbit = Habitable world
        </Text>
        <Text style={styles.footerText}>Tap a planet to dive to planet scale</Text>
        {focusedPlanet ? (
          <View style={styles.renameCard}>
            <Text style={styles.renameLabel}>
              {getPlanetName(focusedPlanet.id)} — rename
            </Text>
            <View style={styles.renameRow}>
              <TextInput
                value={renameText}
                onChangeText={setRenameText}
                placeholder="Enter a new name"
                placeholderTextColor="#54617f"
                style={styles.renameInput}
                maxLength={32}
              />
              <TouchableOpacity
                style={styles.renameButton}
                onPress={commitRename}
                activeOpacity={0.85}
              >
                <Text style={styles.renameButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.footerText}>Tap a planet to retitle it</Text>
        )}
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
  renameCard: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#0f1a31",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2a4b",
  },
  renameLabel: {
    color: "#e6efff",
    fontSize: 12,
    marginBottom: 6,
    textAlign: "center",
    fontWeight: "700",
  },
  renameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  renameInput: {
    flex: 1,
    backgroundColor: "#0b1020",
    borderWidth: 1,
    borderColor: "#25314f",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e6efff",
    fontSize: 12,
  },
  renameButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1e8e3e",
    borderRadius: 6,
    marginLeft: 8,
  },
  renameButtonText: {
    color: "#e6efff",
    fontWeight: "700",
    fontSize: 12,
  },
});
