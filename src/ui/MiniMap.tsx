import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect, Path } from 'react-native-svg';

type XY = [number, number];

type Props = {
  radius: number;
  cameraPos: { x: number; z: number; yaw: number };
  civXY: XY[];
  size?: number;
  onSelect?: (x: number, z: number) => void;
};

export const MiniMap: React.FC<Props> = ({ radius, cameraPos, civXY, size = 140, onSelect }) => {
  const r = size / 2;
  const pad = 10;
  const s = (r - pad) / Math.max(1, radius);

  const worldToMap = (x: number, z: number) => ({ x: r + x * s, y: r + z * s });
  const mapToWorld = (mx: number, my: number) => ({ x: (mx - r) / s, z: (my - r) / s });

  let nearest = -1;
  let nd2 = Infinity;
  for (let i = 0; i < civXY.length; i++) {
    const dx = civXY[i][0] - cameraPos.x;
    const dz = civXY[i][1] - cameraPos.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < nd2) { nd2 = d2; nearest = i; }
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r - 1} stroke="#5872b8" strokeWidth={1} fill="rgba(16,22,43,0.6)" />
        {civXY.map(([x, z], i) => {
          const p = worldToMap(x, z);
          const isN = i === nearest;
          return <Circle key={i} cx={p.x} cy={p.y} r={isN ? 2.5 : 1.6} fill={isN ? '#ff6b6b' : '#9cc8ff'} />;
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
        {nearest >= 0 && (() => {
          const cam = worldToMap(cameraPos.x, cameraPos.z);
          const target = worldToMap(civXY[nearest][0], civXY[nearest][1]);
          const angle = Math.atan2(target.y - cam.y, target.x - cam.x);
          const ah = 6;
          const bx = target.x - Math.cos(angle) * ah;
          const by = target.y - Math.sin(angle) * ah;
          const lx = bx + Math.cos(angle + Math.PI / 2) * (ah * 0.5);
          const ly = by + Math.sin(angle + Math.PI / 2) * (ah * 0.5);
          const rx = bx + Math.cos(angle - Math.PI / 2) * (ah * 0.5);
          const ry = by + Math.sin(angle - Math.PI / 2) * (ah * 0.5);
          return (
            <>
              <Line x1={cam.x} y1={cam.y} x2={target.x} y2={target.y} stroke="#ff6b6b" strokeWidth={1.5} />
              <Path d={`M ${target.x} ${target.y} L ${lx} ${ly} L ${rx} ${ry} Z`} fill="#ff6b6b" />
            </>
          );
        })()}
        <Rect
          x={0} y={0} width={size} height={size} fill="transparent"
          onPress={(e: any) => {
            if (!onSelect) return;
            const { locationX, locationY } = e.nativeEvent;
            const w = mapToWorld(locationX, locationY);
            onSelect(w.x, w.z);
          }}
        />
      </Svg>
    </View>
  );
};
