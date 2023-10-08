highp float utils_double(float n) {
  return n * 2.;
}

highp float utils_add(float a, float b) {
  return a + b;
}

#pragma glslify: export(utils_double), export(utils_add)
