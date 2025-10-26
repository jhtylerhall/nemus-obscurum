precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;
varying vec3 vPosW;
varying vec3 vN;
varying vec2 vUv;

void main() {
  vec4 posW = modelMatrix * vec4(position, 1.0);
  vPosW = posW.xyz;
  vN = normalize(normalMatrix * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
