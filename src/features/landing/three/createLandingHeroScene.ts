import * as THREE from "three-landing";
import { saveLandingFreezeFromCanvas } from "../landing-freeze";
import { landingScroll } from "../landing-scroll-state";
import type { LandingHeroSceneHandle } from "./landing-scene-types";

export type { LandingHeroSceneHandle } from "./landing-scene-types";

/**
 * Furnishes hero — the interactive furnished-house scene, ported faithfully from
 * the frozen reference (`reference/2026-07-16/landing.jsx`,
 * `FurnishesHouse`). Pinned to the three@0.150 color API (outputEncoding /
 * sRGBEncoding). Framework-agnostic: the React wrapper owns DOM controls.
 *
 * The caller MUST ensure no other Landing WebGL context is live (loader disposed)
 * before creating this scene.
 */

const C = {
  bone: 0xffe8dc,
  slab: 0xffb89c,
  plinth: 0xffa888,
  wood: 0xffb89c,
  clay: 0xfb4a21,
  moss: 0xff8a66,
  ochre: 0xff5f33,
  stone: 0xff7148,
  teal: 0xff5f33,
  slate: 0xd62a0a,
  glass: 0xffe4da,
  sage: 0xf23a16,
};

type LandingHeroSceneOptions = {
  mount: HTMLElement;
  skipIntro?: boolean;
  /**
   * Low-cost path for CI / Playwright behavior tests (`/?e2e=1`).
   * Not for visual-parity screenshots.
   */
  testMode?: boolean;
  onIntroDone?: () => void;
  /**
   * Fires once when the opening tour finishes and overview auto-rotate begins.
   * Use this to reveal the Pause control — not `onIntroDone` (title reveal is earlier).
   */
  onOpeningComplete?: () => void;
  /** Fires once after the first painted hero frame (handoff cover can lift). */
  onFirstFrame?: () => void;
  /** Fires after initial sizing and each ResizeObserver-driven resize. */
  onResize?: (width: number, height: number) => void;
  onGlFailed?: () => void;
  getLabelEl: (roomIndex: number) => HTMLElement | null;
};

type FurnMats = {
  seat: THREE.MeshStandardMaterial;
  back: THREE.MeshStandardMaterial;
  arm: THREE.MeshStandardMaterial;
  corner: THREE.MeshStandardMaterial;
  bolster: THREE.MeshStandardMaterial;
};

type Human = {
  g: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  pv: THREE.Group;
  emote?: THREE.Sprite;
  kind?: string;
};

type PoseName = "sit" | "lie" | "walk" | "stand";
type PersonState = {
  x: number;
  z: number;
  y: number;
  face: number;
  pose: PoseName;
};

