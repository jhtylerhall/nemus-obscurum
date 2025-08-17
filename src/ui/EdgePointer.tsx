import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

type Props = {
  show: boolean;
  x: number;  // px in parent view
  y: number;  // px in parent view
  angleDeg: number; // 0=right, 90=down
  label?: string;
};

export const EdgePointer: React.FC<Props> = ({ show, x, y, angleDeg }) => {
  if (!show) return null;
  const s = 28, c = s / 2;
  return (
    <View pointerEvents="none" style={[styles.wrap, { left: x - c, top: y - c, width: s, height: s }]}>
      <Svg width={s} height={s}>
        <G rotation={angleDeg} origin={`${c}, ${c}`}>
          <Circle cx={c} cy={c} r={c - 1.5} stroke="#87a5ff" strokeOpacity={0.7} strokeWidth={1.5} fill="rgba(10,15,30,0.55)" />
          <Path d={`M ${c + 9} ${c} L ${c + 1.8} ${c - 5.4} L ${c + 1.8} ${c + 5.4} Z`}
                fill="#ffd36e" stroke="#3b2f00" strokeOpacity={0.35} strokeWidth={0.6}/>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});

