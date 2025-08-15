import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

export type POIItem = { key: string; label: string; onPress: () => void };

export const POIBar: React.FC<{ items: POIItem[]; style?: ViewStyle }> = ({ items, style }) => (
  <ScrollView horizontal contentContainerStyle={[styles.row, style]} showsHorizontalScrollIndicator={false}>
    {items.map((it) => (
      <Pressable
        key={it.key}
        onPress={it.onPress}
        style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.chipText}>{it.label}</Text>
      </Pressable>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 4, paddingVertical: 2, gap: 4 },
  chip: {
    backgroundColor: '#17203a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2a3c66',
  },
  chipText: { color: '#cfe1ff', fontWeight: '600', fontSize: 11 },
});
