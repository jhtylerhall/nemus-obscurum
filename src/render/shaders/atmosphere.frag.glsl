precision highp float;
varying float vHeight;
uniform float uRadius;
uniform vec3 uColor;
void main() {
  float intensity = smoothstep(uRadius * 1.1, uRadius * 0.9, vHeight);
  gl_FragColor = vec4(uColor * intensity, intensity * 0.6);
}
