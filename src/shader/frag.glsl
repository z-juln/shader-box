#version 300 es
#extension GL_GOOGLE_include_directive : enable
#include <./utils.glsl>
#define PI 3.14

precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 FragColor;

void main() {
  vec4 uv = vec4((gl_FragCoord.x * 2. - iResolution.x) / iResolution.x, (gl_FragCoord.y * 2. - iResolution.y) / iResolution.y, 0., 1.);
  FragColor = uv * iTime / 10000.;
}
