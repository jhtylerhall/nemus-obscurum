import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  style?: ViewStyle;
  onHome(): void;
  onStrongest(): void;
  onFrontier(): void;
  onDensest(): void;
  onNearest(): void;
  onRandom(): void;
  onSpawnCiv(): void;
  onMoreStars(): void;
  onPopulate(): void;
};

export const ActionBar: React.FC<Props> = ({
  style,
  onHome,
  onStrongest,
  onFrontier,
  onDensest,
  onNearest,
  onRandom,
  onSpawnCiv,
  onMoreStars,
  onPopulate,
}) => {
  const Chip = (label: string, fn: () => void) => (
    <Pressable key={label} onPress={fn} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={[s.wrap, style]}>
      <ScrollView horizontal contentContainerStyle={s.row} showsHorizontalScrollIndicator={false}>
        {Chip('Home', onHome)}
        {Chip('Strongest', onStrongest)}
        {Chip('Frontier', onFrontier)}
        {Chip('Densest', onDensest)}
        {Chip('Nearest', onNearest)}
        {Chip('Random', onRandom)}
        {Chip('Spawn Civ', onSpawnCiv)}
        {Chip('+Stars', onMoreStars)}
        {Chip('Populate', onPopulate)}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center' },
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
