export const planetVertexShader = `
precision highp float;
attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 modelViewMatrix, projectionMatrix, modelMatrix, normalMatrix;
varying vec3 vPosW; varying vec3 vN; varying vec2 vUv;
void main() {
  vec4 posW = modelMatrix * vec4(position,1.0);
  vPosW = posW.xyz;
  vN = normalize((normalMatrix * vec4(normal,0.0)).xyz);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

export const planetFragmentShader = `
precision highp float;
varying vec3 vPosW; varying vec3 vN; varying vec2 vUv;
uniform vec3 uCamPos, uStarDir, uDayColor, uNightEmit;
uniform float uSpecPower, uSpecStrength;
uniform sampler2D uAlbedo, uCityMask;
void main() {
  vec3 N = normalize(vN);
  vec3 L = normalize(-uStarDir);
  vec3 V = normalize(uCamPos - vPosW);
  vec3 H = normalize(L+V);
  float NdotL = max(dot(N,L), 0.0);
  vec3 diffuse = NdotL * texture2D(uAlbedo, vUv).rgb * uDayColor;
  float spec = pow(max(dot(N,H),0.0), uSpecPower) * uSpecStrength * step(0.0, NdotL);
  float night = step(NdotL, 0.001);
  float city = texture2D(uCityMask, vUv).r;
  vec3 emissive = night * city * uNightEmit;
  gl_FragColor = vec4(diffuse + spec + emissive, 1.0);
}
`;

export const atmosphereVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 modelViewMatrix, projectionMatrix;
varying float vHeight;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vHeight = length(position);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const atmosphereFragmentShader = `
precision highp float;
varying float vHeight;
uniform vec3 uColor; uniform float uIntensity;
void main() {
  float alpha = smoothstep(1.0, 1.5, vHeight) * uIntensity;
  gl_FragColor = vec4(uColor, alpha);
}
`;
