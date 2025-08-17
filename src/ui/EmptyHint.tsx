import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const EmptyHint: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <View style={s.wrap} pointerEvents="none">
      <Text style={s.title}>Nothing here yet</Text>
      <Text style={s.sub}>Use “Populate”, “+Stars”, or “Spawn Civ” to seed the world.</Text>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 16, right: 16, top: 90,
    padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(8,12,24,0.85)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#273a66',
  },
  title: { color: '#e6efff', fontWeight: '700', marginBottom: 2 },
  sub: { color: '#a9bde7' },
});
