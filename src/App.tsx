import React, { useCallback, useMemo, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable } from "react-native";

import {
  HomeworldScene,
  type HomeworldSceneHandle,
} from "./components/HomeworldScene";
import type {
  HomeworldStats,
  HomeworldDebugInfo,
} from "./homeworld/HomeworldApp";

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
  const [debug, setDebug] = useState<HomeworldDebugInfo | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [visualDebug, setVisualDebug] = useState(false);

  const handleStats = useCallback((next: HomeworldStats) => {
    setStats({ ...next });
  }, []);

  const handleDebug = useCallback((next: HomeworldDebugInfo) => {
    setDebug({ ...next });
  }, []);

  const toggleDebug = useCallback(() => {
    setDebugVisible((prev) => !prev);
  }, []);

  const toggleVisualDebug = useCallback(() => {
    setVisualDebug((prev) => {
      const next = !prev;
      sceneRef.current?.setVisualDebug(next);
      return next;
    });
  }, []);

  const surfaceStatus = useMemo(() => {
    if (!stats) {
      return "Booting homeworld telemetry";
    }
    return stats.revealed ? "Signal detected" : "Hidden in the dark forest";
  }, [stats]);

  return (
    <View style={styles.container}>
      <HomeworldScene
        ref={sceneRef}
        onStats={handleStats}
        onDebug={handleDebug}
      />
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Homeworld Status</Text>
          <Text style={styles.subtitle}>{surfaceStatus}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.button}
              onPress={() => sceneRef.current?.recenter()}
            >
              <Text style={styles.buttonLabel}>Recenter on Planet</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={toggleDebug}>
              <Text style={styles.buttonLabel}>
                {debugVisible ? "Hide Debug" : "Show Debug"}
              </Text>
            </Pressable>
            <Pressable style={styles.button} onPress={toggleVisualDebug}>
              <Text style={styles.buttonLabel}>
                {visualDebug ? "Hide Visual Debug" : "Show Visual Debug"}
              </Text>
            </Pressable>
          </View>
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
          {debugVisible && debug ? (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>Debug Telemetry</Text>
              <View style={styles.debugRow}>
                <Text style={styles.debugKey}>Frame Time</Text>
                <Text style={styles.debugValue}>
                  {debug.frameTimeMs.toFixed(1)} ms
                </Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugKey}>Camera Radius</Text>
                <Text style={styles.debugValue}>
                  {numberFormat.format(debug.cameraRadius)}
                </Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugKey}>Camera Phi / Theta</Text>
                <Text style={styles.debugValue}>
                  {Math.round((debug.cameraPhi * 180) / Math.PI)}° /{" "}
                  {Math.round((debug.cameraTheta * 180) / Math.PI)}°
                </Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugKey}>Camera Position</Text>
                <Text style={styles.debugValue}>
                  {debug.cameraX.toFixed(2)}, {debug.cameraY.toFixed(2)},
                  {" "}
                  {debug.cameraZ.toFixed(2)}
                </Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugKey}>Planet Target</Text>
                <Text style={styles.debugValue}>
                  {debug.targetX.toFixed(2)}, {debug.targetY.toFixed(2)},
                  {" "}
                  {debug.targetZ.toFixed(2)}
                </Text>
              </View>
              <View style={styles.debugRow}>
                <Text style={styles.debugKey}>Energy / Secrecy</Text>
                <Text style={styles.debugValue}>
                  {percentFormat.format(debug.energyUse)} /{" "}
                  {percentFormat.format(debug.secrecy)}
                </Text>
              </View>
            </View>
          ) : null}
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
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
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
  debugPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(96, 168, 255, 0.2)",
  },
  debugTitle: {
    color: "#b8ccff",
    fontWeight: "600",
    marginBottom: 8,
  },
  debugRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  debugKey: {
    color: "#8ba4d9",
  },
  debugValue: {
    color: "#f5f9ff",
    fontVariant: ["tabular-nums"],
  },
});
