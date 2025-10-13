precision highp float;
attribute vec3 position;
uniform mat4 modelViewMatrix, projectionMatrix;
varying float vHeight;
void main() {
  vHeight = length(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
