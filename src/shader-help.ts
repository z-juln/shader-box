// 兼容ssr等非浏览器环境
const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

const NearestFilter = 9728;
const LinearFilter = 9729;
const NearestMipMapNearestFilter = 9984;
const LinearMipMapNearestFilter = 9985;
const NearestMipMapLinearFilter = 9986;
const LinearMipMapLinearFilter = 9987;
const ClampToEdgeWrapping = 33071;
const MirroredRepeatWrapping = 33648;
const RepeatWrapping = 10497;

const textureNeedsPowerOf2 = (texture: TextureType) => {
  if (
    texture.wrapS !== ClampToEdgeWrapping ||
    texture.wrapT !== ClampToEdgeWrapping
  )
    return true;
  if (texture.minFilter !== NearestFilter && texture.minFilter !== LinearFilter)
    return true;
  return false;
};

const textureNeedsGenerateMipmaps = (texture: TextureType, isPowerOfTwo: boolean) =>
  isPowerOfTwo &&
  texture.minFilter !== NearestFilter &&
  texture.minFilter !== LinearFilter;

export type TextureType = {
  url: string;
  wrapS?: number;
  wrapT?: number;
  minFilter?: number;
  magFilter?: number;
  flipY?: number;
};

export const initShader = ({
  gl,
  vertexShaderSource: _vertexShaderSource,
  fragmentShaderSource: _fragmentShaderSource,
  canvasInfo,
  textures,
  onDoneLoadingTextures,
  parseGlslOpts,
}: {
  gl: WebGLRenderingContext;
  vertexShaderSource: string;
  fragmentShaderSource: string;
  canvasInfo: { width: number; height: number; };
  textures?: TextureType[];
  onDoneLoadingTextures?: () => void;
  parseGlslOpts?: {
    includeMap?: Record<string, string>;
  };
}) => {
  gl.viewport(0, 0, canvasInfo.width, canvasInfo.height);
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Program not created');
  }
  // create a new vertex shader and a fragment shader
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) {
    throw new Error('Shaders not created');
  }

  // parse glsl
  const vertexShaderSource = parseInclude(_vertexShaderSource, parseGlslOpts?.includeMap ?? {}).trimStart();
  const fragmentShaderSource = parseInclude(_fragmentShaderSource, parseGlslOpts?.includeMap ?? {}).trimStart();

  // specify the source code for the shaders using those strings
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.shaderSource(fragmentShader, fragmentShaderSource);

  // compile the shaders
  gl.compileShader(vertexShader);
  gl.compileShader(fragmentShader);

  // attach the two shaders to the program
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  gl.useProgram(program);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(vertexShader);
    if (err) {
      throw new Error(err);
    }
  }
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(fragmentShader);
    if (err) {
      throw new Error(err);
    }
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    if (log) {
      throw new Error(log);
    }
  }

  // iResolution
  const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
  gl.uniform2f(resolutionLocation, canvasInfo.width, canvasInfo.height);

  // iTime
  (() => {
    const start = performance.now();
    const frameTask = () => {
      const iTime = performance.now() - start;
      gl.uniform1f(gl.getUniformLocation(program, 'iTime'), iTime);
      gl.drawArrays(gl.POINTS, 0, 1);
      requestAnimationFrame(frameTask);
    };
    frameTask();
  })();

  // uniform samplerXX iChannel0..3; (XX = 2D/Cube)
  (() => {
    if (!textures) return;

    const iChannelResolution: number[] = [];
    const promisesArr = textures.map((textureInfo, index) => {
      const promise = loadTexture(gl, textureInfo).then(({ width, height, texture }) => {
        iChannelResolution[index * 3] = width * devicePixelRatio;
        iChannelResolution[index * 3 + 1] = height * devicePixelRatio;
        iChannelResolution[index * 3 + 2] = 0;
        return {
          index,
          texture,
        };
      });
      return promise;
    });

    Promise.all(promisesArr).then((list) => {
      onDoneLoadingTextures?.();

      for (const { index, texture } of list) {
        const iChannel = gl.getUniformLocation(program, `iChannel${index}`);
        // @ts-ignore
        gl.activeTexture(gl[`TEXTURE${index}`]);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(iChannel, index);
      }
    });
  })();

  return program;
};

