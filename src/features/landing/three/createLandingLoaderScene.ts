import * as THREE from "three-landing";
import { createLandingRenderer } from "./createLandingRenderer";
import { disposeLandingScene } from "./disposeLandingScene";
import {
  createLoopPoints,
  createRoundedBoxGeometry,
  LOADER_PIECES,
  LOADER_TIMING,
  loaderColor,
  type LoaderPiece,
} from "./loader-geometry";
import type {
  LandingLoaderPhase,
  LandingLoaderSceneHandle,
} from "./landing-scene-types";

export type {
  LandingLoaderPhase,
  LandingLoaderSceneHandle,
} from "./landing-scene-types";

type LandingLoaderSceneOptions = {
  mount: HTMLElement;
  getReady: () => boolean;
  getPhase: () => LandingLoaderPhase;
  getSkip: () => boolean;
  onPct: (pct: number) => void;
  onLift: () => void;
  onRendererReleased: () => void;
};

type AnimPiece = {
  p: LoaderPiece;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  fromY: number;
  dropStart: number;
  started: boolean;
  t0: number;
  landedAt: number;
};

function makeGeometry(piece: LoaderPiece) {
  if (piece.type === "block") {
    return createRoundedBoxGeometry(piece.w, piece.h ?? 0.34, piece.d ?? 0.7);
  }
  return createRoundedBoxGeometry(piece.w, piece.h2 ?? 0.55, 0.16);
}

/**
 * Boots the loader WebGL scene. Caller must invoke `releaseRenderer` (or
 * `dispose`) before mounting the hero renderer — never two contexts at once.
 */
