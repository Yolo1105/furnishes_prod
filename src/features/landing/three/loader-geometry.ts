import * as THREE from "three-landing";

const LOADER_BONE = "#EBDABA";
const LOADER_OCHRE = "#F2521F";

const CELL = 0.72;

export type LoaderPiece = {
  id: string;
  type: "block" | "back";
  w: number;
  h?: number;
  h2?: number;
  d?: number;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  rotX?: number;
  color: string;
};

export const LOADER_PIECES: readonly LoaderPiece[] = [
  {
    id: "A",
    type: "block",
    w: 0.7,
    h: 0.34,
    d: 0.7,
    x: 0,
    y: 0.17,
    z: 0,
    color: LOADER_BONE,
  },
  {
    id: "B",
    type: "block",
    w: 0.7,
    h: 0.34,
    d: 0.7,
    x: CELL,
    y: 0.17,
    z: 0,
    color: LOADER_OCHRE,
  },
  {
    id: "C",
    type: "block",
    w: 0.7,
    h: 0.34,
    d: 0.7,
    x: 0,
    y: 0.17,
    z: CELL,
    color: LOADER_OCHRE,
  },
  {
    id: "D",
    type: "block",
    w: 0.7,
    h: 0.34,
    d: 0.7,
    x: CELL,
    y: 0.17,
    z: CELL,
    color: LOADER_BONE,
  },
  {
    id: "bAz",
    type: "back",
    w: 0.7,
    x: 0,
    y: 0.3,
    z: -0.43,
    rotY: 0,
    color: LOADER_OCHRE,
  },
  {
    id: "bBz",
    type: "back",
    w: 0.7,
    x: CELL,
    y: 0.3,
    z: -0.43,
    rotY: 0,
    color: LOADER_BONE,
  },
  {
    id: "bAx",
    type: "back",
    w: 0.7,
    x: -0.43,
    y: 0.3,
    z: 0,
    rotY: Math.PI / 2,
    color: LOADER_OCHRE,
  },
  {
    id: "bCx",
    type: "back",
    w: 0.7,
    x: -0.43,
    y: 0.3,
    z: CELL,
    rotY: Math.PI / 2,
    color: LOADER_BONE,
  },
  {
    id: "su",
    type: "block",
    w: 0.54,
    h: 0.22,
    d: 0.5,
    x: CELL,
    y: 0.45,
    z: CELL,
    color: LOADER_OCHRE,
  },
  {
    id: "sb",
    type: "back",
    w: 0.54,
    h2: 0.4,
    x: CELL,
    y: 0.54,
    z: 0.5,
    rotX: -0.16,
    color: LOADER_BONE,
  },
];

export { LOADER_TIMING } from "./loader-timing";

export function loaderColor(hex: string) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export function createRoundedBoxGeometry(w: number, h: number, d: number) {
  const r = Math.min(0.06, Math.min(w, h) * 0.45);
  const bevel = Math.min(r, d * 0.45);
  const depth = Math.max(d - 2 * bevel, 0.001);
  const x = w / 2;
  const y = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -y + r);
  shape.lineTo(-x, y - r);
  shape.quadraticCurveTo(-x, y, -x + r, y);
  shape.lineTo(x - r, y);
  shape.quadraticCurveTo(x, y, x, y - r);
  shape.lineTo(x, -y + r);
  shape.quadraticCurveTo(x, -y, x - r, -y);
  shape.lineTo(-x + r, -y);
  shape.quadraticCurveTo(-x, -y, -x, -y + r);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function createLoopPoints(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  r: number,
  y: number,
) {
  const raw: THREE.Vector3[] = [];
  const EDGE = 30;
  const ARC = 12;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const arc = (cx: number, cz: number, a0: number, a1: number) => {
    for (let i = 0; i <= ARC; i++) {
      const a = lerp(a0, a1, i / ARC);
      raw.push(
        new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r),
      );
    }
  };
  for (let i = 0; i < EDGE; i++) {
    raw.push(new THREE.Vector3(lerp(x0 + r, x1 - r, i / EDGE), y, z0));
  }
  arc(x1 - r, z0 + r, -Math.PI / 2, 0);
  for (let i = 0; i < EDGE; i++) {
    raw.push(new THREE.Vector3(x1, y, lerp(z0 + r, z1 - r, i / EDGE)));
  }
  arc(x1 - r, z1 - r, 0, Math.PI / 2);
  for (let i = 0; i < EDGE; i++) {
    raw.push(new THREE.Vector3(lerp(x1 - r, x0 + r, i / EDGE), y, z1));
  }
  arc(x0 + r, z1 - r, Math.PI / 2, Math.PI);
  for (let i = 0; i < EDGE; i++) {
    raw.push(new THREE.Vector3(x0, y, lerp(z1 - r, z0 + r, i / EDGE)));
  }
  arc(x0 + r, z0 + r, Math.PI, Math.PI * 1.5);

  let best = 0;
  let bestV = -Infinity;
  raw.forEach((p, i) => {
    const v = p.x + p.z;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  const pts = raw.slice(best).concat(raw.slice(0, best));
  pts.push(pts[0]!.clone());
  return pts;
}