export function createLandingHeroScene(
  options: LandingHeroSceneOptions,
): LandingHeroSceneHandle | null {
  const { mount, skipIntro = false, testMode = false, getLabelEl } = options;
  let width = mount.clientWidth || 1;
  let height = mount.clientHeight || 1;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !testMode,
      alpha: true,
      preserveDrawingBuffer: !testMode,
      powerPreference: testMode ? "low-power" : "high-performance",
    });
  } catch (err) {
    console.warn("WebGL unavailable, skipping the 3D house.", err);
    options.onGlFailed?.();
    return null;
  }

  let lostTimer = 0;
  const onCtxLost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    if (lostTimer) window.clearTimeout(lostTimer);
    lostTimer = window.setTimeout(() => {
      options.onGlFailed?.();
    }, 3000);
  };
  renderer.domElement.addEventListener("webglcontextlost", onCtxLost, false);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    testMode ? 0.5 : Math.min(window.devicePixelRatio, 1.25),
  );
  renderer.setSize(width, height);
  options.onResize?.(renderer.domElement.width, renderer.domElement.height);
  renderer.shadowMap.enabled = !testMode;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.68;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.background = "transparent";

  const scene = new THREE.Scene();

  // Procedural IBL (no jsm RoomEnvironment): bake a tiny warm room.
  // Skip in E2E — PMREM is expensive under software WebGL.
  if (!testMode) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    {
      const faces = [
        0xfff4ef, 0xffede4, 0xfff8f4, 0xffe3d6, 0xfff1ea, 0xffeae0,
      ].map(
        (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide }),
      );
      envScene.add(new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14), faces));
      const kp = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 7),
        new THREE.MeshBasicMaterial({ color: 0xfffaf6 }),
      );
      kp.position.set(3.5, 4.4, 2.5);
      kp.rotation.x = Math.PI / 2;
      envScene.add(kp);
    }
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    envScene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((m) => m && m.dispose());
      }
    });
  }

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function tex(
    size: number,
    fn: (ctx: CanvasRenderingContext2D, s: number) => void,
    rep: number,
  ) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    fn(cv.getContext("2d")!, size);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.anisotropy = maxAniso;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const texFabric = tex(
    256,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      const d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = 234 + (Math.random() - 0.5) * 22;
        d[i] = d[i + 1] = d[i + 2] = n;
        d[i + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#f0cdbe";
      for (let x = 0.5; x < s; x += 3) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
      for (let y = 0.5; y < s; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
    },
    5,
  );
  const texPlaster = tex(
    256,
    (ctx, s) => {
      ctx.fillStyle = "#fff4ef";
      ctx.fillRect(0, 0, s, s);
      for (let k = 0; k < 4200; k++) {
        const v = 198 + Math.random() * 48;
        ctx.fillStyle = `rgba(${v},${(v - 7) | 0},${(v - 16) | 0},0.16)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2.4, 2.4);
      }
    },
    2,
  );
  const texWood = tex(
    256,
    (ctx, s) => {
      for (let y = 0; y < s; y++) {
        const v = 244 + 8 * Math.sin(y * 0.05) + (Math.random() - 0.5) * 10;
        ctx.fillStyle = `rgb(${v | 0},${(v - 3) | 0},${(v - 7) | 0})`;
        ctx.fillRect(0, y, s, 1);
      }
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#eab8a4";
      for (let y = 0; y < s; y += 38) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(s, y + 0.5);
        ctx.stroke();
      }
    },
    3,
  );
  const texWall = tex(
    256,
    (ctx, s) => {
      ctx.fillStyle = "#fff6f1";
      ctx.fillRect(0, 0, s, s);
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      for (let y = 3; y < s; y += 6) {
        ctx.globalAlpha = 0.05 + Math.random() * 0.05;
        ctx.strokeStyle = "#eccab8";
        ctx.beginPath();
        for (let x = 0; x <= s; x += 14) {
          const yy = y + Math.sin(x * 0.05 + y * 0.6) * 1.8;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let k = 0; k < 2200; k++) {
        const v = 240 + Math.random() * 14;
        ctx.fillStyle = `rgba(${v | 0},${(v - 6) | 0},${(v - 11) | 0},0.10)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
    },
    2,
  );

  const mat = (c: number, r = 0.82) => {
    const m = new THREE.MeshStandardMaterial({
      color: c,
      roughness: r,
      metalness: 0,
      envMapIntensity: 0.24,
    });
    m.map = texPlaster;
    m.bumpMap = texPlaster;
    m.bumpScale = 0.025;
    return m;
  };
  const M = {
    bone: mat(C.bone),
    slab: mat(C.slab),
    plinth: mat(C.plinth),
    wood: mat(C.wood, 0.82),
    slate: mat(C.slate, 0.5),
    teal: mat(C.teal, 0.55),
  };
  M.slab.map = texWood;
  M.slab.bumpMap = texWood;
  M.slab.bumpScale = 0.02;
  M.plinth.map = texWood;
  M.plinth.bumpMap = texWood;

  const PAL = [
    {
      wall: 0xffe8dc,
      seat: 0xfff6f1,
      back: 0xf23a16,
      arm: 0xfff6f1,
      corner: 0xfb4a21,
      bolster: 0xe5300c,
      lamp: 0xffd9cc,
    },
    {
      wall: 0xffe8dc,
      seat: 0xfff6f1,
      back: 0xff5f33,
      arm: 0xfff6f1,
      corner: 0xff7148,
      bolster: 0xfb4a21,
      lamp: 0xffd9cc,
    },
    {
      wall: 0xffe8dc,
      seat: 0xfff6f1,
      back: 0xff7148,
      arm: 0xfff6f1,
      corner: 0xff8a66,
      bolster: 0xff5f33,
      lamp: 0xffdccf,
    },
    {
      wall: 0xffe8dc,
      seat: 0xfff6f1,
      back: 0xff8a66,
      arm: 0xfff6f1,
      corner: 0xff8a66,
      bolster: 0xff7148,
      lamp: 0xffdfd2,
    },
    {
      wall: 0xffe8dc,
      seat: 0xfff6f1,
      back: 0xfb4a21,
      arm: 0xfff6f1,
      corner: 0xff5f33,
      bolster: 0xf23a16,
      lamp: 0xffd9cc,
    },
  ];
  const WALL = PAL.map((p) => mat(p.wall));
  WALL.forEach((m) => {
    m.map = texWall;
    m.bumpMap = texWall;
    m.bumpScale = 0.05;
  });
  M.bone.map = texWall;
  M.bone.bumpMap = texWall;
  M.bone.bumpScale = 0.05;
  let wallMat: THREE.MeshStandardMaterial = M.bone;

  const glassMat = new THREE.MeshStandardMaterial({
    color: C.glass,
    transparent: true,
    opacity: 0.3,
    roughness: 0.06,
    metalness: 0,
    envMapIntensity: 1.1,
  });

  const geoCache = new Map<string, THREE.ExtrudeGeometry>();
  function roundedBoxGeo(w: number, h: number, d: number) {
    const key = w.toFixed(3) + "_" + h.toFixed(3) + "_" + d.toFixed(3);
    const cached = geoCache.get(key);
    if (cached) return cached;
    const r = Math.min(0.05, Math.min(w, h) * 0.45);
    const bevel = Math.min(r, d * 0.45);
    const depth = Math.max(d - 2 * bevel, 0.001);
    const x = w / 2;
    const y = h / 2;
    const s = new THREE.Shape();
    s.moveTo(-x, -y + r);
    s.lineTo(-x, y - r);
    s.quadraticCurveTo(-x, y, -x + r, y);
    s.lineTo(x - r, y);
    s.quadraticCurveTo(x, y, x, y - r);
    s.lineTo(x, -y + r);
    s.quadraticCurveTo(x, -y, x - r, -y);
    s.lineTo(-x + r, -y);
    s.quadraticCurveTo(-x, -y, -x, -y + r);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 3,
    });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    geoCache.set(key, geo);
    return geo;
  }
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    cast = true,
    rec = true,
  ) => {
    const thin = Math.min(w, h, d) < 0.16;
    const geo = thin ? new THREE.BoxGeometry(w, h, d) : roundedBoxGeo(w, h, d);
    const me = new THREE.Mesh(geo, m);
    me.castShadow = cast;
    me.receiveShadow = rec;
    return me;
  };
  const at = (me: THREE.Object3D, x: number, y: number, z: number) => {
    me.position.set(x, y, z);
    return me;
  };

  const pivot = new THREE.Group();
  scene.add(pivot);
  const house = new THREE.Group();
  pivot.add(house);
  const add = (m: THREE.Object3D) => house.add(m);
  const BASE = -0.6;

  type Footprint = { x0: number; x1: number; z0: number; z1: number };
  function createBlock(fp: Footprint, elev: number, accent: number) {
    const { x0, x1, z0, z1 } = fp;
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const sH = 0.4;
    const pH = elev - sH - BASE;
    if (pH > 0.06)
      add(at(box(w * 0.99, pH, d * 0.99, M.plinth), cx, BASE + pH / 2, cz));
    add(at(box(w, sH, d, M.slab), cx, elev - sH / 2, cz));
    add(
      at(
        box(w * 0.5, 0.05, d * 0.5, mat(accent, 0.9), false, true),
        cx,
        elev + 0.026,
        cz,
      ),
    );
  }

  type WallEntry = {
    mesh: THREE.Group;
    x: number;
    z: number;
    ry: number;
    ri: number;
    nx?: number;
    nz?: number;
  };
  const wallList: WallEntry[] = [];
  type WindowSpec = { x: number; y: number; w: number; h: number };
  type WallOpts = {
    door?: { x: number; w: number; h: number };
    windows?: WindowSpec[];
  };
  function makeWall(len: number, h: number, th: number, opts: WallOpts) {
    const door = opts.door;
    const wins = opts.windows || [];
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    if (door) {
      shape.moveTo(0, 0);
      shape.lineTo(door.x, 0);
      shape.lineTo(door.x, door.h);
      shape.lineTo(door.x + door.w, door.h);
      shape.lineTo(door.x + door.w, 0);
      shape.lineTo(len, 0);
      shape.lineTo(len, h);
      shape.lineTo(0, h);
      shape.lineTo(0, 0);
    } else {
      shape.moveTo(0, 0);
      shape.lineTo(len, 0);
      shape.lineTo(len, h);
      shape.lineTo(0, h);
      shape.lineTo(0, 0);
    }
    wins.forEach((w) => {
      const p = new THREE.Path();
      p.moveTo(w.x, w.y);
      p.lineTo(w.x + w.w, w.y);
      p.lineTo(w.x + w.w, w.y + w.h);
      p.lineTo(w.x, w.y + w.h);
      p.lineTo(w.x, w.y);
      shape.holes.push(p);
    });
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: th,
      bevelEnabled: false,
    });
    geo.translate(-len / 2, 0, -th / 2);
    const wall = new THREE.Mesh(geo, wallMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    wins.forEach((w) => {
      const cx = w.x + w.w / 2 - len / 2;
      const cy = w.y + w.h / 2;
      g.add(
        at(
          box(w.w * 0.96, w.h * 0.96, 0.04, glassMat, false, false),
          cx,
          cy,
          0,
        ),
      );
      g.add(at(box(w.w, 0.06, th + 0.05, wallMat, false, false), cx, cy, 0));
      g.add(at(box(0.06, w.h, th + 0.05, wallMat, false, false), cx, cy, 0));
    });
    return g;
  }
  function placeWall(
    len: number,
    h: number,
    th: number,
    opts: WallOpts,
    x: number,
    z: number,
    ry: number,
    elev: number,
  ) {
    const w = makeWall(len, h, th, opts);
    w.position.set(x, elev, z);
    w.rotation.y = ry;
    add(w);
    wallList.push({ mesh: w, x, z, ry, ri: WALL.indexOf(wallMat) });
  }
  function stairsX(
    zc: number,
    xStart: number,
    dep: number,
    n: number,
    run: number,
    rise: number,
    dir: number,
    baseY: number,
  ) {
    for (let i = 0; i < n; i++) {
      const hh = rise * (i + 1);
      add(
        at(
          box(run, hh, dep, M.plinth),
          xStart + dir * run * (i + 0.5),
          baseY + hh / 2,
          zc,
        ),
      );
    }
  }
  function stairsZ(
    xc: number,
    zStart: number,
    wdt: number,
    n: number,
    run: number,
    rise: number,
    dir: number,
    baseY: number,
  ) {
    for (let i = 0; i < n; i++) {
      const hh = rise * (i + 1);
      add(
        at(
          box(wdt, hh, run, M.plinth),
          xc,
          baseY + hh / 2,
          zStart + dir * run * (i + 0.5),
        ),
      );
    }
  }

  const T = 0.22;
  const A = { x0: -8.5, x1: 0, z0: 0, z1: 5.0 };
  const B = { x0: 0, x1: 4.0, z0: 0, z1: 3.5 };
  const Cc = { x0: 0, x1: 9.5, z0: -5.0, z1: 0 };
  const D = { x0: -8.5, x1: 0, z0: -3.5, z1: 0 };

  createBlock(A, 0, C.clay);
  createBlock(B, 1.4, C.stone);
  createBlock(Cc, 0.3, C.ochre);
  createBlock(D, 2.6, C.moss);

  wallMat = WALL[0]!;
  placeWall(
    5.0,
    2.5,
    T,
    {
      windows: [
        { x: 1.0, y: 0.8, w: 1.2, h: 1.2 },
        { x: 3.0, y: 0.8, w: 1.2, h: 1.2 },
      ],
    },
    -8.5 + T / 2,
    2.5,
    Math.PI / 2,
    0,
  );
  placeWall(
    3.5,
    2.5,
    T,
    { windows: [{ x: 1.2, y: 0.8, w: 1.4, h: 1.0 }] },
    -6.75,
    0 + T / 2,
    0,
    0,
  );

  wallMat = WALL[1]!;
  placeWall(
    4.0,
    2.2,
    T,
    { windows: [{ x: 0.6, y: 0.8, w: 1.0, h: 1.0 }] },
    2.0,
    3.5 - T / 2,
    0,
    1.4,
  );
  placeWall(
    3.5,
    2.2,
    T,
    { windows: [{ x: 1.2, y: 0.7, w: 1.1, h: 1.1 }] },
    4.0 - T / 2,
    1.75,
    Math.PI / 2,
    1.4,
  );
  placeWall(
    4.0,
    2.2,
    T,
    { door: { x: 1.0, w: 2.0, h: 2.0 } },
    2.0,
    0 + T / 2,
    0,
    1.4,
  );

  wallMat = WALL[2]!;
  placeWall(
    5.0,
    2.4,
    T,
    { windows: [{ x: 2.2, y: 0.6, w: 0.8, h: 1.6 }] },
    9.5 - T / 2,
    -2.5,
    Math.PI / 2,
    0.3,
  );
  placeWall(
    9.5,
    2.4,
    T,
    { windows: [{ x: 3.0, y: 1.3, w: 3.5, h: 0.7 }] },
    4.75,
    -5.0 + T / 2,
    0,
    0.3,
  );
  placeWall(1.5, 2.4, T, {}, 0 + T / 2, -4.25, Math.PI / 2, 0.3);

  wallMat = WALL[3]!;
  placeWall(
    3.5,
    1.8,
    T,
    { windows: [{ x: 1.2, y: 0.6, w: 1.0, h: 1.0 }] },
    -8.5 + T / 2,
    -1.75,
    Math.PI / 2,
    2.6,
  );
  placeWall(
    8.5,
    1.8,
    T,
    {
      windows: [
        { x: 2.2, y: 0.5, w: 1.0, h: 0.9 },
        { x: 5.3, y: 0.5, w: 1.0, h: 0.9 },
      ],
    },
    -4.25,
    -3.5 + T / 2,
    0,
    2.6,
  );

  wallMat = WALL[4]!;
  const E1 = { x0: 4.0, x1: 9.5, z0: 0, z1: 4.0 };
  const E2 = { x0: 6.0, x1: 9.5, z0: 4.0, z1: 7.0 };
  createBlock(E1, 0.3, C.sage);
  createBlock(E2, 0.3, C.sage);
  placeWall(
    4.0,
    2.0,
    T,
    { windows: [{ x: 1.4, y: 0.7, w: 1.2, h: 1.1 }] },
    9.5 - T / 2,
    2.0,
    Math.PI / 2,
    0.3,
  );
  placeWall(2.0, 2.0, T, {}, 5.0, 4.0 - T / 2, 0, 0.3);
  placeWall(
    3.5,
    2.0,
    T,
    { windows: [{ x: 1.2, y: 0.7, w: 1.1, h: 1.0 }] },
    7.75,
    7.0 - T / 2,
    0,
    0.3,
  );
  placeWall(3.0, 2.0, T, {}, 9.5 - T / 2, 5.5, Math.PI / 2, 0.3);
  placeWall(3.0, 2.0, T, {}, 6.0 + T / 2, 5.5, Math.PI / 2, 0.3);

  stairsX(1.75, -0.9, 2.0, 5, 0.34, 0.28, 1, 0);
  stairsZ(2.0, -0.6, 2.0, 4, 0.34, 0.275, 1, 0.3);
  stairsX(-1.75, 0.9, 2.0, 7, 0.32, 0.33, -1, 0.3);

  const SEAT_H = 0.36;
  const furnMats = (p: (typeof PAL)[number]): FurnMats => {
    const m: FurnMats = {
      seat: mat(p.seat, 0.6),
      back: mat(p.back, 0.6),
      arm: mat(p.arm, 0.56),
      corner: mat(p.corner, 0.6),
      bolster: mat(p.bolster, 0.56),
    };
    Object.values(m).forEach((x) => {
      x.map = texFabric;
      x.bumpMap = texFabric;
      x.bumpScale = 0.03;
      x.flatShading = true;
      x.needsUpdate = true;
    });
    return m;
  };
  const P2 = Math.PI / 2;
  const TY0: Record<string, number> = {
    seat: 0.18,
    corner: 0.18,
    arm: 0.275,
    table: 0.11,
    cyl: 0.21,
    back: 0.0,
    arc: 0.0,
    hub: 0.35,
  };
  const NARC = 6;
  const ARC_RIN = 0.34;
  const ARC_ROUT = 1.04;
  function makePiece(type: string, F: FurnMats): THREE.Object3D {
    if (type === "seat") return box(0.7, SEAT_H, 0.35, F.seat);
    if (type === "corner") return box(0.7, SEAT_H, 0.7, F.corner);
    if (type === "arm") return box(0.18, 0.55, 0.7, F.arm);
    if (type === "table") return box(0.78, 0.22, 0.78, F.seat);
    if (type === "cyl") {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.175, 0.175, 0.42, 24),
        F.bolster,
      );
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    if (type === "hub") {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.28, 0.74, 28),
        F.bolster,
      );
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    if (type === "arc") {
      const span = (Math.PI * 2) / NARC - 0.05;
      const sh = new THREE.Shape();
      sh.absarc(0, 0, ARC_ROUT, -span / 2, span / 2, false);
      sh.absarc(0, 0, ARC_RIN, span / 2, -span / 2, true);
      const geo = new THREE.ExtrudeGeometry(sh, {
        depth: SEAT_H,
        bevelEnabled: false,
      });
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, F.corner);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    const g = new THREE.Group();
    const b = box(0.7, 0.6, 0.17, F.back);
    b.position.set(0, 0.3, 0);
    b.rotation.x = -0.16;
    g.add(b);
    return g;
  }

  type Emit = (
    t: string,
    ax: number,
    az: number,
    f: number,
    lx: number,
    lz: number,
    lry?: number,
  ) => void;
  type RoomDef = {
    elev: number;
    phase: number;
    A: (e: Emit) => void;
    B: (e: Emit) => void;
  };
  type RoomData = {
    elev: number;
    phase: number;
    pieces: [string, string][];
    A: Record<string, [number, number, number]>;
    B: Record<string, [number, number, number]>;
  };

  const ROOMS: RoomData[] = (() => {
    const rp = (
      ax: number,
      az: number,
      f: number,
      lx: number,
      lz: number,
    ): [number, number] => [
      ax + lx * Math.cos(f) - lz * Math.sin(f),
      az + lx * Math.sin(f) + lz * Math.cos(f),
    ];
    const sofa = (e: Emit, ax: number, az: number, f: number, n: number) => {
      const h = (n - 1) / 2;
      for (let i = 0; i < n; i++) {
        const lx = (i - h) * 0.7;
        e("seat", ax, az, f, lx, 0);
        e("back", ax, az, f, lx, -0.35);
      }
      const ex = h * 0.7 + 0.44;
      e("arm", ax, az, f, -ex, 0);
      e("arm", ax, az, f, ex, 0);
    };
    const chair = (e: Emit, ax: number, az: number, f: number, arms = 2) => {
      e("seat", ax, az, f, 0, 0);
      e("back", ax, az, f, 0, -0.35);
      if (arms >= 1) e("arm", ax, az, f, -0.44, 0);
      if (arms >= 2) e("arm", ax, az, f, 0.44, 0);
    };
    const bench = (
      e: Emit,
      ax: number,
      az: number,
      f: number,
      n: number,
      bk = 0,
    ) => {
      const h = (n - 1) / 2;
      for (let i = 0; i < n; i++) e("seat", ax, az, f, (i - h) * 0.7, 0);
      if (bk) e("back", ax, az, f, 0, -0.35);
    };
    const pouf = (e: Emit, ax: number, az: number) =>
      e("seat", ax, az, 0, 0, 0);
    const tbl = (e: Emit, ax: number, az: number) =>
      e("table", ax, az, 0, 0, 0);
    const stool = (e: Emit, ax: number, az: number) =>
      e("cyl", ax, az, 0, 0, 0);
    const cornerB = (e: Emit, ax: number, az: number) =>
      e("corner", ax, az, 0, 0, 0);
    const ring = (e: Emit, cx: number, cz: number, n: number) => {
      for (let i = 0; i < n; i++) e("arc", cx, cz, (i / n) * Math.PI * 2, 0, 0);
    };
    const arcBench = (
      e: Emit,
      cx: number,
      cz: number,
      f0: number,
      k0: number,
      k1: number,
      n: number,
    ) => {
      for (let i = k0; i <= k1; i++)
        e("arc", cx, cz, f0 + (i / n) * Math.PI * 2, 0, 0);
    };
    const hubP = (e: Emit, ax: number, az: number) => e("hub", ax, az, 0, 0, 0);
    const bedC = (e: Emit, ax: number, az: number, f: number) => {
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++)
          e("corner", ax, az, f, (i - 1) * 0.7, (j - 0.5) * 0.7);
    };
    const DEF: RoomDef[] = [
      {
        elev: 0,
        phase: 0,
        A: (e) => {
          sofa(e, -6.0, 1.25, 0, 3);
          chair(e, -2.6, 1.3, 0);
          pouf(e, -2.9, 3.1);
          pouf(e, -2.1, 3.1);
          cornerB(e, -1.2, 3.2);
          tbl(e, -6.0, 2.45);
          tbl(e, -7.85, 2.6);
          stool(e, -3.7, 2.2);
          stool(e, -1.3, 1.9);
        },
        B: (e) => {
          sofa(e, -5.6, 1.2, 0, 3);
          chair(e, -1.8, 1.25, 0);
          cornerB(e, -3.4, 3.4);
          pouf(e, -6.4, 3.4);
          pouf(e, -5.6, 3.4);
          tbl(e, -5.6, 2.4);
          tbl(e, -2.7, 3.0);
          stool(e, -7.6, 1.3);
          stool(e, -7.6, 2.2);
        },
      },
      {
        elev: 1.4,
        phase: 9,
        A: (e) => {
          chair(e, 1.5, 1.6, 0);
          bench(e, 2.9, 1.5, P2, 2, 1);
          tbl(e, 1.5, 2.7);
          stool(e, 3.4, 2.6);
        },
        B: (e) => {
          chair(e, 1.2, 1.1, 0, 1);
          chair(e, 2.9, 1.1, 0, 1);
          pouf(e, 1.0, 2.2);
          tbl(e, 2.0, 2.5);
          stool(e, 3.2, 2.0);
        },
      },
      {
        elev: 0.3,
        phase: 18,
        A: (e) => {
          arcBench(e, 2.5, -1.7, 0.5, 0, 2, NARC);
          arcBench(e, 7.2, -3.4, -0.6, 3, 5, NARC);
          hubP(e, 4.8, -3.6);
          tbl(e, 2.4, -3.5);
          tbl(e, 8.4, -1.3);
          pouf(e, 5.2, -1.2);
          pouf(e, 6.5, -1.5);
          pouf(e, 1.4, -2.7);
        },
        B: (e) => {
          ring(e, 4.9, -2.5, NARC);
          hubP(e, 4.9, -2.5);
          tbl(e, 1.5, -1.2);
          tbl(e, 8.5, -3.7);
          pouf(e, 4.9, -0.7);
          pouf(e, 7.7, -2.5);
          pouf(e, 2.0, -3.7);
        },
      },
      {
        elev: 2.6,
        phase: 27,
        A: (e) => {
          bedC(e, -6.3, -2.5, 0);
          tbl(e, -4.8, -2.6);
          pouf(e, -3.0, -1.7);
          pouf(e, -2.3, -1.5);
          stool(e, -3.3, -1.0);
        },
        B: (e) => {
          bedC(e, -2.2, -2.5, 0);
          tbl(e, -3.7, -2.6);
          pouf(e, -6.0, -1.7);
          pouf(e, -5.3, -1.5);
          stool(e, -6.3, -1.0);
        },
      },
      {
        elev: 0.3,
        phase: 36,
        A: (e) => {
          sofa(e, 6.6, 1.3, 0, 2);
          chair(e, 8.4, 3.0, 0, 0);
          pouf(e, 5.0, 3.2);
          tbl(e, 6.6, 2.5);
          stool(e, 8.6, 1.3);
          stool(e, 4.7, 1.6);
        },
        B: (e) => {
          chair(e, 5.6, 1.3, 0, 1);
          chair(e, 7.6, 1.3, 0, 1);
          bench(e, 8.4, 3.0, 0, 2, 1);
          tbl(e, 6.6, 2.2);
          stool(e, 5.0, 2.9);
          stool(e, 6.6, 3.4);
        },
      },
    ];
    const build = (fn: (e: Emit) => void) => {
      const out: { t: string; x: number; z: number; ry: number }[] = [];
      const e: Emit = (t, ax, az, f, lx, lz, lry = 0) => {
        const [x, z] = rp(ax, az, f, lx, lz);
        out.push({
          t,
          x: +x.toFixed(3),
          z: +z.toFixed(3),
          ry: +(f + lry).toFixed(4),
        });
      };
      fn(e);
      return out;
    };
    const byT = (arr: { t: string; x: number; z: number; ry: number }[]) => {
      const m: Record<
        string,
        { t: string; x: number; z: number; ry: number }[]
      > = {};
      arr.forEach((p) => {
        (m[p.t] = m[p.t] || []).push(p);
      });
      return m;
    };
    return DEF.map((d) => {
      const ga = byT(build(d.A));
      const gb = byT(build(d.B));
      const pieces: [string, string][] = [];
      const A: Record<string, [number, number, number]> = {};
      const B: Record<string, [number, number, number]> = {};
      Object.keys(ga).forEach((t) => {
        const la = ga[t]!;
        const lb = gb[t] || [];
        for (let k = 0; k < la.length; k++) {
          const id = t + k;
          pieces.push([id, t]);
          const a = la[k]!;
          A[id] = [a.x, a.z, a.ry];
          const b = lb[k] || a;
          B[id] = [b.x, b.z, b.ry];
        }
      });
      return { elev: d.elev, phase: d.phase, pieces, A, B };
    });
  })();

  const introStruct = house.children.map((m) => ({
    mesh: m,
    baseY: m.position.y,
    x: m.position.x,
    z: m.position.z,
    ri: 0,
  }));

  type AnimPiece = {
    mesh: THREE.Object3D;
    baseY: number;
    A: [number, number, number];
    B: [number, number, number];
    dr: number;
    ri: number;
    lp: number;
  };
  const animPieces: AnimPiece[] = [];
  const seats: {
    A: [number, number, number];
    B: [number, number, number];
  }[][] = [];
  ROOMS.forEach((room, ri) => {
    const FR = furnMats(PAL[ri]!);
    room.pieces.forEach(([id, type], i) => {
      const mesh = makePiece(type, FR);
      add(mesh);
      const A = room.A[id]!;
      const B = room.B[id]!;
      const baseY = room.elev + TY0[type]!;
      if (type === "seat") {
        (seats[ri] = seats[ri] || []).push({ A, B });
      }
      mesh.position.set(A[0], baseY, A[1]);
      mesh.rotation.y = A[2];
      let dr = B[2] - A[2];
      while (dr > Math.PI) dr -= 2 * Math.PI;
      while (dr < -Math.PI) dr += 2 * Math.PI;
      animPieces.push({ mesh, baseY, A, B, dr, ri, lp: i * 0.13 });
    });
  });

  house.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  animPieces.forEach((o) =>
    o.mesh.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    }),
  );

  // ── inhabitants ──────────────────────────────────────────────
  const PCOL = [0xff5f33, 0xfff3ee, 0xff8a66, 0xf23a16, 0xfff3ee];
  const skin = mat(0xe0a77f, 0.8);
  const hair = mat(0x5a3322, 0.9);
  const pants = mat(0xc9684a, 0.9);
  const segMesh = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    y: number,
  ) => {
    const me = new THREE.Mesh(roundedBoxGeo(w, h, d), m);
    me.position.y = y;
    me.castShadow = true;
    me.receiveShadow = true;
    return me;
  };
  function buildHuman(c: number): Human {
    const cloth = mat(c, 0.92);
    const g = new THREE.Group();
    g.add(segMesh(0.26, 0.36, 0.16, cloth, 0.18));
    const head = new THREE.Group();
    head.position.y = 0.38;
    g.add(head);
    head.add(segMesh(0.17, 0.18, 0.17, skin, 0.085));
    head.add(segMesh(0.185, 0.07, 0.185, hair, 0.175));
    const armL = new THREE.Group();
    armL.position.set(0.165, 0.34, 0);
    armL.add(segMesh(0.075, 0.3, 0.09, cloth, -0.15));
    const armR = new THREE.Group();
    armR.position.set(-0.165, 0.34, 0);
    armR.add(segMesh(0.075, 0.3, 0.09, cloth, -0.15));
    g.add(armL, armR);
    const mkLeg = (sx: number) => {
      const hip = new THREE.Group();
      hip.position.set(sx, 0, 0);
      hip.add(segMesh(0.1, 0.22, 0.11, pants, -0.11));
      const knee = new THREE.Group();
      knee.position.y = -0.22;
      hip.add(knee);
      knee.add(segMesh(0.09, 0.22, 0.1, pants, -0.11));
      knee.add(segMesh(0.1, 0.06, 0.18, hair, -0.22));
      (knee.children[1] as THREE.Object3D).position.z = 0.045;
      return { hip, knee };
    };
    const L = mkLeg(0.085);
    const R = mkLeg(-0.085);
    g.add(L.hip, R.hip);
    return {
      g,
      head,
      armL,
      armR,
      hipL: L.hip,
      hipR: R.hip,
      kneeL: L.knee,
      kneeR: R.knee,
      pv: new THREE.Group(),
    };
  }
  const setPose = (H: Human, pose: PoseName, wp: number) => {
    if (pose === "sit") {
      H.hipL.rotation.x = -1.45;
      H.hipR.rotation.x = -1.45;
      H.kneeL.rotation.x = 1.5;
      H.kneeR.rotation.x = 1.5;
      H.armL.rotation.x = -0.35;
      H.armR.rotation.x = -0.35;
    } else if (pose === "lie") {
      H.hipL.rotation.x = 0.03;
      H.hipR.rotation.x = -0.03;
      H.kneeL.rotation.x = 0.06;
      H.kneeR.rotation.x = 0.06;
      H.armL.rotation.x = 0.12;
      H.armR.rotation.x = 0.12;
    } else if (pose === "walk") {
      const s = Math.sin(wp);
      H.hipL.rotation.x = s * 0.55;
      H.hipR.rotation.x = -s * 0.55;
      H.kneeL.rotation.x = Math.max(0, -s) * 0.8;
      H.kneeR.rotation.x = Math.max(0, s) * 0.8;
      H.armL.rotation.x = -s * 0.5;
      H.armR.rotation.x = s * 0.5;
    } else {
      H.hipL.rotation.x =
        H.hipR.rotation.x =
        H.kneeL.rotation.x =
        H.kneeR.rotation.x =
          0;
      H.armL.rotation.x = H.armR.rotation.x = 0.06;
    }
  };

  const rrect = (
    x: CanvasRenderingContext2D,
    a: number,
    b: number,
    w: number,
    h: number,
    r: number,
  ) => {
    x.beginPath();
    x.moveTo(a + r, b);
    x.arcTo(a + w, b, a + w, b + h, r);
    x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r);
    x.arcTo(a, b, a + w, b, r);
    x.closePath();
  };
  const dotC = (
    x: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rr: number,
  ) => {
    x.beginPath();
    x.arc(cx, cy, rr, 0, 7);
    x.fill();
  };
  const emoteTextures: THREE.CanvasTexture[] = [];
  function emoteTex(kind: string) {
    const s = 128;
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const x = cv.getContext("2d")!;
    x.fillStyle = "#ffffff";
    x.strokeStyle = "rgba(120,80,40,0.22)";
    x.lineWidth = 3.5;
    rrect(x, 14, 12, 100, 74, 24);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(54, 84);
    x.lineTo(62, 104);
    x.lineTo(72, 84);
    x.closePath();
    x.fillStyle = "#ffffff";
    x.fill();
    const cx = 64;
    const cy = 48;
    x.lineWidth = 3;
    x.lineCap = "round";
    if (kind === "smile") {
      x.fillStyle = "#6e4a2e";
      dotC(x, cx - 13, cy - 6, 5);
      dotC(x, cx + 13, cy - 6, 5);
      x.strokeStyle = "#6e4a2e";
      x.beginPath();
      x.arc(cx, cy - 2, 16, 0.16 * Math.PI, 0.84 * Math.PI);
      x.stroke();
    } else if (kind === "heart") {
      x.fillStyle = "#cf5a3a";
      x.beginPath();
      x.moveTo(cx, cy + 16);
      x.bezierCurveTo(cx - 22, cy - 2, cx - 10, cy - 20, cx, cy - 6);
      x.bezierCurveTo(cx + 10, cy - 20, cx + 22, cy - 2, cx, cy + 16);
      x.fill();
    } else if (kind === "chat") {
      x.fillStyle = "#6e4a2e";
      dotC(x, cx - 16, cy, 5);
      dotC(x, cx, cy, 5);
      dotC(x, cx + 16, cy, 5);
    } else if (kind === "coffee") {
      x.fillStyle = "#a9763f";
      rrect(x, cx - 15, cy - 4, 26, 22, 4);
      x.fill();
      x.strokeStyle = "#a9763f";
      x.beginPath();
      x.arc(cx + 15, cy + 7, 7, -1.5, 1.5);
      x.stroke();
      x.strokeStyle = "#cbab90";
      x.lineWidth = 3;
      for (const o of [-7, 3]) {
        x.beginPath();
        x.moveTo(cx + o, cy - 8);
        x.quadraticCurveTo(cx + o + 7, cy - 16, cx + o, cy - 25);
        x.stroke();
      }
    } else {
      x.fillStyle = "#6e4a2e";
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 4; c++) {
          rrect(x, cx - 22 + c * 11, cy - 6 + r * 10, 8, 7, 2);
          x.fill();
        }
    }
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = maxAniso;
    emoteTextures.push(t);
    return t;
  }
  const attachEmote = (H: Human, kind: string) => {
    const spr = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: emoteTex(kind),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    spr.scale.set(0.52, 0.52, 0.52);
    spr.position.set(0, 1.04, 0);
    spr.material.opacity = 0;
    H.pv.add(spr);
    H.emote = spr;
    H.kind = kind;
  };

  const RCEN: [number, number][] = [
    [-4.25, 2.5],
    [2.0, 1.75],
    [4.75, -2.5],
    [-4.25, -1.75],
    [7.0, 2.5],
  ];
  wallList.forEach((w) => {
    const rc = RCEN[w.ri] || [0, 0];
    const ax = Math.sin(w.ry);
    const az = Math.cos(w.ry);
    const s = (w.x - rc[0]) * ax + (w.z - rc[1]) * az >= 0 ? 1 : -1;
    w.nx = ax * s;
    w.nz = az * s;
  });

  const WK = 1.9;
  const faceTo = (fx: number, fz: number, tx: number, tz: number) =>
    Math.atan2(tx - fx, tz - fz);
  const lpn = (a: number, b: number, t: number) => a + (b - a) * t;
  const frontOf = (s: [number, number, number]): [number, number] => [
    s[0] - Math.sin(s[2]) * 0.66,
    s[1] + Math.cos(s[2]) * 0.66,
  ];
  const sitFace = (s: [number, number, number]) => -s[2];
  const leg = (
    e: number,
    f: [number, number],
    t: [number, number],
    k: number,
  ): PersonState => ({
    x: lpn(f[0], t[0], k),
    z: lpn(f[1], t[1], k),
    y: e + 0.44,
    face: faceTo(f[0], f[1], t[0], t[1]),
    pose: "walk",
  });
  const walkVia = (
    e: number,
    f: [number, number],
    m: [number, number],
    t: [number, number],
    k: number,
  ) => (k < 0.5 ? leg(e, f, m, k / 0.5) : leg(e, m, t, (k - 0.5) / 0.5));
  const rnd = (a: number) => {
    const x = Math.sin(a * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const pick = <Tp>(arr: Tp[], a: number): Tp =>
    arr[Math.floor(rnd(a) * arr.length) % arr.length]!;

  const PER = 45;
  const HOLD = 17.5;
  const TRANS = 5;
  const DROP_H = 2.4;
  const ease = (t: number) => t * t * (3 - 2 * t);

  type PersonGroup = {
    Hs: Human[];
    seats: { A: [number, number, number]; B: [number, number, number] }[];
    ri: number;
    w: [number, number];
    elev: number;
    phase: number;
    rest: string;
    pairsA: [number, number][];
    pairsB: [number, number][];
    bedA: [number, number] | undefined;
    bedB: [number, number] | undefined;
  };

  const holdSeg = (
    uh: number,
    k: number,
    two: boolean,
    g: PersonGroup,
    key: "A" | "B",
    wp: [number, number],
    seed: number,
  ): PersonState => {
    const e = g.elev;
    const Mmid = HOLD / 2;
    const hw = WK / 2;
    const sOf = (idx: number) => g.seats[idx]![key];
    let s1: [number, number, number];
    let s2: [number, number, number];
    if (two) {
      const p1 = pick(key === "A" ? g.pairsA : g.pairsB, seed + 1);
      const p2 = pick(key === "A" ? g.pairsA : g.pairsB, seed + 2);
      s1 = sOf(p1[k]!);
      s2 = sOf(p2[k]!);
    } else {
      s1 = sOf(Math.floor(rnd(seed + 1) * g.seats.length));
      s2 = sOf(Math.floor(rnd(seed + 2.3) * g.seats.length));
    }
    const P1: [number, number] = [s1[0], s1[1]];
    const P2: [number, number] = [s2[0], s2[1]];
    if (uh < WK) return walkVia(e, wp, frontOf(s1), P1, uh / WK);
    if (uh < Mmid - hw)
      return { x: s1[0], z: s1[1], y: e + 0.4, face: sitFace(s1), pose: "sit" };
    if (uh < Mmid + hw)
      return walkVia(e, P1, frontOf(s2), P2, (uh - (Mmid - hw)) / WK);
    if (uh < HOLD - WK)
      return { x: s2[0], z: s2[1], y: e + 0.4, face: sitFace(s2), pose: "sit" };
    return walkVia(e, P2, frontOf(s2), wp, (uh - (HOLD - WK)) / WK);
  };
  const holdLie = (
    uh: number,
    k: number,
    _two: boolean,
    g: PersonGroup,
    key: "A" | "B",
    wp: [number, number],
    _seed: number,
  ): PersonState => {
    void _seed;
    const e = g.elev;
    const bed = (key === "A" ? g.bedA : g.bedB) ?? [0, 0];
    const spot: [number, number] = [bed[0], bed[1] + (k ? 0.4 : -0.4)];
    const ap: [number, number] = [spot[0] + 0.8, spot[1]];
    if (uh < WK) return walkVia(e, wp, ap, spot, uh / WK);
    if (uh < HOLD - WK)
      return { x: spot[0], z: spot[1], y: e, face: Math.PI / 2, pose: "lie" };
    return walkVia(e, spot, ap, wp, (uh - (HOLD - WK)) / WK);
  };
  const planPerson = (
    u: number,
    k: number,
    g: PersonGroup,
    cyc: number,
  ): PersonState => {
    const two = g.Hs.length === 2;
    const wp: [number, number] = [
      g.w[0] + (two ? (k ? 0.6 : -0.6) : 0),
      g.w[1],
    ];
    const stand = (): PersonState => ({
      x: wp[0],
      z: wp[1],
      y: g.elev + 0.44,
      face: faceTo(wp[0], wp[1], g.w[0], g.w[1] + 0.01),
      pose: "stand",
    });
    const nap = g.rest === "lie";
    const segA = nap ? holdLie : holdSeg;
    const segB = holdSeg;
    const sd = g.phase * 3.7 + k * 1.7 + cyc * 5.3;
    if (u < HOLD) return segA(u, k, two, g, "A", wp, sd);
    if (u < HOLD + TRANS) return stand();
    if (u < 2 * HOLD + TRANS)
      return segB(u - (HOLD + TRANS), k, two, g, "B", wp, sd + 99);
    return stand();
  };

  const COUNT = [2, 1, 2, 2, 1];
  const REST = ["sit", "sit", "sit", "lie", "sit"];
  const mkPairs = (
    arr: { A: [number, number, number]; B: [number, number, number] }[],
    key: "A" | "B",
  ): [number, number][] => {
    const L = arr.map((s) => ({
      p: [s[key][0], s[key][1]] as [number, number],
      r: s[key][2],
    }));
    const front = (r: number): [number, number] => [-Math.sin(r), Math.cos(r)];
    const out: [number, number][] = [];
    for (let i = 0; i < L.length; i++)
      for (let j = i + 1; j < L.length; j++) {
        const a = L[i]!;
        const b = L[j]!;
        const dx = b.p[0] - a.p[0];
        const dz = b.p[1] - a.p[1];
        const d = Math.hypot(dx, dz) || 1e-3;
        let dA = Math.abs(a.r - b.r) % (2 * Math.PI);
        if (dA > Math.PI) dA = 2 * Math.PI - dA;
        if (d > 0.45 && d < 0.95 && dA < 0.6) {
          out.push([i, j]);
          continue;
        }
        const fa = front(a.r);
        const fb = front(b.r);
        if (
          d > 0.8 &&
          d < 2.6 &&
          (dx * fa[0] + dz * fa[1]) / d > 0.5 &&
          (-dx * fb[0] - dz * fb[1]) / d > 0.5
        )
          out.push([i, j]);
      }
    if (!out.length) out.push(L.length >= 2 ? [0, 1] : [0, 0]);
    return out;
  };
  const grp: PersonGroup[] = [];
  const BED: Record<number, { A: [number, number]; B: [number, number] }> = {
    3: { A: [-6.3, -2.5], B: [-2.2, -2.5] },
  };
  const KINDS = [
    "coffee",
    "smile",
    "chat",
    "type",
    "heart",
    "smile",
    "coffee",
    "chat",
    "type",
    "smile",
  ];
  let pidx = 0;
  seats.forEach((arr, ri) => {
    if (!arr || !arr.length) return;
    const n = Math.min(COUNT[ri]!, Math.max(1, arr.length));
    const Hs: Human[] = [];
    for (let k = 0; k < n; k++) {
      const H = buildHuman(PCOL[(ri + k * 2) % 5]!);
      const pv = new THREE.Group();
      pv.add(H.g);
      house.add(pv);
      H.pv = pv;
      attachEmote(H, KINDS[pidx++ % KINDS.length]!);
      Hs.push(H);
    }
    const bd = BED[ri];
    const g: PersonGroup = {
      Hs,
      seats: arr,
      ri,
      w: RCEN[ri]!,
      elev: ROOMS[ri]!.elev,
      phase: ROOMS[ri]!.phase,
      rest: REST[ri]!,
      pairsA: mkPairs(arr, "A"),
      pairsB: mkPairs(arr, "B"),
      bedA: bd && bd.A,
      bedB: bd && bd.B,
    };
    Hs.forEach((H, kk) => {
      const s0 = arr[Math.min(kk, arr.length - 1)]!.A;
      H.pv.position.set(s0[0], g.elev + 0.4, s0[1]);
      setPose(H, "sit", 0);
    });
    grp.push(g);
  });

  function sched(clock: number, phase: number) {
    let u = (((clock + phase) % PER) + PER) % PER;
    if (u < HOLD) return { s: 0, p: 0, moving: false };
    u -= HOLD;
    if (u < TRANS) {
      const p = u / TRANS;
      return { s: ease(p), p, moving: true };
    }
    u -= TRANS;
    if (u < HOLD) return { s: 1, p: 0, moving: false };
    u -= HOLD;
    const p = u / TRANS;
    return { s: 1 - ease(p), p, moving: true };
  }

  house.position.set(-0.5, 0, -1.0);

  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.ShadowMaterial({ opacity: 0.62, color: 0x5a2410 }),
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = BASE;
  catcher.receiveShadow = !testMode;
  pivot.add(catcher);

  scene.add(new THREE.HemisphereLight(0xffdcb8, 0xe6a878, 0.25));
  scene.add(new THREE.AmbientLight(0xffd5a2, 0.05));
  const key = new THREE.DirectionalLight(0xffc987, 1.05);
  key.position.set(8, 20, 11);
  key.castShadow = !testMode;
  if (!testMode) {
    key.shadow.mapSize.set(4096, 4096);
  }
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 120;
  key.shadow.radius = 1.4;
  key.shadow.blurSamples = 8;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  const sb = 28;
  key.shadow.camera.left = -sb;
  key.shadow.camera.right = sb;
  key.shadow.camera.top = sb;
  key.shadow.camera.bottom = -sb;
  scene.add(key);

  const lampPos: [number, number, number][] = [
    [-4.25, 1.9, 2.5],
    [2.0, 3.2, 1.75],
    [4.75, 2.2, -2.5],
    [-4.25, 4.4, -1.75],
    [7.0, 2.2, 2.5],
  ];
  lampPos.forEach((p, i) => {
    const L = new THREE.PointLight(PAL[i]!.lamp, 2.6, 8, 2);
    L.position.set(p[0], p[1], p[2]);
    house.add(L);
  });

  const R = 18;
  const TY = 1.4;
  const Rc = 60;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  let theta = 5.59;
  let phi = 1.06;
  const PHI_MIN = 0.05;
  const PHI_MAX = Math.PI / 2 - 0.02;
  const Tgoal = new THREE.Vector3(0, TY, 0);
  const Tcur = new THREE.Vector3(0, TY, 0);
  const _wpA = new THREE.Vector3();
  const _wpB = new THREE.Vector3();
  const placeCam = () => {
    const sf = Math.sin(phi);
    const cf = Math.cos(phi);
    const dx = sf * Math.sin(theta);
    const dy = cf;
    const dz = sf * Math.cos(theta);
    camera.position.set(Tcur.x + Rc * dx, Tcur.y + Rc * dy, Tcur.z + Rc * dz);
    let ux = -dy * dx;
    let uy = 1 - dy * dy;
    let uz = -dy * dz;
    const ul = Math.hypot(ux, uy, uz);
    if (ul < 1e-4) {
      ux = -Math.sin(theta);
      uy = 0;
      uz = -Math.cos(theta);
    } else {
      ux /= ul;
      uy /= ul;
      uz /= ul;
    }
    camera.up.set(ux, uy, uz);
    camera.lookAt(Tcur);
  };
  function fit() {
    const a = width / height;
    const f = a >= 1 ? 2 * R : (2 * R) / a;
    camera.left = (-f * a) / 2;
    camera.right = (f * a) / 2;
    camera.top = f / 2;
    camera.bottom = -f / 2;
    camera.updateProjectionMatrix();
  }
  fit();
  const OVERVIEW_ZOOM = 4.0;
  const ROOM_ZOOM = 6.5;
  const MIN_ZOOM = OVERVIEW_ZOOM * 0.85;
  let zoomGoal = OVERVIEW_ZOOM;
  camera.zoom = OVERVIEW_ZOOM;
  placeCam();
  camera.updateProjectionMatrix();

  const skipOpening = skipIntro;
  /* Keep room labels still during CI interaction tests. */
  let auto = !testMode;
  const el = renderer.domElement;
  let focusRoom: number | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let lx = 0;
  let ly = 0;
  let pinchDist = 0;
  let moved = 0;
  let panMid: { x: number; y: number } | null = null;
  const panOffset = new THREE.Vector3();
  const setZoomGoal = (z: number) => {
    zoomGoal = Math.min(7.5, Math.max(MIN_ZOOM, z));
  };
  const panBy = (dpx: number, dpy: number) => {
    camera.updateMatrixWorld();
    const wppx = (camera.right - camera.left) / camera.zoom / width;
    const wppy = (camera.top - camera.bottom) / camera.zoom / height;
    const e = camera.matrixWorld.elements;
    const sx = -dpx * wppx;
    const sy = dpy * wppy;
    const mx = e[0]! * sx + e[4]! * sy;
    const my = e[1]! * sx + e[5]! * sy;
    const mz = e[2]! * sx + e[6]! * sy;
    panOffset.x += mx;
    panOffset.y += my;
    panOffset.z += mz;
    Tcur.x += mx;
    Tcur.y += my;
    Tcur.z += mz;
  };
  const dn = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    auto = false;
    el.setPointerCapture?.(e.pointerId);
    el.style.cursor = "grabbing";
    if (pointers.size === 1) {
      lx = e.clientX;
      ly = e.clientY;
      moved = 0;
    }
    if (pointers.size === 2) {
      const p = [...pointers.values()];
      const p0 = p[0]!;
      const p1 = p[1]!;
      pinchDist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
      panMid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    }
  };
  const mv = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      theta -= dx * 0.006;
      phi = Math.min(PHI_MAX, Math.max(PHI_MIN, phi - dy * 0.006));
    } else if (pointers.size === 2) {
      const p = [...pointers.values()];
      const p0 = p[0]!;
      const p1 = p[1]!;
      const d = Math.hypot(p0.x - p1.x, p0.y - p1.y);
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      if (pinchDist > 0) setZoomGoal(zoomGoal * (d / pinchDist));
      if (panMid) panBy(cx - panMid.x, cy - panMid.y);
      pinchDist = d;
      panMid = { x: cx, y: cy };
    }
  };
  const up = (e: PointerEvent) => {
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    el.releasePointerCapture?.(e.pointerId);
    if (pointers.size < 2) panMid = null;
    if (pointers.size === 0) {
      el.style.cursor = "grab";
      if (wasSingle && moved < 6 && focusRoom != null) {
        focusRoom = null;
        zoomGoal = OVERVIEW_ZOOM;
        panOffset.set(0, 0, 0);
      }
      if (focusRoom == null) auto = !testMode;
    } else if (pointers.size === 1) {
      const q = [...pointers.values()][0]!;
      lx = q.x;
      ly = q.y;
    }
  };
  const wheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoomGoal(zoomGoal * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  };
  el.addEventListener("pointerdown", dn);
  el.addEventListener("pointermove", mv);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("pointerleave", up);
  el.addEventListener("wheel", wheel, { passive: false });

  /** Set after paintFrame exists — used by ResizeObserver in testMode. */
  let demandRender: (() => void) | null = null;

  const ro = new ResizeObserver(() => {
    width = mount.clientWidth;
    height = mount.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    fit();
    options.onResize?.(renderer.domElement.width, renderer.domElement.height);
    if (testMode) demandRender?.();
  });
  ro.observe(mount);

  const roomVT = ROOMS.map((r) => r.phase);
  const lblV = new THREE.Vector3();
  let lastT = performance.now() / 1000;

  // ── opening sequence ─────────────────────────────────────────
  introStruct.forEach((s) => {
    let bi = 0;
    let bd = Infinity;
    RCEN.forEach((c, i) => {
      const d = (s.x - c[0]) ** 2 + (s.z - c[1]) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    s.ri = bi;
  });
  const FAR_ZOOM = OVERVIEW_ZOOM * 0.24;
  const DROP_ROOM = 9;
  const DROP_FURN = 5;
  const R_FALL = 1.05;
  const F_FALL = 0.85;
  const ROOM_ORDER = [3, 2, 1, 0, 4];
  const roomStart: Record<number, number> = {};
  ROOM_ORDER.forEach((ri, i) => {
    roomStart[ri] = i * 0.24;
  });

  const TOUR_ORDER = [0, 1, 4, 3, 2];
  const TOUR_POSE = [
    { th: 5.85, ph: 1.08 },
    { th: 5.45, ph: 0.84 },
    { th: 5.05, ph: 1.0 },
    { th: 4.7, ph: 0.82 },
    { th: 6.15, ph: 1.2 },
  ];
  const _endRi = TOUR_ORDER[TOUR_ORDER.length - 1]!;
  const END_THETA = Math.atan2(RCEN[_endRi]![0], RCEN[_endRi]![1]);
  const PUSH_DUR = 5.0;
  const TITLE_REVEAL_T = 2.2;
  const HOLD_DUR = 1.6;
  const MOVE_DUR = 0.85;
  const RET_DUR = 2.6;
  const DRIFT_FRAC = 0.2;
  const TN = TOUR_ORDER.length;
  const vHold = DRIFT_FRAC / HOLD_DUR;
  const hermite = (s: number, m0: number, m1: number) => {
    const s2 = s * s;
    const s3 = s2 * s;
    return -2 * s3 + 3 * s2 + m0 * (s3 - 2 * s2 + s) + m1 * (s3 - s2);
  };
  type Phase = {
    t0: number;
    dur: number;
    a: number;
    b: number;
    f0: number;
    f1: number;
    kind: string;
    m0?: number;
    m1?: number;
  };
  const PH: Phase[] = [];
  let _t = 0;
  PH.push({
    t0: 0,
    dur: PUSH_DUR,
    a: 0,
    b: 1,
    f0: 0,
    f1: 1,
    kind: "push",
    m0: 0,
    m1: vHold * PUSH_DUR,
  });
  _t = PUSH_DUR;
  for (let r = 1; r <= TN; r++) {
    PH.push({
      t0: _t,
      dur: HOLD_DUR,
      a: r,
      b: r + 1,
      f0: 0,
      f1: DRIFT_FRAC,
      kind: "hold",
    });
    _t += HOLD_DUR;
    const last = r === TN;
    const dur = last ? RET_DUR : MOVE_DUR;
    const m = (vHold * dur) / (1 - DRIFT_FRAC);
    PH.push({
      t0: _t,
      dur,
      a: r,
      b: r + 1,
      f0: DRIFT_FRAC,
      f1: 1,
      kind: last ? "return" : "move",
      m0: m,
      m1: m,
    });
    _t += dur;
  }
  const OPEN_DUR = _t;

  const roomArriveT: Record<number, number> = {};
  PH.forEach((p) => {
    if (p.kind === "hold") roomArriveT[TOUR_ORDER[p.a - 1]!] = p.t0;
  });
  const LAND_LEAD = 0.35;
  const roomLandT: Record<number, number> = {};
  TOUR_ORDER.forEach((ri) => {
    roomLandT[ri] = roomArriveT[ri]! - LAND_LEAD;
  });
  const furnStart = (o: AnimPiece) => roomLandT[o.ri]! - F_FALL + o.lp * 0.22;
  const pplStart = (g: PersonGroup) => roomLandT[g.ri]! - F_FALL + 0.1;
  const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const gravFall = (p: number) => 1 - p * p;
  let introStart: number | null = null;
  let introFired = false;
  let openingCompleteFired = false;
  let tourTheta0: number | null = null;
  let tourPhi0 = 0;
  let dropDone = skipOpening;
  let firstFrameFired = false;
  let freezeFrames = 0;

  const captureFreeze = () => {
    if (testMode) return;
    saveLandingFreezeFromCanvas(renderer.domElement);
  };

  let paused = false;
  const focusReqRef: { current: number | "overview" | null } = {
    current: null,
  };

  const labelRenderStates = ROOMS.map(() => ({
    display: "",
    opacity: "",
    transform: "",
    roomVisible: "",
  }));

  function updateLabelStyle(
    roomIndex: number,
    element: HTMLElement,
    next: {
      display: string;
      opacity: string;
      transform: string;
      roomVisible: string;
    },
  ) {
    const current = labelRenderStates[roomIndex]!;

    if (current.display !== next.display) {
      element.style.display = next.display;
      current.display = next.display;
    }

    if (current.opacity !== next.opacity) {
      element.style.opacity = next.opacity;
      current.opacity = next.opacity;
    }

    if (current.transform !== next.transform) {
      element.style.transform = next.transform;
      current.transform = next.transform;
    }

    if (current.roomVisible !== next.roomVisible) {
      element.dataset.roomVisible = next.roomVisible;
      current.roomVisible = next.roomVisible;
    }
  }

  const renderLoop = () => {
    // Pause WebGL while the page is scrolling so paint stays smooth.
    // Opening stays full-rate so the title/hero handoff never stalls.
    if (landingScroll.active && introFired) {
      return;
    }
    const now = performance.now() / 1000;
    let dt = now - lastT;
    lastT = now;
    if (dt > 0.1) dt = 0.1;

    if (introStart == null) introStart = now;
    const introE = now - introStart;
    const inIntro = !skipOpening && introE < OPEN_DUR;
    if (!introFired && (skipOpening || introE >= TITLE_REVEAL_T)) {
      introFired = true;
      options.onIntroDone?.();
    }
    if (!openingCompleteFired && (skipOpening || !inIntro)) {
      openingCompleteFired = true;
      options.onOpeningComplete?.();
    }
    if (!inIntro && !dropDone) {
      dropDone = true;
      for (const s of introStruct) {
        s.mesh.visible = true;
        s.mesh.position.y = s.baseY;
      }
      for (const o of animPieces) o.mesh.visible = true;
      for (const g of grp) g.Hs.forEach((H) => (H.pv.visible = true));
    }

    const req = focusReqRef.current;
    if (req != null) {
      if (req === "overview") {
        focusRoom = null;
        zoomGoal = OVERVIEW_ZOOM;
        panOffset.set(0, 0, 0);
        auto = !testMode;
      } else {
        focusRoom = focusRoom === req ? null : req;
        zoomGoal = focusRoom == null ? OVERVIEW_ZOOM : ROOM_ZOOM;
        panOffset.set(0, 0, 0);
        if (focusRoom != null) auto = false;
      }
      focusReqRef.current = null;
    }

    if (auto && !paused && focusRoom == null && !inIntro) {
      theta += 0.0011;
    }
    if (!testMode && !paused) {
      for (let ri = 0; ri < ROOMS.length; ri++) roomVT[ri]! += dt;
      for (const g of grp) {
        const pt = roomVT[g.ri]!;
        const u = ((pt % PER) + PER) % PER;
        const cyc = Math.max(0, Math.floor(pt / PER));
        const rs = g.Hs.map((_H, k) => planPerson(u, k, g, cyc));
        g.Hs.forEach((H, k) => {
          const r = rs[k]!;
          const pose = r.pose;
          let yy = r.y;
          let rx = 0;
          if (pose === "lie") {
            rx = -Math.PI / 2;
            yy = g.elev + 0.44;
          }
          let heading = r.face;
          let hx = Math.sin(pt * 0.9 + k) * 0.05;
          let hy = Math.sin(pt * 0.7 + k) * 0.2;
          const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
          if (g.Hs.length === 2 && pose === "sit") {
            const o = rs[1 - k]!;
            const toO = Math.atan2(o.x - r.x, o.z - r.z);
            const turn = Math.max(-0.9, Math.min(0.9, wrap(toO - r.face)));
            heading = r.face + turn * 0.5;
            hx = -0.05;
            hy =
              Math.max(-1.05, Math.min(1.05, wrap(toO - heading))) +
              Math.sin(pt * 1.7 + k) * 0.05;
          } else if (g.Hs.length === 2 && pose === "lie") {
            const o = rs[1 - k]!;
            hy =
              Math.max(
                -1.0,
                Math.min(1.0, wrap(Math.atan2(o.x - r.x, o.z - r.z) - r.face)),
              ) * 0.85;
          }
          H.pv.position.set(
            r.x,
            yy + (pose === "walk" ? Math.abs(Math.sin(pt * 9 + k)) * 0.02 : 0),
            r.z,
          );
          H.pv.rotation.y = heading;
          H.g.rotation.x = rx;
          setPose(H, pose, pt * 9 + k * 1.3);
          H.head.rotation.set(hx, hy, 0);
          if (H.kind === "type" && (pose === "sit" || pose === "lie")) {
            const tp = Math.sin(pt * 13 + k) * 0.16;
            H.armL.rotation.x = -1.15 + tp;
            H.armR.rotation.x = -1.15 - tp;
          }
          if (H.emote) {
            const vis =
              pose === "walk" ? 0 : Math.sin(pt * 0.5 + k * 2) > 0.1 ? 1 : 0;
            H.emote.material.opacity += (vis - H.emote.material.opacity) * 0.07;
            const ph = pt * 2.2 + k;
            const drift = H.kind === "coffee" ? 0.05 : 0.03;
            H.emote.position.y = 1.04 + Math.sin(ph) * drift;
            const sc = 0.5 + 0.045 * Math.sin(ph * 1.3);
            H.emote.scale.set(sc, sc, sc);
          }
        });
      }
      for (const o of animPieces) {
        const { s, p, moving } = sched(roomVT[o.ri]!, o.lp);
        o.mesh.position.x = o.A[0] + (o.B[0] - o.A[0]) * s;
        o.mesh.position.z = o.A[1] + (o.B[1] - o.A[1]) * s;
        o.mesh.rotation.y = o.A[2] + o.dr * s;
        if (moving) {
          let h: number;
          let sy = 1;
          if (p < 0.4) {
            const q = p / 0.4;
            h = DROP_H * (1 - (1 - q) * (1 - q));
          } else {
            const fp = (p - 0.4) / 0.6;
            h = DROP_H * (1 - fp * fp);
            if (fp > 0.82)
              sy = 1 - 0.06 * Math.sin(((fp - 0.82) / 0.18) * Math.PI);
          }
          o.mesh.position.y = o.baseY + h;
          o.mesh.scale.y = sy;
        } else {
          o.mesh.position.y = o.baseY;
          o.mesh.scale.y = 1;
        }
      }
      if (inIntro) {
        for (const s of introStruct) {
          const st = roomStart[s.ri] || 0;
          const p = clamp01((introE - st) / R_FALL);
          s.mesh.visible = introE >= st;
          s.mesh.position.y = s.baseY + DROP_ROOM * gravFall(p);
        }
        for (const o of animPieces) {
          const st = furnStart(o);
          const p = clamp01((introE - st) / F_FALL);
          o.mesh.visible = introE >= st;
          o.mesh.position.y += DROP_FURN * gravFall(p);
        }
        for (const g of grp) {
          const st = pplStart(g);
          const p = clamp01((introE - st) / F_FALL);
          const off = DROP_FURN * gravFall(p);
          g.Hs.forEach((H) => {
            H.pv.visible = introE >= st;
            H.pv.position.y += off;
          });
        }
      }
    }

    if (inIntro) {
      if (tourTheta0 == null) {
        tourTheta0 = theta;
        tourPhi0 = phi;
      }
      const N = TOUR_ORDER.length;
      const lerpAng = (a: number, b: number, t: number) => {
        let d = b - a;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return a + d * t;
      };
      const pose = (i: number) =>
        i <= 0
          ? {
              ri: null as number | null,
              th: tourTheta0!,
              ph: tourPhi0,
              z: FAR_ZOOM,
            }
          : i > N
            ? {
                ri: null as number | null,
                th: END_THETA,
                ph: tourPhi0,
                z: OVERVIEW_ZOOM,
              }
            : {
                ri: TOUR_ORDER[i - 1]! as number | null,
                th: TOUR_POSE[TOUR_ORDER[i - 1]!]!.th,
                ph: TOUR_POSE[TOUR_ORDER[i - 1]!]!.ph,
                z: ROOM_ZOOM,
              };
      let ph = PH[0]!;
      for (let pi = 0; pi < PH.length; pi++) {
        if (introE >= PH[pi]!.t0) ph = PH[pi]!;
        else break;
      }
      const lt = clamp01((introE - ph.t0) / ph.dur);
      const e = ph.kind === "hold" ? lt : hermite(lt, ph.m0 ?? 0, ph.m1 ?? 0);
      const frac = ph.f0 + (ph.f1 - ph.f0) * e;
      const pf = pose(ph.a);
      const pt = pose(ph.b);
      const toTh =
        ph.kind === "return" ? END_THETA + 0.066 * (introE - ph.t0) : pt.th;
      const wp = (out: THREE.Vector3, ri: number | null) =>
        ri == null
          ? out.set(0, TY, 0)
          : out
              .set(RCEN[ri]![0], ROOMS[ri]!.elev + 0.7, RCEN[ri]![1])
              .applyMatrix4(house.matrixWorld);
      wp(_wpA, pf.ri);
      wp(_wpB, pt.ri);
      Tcur.copy(_wpA).lerp(_wpB, frac).add(panOffset);
      theta = lerpAng(pf.th, toTh, frac);
      phi = pf.ph + (pt.ph - pf.ph) * frac;
      camera.zoom = pf.z + (pt.z - pf.z) * frac;
    } else {
      if (focusRoom == null) Tgoal.set(0, TY, 0);
      else
        Tgoal.set(
          RCEN[focusRoom]![0],
          ROOMS[focusRoom]!.elev + 0.7,
          RCEN[focusRoom]![1],
        ).applyMatrix4(house.matrixWorld);
      Tgoal.add(panOffset);
      // While paused, freeze the camera entirely so projected room labels stay
      // put for real pointer hit-testing. Focus/zoom goals still update; the
      // fly-to resumes when the user hits Resume.
      if (!paused) {
        Tcur.lerp(Tgoal, 0.09);
        camera.zoom += (zoomGoal - camera.zoom) * 0.12;
      }
    }

    {
      const cull = phi > 0.6;
      const cdx = Math.sin(theta);
      const cdz = Math.cos(theta);
      for (let i = 0; i < wallList.length; i++) {
        const w = wallList[i]!;
        w.mesh.visible = !(cull && w.nx! * cdx + w.nz! * cdz > 0);
      }
    }
    camera.updateProjectionMatrix();
    placeCam();

    renderer.render(scene, camera);
    if (!firstFrameFired) {
      firstFrameFired = true;
      options.onFirstFrame?.();
    } else {
      freezeFrames += 1;
      if (freezeFrames === 90 || freezeFrames % 120 === 0) captureFreeze();
    }
    if (testMode) return;

    for (let ri = 0; ri < ROOMS.length; ri++) {
      const labelEl = getLabelEl(ri);
      if (!labelEl) continue;
      lblV
        .set(RCEN[ri]![0], ROOMS[ri]!.elev + 2.7, RCEN[ri]![1])
        .applyMatrix4(house.matrixWorld)
        .project(camera);
      const px = lblV.x * 0.5 + 0.5;
      const py = -lblV.y * 0.5 + 0.5;
      const onScreen =
        lblV.z < 1 &&
        px > 0.01 &&
        px < 0.99 &&
        // Keep floating room labels out of the title lockup band at the top of
        // the extended hero stage (matches the settled reference framing).
        py > 0.2 &&
        py < 0.99;
      let vis: number;
      if (inIntro) {
        const t0 = roomArriveT[ri];
        vis = t0 == null ? 0 : clamp01((introE - t0) / 0.55);
      } else vis = 1;
      const show = onScreen && vis > 0.001;
      if (show) {
        const eased = vis < 1 ? 1 - Math.pow(1 - vis, 3) : 1;
        const slide = (1 - eased) * 14;
        updateLabelStyle(ri, labelEl, {
          display: "flex",
          opacity: String(eased),
          transform:
            `translate(-50%,-50%) ` +
            `translate(${px * width}px,${py * height + slide}px)`,
          roomVisible: "true",
        });
      } else {
        updateLabelStyle(ri, labelEl, {
          display: "none",
          opacity: "0",
          transform: labelRenderStates[ri]!.transform,
          roomVisible: "false",
        });
      }
    }
  };

  function paintFrame() {
    house.updateMatrixWorld(true);
    {
      const cull = phi > 0.6;
      const cdx = Math.sin(theta);
      const cdz = Math.cos(theta);
      for (let i = 0; i < wallList.length; i++) {
        const w = wallList[i]!;
        w.mesh.visible = !(cull && w.nx! * cdx + w.nz! * cdz > 0);
      }
    }
    camera.updateProjectionMatrix();
    placeCam();
    renderer.render(scene, camera);
    if (!firstFrameFired) {
      firstFrameFired = true;
      options.onFirstFrame?.();
    }
  }

  function settleToRoom(roomIndex: number) {
    focusRoom = roomIndex;
    zoomGoal = ROOM_ZOOM;
    panOffset.set(0, 0, 0);
    auto = false;
    house.updateMatrixWorld(true);
    Tcur.set(
      RCEN[roomIndex]![0],
      ROOMS[roomIndex]!.elev + 0.7,
      RCEN[roomIndex]![1],
    ).applyMatrix4(house.matrixWorld);
    camera.zoom = ROOM_ZOOM;
  }

  function settleToOverview() {
    focusRoom = null;
    zoomGoal = OVERVIEW_ZOOM;
    panOffset.set(0, 0, 0);
    auto = !testMode;
    Tcur.set(0, TY, 0);
    camera.zoom = OVERVIEW_ZOOM;
  }

  demandRender = () => paintFrame();

  if (testMode) {
    /* Demand-driven: one settled frame, then stop the continuous loop. */
    introFired = true;
    openingCompleteFired = true;
    dropDone = true;
    for (const s of introStruct) {
      s.mesh.visible = true;
      s.mesh.position.y = s.baseY;
    }
    for (const o of animPieces) o.mesh.visible = true;
    for (const g of grp) g.Hs.forEach((H) => (H.pv.visible = true));
    settleToOverview();
    paintFrame();
    options.onIntroDone?.();
    options.onOpeningComplete?.();
    renderer.setAnimationLoop(null);
  } else {
    renderer.setAnimationLoop(renderLoop);
  }

  let onScreen = true;
  const syncLoop = () => {
    if (testMode) {
      renderer.setAnimationLoop(null);
      return;
    }
    const shouldRun = !paused && !document.hidden && (!introFired || onScreen);
    renderer.setAnimationLoop(shouldRun ? renderLoop : null);
  };
  const visIO = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (!e || e.isIntersecting === onScreen) return;
      onScreen = e.isIntersecting;
      syncLoop();
    },
    { threshold: 0, rootMargin: "200px 0px" },
  );
  visIO.observe(mount);
  const onVisibility = () => {
    if (document.hidden) captureFreeze();
    syncLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", captureFreeze);
  const onCtxRestored = () => {
    if (lostTimer) {
      window.clearTimeout(lostTimer);
      lostTimer = 0;
    }
    try {
      if (testMode) {
        paintFrame();
      } else {
        syncLoop();
      }
    } catch (error) {
      console.error("[LandingHero] WebGL restoration failed.", error);
      options.onGlFailed?.();
    }
  };
  renderer.domElement.addEventListener(
    "webglcontextrestored",
    onCtxRestored,
    false,
  );

  const dispose = () => {
    captureFreeze();
    if (lostTimer) window.clearTimeout(lostTimer);
    renderer.setAnimationLoop(null);
    demandRender = null;
    visIO.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", captureFreeze);
    renderer.domElement.removeEventListener(
      "webglcontextrestored",
      onCtxRestored,
    );
    ro.disconnect();
    el.removeEventListener("pointerdown", dn);
    el.removeEventListener("pointermove", mv);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.removeEventListener("pointerleave", up);
    el.removeEventListener("wheel", wheel);
    renderer.domElement.removeEventListener("webglcontextlost", onCtxLost);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((m) => m && m.dispose());
    });
    [texFabric, texPlaster, texWood, texWall, ...emoteTextures].forEach((t) => {
      if (t && t.dispose) t.dispose();
    });
    if (scene.environment && scene.environment.dispose)
      scene.environment.dispose();
    renderer.dispose();
    // Do not call forceContextLoss() here. Rapid remounts (E2E, route-away)
    // need a healthy WebGL context; lose-context + recreate exhausts the
    // browser GPU budget on Chromium and leaves HouseFallback stuck.
    if (el.parentNode) el.parentNode.removeChild(el);
  };

  return {
    dispose,
    setPaused: (p: boolean) => {
      paused = p;
      if (testMode) {
        paintFrame();
        return;
      }
      if (p) paintFrame();
      syncLoop();
    },
    focusRoom: (roomIndex: number) => {
      if (testMode) {
        settleToRoom(roomIndex);
        paintFrame();
      } else {
        focusReqRef.current = roomIndex;
      }
    },
    showOverview: () => {
      if (testMode) {
        settleToOverview();
        paintFrame();
      } else {
        focusReqRef.current = "overview";
      }
    },
    renderOnce: () => {
      paintFrame();
    },
  };
}