export const glLog = (gl: WebGLRenderingContext) =>
  ({ x, y, w = 1, h = 1 }: { x: number; y: number; w?: number; h?: number; }) => {
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const pixels: [number, number, number, number][] = [];
  for (let i = 0; i < buf.length; i += 4) {
    pixels.push([buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]);
  }

  const pointStrList = pixels.map(p => p.join(', '));
  if (pixels.length <= 1) {
    console.log('pixels', pointStrList[0] ?? null);
  } else {
    console.log('pixels', pointStrList);
  }
};

export const getWebGLRenderingContext = (canvas: HTMLCanvasElement): { gl: WebGLRenderingContext; type: 'webgl1' | 'webgl2' } => {
  let gl: WebGLRenderingContext | null = canvas.getContext('webgl2') ?? (canvas.getContext('experimental-webg2') as any);
  let type: 'webgl1' | 'webgl2' = 'webgl2';
  if (!gl) {
    gl = canvas.getContext('webg1') ?? (canvas.getContext('experimental-webgl') as any);
    type = 'webgl1';
  }
  if (!gl) {
    throw new Error('WebGL not supported');
  }
  return {
    gl,
    type,
  };
};

const parseInclude = (sourceCode: string, moduleMap: Record<string, string>) => {
  const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

  return sourceCode.replace(includePattern, (_, moduleName: string) => {
    const moduleCode = moduleMap[moduleName];
    if (!moduleCode) {
      throw new Error(`Can not resolve #include <${moduleName}>`);
    }
    return `\n// #include-start<${moduleName}>\n${moduleCode}\n// #include-end<${moduleName}>\n`;
  });
};

/**
 * Initialize a texture and load an image.
 * When the image finished loading copy it into the texture.
 */
const loadTexture = (gl: WebGLRenderingContext, textureArgs: TextureType) => {
  const isPowerOf2 = (value: number) => (value & (value - 1)) === 0;

  const { url, wrapS, wrapT, minFilter, magFilter, flipY = -1 } = textureArgs;

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);

  return new Promise<{ width: number; height: number; texture: WebGLTexture; }>((resolve, reject) => {
    const isImage = !!/(\.jpg|\.jpeg|\.png|\.gif|\.bmp)$/i.exec(url);
    const isVideo = !!/(\.mp4|\.3gp|\.webm|\.ogv)$/i.exec(url);
    if (isImage === null && isVideo === null) {
      reject(new Error(`Please upload a video or an image with a valid format <${url}>`));
      return;
    }
    if (isVideo) {
      reject(new Error(`暂不支持video类型的texture`));
      return;
    }

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 0, 255]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel,
    );
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onerror = () => reject(new Error(`failed loading url: ${url}`));
    image.onload = () => {
      let texImageSource: TexImageSource = image;
      // WebGL1 has different requirements for power of 2 images
      let isPowerOf2Image = isPowerOf2(image.width) && isPowerOf2(image.height);
      if (textureNeedsPowerOf2(textureArgs) && !isPowerOf2Image) {
        texImageSource = makePowerOf2CanvasImageSource(image);
        isPowerOf2Image = true;
      }
  
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Flip image pixels into the bottom-to-top order that WebGL expects.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        texImageSource,
      );

      if (textureNeedsGenerateMipmaps(textureArgs, isPowerOf2Image)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      }

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS || RepeatWrapping);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT || RepeatWrapping);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter || LinearMipMapLinearFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter || LinearFilter);

      resolve({
        width: image.width,
        height: image.height,
        texture,
      });
    };
    image.src = url;
  });
};

const makePowerOf2CanvasImageSource = (
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap
): TexImageSource => {
  const floorPowerOf2 = (value: number) =>
    2 ** Math.floor(Math.log(value) / Math.LN2);

  const pow2canvas = document.createElement('canvas');

  pow2canvas.width = floorPowerOf2(image.width);
  pow2canvas.height = floorPowerOf2(image.height);

  const context = pow2canvas.getContext('2d');
  if (!context) throw new Error('Failed to create 2d context');

  context.drawImage(
    image,
    0,
    0,
    pow2canvas.width,
    pow2canvas.height,
  );

  console.warn(`Image is not power of two ${image.width} x ${
      image.height
    }. Resized to ${pow2canvas.width} x ${pow2canvas.height};`);

  return pow2canvas;
};
