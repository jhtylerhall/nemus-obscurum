import React, { useMemo, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable } from "react-native";

import {
  HomeworldScene,
  type HomeworldSceneHandle,
} from "./components/HomeworldScene";
import type { HomeworldStats } from "./homeworld/HomeworldApp";

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

export default function App() {
  const sceneRef = useRef<HomeworldSceneHandle | null>(null);
  const [stats, setStats] = useState<HomeworldStats | null>(null);

  const surfaceStatus = useMemo(() => {
    if (!stats) {
      return "Booting homeworld telemetry";
    }
    return stats.revealed ? "Signal detected" : "Hidden in the dark forest";
  }, [stats]);

  return (
    <View style={styles.container}>
      <HomeworldScene ref={sceneRef} onStats={setStats} />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Homeworld Status</Text>
          <Text style={styles.subtitle}>{surfaceStatus}</Text>
          <Pressable
            style={styles.button}
            onPress={() => sceneRef.current?.recenter()}
          >
            <Text style={styles.buttonLabel}>Recenter on Planet</Text>
          </Pressable>
          <View style={styles.row}>
            <Text style={styles.label}>Population</Text>
            <Text style={styles.value}>
              {stats ? numberFormat.format(stats.population) : "--"} B
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tech Level</Text>
            <Text style={styles.value}>
              {stats ? numberFormat.format(stats.techLevel) : "--"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Energy Use</Text>
            <Text style={styles.value}>
              {stats ? percentFormat.format(stats.energyUse) : "--"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Secrecy</Text>
            <Text style={styles.value}>
              {stats ? percentFormat.format(stats.secrecy) : "--"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Morale</Text>
            <Text style={styles.value}>
              {stats ? numberFormat.format(stats.morale) : "--"}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#01030a",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    padding: 16,
  },
  panel: {
    backgroundColor: "rgba(4, 12, 24, 0.72)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(96, 168, 255, 0.35)",
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(84, 132, 255, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(120, 168, 255, 0.45)",
  },
  buttonLabel: {
    color: "#e7f1ff",
    fontWeight: "600",
  },
  title: {
    color: "#e2f0ff",
    fontSize: 20,
    fontWeight: "600",
  },
  subtitle: {
    color: "#9fb7ff",
    marginTop: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "#8ba4d9",
  },
  value: {
    color: "#f5f9ff",
    fontWeight: "600",
  },
});