export function createLandingLoaderScene(
  options: LandingLoaderSceneOptions,
): LandingLoaderSceneHandle | null {
  const { mount } = options;
  let width = mount.clientWidth;
  let height = mount.clientHeight;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = createLandingRenderer();
  } catch (error) {
    console.warn("WebGL unavailable, skipping the loading animation.", error);
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.background = "transparent";

  const scene = new THREE.Scene();
  const VIEW = 5.6;
  const target = new THREE.Vector3(0.3, 0.42, 0.3);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position
    .copy(target)
    .add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(20));
  camera.lookAt(target);

  const setFrustum = () => {
    const aspect = width / height;
    camera.top = VIEW / 2;
    camera.bottom = -VIEW / 2;
    camera.left = (-VIEW * aspect) / 2;
    camera.right = (VIEW * aspect) / 2;
    camera.updateProjectionMatrix();
  };
  setFrustum();

  scene.add(
    new THREE.HemisphereLight(
      loaderColor("#ffe9d6"),
      loaderColor("#d24a10"),
      0.45,
    ),
  );
  const keyLight = new THREE.DirectionalLight(loaderColor("#ffeede"), 1.45);
  keyLight.position.set(4.5, 9, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.bias = -0.0012;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  scene.add(new THREE.AmbientLight(loaderColor("#ffceac"), 0.14));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.24 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const matOf = (hex: string) =>
    new THREE.MeshStandardMaterial({
      color: loaderColor(hex),
      roughness: 0.82,
      metalness: 0,
      transparent: true,
    });

  const pieceCount = LOADER_PIECES.length;
  const assemble = LOADER_TIMING.minMs * 0.88;
  const stagger =
    (assemble - LOADER_TIMING.dropMs) / Math.max(pieceCount - 1, 1);
  const baseDelay = 140;

  const anim: AnimPiece[] = LOADER_PIECES.map((piece, index) => {
    const mesh = new THREE.Mesh(makeGeometry(piece), matOf(piece.color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(piece.x, piece.y, piece.z);
    mesh.rotation.y = piece.rotY || 0;
    mesh.rotation.x = piece.rotX || 0;
    const fromY = piece.y + 5;
    mesh.position.y = fromY;
    mesh.visible = false;
    scene.add(mesh);
    return {
      p: piece,
      mesh,
      fromY,
      dropStart: baseDelay + index * stagger,
      started: false,
      t0: 0,
      landedAt: 0,
    };
  });

  const loopPts = createLoopPoints(-0.95, 1.3, -0.95, 1.3, 0.3, 0.03);
  const curve = new THREE.CatmullRomCurve3(loopPts, false);
  const tubeGeo = new THREE.TubeGeometry(curve, 280, 0.02, 7, false);
  const line = new THREE.Mesh(
    tubeGeo,
    new THREE.MeshBasicMaterial({
      color: loaderColor("#C2542A"),
      transparent: true,
    }),
  );
  line.renderOrder = 2;
  tubeGeo.setDrawRange(0, 0);
  scene.add(line);
  const indexCount = tubeGeo.index?.count ?? 0;

  const holeCenter = { cx: 0.175, cz: 0.175 };
  let raf = 0;
  let prog = 0;
  let lastPct = -1;
  let exitStart = 0;
  let released = false;
  const start = performance.now();
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 1.55);
  const fall = (t: number) => Math.min(1, t * t);

  const releaseRenderer = () => {
    if (released) return;
    released = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    disposeLandingScene(renderer, scene);
    options.onRendererReleased();
  };

  const onResize = () => {
    width = mount.clientWidth;
    height = mount.clientHeight;
    renderer.setSize(width, height);
    setFrustum();
  };
  window.addEventListener("resize", onResize);

  const loop = (now: number) => {
    const elapsed = now - start;
    const skip = options.getSkip();
    const done =
      skip || options.getReady() || elapsed > LOADER_TIMING.fallbackMs;
    const phase = options.getPhase();
    const exiting =
      phase === "exit" ||
      phase === "hold" ||
      phase === "wipe" ||
      phase === "gone";

    if (exiting) {
      if (exitStart === 0) exitStart = now;
      const te = now - exitStart;
      const lead = LOADER_TIMING.exitLeadMs;
      const tf = Math.max(0, te - lead);
      const hopMs = LOADER_TIMING.exitHopMs;
      const colMs = LOADER_TIMING.exitCollapseMs;
      const hopH = LOADER_TIMING.exitHopHeight;
      /* Punchier than cubic — hop pops up, collapse snaps into the hole. */
      const hopEase = (t: number) => 1 - Math.pow(1 - t, 2.4);
      const colEase = (t: number) => t * t * (2.4 - 1.4 * t);

      for (const a of anim) {
        if (tf < hopMs) {
          const u = hopEase(tf / hopMs);
          a.mesh.position.set(a.p.x, a.p.y + hopH * u, a.p.z);
          a.mesh.scale.setScalar(1 + 0.06 * u);
          a.mesh.material.opacity = 1;
        } else {
          const f = Math.min((tf - hopMs) / colMs, 1);
          const e = colEase(f);
          a.mesh.position.x = a.p.x + (holeCenter.cx - a.p.x) * e;
          a.mesh.position.z = a.p.z + (holeCenter.cz - a.p.z) * e;
          a.mesh.position.y = a.p.y + hopH * (1 - e) - 0.85 * f;
          a.mesh.scale.setScalar(Math.max(0, 1.06 * (1 - e)));
          a.mesh.material.opacity = Math.max(0, 1 - f * 1.35);
        }
      }

      const lf = Math.min(tf / (hopMs + colMs), 1);
      (line.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        1 - lf * lf,
      );
      renderer.render(scene, camera);
      if (phase === "gone" || released) return;
      raf = requestAnimationFrame(loop);
      return;
    }

    if (skip) prog += (1 - prog) * 0.3;
    else prog = easeOut(Math.min(elapsed / LOADER_TIMING.minMs, 1));
    if (prog > 0.9995) prog = 1;
    const cPct = Math.round(prog * 100);
    if (cPct !== lastPct) {
      lastPct = cPct;
      options.onPct(cPct);
    }
    tubeGeo.setDrawRange(0, Math.floor(prog * indexCount));

    let allLanded = true;
    for (const a of anim) {
      if (!a.started && (skip || elapsed >= a.dropStart)) {
        a.started = true;
        a.t0 = now;
        a.mesh.visible = true;
      }
      if (!a.started) allLanded = false;
      if (a.started && a.landedAt === 0) {
        if (skip) {
          a.mesh.position.y = a.p.y;
          a.landedAt = now;
        } else {
          const t = (now - a.t0) / LOADER_TIMING.dropMs;
          if (t >= 1) {
            a.mesh.position.y = a.p.y;
            a.landedAt = now;
          } else {
            a.mesh.position.y = a.fromY + (a.p.y - a.fromY) * fall(t);
            allLanded = false;
          }
        }
      }
      if (a.landedAt) {
        const s = (now - a.landedAt) / 150;
        if (s < 1) {
          const sq = 1 - Math.sin(s * Math.PI) * 0.12;
          a.mesh.scale.set(2 - sq, sq, 2 - sq);
        } else if (a.mesh.scale.y !== 1) {
          a.mesh.scale.set(1, 1, 1);
        }
      }
    }

    renderer.render(scene, camera);
    if (prog >= 1 && allLanded && done && phase === "run") {
      options.onLift();
    }
    if (released || options.getPhase() === "gone") return;
    raf = requestAnimationFrame(loop);
  };

  raf = requestAnimationFrame(loop);

  return {
    releaseRenderer,
    dispose: () => {
      if (!released) releaseRenderer();
    },
  };
}
