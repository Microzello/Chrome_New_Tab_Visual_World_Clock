const RAD = Math.PI / 180;

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec2 uSize;
uniform float uScale;
uniform float uCenterY;
uniform float uCenterLon;
uniform float uYTop;
uniform float uYBottom;
uniform float uGlowLod;
uniform vec3 uSun;
out vec4 outColor;

const float PI = 3.141592653589793;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 p = gl_FragCoord.xy;
  float my = uCenterY + (p.y - uSize.y * 0.5) / uScale;
  float lon = uCenterLon + (p.x - uSize.x * 0.5) / uScale;
  float lat = 2.0 * atan(exp(clamp(my, uYBottom, uYTop))) - 0.5 * PI;
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);

  vec3 day = texture(uDay, uv).rgb;
  float bm = texture(uNight, uv).r;

  float cl = cos(lat);
  float mu = dot(vec3(cl * cos(lon), cl * sin(lon), sin(lat)), uSun);

  float lum = dot(day, vec3(0.2126, 0.7152, 0.0722));
  vec3 dayCol = mix(vec3(lum), day, 0.9) * 0.92;
  dayCol *= 0.6 + 0.4 * smoothstep(-0.02, 0.5, mu);

  float lights = smoothstep(0.28, 0.85, bm);
  vec3 lightCol = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.88, 0.66), smoothstep(0.55, 1.0, bm));
  vec3 terrain = pow(lum, 0.8) * vec3(0.2, 0.25, 0.38) * 0.6 + vec3(0.1, 0.13, 0.2) * smoothstep(0.02, 0.35, bm) * 0.4;
  float halo = smoothstep(0.14, 0.55, textureLod(uNight, uv, uGlowLod).r);
  vec3 night = terrain + lightCol * lights * 1.35 + vec3(1.0, 0.62, 0.28) * halo * 0.3;

  float dayF = smoothstep(-0.12, 0.07, mu);
  vec3 col = mix(night, dayCol, dayF);

  vec2 q = (p / uSize - 0.5) * vec2(1.0, 1.2);
  col *= mix(0.8, 1.0, smoothstep(0.95, 0.35, length(q)));

  float edge = max(my - uYTop, uYBottom - my) * uScale;
  col = mix(col, vec3(0.012, 0.02, 0.039), smoothstep(-40.0, 0.0, edge));
  col += (hash(p) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

async function loadBitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return createImageBitmap(await res.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function createGL(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ["uDay", "uNight", "uSize", "uScale", "uCenterY", "uCenterLon", "uYTop", "uYBottom", "uGlowLod", "uSun"]) {
    u[name] = gl.getUniformLocation(program, name);
  }
  gl.uniform1i(u.uDay, 0);
  gl.uniform1i(u.uNight, 1);

  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  const textures = [gl.createTexture(), gl.createTexture()];
  let textureWidth = 4096;

  function upload(unit, bitmap, single) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    if (single) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, bitmap);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) {
      const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
    }
  }

  return {
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    setImages(day, lights) {
      textureWidth = lights.width;
      upload(0, day, false);
      upload(1, lights, true);
      day.close();
      lights.close();
    },
    draw(view, sun, dpr) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uSize, canvas.width, canvas.height);
      gl.uniform1f(u.uScale, view.scale * dpr);
      gl.uniform1f(u.uCenterY, view.centerY);
      gl.uniform1f(u.uCenterLon, view.centerLon * RAD);
      gl.uniform1f(u.uYTop, view.yTop);
      gl.uniform1f(u.uYBottom, view.yBottom);
      gl.uniform1f(u.uGlowLod, Math.max(0, Math.log2(textureWidth / (view.worldWidth * dpr))) + 2.5);
      const sLat = sun.lat * RAD;
      const sLon = sun.lon * RAD;
      gl.uniform3f(u.uSun, Math.cos(sLat) * Math.cos(sLon), Math.cos(sLat) * Math.sin(sLon), Math.sin(sLat));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

