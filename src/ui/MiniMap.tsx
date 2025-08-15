import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

type XY = [number, number];

type Props = {
  radius: number;         // world radius (engine.radius)
  cameraPos: { x: number; z: number; yaw: number };  // yaw radians
  civXY: XY[];            // downsampled alive civ positions in XY=> XZ plane
  size?: number;          // px
};

export const MiniMap: React.FC<Props> = ({ radius, cameraPos, civXY, size = 140 }) => {
  const r = size / 2;
  const worldToMap = (x: number, z: number) => {
    const pad = 10;
    const s = (r - pad) / Math.max(1, radius);
    return { x: r + x * s, y: r + z * s };
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r - 1} stroke="#5872b8" strokeWidth={1} fill="rgba(16,22,43,0.6)" />
        {civXY.map(([x, z], i) => {
          const p = worldToMap(x, z);
          return <Circle key={i} cx={p.x} cy={p.y} r={1.6} fill="#9cc8ff" />;
        })}
        {(() => {
          const p = worldToMap(cameraPos.x, cameraPos.z);
          const len = 12;
          const hx = Math.cos(cameraPos.yaw) * len;
          const hz = Math.sin(cameraPos.yaw) * len;
          return (
            <>
              <Circle cx={p.x} cy={p.y} r={3.5} fill="#ffd166" />
              <Line x1={p.x} y1={p.y} x2={p.x + hx} y2={p.y + hz} stroke="#ffd166" strokeWidth={2} />
            </>
          );
        })()}
      </Svg>
    </View>
  );
};
