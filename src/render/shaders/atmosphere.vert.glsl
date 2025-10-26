precision highp float;
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying float vHeight;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vHeight = length(position);
  gl_Position = projectionMatrix * mvPosition;
}
