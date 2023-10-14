// http://www.bimant.com/blog/webgl-shader-crash-course/
import vertGlsl from './shader/vert.glsl';
import fragGlsl from './shader/frag.glsl';
import { getWebGLRenderingContext, glLog, initShader } from './shader-help';
import landscapeTexture from './assets/images/landscape.png';
import cubeTexture from './assets/images/cubetexture.png';

console.log({
  vertGlsl,
  fragGlsl,
})

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const { gl } = getWebGLRenderingContext(canvas);

const program = initShader({
  gl,
  canvasInfo: { width: canvas.width, height: canvas.height },
  vertexShaderSource: vertGlsl,
  fragmentShaderSource: fragGlsl,
  textures: [
    { url: landscapeTexture },
    { url: cubeTexture },
  ],
});
const log = glLog(gl);

log({ x: 0, y: 0 });
