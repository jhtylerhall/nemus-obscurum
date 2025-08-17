import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

export const ShipIndicator: React.FC<{ yaw: number; pitch?: number; size?: number }> = ({
  yaw,
  pitch = 0,
  size = 36,
}) => {
  const s = size;
  const c = s / 2;
  const deg = (yaw * 180) / Math.PI;

  // map pitch to a tiny vertical offset (+up/-down)
  const yOff = Math.max(-6, Math.min(6, (pitch / (Math.PI / 2)) * 6));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={s} height={s}>
        {/* ring */}
        <Circle cx={c} cy={c} r={c - 1} stroke="#7fa2ff" strokeOpacity={0.6} strokeWidth={1} fill="none" />
        {/* crosshair */}
        <Line x1={c - 10} y1={c} x2={c + 10} y2={c} stroke="#7fa2ff" strokeOpacity={0.35} strokeWidth={1} />
        <Line x1={c} y1={c - 10} x2={c} y2={c + 10} stroke="#7fa2ff" strokeOpacity={0.35} strokeWidth={1} />
        {/* center dot */}
        <Circle cx={c} cy={c} r={2.3} fill="#cfe1ff" fillOpacity={0.9} />
        {/* heading chevron (rotates with yaw) */}
        <G transform={`rotate(${deg} ${c} ${c}) translate(0 ${yOff.toFixed(2)})`}>
          <Path
            d={`M ${c} ${c - 12} L ${c - 5.2} ${c - 2} L ${c + 5.2} ${c - 2} Z`}
            fill="#ffd36e"
            fillOpacity={0.95}
            stroke="#3b2f00"
            strokeOpacity={0.35}
            strokeWidth={0.6}
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ShipIndicator;
