import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

export const Vignette: React.FC<{ opacity?: number }> = ({ opacity = 0.55 }) => (
  <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id="vig" cx="50%" cy="50%" r="70%">
          <Stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <Stop offset="100%" stopColor={`rgba(0,0,0,${opacity})`} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#vig)" />
    </Svg>
  </View>
);
