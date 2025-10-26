precision highp float;
varying float vHeight;
uniform vec3 uColor;
uniform float uIntensity;

void main() {
  float alpha = smoothstep(1.0, 1.5, vHeight) * uIntensity;
  gl_FragColor = vec4(uColor, alpha);
}
