precision highp float;
varying vec3 vPosW;
varying vec3 vN;
varying vec2 vUv;
uniform vec3 uCamPos;
uniform vec3 uStarDir;
uniform vec3 uDayColor;
uniform vec3 uNightEmit;
uniform float uSpecPower;
uniform float uSpecStrength;
uniform sampler2D uAlbedo;
uniform sampler2D uCityMask;

void main() {
  vec3 N = normalize(vN);
  vec3 L = normalize(-uStarDir);
  vec3 V = normalize(uCamPos - vPosW);
  vec3 H = normalize(L + V);
  float NdotL = max(dot(N, L), 0.0);
  vec3 albedo = texture2D(uAlbedo, vUv).rgb;
  vec3 diffuse = NdotL * albedo * uDayColor;
  float spec = pow(max(dot(N, H), 0.0), uSpecPower) * uSpecStrength * step(0.0, NdotL);
  float night = step(NdotL, 0.001);
  float city = texture2D(uCityMask, vUv).r;
  vec3 emissive = night * city * uNightEmit;
  gl_FragColor = vec4(diffuse + spec + emissive, 1.0);
}
