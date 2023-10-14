#version 300 es
#include <./utils/utils-common.glsl>
#extension GL_GOOGLE_include_directive : enable
precision highp float;

#pragma glslify: utils_double = require('./utils/utils-double')
#pragma glslify: utils_add = require('./utils/utils-add')

#define PI 3.14

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
out vec4 FragColor;

void main() {
  // Normalized pixel coordinates (from 0 to 1); origin point: center
  vec4 uv = vec4(gl_FragCoord.x / iResolution.x, gl_FragCoord.y / iResolution.y, 0., 1.);
  // Normalized pixel coordinates (from 0 to 1); origin point: top-left
  vec2 textureUV = vec2(gl_FragCoord.x / iResolution.x + 1., -gl_FragCoord.y / iResolution.y + 1.);

  // FragColor = vec4(uv.rgb * iTime / 10000., 1);

  FragColor = FragColor + vec4(texture2D(iChannel0, textureUV).rgb, .5) + vec4(texture2D(iChannel1, textureUV).rgb, .1);
}
