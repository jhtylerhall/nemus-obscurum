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