function create2D(canvas) {
  const ctx = canvas.getContext("2d");
  const shade = document.createElement("canvas");
  const shadeCtx = shade.getContext("2d");
  let dayImage = null;

  return {
    maxTexture: 4096,
    setImages(day) {
      dayImage = day;
    },
    draw(view, sun, dpr) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#03050a";
      ctx.fillRect(0, 0, w, h);
      if (!dayImage) return;
      const scale = view.scale * dpr;
      const worldW = 2 * Math.PI * scale;
      let x0 = w / 2 + ((-180 - view.centerLon) * RAD) * scale;
      while (x0 > 0) x0 -= worldW;
      const iw = dayImage.width;
      const ih = dayImage.height;
      ctx.filter = "brightness(0.85) saturate(0.9)";
      for (let y = 0; y < h; y += 2) {
        const my = view.centerY - (y + 1 - h / 2) / scale;
        if (my > view.yTop || my < view.yBottom) continue;
        const lat = 2 * Math.atan(Math.exp(my)) - Math.PI / 2;
        const sy = Math.min(ih - 1, Math.max(0, Math.round((0.5 - lat / Math.PI) * ih)));
        for (let x = x0; x < w; x += worldW) ctx.drawImage(dayImage, 0, sy, iw, 1, x, y, worldW, 2);
      }
      ctx.filter = "none";

      const sw = Math.ceil(w / 8);
      const sh = Math.ceil(h / 8);
      shade.width = sw;
      shade.height = sh;
      const img = shadeCtx.createImageData(sw, sh);
      const sLat = sun.lat * RAD;
      const sLon = sun.lon * RAD;
      for (let j = 0; j < sh; j++) {
        const my = view.centerY - (j * 8 + 4 - h / 2) / scale;
        const lat = 2 * Math.atan(Math.exp(Math.max(view.yBottom, Math.min(view.yTop, my)))) - Math.PI / 2;
        for (let i = 0; i < sw; i++) {
          const lon = view.centerLon * RAD + (i * 8 + 4 - w / 2) / scale;
          const mu = Math.sin(lat) * Math.sin(sLat) + Math.cos(lat) * Math.cos(sLat) * Math.cos(lon - sLon);
          const t = Math.min(1, Math.max(0, (mu + 0.105) / 0.18));
          const k = (j * sw + i) * 4;
          img.data[k] = 2;
          img.data[k + 1] = 4;
          img.data[k + 2] = 14;
          img.data[k + 3] = Math.round((1 - t * t * (3 - 2 * t)) * 215);
        }
      }
      shadeCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(shade, 0, 0, w, h);
    },
  };
}

export function createRenderer(canvas, onReady) {
  let backend;
  try {
    backend = createGL(canvas);
  } catch (err) {
    console.warn("WebGL unavailable, using 2D fallback", err);
  }
  if (!backend) backend = create2D(canvas);

  let view = null;
  let sun = null;
  let dpr = 1;
  let ready = false;

  function draw() {
    if (ready && view && sun) backend.draw(view, sun, dpr);
  }

  async function loadTier(tag) {
    const [day, lights] = await Promise.all([
      loadBitmap(`img/day_${tag}.webp`),
      loadBitmap(`img/lights_${tag}.webp`),
    ]);
    backend.setImages(day, lights);
    if (!ready) {
      ready = true;
      onReady?.();
    }
    draw();
  }

  const screenPx = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1);
  loadTier("4k")
    .then(() => {
      if (screenPx > 2800 && backend.maxTexture >= 8192) return loadTier("8k");
    })
    .catch((err) => console.error("Map imagery failed to load", err));

  return {
    resize(width, height, ratio) {
      dpr = ratio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    },
    render(nextView, nextSun) {
      view = nextView;
      sun = nextSun;
      draw();
    },
  };
}
