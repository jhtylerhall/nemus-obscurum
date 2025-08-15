import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';

type Props = {
  yaw: number;   // radians (0 = +X). We'll mark East as 0 for now.
  pitch: number; // radians
  size?: number; // px
};

export const Compass: React.FC<Props> = ({ yaw, pitch, size = 96 }) => {
  const r = size / 2;
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const heading = (deg(yaw) + 360) % 360;

  const arrowLen = r * 0.7;

  const makeTick = (angleDeg: number, len: number, width: number = 1) => {
    const a = (angleDeg * Math.PI) / 180;
    const x1 = r + Math.cos(a) * (r - len);
    const y1 = r + Math.sin(a) * (r - len);
    const x2 = r + Math.cos(a) * (r - 2);
    const y2 = r + Math.sin(a) * (r - 2);
    return <Line key={angleDeg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8fb3ff" strokeWidth={width} />;
  };

  const cardinals = [
    { d: 0, label: 'E' },
    { d: 90, label: 'S' },
    { d: 180, label: 'W' },
    { d: 270, label: 'N' },
  ];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r - 1} stroke="#5872b8" strokeWidth={1} fill="rgba(16,22,43,0.6)" />
        {Array.from({ length: 36 }).map((_, i) => makeTick(i * 10, i % 9 === 0 ? 8 : 4, i % 9 === 0 ? 1.5 : 1))}
        {cardinals.map((c) => (
          <SvgText
            key={c.d}
            x={r + Math.cos((c.d * Math.PI) / 180) * (r - 18)}
            y={r + Math.sin((c.d * Math.PI) / 180) * (r - 18) + 4}
            fill="#cfe1ff"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
          >
            {c.label}
          </SvgText>
        ))}
        <G transform={`rotate(${heading} ${r} ${r})`}>
          <Path
            d={`M ${r + arrowLen} ${r} L ${r + arrowLen - 10} ${r - 5} L ${r + arrowLen - 10} ${r + 5} Z`}
            fill="#ffd166"
            stroke="#ffd166"
          />
          <Line x1={r} y1={r} x2={r + arrowLen - 12} y2={r} stroke="#ffd166" strokeWidth={2} />
        </G>
        <Line x1={r - 24} y1={r} x2={r + 24} y2={r} stroke="#5872b8" strokeWidth={3} />
        <Circle cx={r + Math.max(-24, Math.min(24, (pitch / (Math.PI / 2)) * 24))} cy={r} r={3.5} fill="#8af0c9" />
        <SvgText x={r} y={size - 6} fill="#cfe1ff" fontSize="10" textAnchor="middle">
          {`${heading.toFixed(0)}° | pitch ${((pitch * 180) / Math.PI).toFixed(0)}°`}
        </SvgText>
      </Svg>
    </View>
  );
};
