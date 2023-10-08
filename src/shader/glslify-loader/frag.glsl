precision mediump float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: utils_double = require('./utils')
 
void main() {
  // gl_FragColor = vec4(noise(vec3(1.) * 25.0), 1., 1., 1.);
  float r = utils_double(0.5);
  gl_FragColor = vec4(r, 0., 0., 1.);
}
