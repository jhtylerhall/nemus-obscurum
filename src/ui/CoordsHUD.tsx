import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const CoordsHUD: React.FC<{
  cam: { x: number; y: number; z: number; yaw: number; pitch: number; dist: number };
  radius?: number;
}> = ({ cam, radius }) => {
  const d = (n: number) => (Math.abs(n) < 100 ? n.toFixed(2) : n.toFixed(1));
  const deg = (r: number) => ((r * 180) / Math.PI).toFixed(0);
  return (
    <View style={s.wrap} pointerEvents="none">
      <Text style={s.line}>x {d(cam.x)}   y {d(cam.y)}   z {d(cam.z)}</Text>
      <Text style={s.line}>yaw {deg(cam.yaw)}°   pitch {deg(cam.pitch)}°   dist {d(cam.dist)}</Text>
      {typeof radius === 'number' && <Text style={s.line}>r {d(radius)}</Text>}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(11,16,32,0.65)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#29406d',
  },
  line: { color: '#cfe1ff', fontSize: 12, lineHeight: 16 },
});

