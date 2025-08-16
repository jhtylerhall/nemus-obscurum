import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export const AnalogStick: React.FC<{
  onChange: (x: number, y: number) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ onChange, size = 80, style }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const max = size / 2;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      const x = Math.max(-max, Math.min(max, e.translationX));
      const y = Math.max(-max, Math.min(max, e.translationY));
      setPos({ x, y });
      onChange(x / max, -y / max);
    })
    .onEnd(() => {
      setPos({ x: 0, y: 0 });
      onChange(0, 0);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.base, { width: size, height: size, borderRadius: max }, style]}>
        <View
          style={[
            styles.knob,
            {
              left: max - 15,
              top: max - 15,
              transform: [{ translateX: pos.x }, { translateY: pos.y }],
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(11,16,32,0.35)',
  },
  knob: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(207,225,255,0.9)',
  },
});
