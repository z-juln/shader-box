#extension GL_GOOGLE_include_directive : enable
uniform vec2 iResolution;
attribute vec4 a_position;

void main() {
  gl_Position = a_position;
  gl_PointSize = max(iResolution.x, iResolution.y);
}
