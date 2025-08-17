import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

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
}) => {
  const Chip = (label: string, onPress: () => void) => (
    <Pressable key={label} style={({ pressed }) => [s.chip, pressed && s.chipPressed]} onPress={onPress}>
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      style={[{ paddingVertical: 6 }, style]}
    >
      {Chip('Home', onHome)}
      {Chip('Strongest', onStrongest)}
      {Chip('Frontier', onFrontier)}
      {Chip('Densest', onDensest)}
      {Chip('Nearest', onNearest)}
      {Chip('Random', onRandom)}
      {Chip('Spawn Civ', onSpawnCiv)}
      {Chip('+Stars', onMoreStars)}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  row: { paddingHorizontal: 10, gap: 10 },
  chip: {
    backgroundColor: '#1a2340',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2e4070',
  },
  chipPressed: { opacity: 0.6 },
  chipText: { color: '#cfe1ff', fontWeight: '600' },
});

export default ActionBar;
