import { Component, createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

/* Module-local scroll-active flag shared between the wheel-damped scroll effect and
   the 3D render loop. Replaces the former window.__spkScrolling global (no window.__*). */
const spkScroll = { active: false };

/* The Landing surface publishes its root node here so shared helpers/child components
   can look elements up WITHIN the surface instead of reaching into document. Falls back
   to the document when used outside a provider (e.g. a bare unit test). */
const LandingRootContext = createContext(null);
function useScopedFindEl() {
  const rootRef = useContext(LandingRootContext);
  return useCallback((id) => {
    const scope = (rootRef && rootRef.current) || document;
    const sel = "#" + ((typeof window !== "undefined" && window.CSS && CSS.escape) ? CSS.escape(id) : id);
    return scope.querySelector(sel);
  }, [rootRef]);
}

/* APPROVED EXCEPTION — accessibility: this Landing's cinematic motion (the hero 3D
   opening + auto-rotate, the intro loader, and the scroll/menu reveals) intentionally
   does NOT honor the OS "reduce motion" (prefers-reduced-motion) setting; full motion
   always plays, per product decision. Reassess before public a11y certification. */

/* ──────────────────────────────────────────────────────────────
   Data, the menu and the lists below are driven from these arrays
   instead of being hand-written markup, so the JSX stays compact.
   ────────────────────────────────────────────────────────────── */
const WORK_ITEMS = [
  { label: "Archviz", destination: "work-archviz" },
  { label: "Film & cinematics", destination: "work-film" },
  { label: "Real-time", destination: "work-realtime" },
  { label: "Product", destination: "products" },
  { label: "Concept", destination: "work-concept" },
  { label: "Animation", destination: "work-animation" },
];

const STUDIO_ITEMS = [
  { label: "About", destination: "studio" },
  { label: "Journal", destination: "journal", tag: "[ new ]" },
  { label: "Process", destination: "studio-process" },
  { label: "Clients", destination: "studio-clients" },
  { label: "Careers", destination: "studio-careers" },
  { label: "Press", destination: "studio-press" },
];

const NAV_ITEMS = [
  { ix: "[01]", label: "Home", destination: "home", active: true },
  { ix: "[02]", label: "Work", destination: "work" },
  { ix: "[03]", label: "Capabilities", destination: "capabilities" },
  { ix: "[04]", label: "Studio", destination: "studio" },
  { ix: "[05]", label: "Journal", destination: "journal" },
  { ix: "[06]", label: "Contact", destination: "contact" },
];


/* ── Governed standalone content ──────────────────────────────────────────────
   One place for the facts that were previously scattered/conflicting. Demo and
   unverified until a real CMS supplies them; `productionReady:false` lets a launch
   gate refuse unverified content. (Team/projects/journal are still rendered inline
   as demo copy — a later content pass — but the conflict-prone facts live here.) */
const LANDING_LINKS = {
  email: "hello@example.invalid",
  social: [
    { label: "Instagram", href: null, enabled: false },
    { label: "Behance", href: null, enabled: false },
  ],
  legal: [
    { label: "Terms & Conditions", href: null, enabled: false },
    { label: "Privacy Policy", href: null, enabled: false },
    { label: "Refund Policy", href: null, enabled: false },
  ],
};
const LANDING_CONTENT = {
  productionReady: false,
  brand: { name: "Furnishes" },
  waitlist: { label: "Early access", launchYear: 2026 },
  contact: { emailAddress: LANDING_LINKS.email },
  hours: {
    timezone: "Asia/Singapore",
    rows: ["Mon–Fri · 9am–6pm SGT", "Sat · 10am–4pm SGT", "Closed Sun & public holidays"],
    verified: false,
  },
  // Was "59.33°N / 18.06°E" (Stockholm) next to SGT hours — a factual conflict. No
  // coordinates now; appointment-only demo location.
  studioLocation: { label: "By appointment · demo location", coordinates: null, appointmentOnly: true, verified: false },
  projects: [
    { year: "2024", award: "Scandinavian Design Awards, Residential Category", project: "Nordic Retreat House", result: "Winner", verified: false, source: null },
    { year: "2023", award: "ArchDaily Interior Excellence, Public Spaces", project: "Oslo Civic Pavilion", result: "Honorable Mention", verified: false, source: null },
    { year: "2022", award: "Global Design Awards, Eco Innovation", project: "Forestline Studio", result: "Finalist", verified: false, source: null },
    { year: "2021", award: "Nordic Design Week, Innovation & Craftsmanship", project: "Haven Workspace", result: "Winner", verified: false, source: null },
  ],
  teamMembers: [
    { name: "Elizabeth", role: "Creative Director", desc: "Leads visual direction and narrative across projects, balancing brand, materials, and spatial storytelling.", verified: false },
    { name: "Mohan", role: "3D Visualization Lead", desc: "Turns concepts into accurate renders and walkthroughs so clients can see light, scale, and detail before build.", verified: false },
    { name: "Henry", role: "Design Researcher", desc: "Surfaces user needs, benchmarks, and trends to inform layouts, ergonomics, and long term adaptability.", verified: false },
    { name: "Jessica", role: "Principal Architect", desc: "Owns planning, code coordination, and technical resolution from early studies through construction support.", verified: false },
  ],
  journalEntries: [
    { title: "Scandinavian minimalism", read: "3 min read", verified: false },
    { title: "Diving into ocean conservation", read: "5 min read", verified: false },
    { title: "The next era of renewable energy", read: "6 min read", verified: false },
    { title: "How to cultivate a growth mindset", read: "4 min read", verified: false },
  ],
  heritageItems: [
    { title: "Workshop beginnings", category: "Origins", body: "What began as a small workshop grew through joinery, samples, and clients who valued care over volume. That early habit of listening to materials, light, and daily use still shapes how we plan each project today.", verified: false },
    { title: "First signature spaces", category: "Milestones", body: "Early residential and studio projects set our language of honest materials, clear plans, and rooms built to age well with daily life.", verified: false },
    { title: "Craft & collaborators", category: "Makers", body: "We deepened ties with local makers and suppliers so bespoke details and trusted fabrication stay central to every brief.", verified: false },
    { title: "Broader commissions", category: "Growth", body: "Larger renovations and mixed-use work stretched our process while keeping the same bar for light, proportion, and finish.", verified: false },
    { title: "Today & next chapters", category: "Legacy", body: "The studio now balances new builds and careful renewals, carrying a heritage of clarity, warmth, and buildable design forward.", verified: false },
  ],
  links: LANDING_LINKS,
};

/* Reusable grain overlay. The filter id must be unique per instance. */
function Grain({ id, className }) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/* A colored grain, random orange flecks. The turbulence luminance drives the
   alpha, so orange only shows in scattered spots, giving the cream surface a
   subtle, very random warm grain instead of a flat fill. */
function WarmGrain({ id, className }) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="2"
          stitchTiles="stitch"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.86
                  0 0 0 0 0.39
                  0 0 0 0 0.08
                  0.5 0.5 0.5 0 -0.82"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   Furnishes · the house, interactive 3D scene (core three only).
   Embedded into the landing as a transparent layer (its own bg,
   vignette and heading text were stripped on import).
   ────────────────────────────────────────────────────────────── */
const C = {
  bone: 0xffe8dc, slab: 0xffb89c, plinth: 0xffa888, wood: 0xffb89c,
  clay: 0xfb4a21, moss: 0xff8a66, ochre: 0xff5f33, stone: 0xff7148,
  teal: 0xff5f33, slate: 0xd62a0a, glass: 0xffe4da, sage: 0xf23a16,
};
const ROOM_NAMES = ["LIVING", "STUDIO", "LOUNGE", "NOOK", "WING"];

/* Visible fallback when WebGL is unavailable or its context can't be created.
   An on-brand isometric house line-drawing so the hero is never an empty region. */
function HouseFallback() {
  return (
    <div
      role="img"
      aria-label="Illustration of a furnished house. The interactive 3D model is unavailable in this browser."
      style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg viewBox="0 0 320 240" width="72%" height="72%" fill="none" aria-hidden="true"
        stroke="#6e1810" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ maxWidth: 520, opacity: 0.9 }}>
        <path d="M60 120 L160 70 L260 120 L160 170 Z" fill="#FFF2E5" />
        <path d="M60 120 L60 190 L160 230 L160 170 Z" fill="#FFE1CE" />
        <path d="M260 120 L260 190 L160 230 L160 170 Z" fill="#FFD3BC" />
        <path d="M96 138 L96 172" opacity="0.5" />
        <path d="M128 154 L128 188" opacity="0.5" />
        <path d="M192 154 L192 188" opacity="0.5" />
        <path d="M224 138 L224 172" opacity="0.5" />
        <rect x="150" y="196" width="20" height="26" rx="2" fill="#E7551A" stroke="#6e1810" transform="skewY(-27)" style={{ transformOrigin: "160px 210px" }} />
        <circle cx="160" cy="118" r="7" fill="#E7551A" stroke="none" />
      </svg>
    </div>
  );
}

function FurnishesHouse({ onIntroDone, skipIntro }) {
  const mountRef = useRef(null);
  const labelRefs = useRef([]);
  const onIntroDoneRef = useRef(onIntroDone);               // latest "opening finished" callback, read by the loop
  useEffect(() => { onIntroDoneRef.current = onIntroDone; }, [onIntroDone]);
  const pausedRef = useRef(false);          // imperative pause flag the render loop reads
  const focusRef = useRef(null);            // room index the user clicked to fly the camera to (null = overview)
  const showCtlTimerRef = useRef(0);        // handle for the delayed "reveal pause button" timer, cleared on unmount
  const [paused, setPaused] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);   // which room button is pressed (announced to AT)
  const [showCtl, setShowCtl] = useState(false);   // pause button appears only after the opening + hero text are done
  const [glFailed, setGlFailed] = useState(false); // WebGL unavailable / context lost → skip 3D gracefully
  const togglePause = () => { const v = !pausedRef.current; pausedRef.current = v; setPaused(v); };
  const onRoomClick = (ri) => { focusRef.current = ri; setActiveRoom((cur) => (cur === ri ? null : ri)); };
  const goOverview = () => { focusRef.current = "overview"; setActiveRoom(null); };

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth, height = mount.clientHeight;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (err) {
      console.warn("WebGL unavailable, skipping the 3D house.", err);
      setGlFailed(true);
      return;
    }
    let lostTimer = 0;
    const onCtxLost = (e) => {
      e.preventDefault();                  // keep the context restorable instead of crashing
      renderer.setAnimationLoop(null);     // stop drawing into the dead context
      // A lost context invalidates its GPU resources. Rather than attempt a fragile
      // in-place rebuild, we wait briefly for the browser to restore it; if it doesn't
      // come back, we fall back to the static hero (glFailed → <HouseFallback/>).
      if (lostTimer) clearTimeout(lostTimer);
      lostTimer = window.setTimeout(() => setGlFailed(true), 3000);
    };
    renderer.domElement.addEventListener("webglcontextlost", onCtxLost, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.68;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.style.cursor = "grab";

    const scene = new THREE.Scene();

    // procedural IBL (no jsm RoomEnvironment): bake a tiny warm room
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    {
      // light neutral env: keeps whites white, oranges bright
      const faces = [0xfff4ef, 0xffede4, 0xfff8f4, 0xffe3d6, 0xfff1ea, 0xffeae0]
        .map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide }));
      envScene.add(new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14), faces));
      const kp = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ color: 0xfffaf6 }));
      kp.position.set(3.5, 4.4, 2.5); kp.rotation.x = Math.PI / 2; envScene.add(kp);
    }
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    // The env scene is only used to bake the IBL and is not part of the main scene
    // graph, so scene.traverse() won't reach it on teardown — dispose it explicitly.
    envScene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && m.dispose());
    });

    // ---- procedural textures: near-white maps double as albedo + bump ------
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    function tex(size, fn, rep) {
      const cv = document.createElement("canvas"); cv.width = cv.height = size;
      fn(cv.getContext("2d"), size);
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = maxAniso;
      t.encoding = THREE.sRGBEncoding; return t;
    }
    const texFabric = tex(256, (ctx, s) => {                      // woven upholstery
      const im = ctx.createImageData(s, s), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = 234 + (Math.random() - 0.5) * 22; d[i] = d[i + 1] = d[i + 2] = n; d[i + 3] = 255; }
      ctx.putImageData(im, 0, 0);
      ctx.globalAlpha = 0.12; ctx.strokeStyle = "#f0cdbe";
      for (let x = 0.5; x < s; x += 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke(); }
      for (let y = 0.5; y < s; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
    }, 5);
    const texPlaster = tex(256, (ctx, s) => {                     // troweled plaster
      ctx.fillStyle = "#fff4ef"; ctx.fillRect(0, 0, s, s);
      for (let k = 0; k < 4200; k++) { const v = 198 + Math.random() * 48; ctx.fillStyle = `rgba(${v},${(v - 7) | 0},${(v - 16) | 0},0.16)`; ctx.fillRect(Math.random() * s, Math.random() * s, 2.4, 2.4); }
    }, 2);
    const texWood = tex(256, (ctx, s) => {                        // warm oak grain
      for (let y = 0; y < s; y++) { const v = 244 + 8 * Math.sin(y * 0.05) + (Math.random() - 0.5) * 10; ctx.fillStyle = `rgb(${v | 0},${(v - 3) | 0},${(v - 7) | 0})`; ctx.fillRect(0, y, s, 1); }
      ctx.globalAlpha = 0.10; ctx.strokeStyle = "#eab8a4";
      for (let y = 0; y < s; y += 38) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(s, y + 0.5); ctx.stroke(); }
    }, 3);
    const texWall = tex(256, (ctx, s) => {                        // troweled plaster, soft horizontal sweeps (visible albedo)
      ctx.fillStyle = "#fff6f1"; ctx.fillRect(0, 0, s, s);
      ctx.lineWidth = 1.5; ctx.lineCap = "round";
      for (let y = 3; y < s; y += 6) {                            // gentle wavy trowel courses
        ctx.globalAlpha = 0.05 + Math.random() * 0.05; ctx.strokeStyle = "#eccab8";
        ctx.beginPath();
        for (let x = 0; x <= s; x += 14) { const yy = y + Math.sin(x * 0.05 + y * 0.6) * 1.8; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;                                        // fine tooth
      for (let k = 0; k < 2200; k++) { const v = 240 + Math.random() * 14; ctx.fillStyle = `rgba(${v | 0},${(v - 6) | 0},${(v - 11) | 0},0.10)`; ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    }, 2);

    const mat = (c, r = 0.82) => {
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, envMapIntensity: 0.24 });
      m.map = texPlaster; m.bumpMap = texPlaster; m.bumpScale = 0.025; return m;
    };
    const M = {
      bone: mat(C.bone), slab: mat(C.slab), plinth: mat(C.plinth),
      wood: mat(C.wood, 0.82), slate: mat(C.slate, 0.5), teal: mat(C.teal, 0.55),
    };
    M.slab.map = texWood; M.slab.bumpMap = texWood; M.slab.bumpScale = 0.02;   // floors = oak grain
    M.plinth.map = texWood; M.plinth.bumpMap = texWood;

    // ---- per-room palettes: each room a different use → its own colours -----
    //  index 0..4 = rooms A,B,C,D,E (Living / Studio / Lounge / Nook / Wing)
    const PAL = [
      { wall: 0xffe8dc, seat: 0xfff6f1, back: 0xf23a16, arm: 0xfff6f1, corner: 0xfb4a21, bolster: 0xe5300c, lamp: 0xffd9cc }, // A Living, deep red
      { wall: 0xffe8dc, seat: 0xfff6f1, back: 0xff5f33, arm: 0xfff6f1, corner: 0xff7148, bolster: 0xfb4a21, lamp: 0xffd9cc }, // B Studio, bright orange
      { wall: 0xffe8dc, seat: 0xfff6f1, back: 0xff7148, arm: 0xfff6f1, corner: 0xff8a66, bolster: 0xff5f33, lamp: 0xffdccf }, // C Lounge, coral
      { wall: 0xffe8dc, seat: 0xfff6f1, back: 0xff8a66, arm: 0xfff6f1, corner: 0xff8a66, bolster: 0xff7148, lamp: 0xffdfd2 }, // D Nook, coral platform bed + white poufs
      { wall: 0xffe8dc, seat: 0xfff6f1, back: 0xfb4a21, arm: 0xfff6f1, corner: 0xff5f33, bolster: 0xf23a16, lamp: 0xffd9cc }, // E Wing, red-orange
    ];
    const WALL = PAL.map((p) => mat(p.wall));   // tinted plaster per room
    WALL.forEach((m) => { m.map = texWall; m.bumpMap = texWall; m.bumpScale = 0.05; }); // visible troweled wall texture
    M.bone.map = texWall; M.bone.bumpMap = texWall; M.bone.bumpScale = 0.05;
    let wallMat = M.bone;                        // current wall material (set per room before its walls)

    const glassMat = new THREE.MeshStandardMaterial({
      color: C.glass, transparent: true, opacity: 0.3, roughness: 0.06, metalness: 0, envMapIntensity: 1.1,
    });

    // soft-edged box via ExtrudeGeometry + bevel (replaces RoundedBoxGeometry)
    const geoCache = new Map();
    function roundedBoxGeo(w, h, d) {
      const key = w.toFixed(3) + "_" + h.toFixed(3) + "_" + d.toFixed(3);
      if (geoCache.has(key)) return geoCache.get(key);
      const r = Math.min(0.05, Math.min(w, h) * 0.45);
      const bevel = Math.min(r, d * 0.45);
      const depth = Math.max(d - 2 * bevel, 0.001);
      const x = w / 2, y = h / 2, s = new THREE.Shape();
      s.moveTo(-x, -y + r);
      s.lineTo(-x, y - r); s.quadraticCurveTo(-x, y, -x + r, y);
      s.lineTo(x - r, y); s.quadraticCurveTo(x, y, x, y - r);
      s.lineTo(x, -y + r); s.quadraticCurveTo(x, -y, x - r, -y);
      s.lineTo(-x + r, -y); s.quadraticCurveTo(-x, -y, -x, -y + r);
      const geo = new THREE.ExtrudeGeometry(s, {
        depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 3,
      });
      geo.translate(0, 0, -depth / 2); geo.computeVertexNormals();
      geoCache.set(key, geo); return geo;
    }
    const box = (w, h, d, m, cast = true, rec = true) => {
      const thin = Math.min(w, h, d) < 0.16;
      const geo = thin ? new THREE.BoxGeometry(w, h, d) : roundedBoxGeo(w, h, d);
      const me = new THREE.Mesh(geo, m); me.castShadow = cast; me.receiveShadow = rec; return me;
    };
    const at = (me, x, y, z) => { me.position.set(x, y, z); return me; };

    const pivot = new THREE.Group(); scene.add(pivot);
    const house = new THREE.Group(); pivot.add(house);
    const add = (m) => house.add(m);
    const BASE = -0.6;

    function createBlock(fp, elev, accent) {
      const { x0, x1, z0, z1 } = fp, w = x1 - x0, d = z1 - z0,
        cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, sH = 0.4;
      const pH = elev - sH - BASE;
      if (pH > 0.06) add(at(box(w * 0.99, pH, d * 0.99, M.plinth), cx, BASE + pH / 2, cz));
      add(at(box(w, sH, d, M.slab), cx, elev - sH / 2, cz));
      add(at(box(w * 0.5, 0.05, d * 0.5, mat(accent, 0.9), false, true), cx, elev + 0.026, cz));
    }

    const wallList = [];                          // every placed wall + its outward normal, for camera-facing cull
    function makeWall(len, h, th, opts) {
      const door = opts.door, wins = opts.windows || [], g = new THREE.Group(), shape = new THREE.Shape();
      if (door) {
        shape.moveTo(0, 0); shape.lineTo(door.x, 0); shape.lineTo(door.x, door.h);
        shape.lineTo(door.x + door.w, door.h); shape.lineTo(door.x + door.w, 0);
        shape.lineTo(len, 0); shape.lineTo(len, h); shape.lineTo(0, h); shape.lineTo(0, 0);
      } else { shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, h); shape.lineTo(0, h); shape.lineTo(0, 0); }
      wins.forEach((w) => {
        const p = new THREE.Path();
        p.moveTo(w.x, w.y); p.lineTo(w.x + w.w, w.y); p.lineTo(w.x + w.w, w.y + w.h);
        p.lineTo(w.x, w.y + w.h); p.lineTo(w.x, w.y); shape.holes.push(p);
      });
      const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false });
      geo.translate(-len / 2, 0, -th / 2);
      const wall = new THREE.Mesh(geo, wallMat); wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
      wins.forEach((w) => {
        const cx = w.x + w.w / 2 - len / 2, cy = w.y + w.h / 2;
        g.add(at(box(w.w * 0.96, w.h * 0.96, 0.04, glassMat, false, false), cx, cy, 0));
        g.add(at(box(w.w, 0.06, th + 0.05, wallMat, false, false), cx, cy, 0));
        g.add(at(box(0.06, w.h, th + 0.05, wallMat, false, false), cx, cy, 0));
      });
      return g;
    }
    function placeWall(len, h, th, opts, x, z, ry, elev) {
      const w = makeWall(len, h, th, opts); w.position.set(x, elev, z); w.rotation.y = ry; add(w);
      wallList.push({ mesh: w, x, z, ry, ri: WALL.indexOf(wallMat) });   // ri via the room's wall material; normal computed once RCEN exists
    }
    function stairsX(zc, xStart, dep, n, run, rise, dir, baseY) {
      for (let i = 0; i < n; i++) { const hh = rise * (i + 1); add(at(box(run, hh, dep, M.plinth), xStart + dir * run * (i + 0.5), baseY + hh / 2, zc)); }
    }
    function stairsZ(xc, zStart, wdt, n, run, rise, dir, baseY) {
      for (let i = 0; i < n; i++) { const hh = rise * (i + 1); add(at(box(wdt, hh, run, M.plinth), xc, baseY + hh / 2, zStart + dir * run * (i + 0.5))); }
    }

    const T = 0.22;

    // ===== squared sides + bumpy front/back (the previous massing) ==========
    const A  = { x0: -8.5, x1: 0,   z0: 0,    z1: 5.0 };  // Living  L0
    const B  = { x0: 0,    x1: 4.0, z0: 0,    z1: 3.5 };  // Studio  +1.4 (set back)
    const Cc = { x0: 0,    x1: 9.5, z0: -5.0, z1: 0   };  // Lounge  +0.3
    const D  = { x0: -8.5, x1: 0,   z0: -3.5, z1: 0   };  // Nook    +2.6

    createBlock(A, 0, C.clay);
    createBlock(B, 1.4, C.stone);
    createBlock(Cc, 0.3, C.ochre);
    createBlock(D, 2.6, C.moss);

    // A, front OPEN; left wall + back wall
    wallMat = WALL[0];
    placeWall(5.0, 2.5, T, { windows: [{ x: 1.0, y: 0.8, w: 1.2, h: 1.2 }, { x: 3.0, y: 0.8, w: 1.2, h: 1.2 }] }, -8.5 + T / 2, 2.5, Math.PI / 2, 0);
    placeWall(3.5, 2.5, T, { windows: [{ x: 1.2, y: 0.8, w: 1.4, h: 1.0 }] }, -6.75, 0 + T / 2, 0, 0);

    // B, set back & raised; front + right + back (door over C→B stairs)
    wallMat = WALL[1];
    placeWall(4.0, 2.2, T, { windows: [{ x: 0.6, y: 0.8, w: 1.0, h: 1.0 }] }, 2.0, 3.5 - T / 2, 0, 1.4);
    placeWall(3.5, 2.2, T, { windows: [{ x: 1.2, y: 0.7, w: 1.1, h: 1.1 }] }, 4.0 - T / 2, 1.75, Math.PI / 2, 1.4);
    placeWall(4.0, 2.2, T, { door: { x: 1.0, w: 2.0, h: 2.0 } }, 2.0, 0 + T / 2, 0, 1.4);

    // C, low; right (x=9.5) + back + left wall
    wallMat = WALL[2];
    placeWall(5.0, 2.4, T, { windows: [{ x: 2.2, y: 0.6, w: 0.8, h: 1.6 }] }, 9.5 - T / 2, -2.5, Math.PI / 2, 0.3);
    placeWall(9.5, 2.4, T, { windows: [{ x: 3.0, y: 1.3, w: 3.5, h: 0.7 }] }, 4.75, -5.0 + T / 2, 0, 0.3);
    placeWall(1.5, 2.4, T, {}, 0 + T / 2, -4.25, Math.PI / 2, 0.3);

    // D, left-back, highest; left (x=-8.5) + back wall
    wallMat = WALL[3];
    placeWall(3.5, 1.8, T, { windows: [{ x: 1.2, y: 0.6, w: 1.0, h: 1.0 }] }, -8.5 + T / 2, -1.75, Math.PI / 2, 2.6);
    placeWall(8.5, 1.8, T, { windows: [{ x: 2.2, y: 0.5, w: 1.0, h: 0.9 }, { x: 5.3, y: 0.5, w: 1.0, h: 0.9 }] }, -4.25, -3.5 + T / 2, 0, 2.6);

    // E, irregular L wing jutting front-right; right edge x=9.5
    wallMat = WALL[4];
    const E1 = { x0: 4.0, x1: 9.5, z0: 0,   z1: 4.0 };
    const E2 = { x0: 6.0, x1: 9.5, z0: 4.0, z1: 7.0 };
    createBlock(E1, 0.3, C.sage);
    createBlock(E2, 0.3, C.sage);
    placeWall(4.0, 2.0, T, { windows: [{ x: 1.4, y: 0.7, w: 1.2, h: 1.1 }] }, 9.5 - T / 2, 2.0, Math.PI / 2, 0.3); // E1 right
    placeWall(2.0, 2.0, T, {}, 5.0, 4.0 - T / 2, 0, 0.3);                                                          // E1 front x[4,6]
    placeWall(3.5, 2.0, T, { windows: [{ x: 1.2, y: 0.7, w: 1.1, h: 1.0 }] }, 7.75, 7.0 - T / 2, 0, 0.3);          // E2 front
    placeWall(3.0, 2.0, T, {}, 9.5 - T / 2, 5.5, Math.PI / 2, 0.3);                                                // E2 right
    placeWall(3.0, 2.0, T, {}, 6.0 + T / 2, 5.5, Math.PI / 2, 0.3);                                                // E2 left

    // connectors
    stairsX(1.75, -0.9, 2.0, 5, 0.34, 0.28, 1, 0);     // A → B
    stairsZ(2.0, -0.6, 2.0, 4, 0.34, 0.275, 1, 0.3);   // C → B
    stairsX(-1.75, 0.9, 2.0, 7, 0.32, 0.33, -1, 0.3);  // C → D

    // (main gate + front apron removed)

    // ===== FURNITURE, Furnishes kit · each room recombines over time =======
    // five modules, function-coded (desaturated). seat top = 0.36, grid 0.70.
    // Every room keeps a FIXED kit and morphs between two layouts (A ↔ B).
    const SEAT_H = 0.36;
    // per-room upholstery material set, built from that room's palette
    const furnMats = (p) => {
      const m = {
        seat:    mat(p.seat, 0.6),    // Plinth
        back:    mat(p.back, 0.6),    // Wedge
        arm:     mat(p.arm, 0.56),    // Arm
        corner:  mat(p.corner, 0.6),  // Corner
        bolster: mat(p.bolster, 0.56),// Cylinder
      };
      Object.values(m).forEach((x) => { x.map = texFabric; x.bumpMap = texFabric; x.bumpScale = 0.03; x.flatShading = true; x.needsUpdate = true; }); // weave + hard faceted shading
      return m;
    };
    const P2 = Math.PI / 2, PI = Math.PI;
    const TY0 = { seat: 0.18, corner: 0.18, arm: 0.275, table: 0.11, cyl: 0.21, back: 0.0, arc: 0.0, hub: 0.35 };
    const NARC = 6, ARC_RIN = 0.34, ARC_ROUT = 1.04, ARC_RMID = (ARC_RIN + ARC_ROUT) / 2;
    function makePiece(type, F) {
      if (type === "seat")   return box(0.70, SEAT_H, 0.35, F.seat);
      if (type === "corner") return box(0.70, SEAT_H, 0.70, F.corner);
      if (type === "arm")    return box(0.18, 0.55, 0.70, F.arm);
      if (type === "table")  return box(0.78, 0.22, 0.78, F.seat);
      if (type === "cyl") { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.42, 24), F.bolster); m.castShadow = true; m.receiveShadow = true; return m; }
      if (type === "hub") { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.74, 28), F.bolster); m.castShadow = true; m.receiveShadow = true; return m; }
      if (type === "arc") {                                  // curved bench segment, many tile into a full ring
        const span = (Math.PI * 2 / NARC) - 0.05;
        const sh = new THREE.Shape();
        sh.absarc(0, 0, ARC_ROUT, -span / 2, span / 2, false);
        sh.absarc(0, 0, ARC_RIN, span / 2, -span / 2, true);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: SEAT_H, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);                           // lay flat, thickness along +Y
        const m = new THREE.Mesh(geo, F.corner); m.castShadow = true; m.receiveShadow = true; return m;
      }
      const g = new THREE.Group(); const b = box(0.70, 0.60, 0.17, F.back); b.position.set(0, 0.30, 0); b.rotation.x = -0.16; g.add(b); return g; // leaning back
    }

    // each room is FULLY furnished (several groups); A↔B reuse the same kit.
    const ROOMS = (() => {
      const rp = (ax, az, f, lx, lz) => [ax + lx * Math.cos(f) - lz * Math.sin(f), az + lx * Math.sin(f) + lz * Math.cos(f)];
      const sofa = (e, ax, az, f, n) => { const h = (n - 1) / 2; for (let i = 0; i < n; i++) { const lx = (i - h) * 0.70; e("seat", ax, az, f, lx, 0); e("back", ax, az, f, lx, -0.35); } const ex = h * 0.70 + 0.44; e("arm", ax, az, f, -ex, 0); e("arm", ax, az, f, ex, 0); };
      const chair = (e, ax, az, f, arms = 2) => { e("seat", ax, az, f, 0, 0); e("back", ax, az, f, 0, -0.35); if (arms >= 1) e("arm", ax, az, f, -0.44, 0); if (arms >= 2) e("arm", ax, az, f, 0.44, 0); };
      const bench = (e, ax, az, f, n, bk = 0) => { const h = (n - 1) / 2; for (let i = 0; i < n; i++) e("seat", ax, az, f, (i - h) * 0.70, 0); if (bk) e("back", ax, az, f, 0, -0.35); };
      const daybed = (e, ax, az, f, n) => { const h = (n - 1) / 2; for (let i = 0; i < n; i++) e("seat", ax, az, f, (i - h) * 0.70, 0); e("back", ax, az, f, -h * 0.70, -0.35); };
      const pouf = (e, ax, az) => e("seat", ax, az, 0, 0, 0);
      const tbl = (e, ax, az) => e("table", ax, az, 0, 0, 0);
      const stool = (e, ax, az) => e("cyl", ax, az, 0, 0, 0);
      const cornerB = (e, ax, az) => e("corner", ax, az, 0, 0, 0);
      const upit = (e, ax, az, f) => {
        e("corner", ax, az, f, -1.05, -1.05); e("corner", ax, az, f, 1.05, -1.05);
        e("seat", ax, az, f, -0.35, -1.05); e("seat", ax, az, f, 0.35, -1.05);
        e("back", ax, az, f, -0.35, -1.40); e("back", ax, az, f, 0.35, -1.40);
        e("seat", ax, az, f, -1.05, -0.35, P2); e("back", ax, az, f, -1.40, -0.35, P2);
        e("seat", ax, az, f, 1.05, -0.35, -P2); e("back", ax, az, f, 1.40, -0.35, -P2);
        e("arm", ax, az, f, -1.05, 0.40, P2); e("arm", ax, az, f, 1.05, 0.40, -P2);
      };
      const ring = (e, cx, cz, n) => { for (let i = 0; i < n; i++) e("arc", cx, cz, (i / n) * Math.PI * 2, 0, 0); };            // arcs tile a closed circle
      const arcBench = (e, cx, cz, f0, k0, k1, n) => { for (let i = k0; i <= k1; i++) e("arc", cx, cz, f0 + (i / n) * Math.PI * 2, 0, 0); }; // partial curved bench
      const hubP = (e, ax, az) => e("hub", ax, az, 0, 0, 0);
      const bedC = (e, ax, az, f) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) e("corner", ax, az, f, (i - 1) * 0.70, (j - 0.5) * 0.70); }; // 2.1×1.4 plinth mattress
      const DEF = [
        { elev: 0, phase: 0, // A Living, sofa+armchair+poufs+tables  ↔  shifted set
          A: (e) => { sofa(e, -6.0, 1.25, 0, 3); chair(e, -2.6, 1.3, 0); pouf(e, -2.9, 3.1); pouf(e, -2.1, 3.1); cornerB(e, -1.2, 3.2); tbl(e, -6.0, 2.45); tbl(e, -7.85, 2.6); stool(e, -3.7, 2.2); stool(e, -1.3, 1.9); },
          B: (e) => { sofa(e, -5.6, 1.2, 0, 3); chair(e, -1.8, 1.25, 0); cornerB(e, -3.4, 3.4); pouf(e, -6.4, 3.4); pouf(e, -5.6, 3.4); tbl(e, -5.6, 2.4); tbl(e, -2.7, 3.0); stool(e, -7.6, 1.3); stool(e, -7.6, 2.2); } },
        { elev: 1.4, phase: 9, // B Studio
          A: (e) => { chair(e, 1.5, 1.6, 0); bench(e, 2.9, 1.5, P2, 2, 1); tbl(e, 1.5, 2.7); stool(e, 3.4, 2.6); },
          B: (e) => { chair(e, 1.2, 1.1, 0, 1); chair(e, 2.9, 1.1, 0, 1); pouf(e, 1.0, 2.2); tbl(e, 2.0, 2.5); stool(e, 3.2, 2.0); } },
        { elev: 0.3, phase: 18, // C Lounge, arcs as two curved benches  ↔  recombine into ONE full ring round a hub
          A: (e) => { arcBench(e, 2.5, -1.7, 0.5, 0, 2, NARC); arcBench(e, 7.2, -3.4, -0.6, 3, 5, NARC); hubP(e, 4.8, -3.6); tbl(e, 2.4, -3.5); tbl(e, 8.4, -1.3); pouf(e, 5.2, -1.2); pouf(e, 6.5, -1.5); pouf(e, 1.4, -2.7); },
          B: (e) => { ring(e, 4.9, -2.5, NARC); hubP(e, 4.9, -2.5); tbl(e, 1.5, -1.2); tbl(e, 8.5, -3.7); pouf(e, 4.9, -0.7); pouf(e, 7.7, -2.5); pouf(e, 2.0, -3.7); } },
        { elev: 2.6, phase: 27, // D Nook, platform bed tucked in a corner + bedside table  ↔  bed slides over, pouf cluster swaps sides
          A: (e) => { bedC(e, -6.3, -2.5, 0); tbl(e, -4.8, -2.6); pouf(e, -3.0, -1.7); pouf(e, -2.3, -1.5); stool(e, -3.3, -1.0); },
          B: (e) => { bedC(e, -2.2, -2.5, 0); tbl(e, -3.7, -2.6); pouf(e, -6.0, -1.7); pouf(e, -5.3, -1.5); stool(e, -6.3, -1.0); } },
        { elev: 0.3, phase: 36, // E Wing, loveseat+chair  ↔  two chairs+bench
          A: (e) => { sofa(e, 6.6, 1.3, 0, 2); chair(e, 8.4, 3.0, 0, 0); pouf(e, 5.0, 3.2); tbl(e, 6.6, 2.5); stool(e, 8.6, 1.3); stool(e, 4.7, 1.6); },
          B: (e) => { chair(e, 5.6, 1.3, 0, 1); chair(e, 7.6, 1.3, 0, 1); bench(e, 8.4, 3.0, 0, 2, 1); tbl(e, 6.6, 2.2); stool(e, 5.0, 2.9); stool(e, 6.6, 3.4); } },
      ];
      const build = (fn) => { const out = []; const e = (t, ax, az, f, lx, lz, lry = 0) => { const [x, z] = rp(ax, az, f, lx, lz); out.push({ t, x: +x.toFixed(3), z: +z.toFixed(3), ry: +(f + lry).toFixed(4) }); }; fn(e); return out; };
      const byT = (arr) => { const m = {}; arr.forEach((p) => { (m[p.t] = m[p.t] || []).push(p); }); return m; };
      return DEF.map((d) => {
        const ga = byT(build(d.A)), gb = byT(build(d.B)), pieces = [], A = {}, B = {};
        Object.keys(ga).forEach((t) => { const la = ga[t], lb = gb[t] || []; for (let k = 0; k < la.length; k++) { const id = t + k; pieces.push([id, t]); A[id] = [la[k].x, la[k].z, la[k].ry]; B[id] = [lb[k].x, lb[k].z, lb[k].ry]; } });
        return { elev: d.elev, phase: d.phase, pieces, A, B };
      });
    })();

    // opening sequence: snapshot the room structure now, before any furniture
    // is added, so each room's blocks can be dropped in first (ri tagged later,
    // once RCEN is available)
    const introStruct = house.children.map((m) => ({
      mesh: m, baseY: m.position.y, x: m.position.x, z: m.position.z, ri: 0,
    }));

    const animPieces = [];
    const seats = [];   // per room: list of every seat's {A,B} resting transforms
    ROOMS.forEach((room, ri) => {
      const FR = furnMats(PAL[ri]);          // this room's furniture colours
      room.pieces.forEach(([id, type], i) => {
        const mesh = makePiece(type, FR); add(mesh);
        const A = room.A[id], B = room.B[id], baseY = room.elev + TY0[type];
        if (type === "seat") { (seats[ri] = seats[ri] || []).push({ A, B }); }
        mesh.position.set(A[0], baseY, A[1]); mesh.rotation.y = A[2];
        let dr = B[2] - A[2]; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
        animPieces.push({ mesh, baseY, A, B, dr, ri, lp: i * 0.13 }); // ri = room, lp = per-piece stagger
      });
    });

    // shadows: rooms/walls/floors do NOT cast, only furniture (and people) cast their own
    house.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    animPieces.forEach((o) => o.mesh.traverse((c) => { if (c.isMesh) c.castShadow = true; }));

    // ---- low-poly inhabitants: articulated figures that walk, sit & make way --
    const PCOL = [0xff5f33, 0xfff3ee, 0xff8a66, 0xf23a16, 0xfff3ee]; // clean coral/orange outfits
    const skin = mat(0xe0a77f, 0.8), hair = mat(0x5a3322, 0.9), pants = mat(0xc9684a, 0.9);
    const seg = (w, h, d, m, y) => { const me = new THREE.Mesh(roundedBoxGeo(w, h, d), m); me.position.y = y; me.castShadow = true; me.receiveShadow = true; return me; };
    function buildHuman(c) {
      const cloth = mat(c, 0.92), g = new THREE.Group();
      g.add(seg(0.26, 0.36, 0.16, cloth, 0.18));   // torso
      const head = new THREE.Group(); head.position.y = 0.38; g.add(head); // neck pivot
      head.add(seg(0.17, 0.18, 0.17, skin, 0.085));     // head
      head.add(seg(0.185, 0.07, 0.185, hair, 0.175));   // hair cap
      const armL = new THREE.Group(); armL.position.set(0.165, 0.34, 0); armL.add(seg(0.075, 0.30, 0.09, cloth, -0.15));
      const armR = new THREE.Group(); armR.position.set(-0.165, 0.34, 0); armR.add(seg(0.075, 0.30, 0.09, cloth, -0.15));
      g.add(armL, armR);
      const mkLeg = (sx) => {
        const hip = new THREE.Group(); hip.position.set(sx, 0, 0);
        hip.add(seg(0.10, 0.22, 0.11, pants, -0.11));
        const knee = new THREE.Group(); knee.position.y = -0.22; hip.add(knee);
        knee.add(seg(0.09, 0.22, 0.10, pants, -0.11));
        knee.add(seg(0.10, 0.06, 0.18, hair, -0.22)); knee.children[1].position.z = 0.045;
        return { hip, knee };
      };
      const L = mkLeg(0.085), R = mkLeg(-0.085); g.add(L.hip, R.hip);
      return { g, head, armL, armR, hipL: L.hip, hipR: R.hip, kneeL: L.knee, kneeR: R.knee };
    }
    const setPose = (H, pose, wp) => {
      if (pose === "sit") {
        H.hipL.rotation.x = -1.45; H.hipR.rotation.x = -1.45; H.kneeL.rotation.x = 1.5; H.kneeR.rotation.x = 1.5;
        H.armL.rotation.x = -0.35; H.armR.rotation.x = -0.35;
      } else if (pose === "lie") {
        H.hipL.rotation.x = 0.03; H.hipR.rotation.x = -0.03; H.kneeL.rotation.x = 0.06; H.kneeR.rotation.x = 0.06;
        H.armL.rotation.x = 0.12; H.armR.rotation.x = 0.12;
      } else if (pose === "walk") {
        const s = Math.sin(wp);
        H.hipL.rotation.x = s * 0.55; H.hipR.rotation.x = -s * 0.55;
        H.kneeL.rotation.x = Math.max(0, -s) * 0.8; H.kneeR.rotation.x = Math.max(0, s) * 0.8;
        H.armL.rotation.x = -s * 0.5; H.armR.rotation.x = s * 0.5;
      } else { H.hipL.rotation.x = H.hipR.rotation.x = H.kneeL.rotation.x = H.kneeR.rotation.x = 0; H.armL.rotation.x = H.armR.rotation.x = 0.06; }
    };
    // ---- emote bubbles (expressions / steaming coffee / typing) above heads ----
    const rrect = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
    const dotC = (x, cx, cy, rr) => { x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); };
    function emoteTex(kind) {
      const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s; const x = cv.getContext("2d");
      x.fillStyle = "#ffffff"; x.strokeStyle = "rgba(120,80,40,0.22)"; x.lineWidth = 3.5;
      rrect(x, 14, 12, 100, 74, 24); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(54, 84); x.lineTo(62, 104); x.lineTo(72, 84); x.closePath(); x.fillStyle = "#ffffff"; x.fill();
      const cx = 64, cy = 48; x.lineWidth = 3; x.lineCap = "round";
      if (kind === "smile") { x.fillStyle = "#6e4a2e"; dotC(x, cx - 13, cy - 6, 5); dotC(x, cx + 13, cy - 6, 5); x.strokeStyle = "#6e4a2e"; x.beginPath(); x.arc(cx, cy - 2, 16, 0.16 * Math.PI, 0.84 * Math.PI); x.stroke(); }
      else if (kind === "heart") { x.fillStyle = "#cf5a3a"; x.beginPath(); x.moveTo(cx, cy + 16); x.bezierCurveTo(cx - 22, cy - 2, cx - 10, cy - 20, cx, cy - 6); x.bezierCurveTo(cx + 10, cy - 20, cx + 22, cy - 2, cx, cy + 16); x.fill(); }
      else if (kind === "chat") { x.fillStyle = "#6e4a2e"; dotC(x, cx - 16, cy, 5); dotC(x, cx, cy, 5); dotC(x, cx + 16, cy, 5); }
      else if (kind === "coffee") { x.fillStyle = "#a9763f"; rrect(x, cx - 15, cy - 4, 26, 22, 4); x.fill(); x.strokeStyle = "#a9763f"; x.beginPath(); x.arc(cx + 15, cy + 7, 7, -1.5, 1.5); x.stroke(); x.strokeStyle = "#cbab90"; x.lineWidth = 3; for (const o of [-7, 3]) { x.beginPath(); x.moveTo(cx + o, cy - 8); x.quadraticCurveTo(cx + o + 7, cy - 16, cx + o, cy - 25); x.stroke(); } }
      else { x.fillStyle = "#6e4a2e"; for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { rrect(x, cx - 22 + c * 11, cy - 6 + r * 10, 8, 7, 2); x.fill(); } } // typing keyboard
      const t = new THREE.CanvasTexture(cv); t.anisotropy = maxAniso; return t;
    }
    const attachEmote = (H, kind) => {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTex(kind), transparent: true, depthWrite: false, toneMapped: false }));
      spr.scale.set(0.52, 0.52, 0.52); spr.position.set(0, 1.04, 0); spr.material.opacity = 0;
      H.pv.add(spr); H.emote = spr; H.kind = kind;
    };
    // movement plan over one 30s room cycle: sit in the calm middle of each hold,
    // get up & stand clear while furniture is airborne, walk back once it settles.
    // walks route via a point in FRONT of the target seat → no straight cut through furniture.
    const RCEN = [[-4.25, 2.5], [2.0, 1.75], [4.75, -2.5], [-4.25, -1.75], [7.0, 2.5]];
    // Outward normal per wall = the wall's face axis (±X for ry≈π/2, ±Z for ry≈0) pointed AWAY from its
    // room centre. Used to hide the walls that face the camera so we can see into each room.
    wallList.forEach((w) => {
      const rc = RCEN[w.ri] || [0, 0];
      const ax = Math.sin(w.ry), az = Math.cos(w.ry);                 // face-normal axis (one ≈0)
      const s = ((w.x - rc[0]) * ax + (w.z - rc[1]) * az) >= 0 ? 1 : -1;
      w.nx = ax * s; w.nz = az * s;
    });
    const WK = 1.9, faceTo = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);
    const lp = (a, b, t) => a + (b - a) * t;
    const frontOf = (s) => [s[0] - Math.sin(s[2]) * 0.66, s[1] + Math.cos(s[2]) * 0.66]; // open side of a seat
    const sitFace = (s) => -s[2];                                                          // sit looking out into the room
    const leg = (e, f, t, k) => ({ x: lp(f[0], t[0], k), z: lp(f[1], t[1], k), y: e + 0.44, face: faceTo(f[0], f[1], t[0], t[1]), pose: "walk" });
    const walkVia = (e, f, m, t, k) => (k < 0.5 ? leg(e, f, m, k / 0.5) : leg(e, m, t, (k - 0.5) / 0.5));
    const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const pick = (arr, a) => arr[Math.floor(rnd(a) * arr.length) % arr.length];
    // one hold = walk in → sit → stroll to a DIFFERENT (random) seat → sit → walk out
    const holdSeg = (uh, k, two, g, key, wp, seed) => {
      const e = g.elev, M = HOLD / 2, hw = WK / 2, sOf = (idx) => g.seats[idx][key];
      let s1, s2;
      if (two) { const p1 = pick(g["pairs" + key], seed + 1), p2 = pick(g["pairs" + key], seed + 2); s1 = sOf(p1[k]); s2 = sOf(p2[k]); }
      else { s1 = sOf(Math.floor(rnd(seed + 1) * g.seats.length)); s2 = sOf(Math.floor(rnd(seed + 2.3) * g.seats.length)); }
      const P1 = [s1[0], s1[1]], P2 = [s2[0], s2[1]];
      if (uh < WK) return walkVia(e, wp, frontOf(s1), P1, uh / WK);
      if (uh < M - hw) return { x: s1[0], z: s1[1], y: e + 0.40, face: sitFace(s1), pose: "sit" };
      if (uh < M + hw) return walkVia(e, P1, frontOf(s2), P2, (uh - (M - hw)) / WK);
      if (uh < HOLD - WK) return { x: s2[0], z: s2[1], y: e + 0.40, face: sitFace(s2), pose: "sit" };
      return walkVia(e, P2, frontOf(s2), wp, (uh - (HOLD - WK)) / WK);
    };
    const holdLie = (uh, k, two, g, key, wp, seed) => {                          // lie on the bed
      const e = g.elev, bed = key === "A" ? g.bedA : g.bedB, spot = [bed[0], bed[1] + (k ? 0.4 : -0.4)], ap = [spot[0] + 0.8, spot[1]];
      if (uh < WK) return walkVia(e, wp, ap, spot, uh / WK);
      if (uh < HOLD - WK) return { x: spot[0], z: spot[1], y: e, face: Math.PI / 2, pose: "lie" };
      return walkVia(e, spot, ap, wp, (uh - (HOLD - WK)) / WK);
    };
    const planPerson = (u, k, g, cyc) => {
      const two = g.Hs.length === 2, wp = [g.w[0] + (two ? (k ? 0.6 : -0.6) : 0), g.w[1]];
      const stand = () => ({ x: wp[0], z: wp[1], y: g.elev + 0.44, face: faceTo(wp[0], wp[1], g.w[0], g.w[1] + 0.01), pose: "stand" });
      // nap rooms (Nook) lie on the bed during the A-hold, then get up and SIT in
      // the pouf cluster during the B-hold, so they're not "just lying", and at the
      // frozen opening (which lands in the B-hold) they're sitting/active, not napping
      const nap = g.rest === "lie";
      const segA = nap ? holdLie : holdSeg, segB = holdSeg;
      const sd = g.phase * 3.7 + k * 1.7 + cyc * 5.3;
      if (u < HOLD) return segA(u, k, two, g, "A", wp, sd);
      if (u < HOLD + TRANS) return stand();                                       // vacate while furniture flies
      if (u < 2 * HOLD + TRANS) return segB(u - (HOLD + TRANS), k, two, g, "B", wp, sd + 99);
      return stand();
    };
    // people per room, big rooms (A Living, C Lounge) + top-left D Nook get two
    const COUNT = [2, 1, 2, 2, 1], REST = ["sit", "sit", "sit", "lie", "sit"];
    // find seat pairs that read as "together" (adjacent, same facing) or "facing" (fronts meet)
    const mkPairs = (arr, key) => {
      const L = arr.map((s) => ({ p: [s[key][0], s[key][1]], r: s[key][2] }));
      const front = (r) => [-Math.sin(r), Math.cos(r)], out = [];
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const a = L[i], b = L[j], dx = b.p[0] - a.p[0], dz = b.p[1] - a.p[1], d = Math.hypot(dx, dz) || 1e-3;
        let dA = Math.abs(a.r - b.r) % (2 * Math.PI); if (dA > Math.PI) dA = 2 * Math.PI - dA;
        if (d > 0.45 && d < 0.95 && dA < 0.6) { out.push([i, j]); continue; }        // side-by-side → sit together
        const fa = front(a.r), fb = front(b.r);
        if (d > 0.8 && d < 2.6 && (dx * fa[0] + dz * fa[1]) / d > 0.5 && (-dx * fb[0] - dz * fb[1]) / d > 0.5) out.push([i, j]); // facing
      }
      if (!out.length) out.push(L.length >= 2 ? [0, 1] : [0, 0]);
      return out;
    };
    const grp = [];
    const BED = { 3: { A: [-6.3, -2.5], B: [-2.2, -2.5] } };   // D Nook bed anchors (must match bedC in DEF)
    const KINDS = ["coffee", "smile", "chat", "type", "heart", "smile", "coffee", "chat", "type", "smile"];
    let pidx = 0;
    seats.forEach((arr, ri) => {
      if (!arr || !arr.length) return;
      const n = Math.min(COUNT[ri], Math.max(1, arr.length)), Hs = [];
      for (let k = 0; k < n; k++) {
        const H = buildHuman(PCOL[(ri + k * 2) % 5]);
        const pv = new THREE.Group(); pv.add(H.g); house.add(pv); H.pv = pv;
        attachEmote(H, KINDS[pidx++ % KINDS.length]); Hs.push(H);
      }
      const bd = BED[ri];
      const g = { Hs, seats: arr, ri, w: RCEN[ri], elev: ROOMS[ri].elev, phase: ROOMS[ri].phase, rest: REST[ri], pairsA: mkPairs(arr, "A"), pairsB: mkPairs(arr, "B"), bedA: bd && bd.A, bedB: bd && bd.B };
      Hs.forEach((H, kk) => { const s0 = arr[Math.min(kk, arr.length - 1)].A; H.pv.position.set(s0[0], g.elev + 0.40, s0[1]); setPose(H, "sit", 0); });
      grp.push(g);
    });

    // each room holds config A, then the SAME pieces LIFT and FALL into config B,
    // hold, then fall back. Rooms offset by phase; pieces offset within a room.
    const PER = 45, HOLD = 17.5, TRANS = 5, DROP_H = 2.4, ease = (t) => t * t * (3 - 2 * t);
    function sched(clock, phase) {
      let u = (((clock + phase) % PER) + PER) % PER;
      if (u < HOLD) return { s: 0, p: 0, moving: false }; u -= HOLD;
      if (u < TRANS) { const p = u / TRANS; return { s: ease(p), p, moving: true }; } u -= TRANS;
      if (u < HOLD) return { s: 1, p: 0, moving: false }; u -= HOLD;
      const p = u / TRANS; return { s: 1 - ease(p), p, moving: true };
    }

    house.position.set(-0.5, 0, -1.0);

    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.62, color: 0x5a2410 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = BASE; catcher.receiveShadow = true; pivot.add(catcher);

    scene.add(new THREE.HemisphereLight(0xffdcb8, 0xe6a878, 0.25));   // warm amber sky, warm ground bounce
    scene.add(new THREE.AmbientLight(0xffd5a2, 0.05));                // warm minimal fill → keeps a real light→shadow gradient
    const key = new THREE.DirectionalLight(0xffc987, 1.05);          // warm amber key, softer (was bright near-white)
    key.position.set(8, 20, 11); key.castShadow = true;               // overhead → flat room lighting, furniture casts a clean contact shadow
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 120;
    key.shadow.radius = 1.4; key.shadow.blurSamples = 8; key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02;
    const sb = 28;
    key.shadow.camera.left = -sb; key.shadow.camera.right = sb; key.shadow.camera.top = sb; key.shadow.camera.bottom = -sb;
    scene.add(key);

    // per-room interior lamps, each room its own warm pool of light (rotates with house)
    const lampPos = [[-4.25, 1.9, 2.5], [2.0, 3.2, 1.75], [4.75, 2.2, -2.5], [-4.25, 4.4, -1.75], [7.0, 2.2, 2.5]];
    lampPos.forEach((p, i) => {
      const L = new THREE.PointLight(PAL[i].lamp, 2.6, 8, 2);
      L.position.set(p[0], p[1], p[2]); house.add(L);
    });

    const R = 18, TY = 1.4, Rc = 60;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
    // unified ORBIT camera: BOTH axes move the camera around the target on a sphere (azimuth θ + polar φ measured from the top).
    // φ = 0 → straight-down (完全俯视); φ = π/2 → level (平视). φ is clamped at π/2 so the underside is never visible.
    let theta = 5.59, phi = 1.06;                    // nudged a touch toward the more top-down reference framing
    const PHI_MIN = 0.05, PHI_MAX = Math.PI / 2 - 0.02;
    const Tgoal = new THREE.Vector3(0, TY, 0), Tcur = new THREE.Vector3(0, TY, 0);
    const _wpA = new THREE.Vector3(), _wpB = new THREE.Vector3();   // tour waypoint scratch
    const placeCam = () => {
      const sf = Math.sin(phi), cf = Math.cos(phi), dx = sf * Math.sin(theta), dy = cf, dz = sf * Math.cos(theta); // unit dir target→camera
      camera.position.set(Tcur.x + Rc * dx, Tcur.y + Rc * dy, Tcur.z + Rc * dz);
      let ux = -dy * dx, uy = 1 - dy * dy, uz = -dy * dz;                                    // world-up made ⟂ to view dir
      const ul = Math.hypot(ux, uy, uz);
      if (ul < 1e-4) { ux = -Math.sin(theta); uy = 0; uz = -Math.cos(theta); } else { ux /= ul; uy /= ul; uz /= ul; } // straight-down fallback
      camera.up.set(ux, uy, uz); camera.lookAt(Tcur);
    };
    function fit() {
      const a = width / height, f = a >= 1 ? 2 * R : (2 * R) / a;
      camera.left = (-f * a) / 2; camera.right = (f * a) / 2; camera.top = f / 2; camera.bottom = -f / 2;
      camera.updateProjectionMatrix();
    }
    fit();
    const OVERVIEW_ZOOM = 4.0, ROOM_ZOOM = 6.5;
    const MIN_ZOOM = OVERVIEW_ZOOM * 0.85;           // can zoom OUT a little past the default framing (house a touch smaller than default)
    let zoomGoal = OVERVIEW_ZOOM; camera.zoom = OVERVIEW_ZOOM; placeCam(); camera.updateProjectionMatrix();


    const reduce = false;   // motion restored: the hero 3D always plays its full experience (opening tour → room fly-through → settled overview auto-rotate, plus people & furniture), regardless of the OS "reduce motion" setting.
    const skipOpening = reduce || skipIntro;     // returning from the account view → start settled, no opening shot
    let auto = !reduce; const el = renderer.domElement;
    let focusRoom = null;                            // room the camera is locked onto (null = overview)
    const pointers = new Map();
    let lx = 0, ly = 0, pinchDist = 0, moved = 0, panMid = null;
    const panOffset = new THREE.Vector3();
    const setZoomGoal = (z) => { zoomGoal = Math.min(7.5, Math.max(MIN_ZOOM, z)); };  // farthest = a touch beyond the default framing (can zoom out a little smaller than default)
    const panBy = (dpx, dpy) => {                                      // two-finger pan: shift the target along the camera's screen plane
      camera.updateMatrixWorld();
      const wppx = (camera.right - camera.left) / camera.zoom / width, wppy = (camera.top - camera.bottom) / camera.zoom / height;
      const e = camera.matrixWorld.elements, sx = -dpx * wppx, sy = dpy * wppy;
      const mx = e[0] * sx + e[4] * sy, my = e[1] * sx + e[5] * sy, mz = e[2] * sx + e[6] * sy;
      panOffset.x += mx; panOffset.y += my; panOffset.z += mz; Tcur.x += mx; Tcur.y += my; Tcur.z += mz;
    };
    const dn = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      auto = false; el.setPointerCapture?.(e.pointerId); el.style.cursor = "grabbing";
      if (pointers.size === 1) { lx = e.clientX; ly = e.clientY; moved = 0; }
      if (pointers.size === 2) { const p = [...pointers.values()]; pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); panMid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; }
    };
    const mv = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        theta -= dx * 0.006;                                                         // horizontal drag → orbit azimuth (model follows the finger)
        phi = Math.min(PHI_MAX, Math.max(PHI_MIN, phi - dy * 0.006));                // vertical drag → orbit elevation (drag down → tip toward top-down)
      } else if (pointers.size === 2) {
        const p = [...pointers.values()], d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        const cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2;
        if (pinchDist > 0) setZoomGoal(zoomGoal * (d / pinchDist));            // pinch → zoom
        if (panMid) panBy(cx - panMid.x, cy - panMid.y);                       // both fingers together → pan
        pinchDist = d; panMid = { x: cx, y: cy };
      }
    };
    const up = (e) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId); el.releasePointerCapture?.(e.pointerId);
      if (pointers.size < 2) panMid = null;
      if (pointers.size === 0) {
        el.style.cursor = "grab";
        if (wasSingle && moved < 6 && focusRoom != null) { focusRoom = null; zoomGoal = OVERVIEW_ZOOM; panOffset.set(0, 0, 0); } // tap empty space → overview
        if (!reduce && focusRoom == null) auto = true;
      } else if (pointers.size === 1) { const q = [...pointers.values()][0]; lx = q.x; ly = q.y; }
    };
    const wheel = (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoomGoal(zoomGoal * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); };  // 普通滚轮→滚页面；Ctrl/触控板捏合→缩放模型
    el.addEventListener("pointerdown", dn);
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("wheel", wheel, { passive: false });

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth; height = mount.clientHeight;
      if (width && height) { renderer.setSize(width, height); fit(); }
    });
    ro.observe(mount);

    const roomVT = ROOMS.map((r) => r.phase);          // per-room virtual time (starts desynced)
    const uOf = (ri) => { let u = roomVT[ri] % PER; return u < 0 ? u + PER : u; };
    const movingNow = (ri) => { const u = uOf(ri); return (u >= HOLD && u < HOLD + TRANS) || u >= 2 * HOLD + TRANS; }; // furniture airborne
    const lblV = new THREE.Vector3();
    let lastT = performance.now() / 1000;
    let scrollSkip = false;   // alternates frames while the damped scroll is active

    // ── opening sequence (intro) ──────────────────────────────────────────
    // tag each structural block with its nearest room (for staggered drop)
    introStruct.forEach((s) => {
      let bi = 0, bd = Infinity;
      RCEN.forEach((c, i) => { const d = (s.x - c[0]) ** 2 + (s.z - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } });
      s.ri = bi;
    });
    const FAR_ZOOM = OVERVIEW_ZOOM * 0.24;          // camera starts much farther back, eases in to OVERVIEW_ZOOM
    const DROP_ROOM = 9, DROP_FURN = 5;             // fall heights (world units)
    const R_FALL = 1.05, F_FALL = 0.85;             // individual fall durations (slower)
    const ROOM_ORDER = [3, 2, 1, 0, 4];             // shells fall back-to-front
    const roomStart = {}; ROOM_ORDER.forEach((ri, i) => { roomStart[ri] = i * 0.24; });
    const STRUCT_DUR = 2.0;                          // room shells finish landing ~here

    // ONE continuous opening shot, a long slow push in from far while the shells fall, then a
    // glide room→room (each from its own angle), lingering on each, finally easing to overview.
    const TOUR_ORDER = [0, 1, 4, 3, 2];             // Living → Studio → Wing → Nook → Lounge (end on Lounge)
    // each room is shot from its OWN angle (azimuth θ + elevation φ) so the tour swings
    // around to a fresh vantage for every room, not the same framing panned sideways
    const TOUR_POSE = [
      { th: 5.85, ph: 1.08 },   // 0 Living, level, from the right-front
      { th: 5.45, ph: 0.84 },   // 1 Studio, steep top-down
      { th: 5.05, ph: 1.00 },   // 2 Lounge, mid elevation, swung left
      { th: 4.70, ph: 0.82 },   // 3 Nook  , top-down, from back-left
      { th: 6.15, ph: 1.20 },   // 4 Wing  , low & level, swung far right
    ];
    // After the tour, settle the pulled-back overview so the LAST room (Lounge) sits in the FOREGROUND
    //, the lounge-front reference framing, NOT the default living-front start. A room is in the
    // foreground when the camera azimuth points at it: θ = atan2(roomX, roomZ). The far opening still
    // uses tourTheta0 (living-front = the start image), so only the END framing moves.
    const _endRi = TOUR_ORDER[TOUR_ORDER.length - 1];
    const END_THETA = Math.atan2(RCEN[_endRi][0], RCEN[_endRi][1]);  // ≈2.06 for Lounge → lounge in foreground
    // The opening is built as an explicit chain of phases so every room gets the SAME stay and a
    // clear, natural drift while it's on screen. Pose indices: 0 = far, 1..N = rooms (in TOUR_ORDER),
    // N+1 = overview. Each room = a MOVE in, then a HOLD (a slow, steady, OBVIOUS drift that keeps
    // gliding toward the NEXT room, the camera never parks to stare). All HOLDs are equal length.
    const PUSH_DUR = 5.0;                            // establishing push: far → first room (long, slow approach)
    const TITLE_REVEAL_T = 2.2;                      // reveal the hero title/text THIS early (decoupled from PUSH_DUR so the title comes in sooner while the 3D keeps pushing / touring)
    const HOLD_DUR = 1.6;                            // every room's stay, identical for all rooms
    const MOVE_DUR = 0.85;                           // brisk glide room → room
    const RET_DUR = 2.6;                             // slow, silky ease back to overview (now also orbits round to the lounge-front)
    const DRIFT_FRAC = 0.2;                          // how far (of the way to the next room) the camera drifts during a HOLD, bigger = more obvious drift
    const TN = TOUR_ORDER.length;
    const vHold = DRIFT_FRAC / HOLD_DUR;             // the hold's drift speed (frac/s), moves enter & exit AT this speed so the drift is continuous
    // Hermite on [0,1] with p0=0,p1=1 and endpoint slopes m0,m1
    const hermite = (s, m0, m1) => { const s2 = s * s, s3 = s2 * s; return (-2 * s3 + 3 * s2) + m0 * (s3 - 2 * s2 + s) + m1 * (s3 - s2); };
    const PH = []; let _t = 0;                       // phase list: {t0,dur,a,b,f0,f1,kind,m0,m1}
    PH.push({ t0: 0, dur: PUSH_DUR, a: 0, b: 1, f0: 0, f1: 1, kind: 'push', m0: 0, m1: vHold * PUSH_DUR }); // from rest → arrives at the hold's drift speed
    _t = PUSH_DUR;
    for (let r = 1; r <= TN; r++) {
      PH.push({ t0: _t, dur: HOLD_DUR, a: r, b: r + 1, f0: 0, f1: DRIFT_FRAC, kind: 'hold' }); _t += HOLD_DUR;
      const last = r === TN, dur = last ? RET_DUR : MOVE_DUR;
      const m = vHold * dur / (1 - DRIFT_FRAC);      // enter & leave the move at the hold's drift speed → no jolt
      PH.push({ t0: _t, dur, a: r, b: r + 1, f0: DRIFT_FRAC, f1: 1, kind: last ? 'return' : 'move', m0: m, m1: m }); _t += dur;
    }
    const OPEN_DUR = _t;                             // whole opening length

    // a room is "arrived" at the start of its HOLD; land its furniture just before, so it's already
    // settled as the camera glides on, never an "arrived, now waiting for furniture" beat.
    const roomArriveT = {}; PH.forEach((p) => { if (p.kind === 'hold') roomArriveT[TOUR_ORDER[p.a - 1]] = p.t0; });
    const LAND_LEAD = 0.35;                          // furniture finishes landing this long before the camera arrives
    const roomLandT = {}; TOUR_ORDER.forEach((ri) => { roomLandT[ri] = roomArriveT[ri] - LAND_LEAD; });
    const furnStart = (o) => roomLandT[o.ri] - F_FALL + o.lp * 0.22;   // furniture LANDS just before arrival (staggered across the cluster)
    const pplStart = (g) => roomLandT[g.ri] - F_FALL + 0.1;
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const gravFall = (p) => 1 - p * p;              // p:0→1 ⇒ offset 1→0 (accelerating, gravity-like)
    let introStart = null;
    let introFired = false;                          // ensures onIntroDone fires exactly once
    let tourTheta0 = null, tourPhi0 = null;          // camera angle captured when the tour begins (for seamless start/return)
    let dropDone = skipOpening;                      // reduced motion / return → skip the opening, straight to final

    const renderLoop = () => {
      /* While the damped page-scroll is actively lerping (spkScroll.active),
         render every OTHER frame. The full-rate WebGL render competed with the
         scroll loop for the same frame budget and caused irregular scroll jank;
         at 30fps under scroll-motion the 3D difference is imperceptible. The
         opening sequence is exempt so the intro always runs at full rate. */
      if (spkScroll.active && introFired) {
        scrollSkip = !scrollSkip;
        if (scrollSkip) return;
      }
      const now = performance.now() / 1000; let dt = now - lastT; lastT = now; if (dt > 0.1) dt = 0.1;

      // opening: room shells fall while the camera slowly pushes in from far; it arrives
      // at the first room as that room's furniture drops, then glides room→room and finally
      // back to overview, all in ONE continuous move. roomVT runs live the whole time.
      if (introStart == null) introStart = now;
      const introE = now - introStart;
      const inIntro = !skipOpening && introE < OPEN_DUR;
      if (!introFired && (skipOpening || introE >= TITLE_REVEAL_T)) { introFired = true; onIntroDoneRef.current && onIntroDoneRef.current(); showCtlTimerRef.current = setTimeout(() => setShowCtl(true), 2500); } // reveal the hero title/text early (the camera keeps pushing/touring the rooms after)
      if (!inIntro && !dropDone) {                   // first frame after the opening: everything settled & visible
        dropDone = true;
        for (const s of introStruct) { s.mesh.visible = true; s.mesh.position.y = s.baseY; }
        for (const o of animPieces) o.mesh.visible = true;
        for (const g of grp) g.Hs.forEach((H) => { H.pv.visible = true; });
      }

      // clicking a room label flies the camera in to observe it; clicking it again (or tapping empty space) returns to overview
      const req = focusRef.current;
      if (req != null) {
        if (req === "overview") {
          focusRoom = null; zoomGoal = OVERVIEW_ZOOM; panOffset.set(0, 0, 0); auto = !reduce;
        } else {
          focusRoom = (focusRoom === req) ? null : req;
          zoomGoal = focusRoom == null ? OVERVIEW_ZOOM : ROOM_ZOOM;
          panOffset.set(0, 0, 0);
          if (focusRoom != null) auto = false;
        }
        focusRef.current = null;
      }

      // auto-rotate resumes only after the whole opening; during the opening the camera
      // is driven by the pull-in then the tour, so the spin stays out of the way
      if (auto && !pausedRef.current && focusRoom == null && !inIntro) {
        theta += 0.0011;
      }
      if (!reduce && !pausedRef.current) {
        // Pause (and reduced-motion) stop ALL nonessential motion: auto-rotation
        // (above) plus the people and furniture below. Room clocks stop with them,
        // so resuming continues seamlessly. The drop is only a Y-overlay, so
        // positions stay continuous throughout.
        for (let ri = 0; ri < ROOMS.length; ri++) { roomVT[ri] += dt; }
        for (const g of grp) {
          // people are driven by their room's clock, which keeps running through PAUSE, they keep
          // walking / sitting / cycling; only the model's rotation stops on pause
          const pt = roomVT[g.ri]; let u = ((pt % PER) + PER) % PER;
          const cyc = Math.max(0, Math.floor(pt / PER));
          const rs = g.Hs.map((H, k) => planPerson(u, k, g, cyc));
          g.Hs.forEach((H, k) => {
            const r = rs[k]; let pose = r.pose, yy = r.y, rx = 0;
            if (pose === "lie") { rx = -Math.PI / 2; yy = g.elev + 0.44; }
            let heading = r.face, hx = Math.sin(pt * 0.9 + k) * 0.05, hy = Math.sin(pt * 0.7 + k) * 0.2;
            const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
            if (g.Hs.length === 2 && pose === "sit") {
              const o = rs[1 - k], toO = Math.atan2(o.x - r.x, o.z - r.z), turn = Math.max(-0.9, Math.min(0.9, wrap(toO - r.face)));
              heading = r.face + turn * 0.5;
              hx = -0.05; hy = Math.max(-1.05, Math.min(1.05, wrap(toO - heading))) + Math.sin(pt * 1.7 + k) * 0.05;
            } else if (g.Hs.length === 2 && pose === "lie") {
              const o = rs[1 - k]; hy = Math.max(-1.0, Math.min(1.0, wrap(Math.atan2(o.x - r.x, o.z - r.z) - r.face))) * 0.85;
            }
            H.pv.position.set(r.x, yy + (pose === "walk" ? Math.abs(Math.sin(pt * 9 + k)) * 0.02 : 0), r.z);
            H.pv.rotation.y = heading; H.g.rotation.x = rx;
            setPose(H, pose, pt * 9 + k * 1.3);
            H.head.rotation.set(hx, hy, 0);
            if (H.kind === "type" && (pose === "sit" || pose === "lie")) { const tp = Math.sin(pt * 13 + k) * 0.16; H.armL.rotation.x = -1.15 + tp; H.armR.rotation.x = -1.15 - tp; }
            if (H.emote) {
              const vis = pose === "walk" ? 0 : (Math.sin(pt * 0.5 + k * 2) > 0.1 ? 1 : 0);
              H.emote.material.opacity += (vis - H.emote.material.opacity) * 0.07;
              const ph = pt * 2.2 + k, drift = H.kind === "coffee" ? 0.05 : 0.03;
              H.emote.position.y = 1.04 + Math.sin(ph) * drift;
              const sc = 0.5 + 0.045 * Math.sin(ph * 1.3); H.emote.scale.set(sc, sc, sc);
            }
          });
        }
        for (const o of animPieces) {
          const { s, p, moving } = sched(roomVT[o.ri], o.lp);
          o.mesh.position.x = o.A[0] + (o.B[0] - o.A[0]) * s;
          o.mesh.position.z = o.A[1] + (o.B[1] - o.A[1]) * s;
          o.mesh.rotation.y = o.A[2] + o.dr * s;
          if (moving) {
            let h, sy = 1;
            if (p < 0.4) { const q = p / 0.4; h = DROP_H * (1 - (1 - q) * (1 - q)); }          // toss up (ease-out)
            else {
              const fp = (p - 0.4) / 0.6; h = DROP_H * (1 - fp * fp);                            // gravity-accelerated fall
              if (fp > 0.82) sy = 1 - 0.06 * Math.sin(((fp - 0.82) / 0.18) * Math.PI);           // soft squash-settle on landing
            }
            o.mesh.position.y = o.baseY + h;
            o.mesh.scale.y = sy;
          } else { o.mesh.position.y = o.baseY; o.mesh.scale.y = 1; }
        }
        if (inIntro) {
          // overlay the opening drop on TOP of the resting positions the logic
          // above just set: structure blocks first (staggered), then furniture
          // and people, Y only, so the end of the drop == the normal start pose
          for (const s of introStruct) {
            const st = roomStart[s.ri] || 0, p = clamp01((introE - st) / R_FALL);
            s.mesh.visible = introE >= st;
            s.mesh.position.y = s.baseY + DROP_ROOM * gravFall(p);
          }
          for (const o of animPieces) {
            const st = furnStart(o), p = clamp01((introE - st) / F_FALL);
            o.mesh.visible = introE >= st;
            o.mesh.position.y += DROP_FURN * gravFall(p);
          }
          for (const g of grp) {
            const st = pplStart(g), p = clamp01((introE - st) / F_FALL), off = DROP_FURN * gravFall(p);
            g.Hs.forEach((H) => { H.pv.visible = introE >= st; H.pv.position.y += off; });
          }
        }
      }

      // camera: the opening is an explicit chain of phases, far → (each room: glide IN, then HOLD)
      // → overview. During a HOLD the camera drifts at a steady, visible pace toward the NEXT room
      // (it keeps gliding along the trajectory it's about to take, it never parks). Every HOLD is the
      // same length, so every room gets the same stay. Moves ease in/out AT the hold's drift speed,
      // so the drift flows continuously into and out of each move with no jolt.
      if (inIntro) {
        if (tourTheta0 == null) { tourTheta0 = theta; tourPhi0 = phi; }
        const N = TOUR_ORDER.length;
        const lerpAng = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };
        const pose = (i) => i <= 0 ? { ri: null, th: tourTheta0, ph: tourPhi0, z: FAR_ZOOM }
          : i > N ? { ri: null, th: END_THETA, ph: tourPhi0, z: OVERVIEW_ZOOM }
            : { ri: TOUR_ORDER[i - 1], ...TOUR_POSE[TOUR_ORDER[i - 1]], z: ROOM_ZOOM };
        let ph = PH[0]; for (let pi = 0; pi < PH.length; pi++) { if (introE >= PH[pi].t0) ph = PH[pi]; else break; }
        const lt = clamp01((introE - ph.t0) / ph.dur);                  // local progress within this phase
        const e = ph.kind === 'hold' ? lt : hermite(lt, ph.m0, ph.m1);  // HOLD = linear steady drift; move/push/return = eased (matched end-slopes)
        const frac = ph.f0 + (ph.f1 - ph.f0) * e;                       // fraction along pose(a)→pose(b)
        const pf = pose(ph.a), pt = pose(ph.b);
        // FINAL return → let the destination overview angle DRIFT at the auto-rotate speed, so the
        // camera reaches overview ALREADY turning at the spin rate, auto-rotate continues from that
        // exact motion with no stall between the return and the rotation.
        const toTh = ph.kind === 'return' ? END_THETA + 0.066 * (introE - ph.t0) : pt.th;
        const wp = (out, ri) => ri == null ? out.set(0, TY, 0) : out.set(RCEN[ri][0], ROOMS[ri].elev + 0.7, RCEN[ri][1]).applyMatrix4(house.matrixWorld);
        wp(_wpA, pf.ri); wp(_wpB, pt.ri);
        Tcur.copy(_wpA).lerp(_wpB, frac).add(panOffset);
        theta = lerpAng(pf.th, toTh, frac);                            // swing azimuth → a different side per room
        phi = pf.ph + (pt.ph - pf.ph) * frac;                          // and tilt elevation
        camera.zoom = pf.z + (pt.z - pf.z) * frac;                      // far → room → overview
      } else {
        if (focusRoom == null) Tgoal.set(0, TY, 0);
        else Tgoal.set(RCEN[focusRoom][0], ROOMS[focusRoom].elev + 0.7, RCEN[focusRoom][1]).applyMatrix4(house.matrixWorld);
        Tgoal.add(panOffset);
        Tcur.lerp(Tgoal, 0.09);
        camera.zoom += (zoomGoal - camera.zoom) * 0.12;
      }
      // Near-wall cull: hide the walls whose outward normal points toward the camera (the 1–2 walls
      // between the camera and each room's interior) so we can see in. When looking top-down (small
      // phi) walls don't occlude, so keep them all. The toggle happens when a wall is edge-on (zero
      // visible width), so it's not noticeable.
      {
        const cull = phi > 0.6;                                       // not top-down
        const cdx = Math.sin(theta), cdz = Math.cos(theta);          // horizontal dir target→camera
        for (let i = 0; i < wallList.length; i++) {
          const w = wallList[i];
          w.mesh.visible = !(cull && (w.nx * cdx + w.nz * cdz) > 0);
        }
      }
      camera.updateProjectionMatrix();
      placeCam();

      renderer.render(scene, camera);
      for (let ri = 0; ri < ROOMS.length; ri++) {       // float the room-name labels above each room
        const el = labelRefs.current[ri]; if (!el) continue;
        lblV.set(RCEN[ri][0], ROOMS[ri].elev + 2.7, RCEN[ri][1]).applyMatrix4(house.matrixWorld).project(camera);
        const px = lblV.x * 0.5 + 0.5, py = -lblV.y * 0.5 + 0.5;
        const onScreen = lblV.z < 1 && px > 0.01 && px < 0.99 && py > 0.01 && py < 0.99;
        // during the opening, each label fades in + slides up as the camera arrives at its room
        // (timed off that room's arrival); afterwards every on-screen label simply shows.
        let vis;
        if (inIntro) { const t0 = roomArriveT[ri]; vis = (t0 == null) ? 0 : clamp01((introE - t0) / 0.55); }
        else vis = 1;
        const show = onScreen && vis > 0.001;
        el.style.display = show ? "flex" : "none";
        if (show) {
          const e = vis < 1 ? 1 - Math.pow(1 - vis, 3) : 1;          // easeOutCubic entrance
          el.style.opacity = e;
          const slide = (1 - e) * 14;                                 // start 14px lower → slide up to rest
          el.style.transform = `translate(-50%,-50%) translate(${px * width}px,${py * height + slide}px)`;
        } else {
          el.style.opacity = 0;
        }
      }
    };
    renderer.setAnimationLoop(renderLoop);

    /* Biggest scroll-perf win: pause the whole loop (camera math + WebGL draw)
       whenever the house is scrolled out of view, resume a little before it
       re-enters. dt is clamped to 0.1 in the loop so resuming never jumps. */
    let onScreen = true;
    // One place decides whether the loop runs: on-screen AND the tab is visible.
    // Before the opening fires onIntroDone we always keep running (else the hero
    // title would stay hidden). Used by the offscreen observer, tab-visibility,
    // and WebGL context restoration alike.
    const syncLoop = () => {
      // Before the opening fires we keep running regardless of onScreen (else the hero
      // title never reveals); afterwards, run only when on-screen. Always pause on a
      // hidden tab. This also lets a context lost BEFORE introFired resume on restore.
      const shouldRun = !document.hidden && (!introFired || onScreen);
      renderer.setAnimationLoop(shouldRun ? renderLoop : null);
    };
    const visIO = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting === onScreen) return;
        onScreen = e.isIntersecting;
        syncLoop();
      },
      { threshold: 0, rootMargin: "200px 0px" }
    );
    visIO.observe(mount);
    const onVisibility = () => syncLoop();
    document.addEventListener("visibilitychange", onVisibility);
    // If the GPU context is lost then restored, resume the loop (we preventDefault
    // on loss to keep it restorable rather than crashing).
    const onCtxRestored = () => {
      if (lostTimer) { clearTimeout(lostTimer); lostTimer = 0; }
      try { syncLoop(); }
      catch (error) { console.error("[SpektralLanding] WebGL restoration failed.", error); setGlFailed(true); }
    };
    renderer.domElement.addEventListener("webglcontextrestored", onCtxRestored, false);

    return () => {
      clearTimeout(showCtlTimerRef.current);
      if (lostTimer) clearTimeout(lostTimer);
      renderer.setAnimationLoop(null);
      visIO.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("webglcontextrestored", onCtxRestored);
      ro.disconnect();
      el.removeEventListener("pointerdown", dn);
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", up);
      el.removeEventListener("wheel", wheel);
      renderer.domElement.removeEventListener("webglcontextlost", onCtxLost);
      // dispose scene graph + generated textures (mirrors FurnishesIntro) so GPU
      // resources are reclaimed on remount rather than left to forceContextLoss alone
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      [texFabric, texPlaster, texWood, texWall].forEach((t) => { if (t && t.dispose) t.dispose(); });
      if (scene.environment && scene.environment.dispose) scene.environment.dispose();
      if (pmrem && pmrem.dispose) pmrem.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  if (glFailed) return <HouseFallback />;

  return (
    <div
      role="group"
      aria-label="Interactive furnished-house preview. Use the room buttons to zoom into a room and the Overview button to reset; pointer drag to rotate is an enhancement."
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div ref={mountRef} aria-hidden="true" style={{ position: "absolute", inset: 0 }} />


      {ROOM_NAMES.map((nm, ri) => (
        <button
          type="button"
          key={nm}
          ref={(el) => (labelRefs.current[ri] = el)}
          onClick={() => onRoomClick(ri)}
          aria-pressed={activeRoom === ri}
          aria-label={`Zoom into the ${nm.toLowerCase()} room`}
          title="click to zoom into this room"
          style={{
            /* dynamic: JS repositions this room-zoom pill to follow the pointer */
            position: "absolute", left: 0, top: 0, zIndex: 2, transform: "translate(-9999px,-9999px)",
            display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999,
            appearance: "none", border: 0,
            background: "#fff", color: "#6e1810", cursor: "pointer", pointerEvents: "auto", whiteSpace: "nowrap", userSelect: "none",
            font: '600 11px/1 "Space Mono", ui-monospace, monospace', letterSpacing: "0.13em",
            boxShadow: "0 5px 16px rgba(120,40,20,0.22)", transition: "opacity .25s, box-shadow .15s",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 999, background: "#FF5F33" }} />{nm}
        </button>
      ))}

      <button
        type="button"
        onClick={goOverview}
        className="house-overview"
        style={{
          position: "absolute", top: 18, left: 18, zIndex: 3,
          padding: "8px 16px", borderRadius: 999, cursor: "pointer",
          border: "1px solid rgba(200,90,50,0.32)", background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#6e1810",
          font: '600 11px/1 "Space Mono", ui-monospace, monospace', letterSpacing: "0.18em", textTransform: "uppercase",
          opacity: activeRoom != null ? 1 : 0,
          pointerEvents: activeRoom != null ? "auto" : "none",
          transition: "opacity .3s ease",
        }}
      >
        Overview
      </button>

      <button
        type="button"
        onClick={togglePause}
        aria-pressed={paused}
        style={{
          position: "absolute", bottom: 22, left: "50%", zIndex: 3,
          display: "flex", alignItems: "center", gap: 9,
          padding: "9px 20px", borderRadius: 999, cursor: "pointer",
          border: "1px solid rgba(200,90,50,0.32)", background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#6e1810",
          font: '600 11px/1 "Space Mono", ui-monospace, monospace', letterSpacing: "0.18em", textTransform: "uppercase",
          opacity: showCtl ? 1 : 0,
          transform: showCtl ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(10px)",
          pointerEvents: showCtl ? "auto" : "none",
          transition: "opacity 1s ease, transform 1.1s cubic-bezier(.16,.84,.3,1)",
        }}
      >
        <span style={{ display: "inline-flex", color: "#C95E2D" }} aria-hidden="true">
          {paused ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 5 L19 12 L8 19 Z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M9 6 V18" />
              <path d="M15 6 V18" />
            </svg>
          )}
        </span>
        {paused ? "Resume" : "Pause"}
      </button>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0.13, mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "140px 140px" }} />
    </div>
  );
}

/* Section model shared by the left rail and the bottom-right index. */
/* 4 nav items; each owns a GROUP of [ xx ] sections (page order). Clicking an
   item jumps to the FIRST section of its group (item.id === first section id). */
const SIDENAV_SECTIONS = [
  { id: "about", label: "About", desc: "Who we are and how we work.", group: ["about"] },
  { id: "experience", label: "Experience", desc: "Design that feels natural to live in.", group: ["experience"] },
  { id: "studio", label: "Studio", desc: "We build the image before it's built.", group: ["studio", "about-intro"] },
  { id: "about-projects", label: "Work", desc: "Projects, teams, journal, and how to reach us.", group: ["about-projects", "about-teams", "about-blog", "heritage", "waitlist", "contact"] },
];
/* flat page-order list for the scroll spy: section id -> owning nav item */
const SPY_ORDER = SIDENAV_SECTIONS.flatMap((s) => s.group.map((sec) => ({ sec, nav: s.id })));

function scrollToSection(id, find) {
  if (id === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = find ? find(id) : document.getElementById(id);
  if (!el) return;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY,
    behavior: "smooth",
  });
}

/* Single scroll-spy reused by both nav surfaces so they stay perfectly synced. */
function useSectionSpy() {
  const [active, setActive] = useState("");
  const findEl = useScopedFindEl();
  useEffect(() => {
    /* PERF: section tops are MEASURED only on mount/resize (and twice more after
       mount for late layout: fonts/3D). The scroll handler is pure arithmetic on
       cached numbers + rAF-throttled, the old version called
       getBoundingClientRect for every section on every scroll event, which with
       the damped scroll (a scroll event per frame) forced ~600 reflows/sec and
       made scrolling stutter. */
    let tops = [];
    const measure = () => {
      tops = SPY_ORDER.map((s) => {
        const el = findEl(s.sec);
        return el ? { nav: s.nav, top: el.getBoundingClientRect().top + window.scrollY } : null;
      }).filter(Boolean);
    };
    let raf = 0;
    const compute = () => {
      raf = 0;
      const line = window.scrollY + window.innerHeight * 0.5;
      let cur = "";   // in the hero, no item is active
      for (const t of tops) if (line >= t.top) cur = t.nav;
      setActive((a) => (a === cur ? a : cur));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    const remeasure = () => { measure(); onScroll(); };
    measure(); compute();
    const t1 = setTimeout(remeasure, 600), t2 = setTimeout(remeasure, 2200);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
    };
  }, []);
  return active;
}

/* Sticky left section rail: brackets the active section, shows a small blurb
   under it, smooth-scrolls on click. Light over the hero, warm-dark on cream. */
function SidebarNav() {
  const active = useSectionSpy();
  const findEl = useScopedFindEl();
  const [atFooter, setAtFooter] = useState(false);
  useEffect(() => {
    const foot = findEl("contact");
    if (!foot) return;
    const io = new IntersectionObserver(
      ([e]) => setAtFooter(e.isIntersecting),
      { root: null, rootMargin: "0px 0px -30% 0px", threshold: 0 }
    );
    io.observe(foot);
    return () => io.disconnect();
  }, []);
  const theme = active === "contact" ? "light" : "dark";
  const hidden = atFooter || active === "contact";
  return (
    <nav
      className={"sidenav sidenav--" + theme + (hidden ? " sidenav--hidden" : "")}
      aria-label="Section"
    >
      {SIDENAV_SECTIONS.filter((s) => s.id !== "contact").map(({ id, label, desc }) => {
        const on = active === id;
        return (
          <div key={id} className="sidenav__item">
            <button
              type="button"
              className="sidenav__btn"
              onClick={() => scrollToSection(id, findEl)}
              aria-current={on ? "location" : undefined}
            >
              {on && <span className="sidenav__bk" aria-hidden="true">[</span>}
              <span className="sidenav__lb" data-active={String(on)}>
                {label}
              </span>
              {on && <span className="sidenav__bk" aria-hidden="true">]</span>}
            </button>
            {on && <p className="sidenav__desc">{desc}</p>}
          </div>
        );
      })}
    </nav>
  );
}

/* "Who are we", adapted from the zip's AboutWhoWe / AboutHeroText, images
   stripped: a manifesto paragraph whose characters reveal grey → black as the
   section scrolls through the viewport, with two phrases lifting to accent. */
const ABOUT_PARTS = [
  ["We understand that ", 0],
  ["good design ", 1],
  ["goes beyond aesthetics. ", 0],
  ["Our philosophy ", 0],
  ["centers around creating functional, ", 0],
  ["comfortable ", 1],
  ["spaces. ", 0],
  ["We listen first to what matters, then we shape light and layout to how you live, work, and rest.", 0],
];
const ABOUT_CHARS = (() => {
  const out = [];
  for (const [text, hl] of ABOUT_PARTS) for (const ch of text) out.push({ ch, hl: !!hl });
  return out;
})();

function WhoAreWe() {
  const secRef = useRef(null);
  const copyRef = useRef(null);
  const spanRefs = useRef([]);
  const lastRef = useRef(-1);

  useEffect(() => {
    const GREY = "#6b7280", BLACK = "#6e1810", ACCENT = "var(--accent-hi)";
    const total = ABOUT_CHARS.length;
    // motion restored: the scroll-driven character reveal always runs.
    let raf;
    let visible = false;
    const vio = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting; },
      { rootMargin: "120px 0px" }
    );
    if (secRef.current) vio.observe(secRef.current);
    const tick = () => {
      const sec = secRef.current;
      if (sec && visible) {
        const el = copyRef.current || sec;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        /* Reader-arrival timing. This paragraph naturally sits around the middle
           of the viewport once the visitor lands on the section, so the paint
           must NOT begin while the text is still entering at the bottom (earlier
           mappings did, and the reveal was half done before you settled).
           We track the TEXT BLOCK itself (not the padded section), start only
           when its top reaches 62% of the viewport (you have arrived and begun
           reading), finish by 16% (near the top), and ease the start (p^1.4)
           so the first characters warm up gently rather than in a burst. */
        const start = vh * 0.62;   // text top here → p = 0 (reader has arrived)
        const end = vh * 0.16;     // text top here → p = 1
        let p = (start - r.top) / (start - end);
        p = Math.max(0, Math.min(1, p));
        p = Math.pow(p, 1.4);      // slow start, natural finish
        const count = Math.round(p * total);
        if (count !== lastRef.current) {
          const lo = Math.max(0, Math.min(lastRef.current, count));
          const hi = Math.max(lastRef.current, count);
          for (let i = lo; i < hi; i++) {
            const el = spanRefs.current[i];
            if (!el) continue;
            el.style.color = i < count ? (ABOUT_CHARS[i].hl ? ACCENT : BLACK) : GREY;
          }
          lastRef.current = count;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); vio.disconnect(); };
  }, []);

  return (
    <section className="block block--about" id="about" ref={secRef}>
      <p className="eyebrow about__eyebrow">
        <span className="about__bk">[</span> Who are we <span className="about__bk">]</span>
      </p>
      <p className="about__copy" ref={copyRef}>
        {ABOUT_CHARS.map((c, i) => (
          <span
            key={i}
            ref={(el) => (spanRefs.current[i] = el)}
            style={{ color: "#6b7280" }}
          >
            {c.ch}
          </span>
        ))}
      </p>
    </section>
  );
}

/* "Experience", restructured from the zip's ExperienceSection: image dropped,
   e-commerce copy (shipping / payment / support, the stat band) rewritten for a
   3D / interior studio, palette folded into the warm landing. Keeps the original
   bones: split intro, a philosophy block, a centred line, three icon features. */
const EXP_FEATURES = [
  {
    title: "Concept & lookdev",
    body: "We develop the look, mood and material language of a space long before a single wall is built.",
    icon: "layers",
  },
  {
    title: "Lighting & mood",
    body: "Light, shadow and surface tuned frame by frame until every room reads true to life.",
    icon: "sun",
  },
  {
    title: "Final frames",
    body: "Production-ready stills and motion, delivered for film, games and architecture.",
    icon: "frame",
  },
];

function ExpGlyph({ type }) {
  const c = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (type === "layers")
    return (
      <svg {...c}>
        <path d="M12 3 4 7l8 4 8-4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 17l8 4 8-4" />
      </svg>
    );
  if (type === "sun")
    return (
      <svg {...c}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    );
  return (
    <svg {...c}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M8 4v16" />
      <path d="M13 11.5l4 2.5-4 2.5z" />
    </svg>
  );
}

/* Heritage band, the middle of the three closing gradients (peach → accent),
   mirroring the zip: a bracketed CTA label, a two-line headline, a two-paragraph
   tagline, and a 01–05 timeline accordion. Cream type on the warm wash; the
   section is tall so the peach→orange transition is spread out and natural. */
function HeritageSection() {
  const [open, setOpen] = useState(0);
  const findEl = useScopedFindEl();
  return (
    <section className="her" id="heritage">
      <div className="her__in">
        <div className="her__head">
          <a
            className="her__label reveal"
            href="#contact"
            onClick={(e) => {
              /* native hash jump teleports instantly to the footer (feels like the
                 page "disappeared"); intercept and smooth-scroll instead */
              e.preventDefault();
              const el = findEl("contact");
              if (!el) return;
              const y = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
              window.scrollTo({ top: Math.max(0, y - 8), behavior: "smooth" });
            }}
          >[ Start your project ]</a>
          <h2 className="her__h reveal">
            Heritage<br />
            <span className="her__h-i">we</span> preserve
          </h2>
          <div className="her__tag reveal">
            <p>
              From workshop roots to full interiors, craft, clarity, and lasting
              materials stay at the center of how we work.
            </p>
            <p>
              We still sketch with real samples, watch light move through a room,
              and choose finishes that feel honest in the hand. The process stays
              quiet and deliberate, clear plans, steady partners, and spaces
              built to live well long after the first reveal.
            </p>
          </div>
        </div>

        <ul className="her__list">
          {LANDING_CONTENT.heritageItems.map(({ title, category, body }, i) => {
            const isOpen = open === i;
            return (
              <li key={title} className="her__row reveal">
                <button
                  className={"her__rowtop" + (isOpen ? " is-open" : "")}
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="her__no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="her__title">{title}</span>
                  <span className="her__cat">{category}</span>
                  <span className="her__chev" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                <div className={"her__body" + (isOpen ? " is-open" : "")}>
                  <div className="her__body-in">
                    <p>{body}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* Waitlist band, compact, centred sign-up grounded in the configurable
   collection. Kept narrow and centred so it never collides with the fixed
   bottom-left section nav, and so the input + button read as one tidy object
   rather than two elements stranded at opposite edges. No <form> element
   (button onClick + Enter) for artifact compatibility. */
function WaitlistBand({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | invalid | pending | success | duplicate | error
  const inputRef = useRef(null);
  const validEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    if (status === "pending") return;                       // guard against double-submit while a request is in flight
    const v = email.trim();
    if (!validEmail(v)) {
      setStatus("invalid");
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    setStatus("pending");
    try {
      // The surface receives onSubmit from the wrapper (or a host app). With no
      // handler wired we fall back to an optimistic success so the standalone demo
      // still runs; a real integration returns { ok } or { ok:false, reason }.
      const result = onSubmit ? await onSubmit(v) : { ok: true };
      if (result && result.ok === false && result.reason === "duplicate") setStatus("duplicate");
      else if (result && result.ok === false) setStatus("error");
      else setStatus("success");
    } catch (err) {
      setStatus("error");
    }
  };
  const done = status === "success" || status === "duplicate";
  const showErr = status === "invalid" || status === "error";
  return (
    <section className="wl" id="waitlist" aria-labelledby="wl-h">
      <div className="wl__in">
        <div className="wl__left">
          <p className="wl__tag reveal">[ Early access &middot; 2026 ]</p>
          <h2 className="wl__h reveal" id="wl-h">
            Be <span className="wl__h-i">first</span> through the door.
          </h2>
          <p className="wl__lead reveal">
            Be first to configure Plinth, Wedge, and Cylinder in Bone &amp; Moss.
            One note the day it opens, nothing more.
          </p>
        </div>

        <div className="wl__right reveal">
          {done ? (
            <p className="wl__done" role="status">
              {status === "duplicate"
                ? <>You&rsquo;re already on the list, <span className="wl__done-i">see you at launch.</span></>
                : <>You&rsquo;re on the list, <span className="wl__done-i">see you at launch.</span></>}
            </p>
          ) : (
            <form className="wl__form" onSubmit={handleSubmit} noValidate>
              <label className="wl__flabel" htmlFor="wl-email">Email address</label>
              <div className={"wl__field" + (showErr ? " wl__field--err" : "")}>
                <input
                  id="wl-email"
                  ref={inputRef}
                  className="wl__input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@studio.com"
                  value={email}
                  disabled={status === "pending"}
                  aria-invalid={showErr}
                  aria-describedby="wl-note"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (showErr) setStatus("idle");
                  }}
                />
                <button
                  className="wl__go"
                  type="submit"
                  disabled={status === "pending"}
                  aria-label={status === "pending" ? "Joining the waitlist" : "Join the waitlist"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={status === "pending" ? { opacity: 0.5 } : undefined}>
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
              {status === "invalid" ? (
                <p id="wl-note" className="wl__note wl__note--err" role="alert">
                  Please enter a valid email address.
                </p>
              ) : status === "error" ? (
                <p id="wl-note" className="wl__note wl__note--err" role="alert">
                  Something went wrong. Please try again.
                </p>
              ) : status === "pending" ? (
                <p id="wl-note" className="wl__note" role="status">Adding you&hellip;</p>
              ) : (
                <p id="wl-note" className="wl__note">No spam, unsubscribe anytime.</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section className="block block--exp" id="experience">
      {/* intro: label + accent title on the left, lead paragraph on the right */}
      <div className="exp__intro">
        <div className="exp__intro-head reveal">
          <p className="eyebrow about__eyebrow">
            <span className="about__bk">[</span> Experience <span className="about__bk">]</span>
          </p>
          <h2 className="exp__title">
            For <span className="exp__accent">modern</span>
            <br />
            living.
          </h2>
        </div>
        <p className="exp__lead reveal">
          Good design should feel natural in daily life: easy to live with, calm
          to look at, genuinely pleasant to use. We work with people who
          understand how a space is really lived in, so every room stays
          thoughtful, durable and honest from first sketch to final frame.
        </p>
      </div>

      {/* page 2 of the section: [ Our philosophy ] + quote + features, one full viewport */}
      <div className="exp__page2">
      {/* philosophy: no photo, title + label on the left, body on the right */}
      <div className="exp__phil">
        <div className="exp__phil-head reveal">
          <h3 className="exp__subtitle">
            Futuristic &amp;
            <br />
            minimalist.
          </h3>
          <p className="exp__phil-label">[ Our philosophy ]</p>
        </div>
        <p className="exp__phil-body reveal">
          What you see on screen is what gets built. Every project is led by
          specialists who care about proportion, light and the honest use of
          materials, and who stay close to the work until the last detail feels
          right, clear updates along the way, finishes that age well.
        </p>
      </div>

      {/* centred line */}
      <p className="exp__quote reveal">
        &ldquo;A space should feel right long before it&rsquo;s real.&rdquo;
      </p>

      {/* three features, icon over an accent dot, then title + copy */}
      <div className="exp__features">
        {EXP_FEATURES.map((f) => (
          <div key={f.title} className="exp__feat reveal">
            <span className="exp__feat-ic">
              <span className="exp__feat-dot" aria-hidden="true" />
              <span className="exp__feat-glyph">
                <ExpGlyph type={f.icon} />
              </span>
            </span>
            <div className="exp__feat-tx">
              <div className="exp__feat-h">{f.title}</div>
              <p className="exp__feat-p">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

/* Sticky bottom-right index [00]…[03], synced to the same active section. */
function SectionIndex({ inline = false, show = false }) {
  const active = useSectionSpy();
  const findEl = useScopedFindEl();
  // floating index recolors per section; the inline one lives on the orange band, so it stays light
  const theme = inline ? "light" : active === "contact" ? "light" : "dark";
  const cls =
    "sindex sindex--" + theme +
    (inline ? " sindex--inline" : "") +
    (inline || show ? " is-in" : "") +
    (!inline && active === "contact" ? " sindex--hidden" : "");
  return (
    <div className={cls} aria-hidden="true">
      {SIDENAV_SECTIONS.filter((s) => s.id !== "contact").map(({ id }, i) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            className="sindex__item"
            data-active={String(on)}
            onClick={() => scrollToSection(id, findEl)}
            tabIndex={-1}
          >
            [{String(i).padStart(2, "0")}]
          </button>
        );
      })}
    </div>
  );
}

/* ── About-us sections folded in from the prod /about page (images dropped,
   recoloured to the warm landing: dark-brown ink on cream). Intro headline with
   accent words, a projects timeline, an auto-rotating team list, a blog grid. ── */
const AB_INTRO_PARTS = [
  { t: "Fusing " },
  { t: "passion", hl: true },
  { t: " and " },
  { t: "craft", hl: true },
  { t: ": every space tells a story with Furnishes." },
];
const AB_INTRO_TAGLINE =
  "Honest materials, careful detail, rooms that feel like yours.";
const AB_INTRO_SUB =
  "From concept to completion, our approach is an innovative fusion of craftsmanship, sustainable choices, and timeless design.";
const AB_INTRO_COL1 =
  "Furnishes draws on a wide spectrum of design traditions and contemporary practice. From the clarity of minimalism and the richness of natural materials to the rigor of space planning, our roots run deep in both craft and function.";
const AB_INTRO_COL2 =
  "This blend of influence fuels interiors that are as livable as they are distinctive, balancing rhythm, restraint, and refinement. It is in this intersection that Furnishes creates something lasting: spaces shaped by care and expertise.";

const AB_PROJECTS_LABEL = "Projects";

const AB_TEAMS_LABEL = "Teams";

const AB_BLOG_LABEL = "Blog";

function AbArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M17 7v6M17 7h-6" />
    </svg>
  );
}

function AboutIntro() {
  return (
    <section className="block block--ab ab-intro" id="about-intro">
      <div className="ab-intro__head reveal">
        <p className="ab-head__label" style={{ margin: "0 0 clamp(16px,2vw,26px)" }}>[ Who we are ]</p>
        <h2 className="ab-intro__h">
          {AB_INTRO_PARTS.map((p, i) => (
            <span key={i} className={p.hl ? "ab-accent" : undefined}>{p.t}</span>
          ))}
        </h2>
        <p className="ab-intro__tag">{AB_INTRO_TAGLINE}</p>
      </div>
      <p className="ab-intro__col1 reveal">{AB_INTRO_COL1}</p>
      <div className="ab-intro__split reveal">
        <h3 className="ab-intro__sub">{AB_INTRO_SUB}</h3>
        <p className="ab-intro__col2">{AB_INTRO_COL2}</p>
      </div>
    </section>
  );
}

function AboutProjects() {
  return (
    <section className="block block--ab ab-proj" id="about-projects">
      <header className="ab-head reveal">
        <p className="ab-head__label">[ {AB_PROJECTS_LABEL} ]</p>
        <h2 className="ab-head__h">A recognition of design <span className="h-accent">excellence</span> shaped by dedication, innovation, and lasting influence.</h2>
      </header>
      <ul className="ab-proj__list">
        {LANDING_CONTENT.projects.map((e) => (
          <li key={e.year} className="ab-proj__row reveal">
            <span className="ab-proj__year">{e.year}</span>
            <div className="ab-proj__main">
              <p className="ab-proj__award">{e.award}</p>
              <p className="ab-proj__meta">{e.project}, {e.result}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AboutTeams() {
  const [active, setActive] = useState(0);
  const pause = useRef(false);
  useEffect(() => {
    // Approved Landing-wide exception: motion always plays (no prefers-reduced-motion gate).
    const n = LANDING_CONTENT.teamMembers.length;
    const id = window.setInterval(() => {
      if (pause.current) return;
      setActive((i) => (i + 1) % n);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <section className="block block--ab ab-team" id="about-teams">
      <header className="ab-head reveal">
        <p className="ab-head__label">[ {AB_TEAMS_LABEL} ]</p>
        <h2 className="ab-head__h">A team united by <span className="h-accent">vision</span>, craft, and timeless design.</h2>
      </header>
      <ul
        className="ab-team__list reveal"
        onMouseLeave={() => { pause.current = false; }}
      >
        {LANDING_CONTENT.teamMembers.map((m, i) => {
          const on = active === i;
          return (
            <li key={m.name} className={"ab-team__row" + (on ? " is-on" : "")}>
              <button
                type="button"
                className="ab-team__btn"
                aria-current={on ? "true" : undefined}
                onMouseEnter={() => { pause.current = true; setActive(i); }}
                onClick={() => { pause.current = true; setActive(i); }}
                onFocus={() => { pause.current = true; setActive(i); }}
              >
                <span className="ab-team__dot" aria-hidden="true" />
                <span className="ab-team__name">{m.name}</span>
                <span className="ab-team__role">{m.role}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="ab-team__panel reveal" aria-live="polite">
        {LANDING_CONTENT.teamMembers.map((m, i) => (
          <p
            key={m.name}
            className={"ab-team__desc" + (active === i ? " is-on" : "")}
          >
            {m.desc}
          </p>
        ))}
      </div>
    </section>
  );
}

function AboutBlog() {
  return (
    <section className="block block--ab ab-blog" id="about-blog">
      <header className="ab-head reveal">
        <p className="ab-head__label">[ {AB_BLOG_LABEL} ]</p>
        <h2 className="ab-head__h">Insights shaped by our exploration of <span className="h-accent">space</span> and design.</h2>
      </header>
      <div className="ab-blog__grid">
        {LANDING_CONTENT.journalEntries.map((b) => (
          <article key={b.title} className="ab-blog__card reveal">
            <span className="ab-blog__read">{b.read}</span>
            <h3 className="ab-blog__title">{b.title}</h3>
            <span className="ab-blog__arrow"><AbArrow /></span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SpektralLandingSurface({ skipIntro, onNavigate = () => {}, onLogin, onSubmitWaitlist }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [introDone, setIntroDone] = useState(false);       // true once the 3D opening settles into its circling overview
  const handleIntroDone = useCallback(() => setIntroDone(true), []);
  // Safety net: the hero title/text are held until the 3D reports "settled". Never let
  // them stay hidden, reveal immediately when returning (skipIntro), and within a few
  // seconds otherwise even if WebGL fails and onIntroDone never fires.
  useEffect(() => {
    if (skipIntro) { setIntroDone(true); return; }
    const t = setTimeout(() => setIntroDone(true), 7000);
    return () => clearTimeout(t);
  }, [skipIntro]);

  const stageRef = useRef(null);
  const bandRef = useRef(null);
  const mainRef = useRef(null);
  const topbarRef = useRef(null);
  const rootRef = useRef(null);   // surface root, used to scope .reveal queries to this surface (not document-wide)
  const blurbRef = useRef(null);
  const tagRef = useRef(null);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const menuWasOpen = useRef(false);

  const closeMenu = () => setMenuOpen(false);
  /* Native scrolling is the baseline — no wheel interception, no damped lerp.
     We only keep a short-lived "page is scrolling right now" flag so the 3D render
     loop can drop to half-rate during scroll; it clears shortly after scrolling
     stops. This is isolated and optional; it never drives the scroll position. */
  useEffect(() => {
    let idle;
    const onScroll = () => {
      spkScroll.active = true;
      clearTimeout(idle);
      idle = setTimeout(() => { spkScroll.active = false; }, 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(idle);
      spkScroll.active = false;
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  // Menu/nav intent leaves the surface as a typed destination; the wrapper decides
  // what it does. No in-surface placeholder page anymore.
  // Navigation is explicit: each menu item carries its own `destination`; behavior is
  // never derived from visible label text.
  const navigateTo = (destination) => { setMenuOpen(false); onNavigate(destination); };
  const pendingScrollRef = useRef(null);

  /* Navigation that also works while the menu is open: defer the actual
     scroll until the menu has closed and the body is un-pinned. */
  const navTo = (action) => {
    if (menuOpen) {
      pendingScrollRef.current = action;
      setMenuOpen(false);
    } else {
      action();
    }
  };

  /* Clicking the wordmark returns the visitor to the landing view. */
  const goHome = () =>
    navTo(() => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* CTA, jump to the contact section. (Computed offset so it also works
     while the content is driven by the damped-scroll transform.) */
  const goContact = () =>
    navTo(() => {
      const el = (rootRef.current || document).querySelector("#contact");
      if (!el) return;
      const y =
        el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      window.scrollTo({ top: Math.max(0, y - 8), behavior: "smooth" });
    });

  /* The topbar is transparent while the orange header is behind it (so the
     band's gradient + grain read as one continuous surface, no seam). Once
     the header has scrolled past, the topbar gets its own solid background
     so it stays legible over the cream content below. */
  useEffect(() => {
    /* PERF: band/bar heights are MEASURED only on mount/resize. The old handler
       read offsetHeight twice per scroll event, and with the damped scroll firing
       a scroll event per frame that forced ~120 reflows/sec mid-lerp — the source
       of the scroll stutter. Now the scroll path is pure arithmetic on cached
       numbers, and the React state only flips at the threshold crossing. */
    let threshold = 0;
    const measure = () => {
      const band = bandRef.current;
      const bar = topbarRef.current;
      const bandH = band ? band.offsetHeight : window.innerHeight * 0.24;
      const barH = bar ? bar.offsetHeight : 56;
      threshold = Math.max(0, bandH - barH - 1);
    };
    const onScroll = () => {
      setScrolled((window.scrollY || window.pageYOffset || 0) > threshold);
    };
    const remeasure = () => { measure(); onScroll(); };
    remeasure();
    const t1 = setTimeout(remeasure, 600);   // late layout: fonts / 3D settle
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    return () => {
      clearTimeout(t1);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  /* ── Layout: header takes a fixed share of the viewport, hero the rest ── */
  useEffect(() => {
    const MOBILE = 720;
    const root = document.documentElement;
    const prevNavH = root.style.getPropertyValue("--nav-h");   // restore on unmount so the surface doesn't leak this var onto <html>

    const apply = () => {
      const topbar = topbarRef.current;
      if (topbar) root.style.setProperty("--nav-h", topbar.offsetHeight + "px");

      const stage = stageRef.current;
      const band = bandRef.current;
      const main = mainRef.current;
      if (!stage || !band || !main) return;

      if (window.innerWidth < MOBILE) {
        stage.style.height = "";
        band.style.height = "";
        main.style.height = "";
        if (tagRef.current) tagRef.current.style.marginLeft = "";
        if (blurbRef.current) blurbRef.current.style.flexBasis = "";
        return;
      }
      const h = window.innerHeight;
      stage.style.height = h + "px";
      band.style.height = "";                 // auto, fit the large title

      // Move the "Visual development" blurb (and, by extension, the tagline) so
      // its left edge sits just to the RIGHT of the 3rd vertical separator.
      // The guides sit at 20/40/60/80% of the viewport, so the 3rd line is 60%.
      const blurb = blurbRef.current;
      const tag = tagRef.current;
      const cs = getComputedStyle(main);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const mainRect = main.getBoundingClientRect();
      const contentRight = mainRect.right - padR;
      const targetLeft = 0.6 * window.innerWidth + 14; // just past the 3rd line
      if (blurb) {
        const w = Math.max(220, contentRight - targetLeft);
        blurb.style.flexBasis = w + "px";
      }

      const bandH = band.offsetHeight;
      main.style.height = Math.max(0, h - bandH) + "px";

      // tagline + marker are right-aligned via CSS (align-self:flex-end); clear
      // any previous runtime offset so the marker meets the right padding edge.
      if (tag) tag.style.marginLeft = "0px";
    };

    apply();
    window.addEventListener("resize", apply, { passive: true });
    window.addEventListener("orientationchange", apply);
    window.visualViewport?.addEventListener("resize", apply, { passive: true });
    let fontsDisposed = false;
    const safeApply = () => { if (!fontsDisposed) apply(); };
    document.fonts?.ready.then(safeApply);   // re-measure once the title font loads (guarded post-unmount)

    return () => {
      fontsDisposed = true;
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      if (prevNavH) root.style.setProperty("--nav-h", prevNavH);
      else root.style.removeProperty("--nav-h");
    };
  }, []);

  useEffect(() => {
    const reduce = false;   // motion restored: always run the scroll-triggered section-text reveal.
    const timers = new Set();
    const schedule = (cb, delay) => {
      const t = window.setTimeout(() => { timers.delete(t); cb(); }, delay);
      timers.add(t);
      return t;
    };
    const els = (rootRef.current || document).querySelectorAll(".reveal");   // scoped to this surface, never other routes' .reveal
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    // Per-section reveal. When a section scrolls into view, ITS OWN .reveal items
    // cascade in with a small stagger. Each section is independent, so the entrance
    // always plays right as you reach that section, unlike the old design, which
    // fed every .reveal on the page through ONE global queue that drained one item
    // every 180ms and backed up on fast scroll, so animations dripped out seconds
    // after you'd already passed (or reached the bottom).
    const STAGGER = 90;     // ms between items inside the same section
    const MAX_STEPS = 6;    // cap the delay so a long section never lags far behind
    const groupOf = (el) => el.closest("section, footer") || el.parentElement;
    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        if (!entering.length) return;
        entering.forEach((el) => io.unobserve(el));
        // document order so each section's cascade runs top-to-bottom
        entering.sort((a, b) => ((a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1));
        // the stagger index resets per section → every section is its own cascade,
        // and there is no global timer to back up, so reveal tracks the scroll.
        const stepByGroup = new Map();
        entering.forEach((el) => {
          const g = groupOf(el);
          const step = stepByGroup.get(g) || 0;
          stepByGroup.set(g, step + 1);
          const delay = Math.min(step, MAX_STEPS) * STAGGER;
          el.style.transitionDelay = delay + "ms";
          el.classList.add("in");
          // drop the inline delay once the entrance finishes so it can't delay
          // later transitions on the same element (e.g. card hover). 850ms = the
          // .reveal transition duration.
          schedule(() => { el.style.transitionDelay = ""; }, delay + 900);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  /* ── Menu side-effects: focus management (move focus in, trap Tab, restore
     focus on close), close on Escape. No scroll lock (dropdown). ── */
  useEffect(() => {
    const root = document.documentElement;
    const focusablesIn = (el) =>
      el
        ? Array.from(
            el.querySelectorAll(
              'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((n) => n.offsetParent !== null)
        : [];

    if (menuOpen) {
      root.classList.add("menu-lock");
      const first = focusablesIn(menuRef.current)[0];
      if (first) requestAnimationFrame(() => first.focus());
      menuWasOpen.current = true;
    } else {
      root.classList.remove("menu-lock");
      if (pendingScrollRef.current) {
        const action = pendingScrollRef.current;
        pendingScrollRef.current = null;
        requestAnimationFrame(action);
      } else if (menuWasOpen.current && menuBtnRef.current) {
        /* Return focus to the trigger so keyboard users aren't dropped at the
           top of the document. (Skipped on initial mount and on nav actions.) */
        menuBtnRef.current.focus();
      }
      menuWasOpen.current = false;
    }

    const onKey = (e) => {
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key !== "Tab" || !menuOpen) return;
      const f = focusablesIn(menuRef.current);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-lock");   // never leave <html> locked if we unmount mid-open
    };
  }, [menuOpen]);

  return (
    <LandingRootContext.Provider value={rootRef}>
    <div className={"spektral" + (skipIntro ? " instant" : "")} data-surface="landing" ref={rootRef}>
      <style>{css}</style>

      {/* sticky condensed bar */}
      <div
        className={"topbar" + (scrolled ? " topbar--solid" : "")}
        ref={topbarRef}
      >
        <Grain id="barGrain" className="band__grain" />
        <div className="band__row util">
          <button
            type="button"
            className="util__menu label"
            ref={menuBtnRef}
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
          <button type="button" className="util__brand" onClick={goHome}>
            furnishes.
          </button>
          <button
            type="button"
            className="util__cta label"
            onClick={() => (onLogin ? onLogin() : goContact())}
          >
            login
          </button>
        </div>
      </div>

      {/* full-screen menu */}
      <div
        className={`menu${menuOpen ? " open" : ""}`}
        id="main-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        aria-hidden={!menuOpen}
      >
        <Grain id="menuGrain" className="m-grain" />

        <div className="m-wrap">
          <div className="m-grid">
            <div className="m-vline" />

            <div className="m-left">
              <div className="m-block" style={{ paddingBottom: "26px" }}>
                <div>
                  <div className="m-rev m-eyebrow" style={{ transitionDelay: ".30s" }}>
                    [ Work ]
                  </div>
                  <div className="m-rev m-h" style={{ transitionDelay: ".34s" }}>
                    Projects
                  </div>
                  <div className="m-rev" style={{ transitionDelay: ".40s" }}>
                    <button type="button" className="m-cta" onClick={() => navigateTo("work")}>
                      <span className="ctt">See all work</span>
                      <span className="car">→</span>
                    </button>
                  </div>
                </div>
                <div className="m-items">
                  {WORK_ITEMS.map((item, i) => (
                    <div
                      key={item.label}
                      className="m-rev"
                      style={{ /* dynamic: staggered by menu-item index i */ transitionDelay: `${0.36 + i * 0.03}s` }}
                    >
                      <button type="button" className="m-li" onClick={() => navigateTo(item.destination)}>
                        {item.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="m-block" style={{ paddingTop: "26px" }}>
                <div>
                  <div className="m-rev m-eyebrow" style={{ transitionDelay: ".46s" }}>
                    [ Studio ]
                  </div>
                  <div className="m-rev m-h" style={{ transitionDelay: ".50s" }}>
                    Furnishes
                  </div>
                  <div className="m-rev" style={{ transitionDelay: ".56s" }}>
                    <button type="button" className="m-cta" onClick={() => navigateTo("studio")}>
                      <span className="ctt">About the studio</span>
                      <span className="car">→</span>
                    </button>
                  </div>
                </div>
                <div className="m-items">
                  {STUDIO_ITEMS.map(({ label, destination, tag }, i) => (
                    <div
                      key={label}
                      className="m-rev"
                      style={{ /* dynamic: staggered by menu-item index i */ transitionDelay: `${0.52 + i * 0.03}s` }}
                    >
                      <button type="button" className="m-li" onClick={() => navigateTo(destination)}>
                        {label}
                      </button>
                      {tag && <span className="m-tag">{tag}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="m-right">
              {NAV_ITEMS.map(({ ix, label, destination, active }, i) => (
                <button
                  type="button"
                  key={label}
                  className={`m-rev m-nav${active ? " act" : ""}`}
                  style={{ /* dynamic: staggered by nav-item index i */ transitionDelay: `${0.4 + i * 0.05}s` }}
                  onClick={() => navigateTo(destination)}
                >
                  <span className="ix">{ix}</span>
                  {label}
                </button>
              ))}

              <div
                className="m-rev m-eyebrow"
                style={{ transitionDelay: ".62s", marginTop: "26px" }}
              >
                [ Connect ]
              </div>
              {LANDING_CONTENT.links.social.map((item, i) => (
                item.enabled && item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="m-rev m-nav m-sub"
                    style={{ /* dynamic: staggered by sub-item index i */ transitionDelay: `${0.66 + i * 0.04}s` }}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    key={item.label}
                    className="m-rev m-nav m-sub m-sub--disabled"
                    aria-disabled="true"
                    style={{ /* dynamic: staggered by sub-item index i */ transitionDelay: `${0.66 + i * 0.04}s` }}
                  >
                    {item.label}
                  </span>
                )
              ))}
              <a
                className="m-rev m-nav m-sub"
                style={{ transitionDelay: ".74s" }}
                href={`mailto:${LANDING_CONTENT.contact.emailAddress}`}
                onClick={closeMenu}
              >
                {LANDING_CONTENT.contact.emailAddress}
                <span className="m-cnt">[↗]</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* sticky left section rail */}
      <SidebarNav />

      {/* sticky bottom-right section index, synced to the rail */}
      <SectionIndex show={introDone} />

      {/* scroll layer */}
      <div id="smooth-content">
        <main>
        <div className="stage" ref={stageRef} id="home">
          {/* red-orange header */}
          <header className="band" ref={bandRef}>
            <Grain id="bandGrain" className="band__grain" />
            <div className="band__row lockup">
              <div className="lockup__title">
                <h1 className={"title" + (introDone ? " is-in" : "")} aria-label="Interior Revolution">
                  <span className="title__lg" style={{ "--o": 1, position: "relative", zIndex: 2 }}>Interior</span>
                  <span className="title__rev" style={{ opacity: 0.9, "--o": 0.9, position: "relative", zIndex: 2 }}>Revolution</span>
                  <span className="title__rev" style={{ opacity: 0.65, "--o": 0.65, position: "relative", zIndex: 2 }}>Revolution</span>
                  <span className="title__rev" style={{ opacity: 0.4, "--o": 0.4, position: "relative", zIndex: 2 }}>Revolution</span>
                  <span className="title__rev" style={{ opacity: 0.15, "--o": 0.15, position: "relative", zIndex: 2 }}>Revolution</span>
                </h1>
              </div>
              <div className={"lockup__right" + (introDone ? " is-in" : "")} ref={blurbRef}>
                <p className="label">
                  Visual development
                  <br />
                  and support in 3D production
                </p>
              </div>
            </div>
          </header>

          {/* cream main */}
          <div className="main" ref={mainRef}>
            <div className="main__grain" aria-hidden="true">
              <Grain id="mainTex" className="grain-fill grain-fill--tex" />
              <WarmGrain id="mainWarm" className="grain-fill grain-fill--warm" />
            </div>
            <div className="main__stage">
              <FurnishesHouse onIntroDone={handleIntroDone} skipIntro={skipIntro} />
            </div>
            <button
              type="button"
              className={"hero__tag" + (introDone ? " is-in" : "")}
              ref={tagRef}
              onClick={goContact}
            >
              <span className="hero__tagline">Move in, built to last</span>
              <span className="hero__mark" aria-hidden="true">
                <span className="hero__bracket">[</span>
                <span className="hero__mark-arrow">
                  <svg className="hero__arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 L17 7" />
                    <path d="M9 7 H17 V15" />
                  </svg>
                </span>
                <span className="hero__bracket">]</span>
              </span>
            </button>
          </div>
        </div>

        {/* below the fold */}
        <div className="below">
          <div className="below__grain" aria-hidden="true">
            <Grain id="belowTex" className="grain-fill grain-fill--tex" />
            <WarmGrain id="belowWarm" className="grain-fill grain-fill--warm" />
          </div>
          <WhoAreWe />

          <ExperienceSection />

          <section className="block block--intro" id="studio">
            <p className="eyebrow reveal">[ Studio · Furnishes ]</p>
            <h2 className="statement reveal">
              We build the <span className="statement__hi">image</span> of a place
              <br />
              before the place is built.
            </h2>
            <p className="lede reveal">
              Visual development and support across the full 3D pipeline , 
              concept, lookdev, lighting and final frames for film, games and
              architecture.
            </p>
          </section>

          <AboutIntro />

          <AboutProjects />

          <AboutTeams />

          <AboutBlog />

          <HeritageSection />

          <WaitlistBand onSubmit={onSubmitWaitlist} />
        </div>
        </main>

          <footer className="foot" id="contact">
            <a className="foot__cta" href="#contact">
              <span className="foot__cta-a">Sounds Interested? Let&rsquo;s get in</span>
              <span className="foot__cta-mid" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" />
                  <path d="M17 7v6M17 7h-6" />
                </svg>
              </span>
              <span className="foot__cta-b">touch today!</span>
            </a>

            <div className="foot__grid">
              <div className="foot__brand">
                <div className="foot__mark">furnishes.</div>
                <p className="foot__p foot__brand-p">
                  A design studio for high-quality, modern interiors, a seamless
                  process that shapes each space around how you live, work, and rest.
                </p>
              </div>

              <div className="foot__col">
                <h3 className="foot__h">[ Hours ]</h3>
                <p className="foot__p">
                  {LANDING_CONTENT.hours.rows.map((row, i) => (
                    <span key={i}>{i > 0 && <br />}{row}</span>
                  ))}
                </p>
              </div>

              <div className="foot__col">
                <h3 className="foot__h">[ Contact ]</h3>
                <p className="foot__p">
                  <a className="foot__link" href={`mailto:${LANDING_CONTENT.contact.emailAddress}`}>
                    {LANDING_CONTENT.contact.emailAddress}
                  </a>
                </p>
                <ul className="foot__social">
                  {LANDING_CONTENT.links.social.map((item) => (
                    <li key={item.label}>
                      {item.enabled && item.href
                        ? <a className="foot__link" href={item.href}>{item.label}</a>
                        : <span className="foot__link foot__link--disabled" aria-disabled="true">{item.label}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="foot__col">
                <h3 className="foot__h">[ Studio ]</h3>
                <p className="foot__p">
                  Visual development &amp; support across the full 3D pipeline.
                </p>
                <p className="foot__coord">{LANDING_CONTENT.studioLocation.label}</p>
              </div>
            </div>

            <div className="foot__legal">
              <div className="foot__legal-links">
                {LANDING_CONTENT.links.legal.map((item) => (
                  item.enabled && item.href
                    ? <a key={item.label} className="foot__link" href={item.href}>{item.label}</a>
                    : <span key={item.label} className="foot__link foot__link--disabled" aria-disabled="true">{item.label}</span>
                ))}
              </div>
              <div className="foot__copy">© {new Date().getFullYear()} Furnishes.</div>
            </div>
          </footer>
      </div>

    </div>
    </LandingRootContext.Provider>
  );
}

/* ──────────────────────────────────────────────────────────────
   Styles, ported from the original page. The hero photo variable
   was removed; the hero now shows the SVG graphic above instead.
   ────────────────────────────────────────────────────────────── */
const css = `
/* NOTE: webfonts, the global scrollbar-hide, and html{scroll-behavior} used to live
   here. They mutate document-level chrome, so they moved to the standalone wrapper's
   injected global style (STANDALONE_GLOBAL_CSS). A host app owns them at the layout
   level; this reusable surface is now fully scoped under .spektral. */
.spektral .menu{scrollbar-width:none}
.spektral .menu::-webkit-scrollbar{display:none}

.spektral{
  /* ── SHARED DESIGN TOKENS (contract with FurnishesApp) ──────────────────
     Keep these aligned across SpektralLanding + FurnishesApp:
     · --paper:#FFEDDF  = app --paper   (page/section background)
     · --cream:#FFF2E5 in app = warm white; here --cream currently = #FFEDDF
       (legacy). New code: use --paper for #FFEDDF, --cream-ui for #FFF2E5.
     · --ink:#6e1810 warm ink is the agreed cross-page text color (account css
       below says "warmed to match the landing + product page ink"); the app
       file still has #2A0E04 → align the APP side when next edited.
     · --terra / --on-orange / --topbar / --maxw / --pad: already identical.
     MOTION: three official curves —
       cubic-bezier(.16,.84,.3,1)  main (all ui motion, enters)
       cubic-bezier(.45,0,.7,.2)   accelerate-out (exits only)
       cubic-bezier(.76,0,.24,1)   symmetric cover/reveal (xfade only)
     BREAKPOINTS (new code only): 560 / 760 / 900 / 1000. Legacy odd widths
     get folded in when their component is next touched.
     ──────────────────────────────────────────────────────────────────── */
  --orange-lo:#c23600;
  --band-grad:linear-gradient(to bottom,#E83200 0%,#ED3F00 12%,#F34D00 24%,#F95C00 37%,#FE6A02 50%,#FF7806 64%,#FF8A10 80%,#FF9C18 100%);
  --paper:#FFEDDF;   /* = FurnishesApp --paper (canonical name) */
  --cream:var(--paper);        /* legacy alias */
  --cream-lite:var(--paper);   /* legacy alias（统一浅背景色）*/
  --ink:#6e1810;
  --ink-2:color-mix(in srgb,#6e1810 62%,transparent);   /* secondary text, = app --ink-2 */
  --on-orange:#FBF0DC;
  --terra:oklch(0.605 0.176 41);   /* unified with the account view + FurnishesApp terra */
  --accent-hi:#e7551a;   /* bright keyword-highlight orange (menu ground, accent words) */
  --pad:clamp(20px,3.4vw,44px);   /* side gutters, matched to FurnishesApp product page */
  --header-ratio:0.24;
  --maxw:1320px;   /* centered content frame, matched to FurnishesApp product page */
  --hero-shift:clamp(0px,2vw,34px);
}

.spektral *{box-sizing:border-box}
/* Controls that used to be spans/divs are now real <button>s. Strip UA button
   chrome at 0 specificity (:where) so each control's own class styling always wins
   and the appearance is unchanged; focus-visible outlines are intentionally kept. */
.spektral :where(button.m-li,button.m-cta,button.m-nav,button.hero__tag){-webkit-appearance:none;appearance:none;background:none;border:0;margin:0;padding:0;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;text-align:inherit;line-height:inherit;width:auto;cursor:pointer}
.spektral{
  background:var(--cream);
  color:var(--ink);
  font-family:"Space Mono",ui-monospace,monospace;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  overflow-x:hidden;            /* no horizontal sliver at the edges */
}
/* the cream fills behind everything so no dark document edge can peek through */
.spektral #smooth-content{background:var(--cream)}
.spektral a{color:inherit;text-decoration:none}
/* faint proportional vertical column guides, painted into each section's
   background (behind all content, so the 3D house renders on top of them). */
.spektral{
  --rule:rgba(42,14,4,.075);   /* aligned to FurnishesApp */
  --col-lines:linear-gradient(90deg,
    transparent 0 20%,var(--rule) 20%,var(--rule) calc(20% + 1px),
    transparent calc(20% + 1px) 40%,var(--rule) 40%,var(--rule) calc(40% + 1px),
    transparent calc(40% + 1px) 60%,var(--rule) 60%,var(--rule) calc(60% + 1px),
    transparent calc(60% + 1px) 80%,var(--rule) 80%,var(--rule) calc(80% + 1px),
    transparent calc(80% + 1px));
}
.spektral :focus-visible{outline:2px solid currentColor;outline-offset:3px}
/* sticky left section rail, bottom-left; its last item (Contact) sits level with [00] */
.spektral .sidenav{
  position:fixed;left:clamp(14px,2.2vw,34px);bottom:clamp(28px,5vh,58px);top:auto;transform:none;
  z-index:30;display:flex;flex-direction:column;gap:2px;
  font-family:"Archivo",sans-serif;font-weight:500;font-stretch:78%;
  transition:opacity .4s ease;
}
.spektral .sidenav--hidden{opacity:0;pointer-events:none}
.spektral .sidenav__item{display:flex;flex-direction:column}
.spektral .sidenav__btn{
  display:flex;flex-direction:row;align-items:center;gap:4px;
  padding:2px 0;cursor:pointer;background:none;border:0;text-align:left;
}
.spektral .sidenav__bk{flex-shrink:0;color:var(--terra);font-size:21px;font-weight:400;line-height:1}
.spektral .sidenav__lb{
  font-size:16px;letter-spacing:.02em;
  transition:color .3s,font-size .22s ease,opacity .3s,text-shadow .3s;
}
.spektral .sidenav__desc{
  margin:1px 0 2px;max-width:158px;font-size:12px;line-height:1.42;letter-spacing:.01em;
  animation:spk-fade .35s ease both;
}
.spektral .sidenav--light .sidenav__lb{color:var(--on-orange);text-shadow:0 1px 3px rgba(0,0,0,.4);opacity:.78}
.spektral .sidenav--light .sidenav__lb[data-active="true"]{opacity:1;font-size:18px;text-shadow:0 1px 4px rgba(0,0,0,.35)}
.spektral .sidenav--light .sidenav__desc{color:var(--on-orange);opacity:.82;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.spektral .sidenav--dark .sidenav__lb{color:rgba(107,44,18,.55)}
.spektral .sidenav--dark .sidenav__lb[data-active="true"]{color:#6b2c12;font-size:18px}
.spektral .sidenav--dark .sidenav__desc{color:rgba(107,44,18,.7)}
@keyframes spk-fade{from{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}
@media (max-width:720px){.spektral .sidenav{left:10px;gap:0}.spektral .sidenav__lb{font-size:15px}.spektral .sidenav--light .sidenav__lb[data-active="true"],.spektral .sidenav--dark .sidenav__lb[data-active="true"]{font-size:16px}.spektral .sidenav__desc{display:none}}
/* sticky bottom-right section index, synced to the rail */
.spektral .sindex{
  position:fixed;right:clamp(14px,2.4vw,40px);
  top:calc(var(--nav-h,64px) + clamp(44px,8vh,96px));bottom:auto;
  z-index:30;display:flex;flex-direction:row;gap:clamp(10px,1.2vw,20px);
  font-family:"Space Mono",monospace;font-weight:700;
  font-size:clamp(11px,.9vw,14px);letter-spacing:.14em;
  opacity:0;transform:translateY(14px);
  transition:opacity 1.1s ease .85s,transform 1.2s cubic-bezier(.16,.84,.3,1) .85s;
}
.spektral .sindex.is-in{opacity:1;transform:none}
.spektral .sindex.sindex--hidden{opacity:0;pointer-events:none}
/* inline variant, lives above the hero blurb instead of floating bottom-right */
.spektral .sindex--inline{position:static;right:auto;bottom:auto;
  gap:clamp(8px,.9vw,16px);font-size:clamp(10px,.82vw,13px);font-weight:400}
.spektral .sindex__item{
  background:none;border:0;cursor:pointer;padding:0;line-height:1;
  transition:opacity .25s ease,color .25s ease;
}
.spektral .sindex--light .sindex__item{color:var(--on-orange);opacity:.5;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.spektral .sindex--light .sindex__item[data-active="true"]{opacity:1;color:#fff}
.spektral .sindex--dark .sindex__item{color:rgba(107,44,18,.5)}
.spektral .sindex--dark .sindex__item[data-active="true"]{opacity:1;color:var(--terra)}
.spektral button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}

.spektral .label{
  font-family:"Space Mono",monospace;
  font-size:clamp(10px,0.78vw,12px);
  letter-spacing:.2em;
  text-transform:uppercase;
}

.spektral .stage{
  display:flex;flex-direction:column;
  height:100vh;height:100dvh;overflow:hidden;
}

/* red-orange header */
.spektral .band{
  flex:0 0 auto;
  background:var(--band-grad);
  color:var(--on-orange);
  position:relative;overflow:visible;
  display:flex;flex-direction:column;justify-content:flex-start;
  padding:var(--nav-h,60px) var(--pad) clamp(16px,2.2vh,26px);
}
.spektral .band__row{position:relative}  /* not a stacking context, so the title spans (all z2) sit above the 3D house (z1) in the root context */
.spektral .band__grain{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.8;mix-blend-mode:overlay;z-index:0}
.spektral .band > .band__grain{
  -webkit-mask-image:linear-gradient(to bottom,#000 48%,transparent 86%);
          mask-image:linear-gradient(to bottom,#000 48%,transparent 86%);
}

.spektral .topbar{
  position:fixed;top:0;left:0;right:0;z-index:50;
  color:var(--on-orange);
  background:transparent;          /* at the top the band shows through → no seam */
  padding:clamp(6px,0.95vh,11px) var(--pad);
  overflow:visible;
}
/* the solid background lives on a pseudo-element so it can fade in smoothly.
   while scrolling through the band the bar is transparent, so the band shows
   through and visibly lightens; once the bar passes the band it locks onto the
   band's very last orange (#FF9C18) so there's no jump and it stays that warm
   tone over the content below. */
.spektral .topbar::before{
  content:"";position:absolute;left:0;right:0;top:0;height:calc(100% + 24px);z-index:-1;
  background:linear-gradient(180deg,
    #E83200 0%,
    #F24A00 10%,
    #FA6400 22%,
    #FF8410 36%,
    #FF9C18 50%,
    rgba(255,156,24,0.78) 62%,
    rgba(255,156,24,0.50) 73%,
    rgba(255,156,24,0.28) 83%,
    rgba(255,156,24,0.10) 92%,
    rgba(255,156,24,0) 100%);
  opacity:0;transition:opacity .3s ease;
}
.spektral .topbar--solid::before{opacity:1}
.spektral .topbar .band__grain{opacity:0;transition:opacity .3s ease;
  -webkit-mask-image:linear-gradient(to bottom,#000 32%,transparent 78%);
          mask-image:linear-gradient(to bottom,#000 32%,transparent 78%)}
.spektral .topbar--solid .band__grain{opacity:.4}

.spektral .util{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}
.spektral .util .label{font-size:clamp(12px,1.05vw,15px);letter-spacing:.16em}
.spektral .util__menu,.spektral .util__cta{transition:opacity .2s}
.spektral .util__menu{justify-self:start}
.spektral .util__cta{
  justify-self:end;
  border:1px solid var(--on-orange);
  padding:.62em 1.05em;border-radius:2px;line-height:1;
  color:var(--on-orange);
  transition:opacity .2s,background-color .25s ease,color .25s ease;
}
.spektral .util__menu:hover{opacity:.7}
.spektral .util__cta:hover{opacity:1;background:var(--on-orange);color:var(--terra)}
.spektral .util__brand{
  justify-self:center;
  font-family:"Space Mono",monospace;
  font-weight:700;font-size:clamp(14px,1.05vw,16px);letter-spacing:.03em;
  transition:opacity .2s;
}
.spektral .util__brand:hover{opacity:.7}

.spektral .lockup{display:flex;align-items:flex-end;gap:clamp(16px,2.2vw,36px);flex-wrap:wrap;margin-top:clamp(0px,0.8vh,10px)}
.spektral .lockup__title{display:flex;align-items:center;gap:clamp(10px,1.4vw,24px)}
.spektral .title{
  font-family:"Archivo",sans-serif;text-transform:uppercase;
  line-height:.92;letter-spacing:0;color:#9a4017;
  font-size:clamp(32px,5vw,84px);margin:0 0 0 -0.02em;
}
.spektral .title__lg{            /* Interior */
  display:block;color:#6b2c12;
  font-variation-settings:"wght" 500,"wdth" 118;
  font-size:.70em;
}
.spektral .title__rev{           /* Revolution */
  display:block;color:#9a4017;
  font-variation-settings:"wght" 500,"wdth" 118;
  font-size:1em;
}
.spektral .lockup__right{display:flex;align-items:center;margin-left:auto;position:relative;z-index:2;
  flex:0 0 clamp(320px,46%,560px)}
.spektral .lockup__right p{margin:0 0 0 auto;line-height:1.8;opacity:.92;color:#FFF6E9;white-space:nowrap;
  text-shadow:0 1px 2px rgba(42,14,4,.55),0 0 10px rgba(42,14,4,.42)}

/* cream main */
.spektral .main{
  flex:1 1 auto;position:relative;
  background:linear-gradient(to bottom,#FF9C18 0%,#FDA838 11%,#FAB45C 20%,#F6C485 29%,#F2D2A6 37%,#FFEDDF 46%,#FFEDDF 100%);
  min-height:0;
  padding:clamp(6px,1.8vh,30px) var(--pad) clamp(10px,1.4vh,18px);
  display:flex;flex-direction:column;gap:clamp(18px,3vh,40px);
}
/* tagline + [ ] marker, right-aligned so the marker's right edge meets the
   main's right padding (which lines up with the LOGIN button's right edge). */
.spektral .hero__tag{
  flex:0 0 auto;align-self:flex-end;position:relative;z-index:3;
  margin:clamp(-18px,-0.8vh,-2px) 0 0 0;
  width:auto;min-width:0;
  display:flex;align-items:center;gap:clamp(10px,1.3vw,22px);
  cursor:pointer;
}
.spektral .hero__tagline{
  margin:0;color:#6e1810;text-align:left;white-space:nowrap;
  font-family:"Archivo",sans-serif;font-weight:400;
  font-stretch:64%;letter-spacing:-0.02em;line-height:.9;
  font-size:clamp(24px,3.5vw,50px);
  text-shadow:0 1px 10px rgba(255,246,233,.4);
}
/* [ ] marker now sits to the right of the tagline; a right arrow fades into
   the brackets on hover. The arrow always occupies its slot (just invisible)
   so the brackets never shift when it appears. */
.spektral .hero__mark{
  flex:0 0 auto;display:inline-flex;align-items:center;
  color:#C95E2D;font-family:"Space Mono",monospace;font-weight:400;
  font-size:clamp(22px,2.8vw,40px);line-height:1;
}
.spektral .hero__bracket{display:inline-block}
.spektral .hero__mark-arrow{
  display:inline-flex;align-items:center;justify-content:center;width:1em;
  opacity:0;transform:translate(-2px,2px);
  transition:opacity .25s ease,transform .25s cubic-bezier(.16,.84,.3,1);
}
.spektral .hero__arrow-svg{width:.82em;height:.82em;display:block}
.spektral .hero__tag:hover .hero__mark-arrow,
.spektral .hero__tag:focus-visible .hero__mark-arrow{opacity:1;transform:translate(0,0)}
.spektral .hero__tagline{transition:opacity .2s ease}
.spektral .hero__tag:hover .hero__tagline{opacity:.78}
.spektral .hero__tag:focus-visible{outline:2px solid var(--terra);outline-offset:6px;border-radius:4px}

.spektral .hero{
  position:relative;flex:1 1 auto;min-height:0;
  border-radius:5px;overflow:hidden;background:#1a0f08;
  box-shadow:0 22px 50px -30px rgba(120,40,10,.55);
}
.spektral .hero__graphic{position:absolute;inset:0;width:100%;height:100%;display:block}
.spektral .hero__meta{position:absolute;inset:0;padding:clamp(12px,1.6vw,20px);
  display:flex;flex-direction:column;justify-content:space-between;color:var(--on-orange);pointer-events:none;
  text-shadow:0 1px 8px rgba(0,0,0,.55)}
.spektral .hero__meta .row{display:flex;justify-content:space-between;gap:16px}
.spektral .hero__meta .label{opacity:.85;font-size:clamp(9px,.7vw,11px)}

/* below the fold */
.spektral .below{position:relative;color:var(--ink);
  /* three evenly-spread vertical guides at 25/50/75% (split the width into 4 columns).
     each line is its own 1px background layer so it snaps crisply at any width,
     instead of a single multi-stop hairline gradient that drops lines on wide viewports. */
  background-color:var(--cream-lite);
  background-image:
    linear-gradient(rgba(42,14,4,.1),rgba(42,14,4,.1)),
    linear-gradient(rgba(42,14,4,.1),rgba(42,14,4,.1)),
    linear-gradient(rgba(42,14,4,.1),rgba(42,14,4,.1)),
    linear-gradient(rgba(42,14,4,.1),rgba(42,14,4,.1));
  background-size:1px 100%;
  background-position:20% 0,40% 0,60% 0,80% 0;
  background-repeat:no-repeat}
.spektral .below__grain{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
/* same grain on the hero's cream area, faded in over the orange→cream blend so
   the cream below the reel matches the grainy section beneath it seamlessly */
.spektral .main__grain{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,transparent 26%,#000 46%);
          mask-image:linear-gradient(to bottom,transparent 26%,#000 46%)}
.spektral .main > .hero__tag,.spektral .main > .hero{position:relative;z-index:1}
/* 3D house stage: extends up over the orange band. LAYERING RULE, gradient background (z0) BELOW,
   house here (z1), and ALL text/UI ABOVE: the full title lockup incl. the faded REVOLUTION echoes
   (z2), the VISUAL DEV blurb (z2), hero__tag + room labels, and topbar/sidenav/index (z30–50). The
   canvas is alpha:true, so the empty area up in the band stays transparent and the orange + title
   show through; the house never occludes text. */
.spektral .main__stage{position:absolute;left:0;right:0;bottom:0;top:-44vh;z-index:1;}
.spektral .grain-fill{position:absolute;inset:0;width:100%;height:100%;display:block}
.spektral .grain-fill--tex{opacity:.1;mix-blend-mode:multiply}
.spektral .grain-fill--warm{opacity:.4;mix-blend-mode:normal}
.spektral .below > .block,.spektral .below > .foot{position:relative;z-index:1}
/* each [ xx ] block is one full-viewport section, adapting to the user's screen */
.spektral .below > section{min-height:100vh;min-height:100dvh;box-sizing:border-box;
  display:flex;flex-direction:column;justify-content:center}
/* experience holds TWO [ xx ] blocks; give each its own viewport instead of cramming */
.spektral .block--exp{justify-content:flex-start}
.spektral .exp__intro{min-height:calc(100vh - clamp(64px,12vh,150px)*2);min-height:calc(100dvh - clamp(64px,12vh,150px)*2)}
.spektral .exp__page2{min-height:100vh;min-height:100dvh;box-sizing:border-box;
  display:flex;flex-direction:column;justify-content:center;gap:clamp(26px,4.5vh,48px)}
.spektral .exp__page2 > *{margin-top:0;margin-bottom:0}
.spektral .block{box-sizing:border-box;width:100%;max-width:var(--maxw);margin:0 auto;
  min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;
  padding:clamp(64px,12vh,150px) var(--pad)}
/* ── [ xxx ] TAG SYSTEM (canonical spec) ─────────────────────────────
   Tier A, section tags ([ Experience ], [ Early access ], [ Hours ], menu eyebrow):
     Space Mono 400 + 0.3px stroke (semi-bold look) · clamp(11px,.85vw,13px) · letter-spacing .18em · uppercase
     ALWAYS bracketed "[ … ]" · color: var(--terra) on light bg / rgba(251,240,220,.72) on orange
   Tier B, row/meta tags (list categories, "3 min read"):
     Space Mono 400 plain (no stroke) · clamp(10px,.8vw,12px) · letter-spacing .18em · uppercase · muted · no brackets
   Any new tag must use one of these two tiers. ─────────────────────── */
.spektral .eyebrow,.spektral .exp__phil-label,.spektral .ab-head__label,.spektral .her__label,
.spektral .wl__tag,.spektral .m-eyebrow,.spektral .foot__h{
  font-weight:400;-webkit-text-stroke:0.3px currentColor;paint-order:stroke fill}
.spektral .her__cat,.spektral .ab-blog__read{font-weight:400}
.spektral .eyebrow{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.18em;
  font-size:clamp(11px,.85vw,13px);color:var(--terra);margin:0 0 clamp(22px,3vw,40px)}
.spektral .statement__hi{color:var(--accent-hi)}
.spektral .statement{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.015em;line-height:1.1;
  font-size:clamp(30px,5vw,58px);margin:0 0 clamp(24px,3vw,40px);max-width:18ch}
.spektral .lede{font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;max-width:56ch;opacity:.80;
  font-size:clamp(16px,1.25vw,19px);margin:0}
/* who-are-we: bracketed label + scroll-revealed manifesto copy */
.spektral .about__eyebrow{margin-bottom:clamp(18px,2.4vw,32px)}
.spektral .about__bk{color:var(--terra)}
.spektral .about__copy{font-family:"Archivo",sans-serif;font-weight:430;font-stretch:78%;letter-spacing:-0.012em;
  line-height:1.34;font-size:clamp(22px,3.6vw,48px);max-width:24ch;margin:0}
@media (min-width:760px){.spektral .about__copy{max-width:none}}
/* experience, split intro, philosophy, centred line, three icon features */
.spektral .block--exp{gap:clamp(40px,7vh,92px)}
.spektral .exp__intro{display:flex;flex-wrap:wrap;gap:clamp(22px,4vw,56px);align-items:center}
.spektral .exp__intro-head{flex:1 1 300px;min-width:258px}
.spektral .exp__title{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.015em;line-height:1.1;
  font-size:clamp(30px,5vw,58px);margin:8px 0 0;color:var(--ink)}
.spektral .exp__accent{color:var(--accent-hi)}
.spektral .exp__lead{flex:1.5 1 360px;min-width:280px;align-self:center;max-width:600px;margin:0;
  font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;font-size:clamp(16px,1.25vw,19px);opacity:.80;color:var(--ink)}
@media (min-width:880px){.spektral .exp__lead{text-align:right}}
.spektral .exp__phil{display:flex;flex-wrap:wrap;gap:clamp(22px,4vw,56px);align-items:center}
.spektral .exp__phil-head{flex:1 1 280px;min-width:238px}
.spektral .exp__subtitle{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.015em;line-height:1.1;
  font-size:clamp(30px,5vw,58px);margin:0;color:var(--ink)}
.spektral .exp__phil-label{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.18em;
  font-size:clamp(11px,.85vw,13px);color:var(--terra);margin:12px 0 0}
.spektral .exp__phil-body{flex:1.3 1 360px;min-width:280px;max-width:560px;margin:0;
  font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;font-size:clamp(16px,1.25vw,19px);opacity:.80;color:var(--ink)}
.spektral .exp__quote{text-align:center;margin:0 auto;max-width:22ch;color:var(--ink);
  font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.01em;line-height:1.28;
  font-size:clamp(22px,2.6vw,36px)}
.spektral .exp__features{display:grid;grid-template-columns:1fr;gap:clamp(26px,3vw,42px)}
@media (min-width:780px){.spektral .exp__features{grid-template-columns:repeat(3,1fr)}}
.spektral .exp__feat{display:flex;gap:15px;align-items:flex-start}
.spektral .exp__feat-ic{position:relative;flex-shrink:0;display:inline-flex;margin-top:2px}
.spektral .exp__feat-dot{position:absolute;right:-6px;bottom:-6px;width:42px;height:42px;border-radius:50%;
  background:var(--accent-hi);z-index:0}
.spektral .exp__feat-glyph{position:relative;z-index:1;display:flex;padding:11px;border-radius:50%;
  background:#fff;color:var(--ink);box-shadow:0 3px 12px rgba(42,14,4,.14)}
.spektral .exp__feat-h{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.005em;
  font-size:clamp(16px,1.4vw,20px);color:var(--ink)}
.spektral .exp__feat-p{font-family:"Archivo",sans-serif;font-weight:400;font-stretch:78%;line-height:1.5;opacity:.74;color:var(--ink);
  font-size:clamp(16px,1.25vw,19px);margin:6px 0 0}

/* ── about-us sections folded into the landing ── */
.spektral .block--ab{min-height:auto;justify-content:flex-start;gap:clamp(22px,3vh,40px);
  padding-top:clamp(54px,8.5vh,104px);padding-bottom:clamp(54px,8.5vh,104px)}
.spektral .ab-accent{color:var(--accent-hi)}
/* shared bracketed header */
.spektral .ab-head{display:grid;grid-template-columns:1fr;gap:clamp(10px,1.6vw,18px)}
@media (min-width:900px){.spektral .ab-head{grid-template-columns:minmax(110px,1.4fr) 8.6fr;gap:clamp(20px,3vw,48px);align-items:start}
  .spektral .ab-blog .ab-head{grid-template-columns:1fr;gap:clamp(10px,1.6vw,18px)}}
.spektral .ab-head__label{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.18em;
  font-size:clamp(11px,.85vw,13px);color:var(--terra);margin:0}
/* shared orange keyword highlight for headings (canonical class) */
.spektral .h-accent{color:var(--accent-hi)}
/* sub-section heading: same family as section h2 (460 / 78% / sentence case),
   one step below the main section size (main: clamp(30-34px,5vw,58-66px)) */
.spektral .ab-head__h{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.015em;line-height:1.14;
  font-size:clamp(30px,5vw,58px);margin:0;color:var(--ink);max-width:30ch}
/* intro */
.spektral .ab-rule{display:block;width:46px;height:2px;background:transparent;margin:0 0 clamp(16px,2vw,26px)}
.spektral .ab-intro__head{max-width:54ch}
.spektral .ab-intro__h{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.015em;line-height:1.1;
  font-size:clamp(30px,5vw,58px);margin:0;color:var(--ink)}
.spektral .ab-intro__tag{font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;
  font-size:clamp(16px,1.25vw,19px);opacity:.80;color:var(--ink);max-width:46ch;margin:clamp(14px,1.8vw,22px) 0 0}
.spektral .ab-intro__col1{font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;
  font-size:clamp(16px,1.25vw,19px);opacity:.80;color:var(--ink);margin:clamp(6px,1vh,14px) 0 0}
.spektral .ab-intro__split{display:grid;grid-template-columns:1fr;gap:clamp(18px,3vw,40px);margin-top:clamp(10px,2vh,26px)}
@media (min-width:900px){.spektral .ab-intro__split{grid-template-columns:5fr 7fr;gap:clamp(28px,4vw,56px);align-items:start}}
.spektral .ab-intro__sub{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.01em;line-height:1.3;
  font-size:clamp(22px,2.6vw,36px);margin:0;color:var(--ink)}
.spektral .ab-intro__col2{font-family:"Archivo",sans-serif;font-weight:400;font-stretch:78%;line-height:1.6;
  font-size:clamp(16px,1.25vw,19px);opacity:.82;color:var(--ink);margin:0}
/* projects timeline */
.spektral .ab-proj__list{list-style:none;margin:clamp(6px,1.2vh,16px) 0 0;padding:0}
.spektral .ab-proj__row{display:grid;grid-template-columns:1fr;gap:4px;
  padding:clamp(18px,2.3vw,28px) 0}
@media (min-width:760px){.spektral .ab-proj__row{grid-template-columns:120px 1fr;gap:clamp(20px,3vw,48px);align-items:baseline}}
.spektral .ab-proj__year{font-family:"Space Mono",monospace;font-size:clamp(13px,1vw,15px);color:var(--ink);opacity:.72}
.spektral .ab-proj__award{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.05em;
  font-size:clamp(12px,1vw,14px);color:var(--ink);margin:0;opacity:.92}
.spektral .ab-proj__meta{font-family:"Archivo",sans-serif;font-weight:440;font-stretch:78%;letter-spacing:-0.01em;
  font-size:clamp(16px,1.5vw,22px);color:var(--ink);margin:7px 0 0}
/* teams */
.spektral .ab-team__list{list-style:none;margin:clamp(6px,1.2vh,16px) 0 0;padding:0;max-width:760px}
.spektral .ab-team__row{}
.spektral .ab-team__btn{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:baseline;gap:clamp(8px,1.4vw,16px);
  width:100%;background:none;border:0;text-align:left;cursor:pointer;padding:clamp(14px,1.9vw,20px) 0}
.spektral .ab-team__dot{width:9px;height:9px;border-radius:50%;background:var(--accent-hi);align-self:center;
  transform:scale(.5);opacity:0;transition:transform .3s,opacity .3s}
.spektral .ab-team__row.is-on .ab-team__dot{transform:scale(1);opacity:1}
.spektral .ab-team__name{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;text-transform:uppercase;letter-spacing:.01em;
  font-size:clamp(16px,1.4vw,20px);color:var(--ink);opacity:.6;transition:opacity .3s,font-weight .3s}
.spektral .ab-team__row.is-on .ab-team__name{opacity:1;font-weight:600}
.spektral .ab-team__role{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.07em;
  font-size:clamp(11px,.85vw,13px);color:var(--ink);opacity:.68;text-align:right}
.spektral .ab-team__panel{position:relative;max-width:62ch;margin-top:clamp(16px,2.4vw,26px);min-height:8.4em}
@media (min-width:640px){.spektral .ab-team__panel{min-height:5.4em}}
@media (min-width:1000px){.spektral .ab-team__panel{min-height:4em}}
.spektral .ab-team__desc{position:absolute;inset:0;margin:0;pointer-events:none;
  font-family:"Archivo",sans-serif;font-weight:400;font-stretch:78%;line-height:1.55;
  font-size:clamp(16px,1.25vw,19px);color:var(--ink);opacity:0;transition:opacity .4s ease}
.spektral .ab-team__desc.is-on{opacity:.82;pointer-events:auto}
/* blog */
.spektral .ab-blog__grid{display:grid;grid-template-columns:1fr;gap:clamp(2px,1vw,8px);margin-top:clamp(6px,1.2vh,16px)}
@media (min-width:640px){.spektral .ab-blog__grid{grid-template-columns:1fr 1fr;column-gap:clamp(24px,3vw,44px)}}
@media (min-width:1000px){.spektral .ab-blog__grid{grid-template-columns:repeat(4,1fr);column-gap:clamp(20px,2.4vw,40px)}}
.spektral .ab-blog__card{display:flex;flex-direction:column;gap:7px;cursor:pointer;min-height:128px;
  padding:clamp(16px,1.7vw,22px) 0 clamp(18px,1.9vw,24px);
  transition:transform .3s ease}
.spektral .ab-blog__card:hover{transform:translateY(-4px)}
.spektral .ab-blog__read{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.18em;
  font-size:clamp(10px,.8vw,12px);color:var(--terra)}
.spektral .ab-blog__title{font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;text-transform:uppercase;letter-spacing:-0.005em;line-height:1.2;
  font-size:clamp(16px,1.4vw,20px);color:var(--ink);margin:2px 0 0}
.spektral .ab-blog__arrow{margin-top:auto;color:var(--accent-hi);display:inline-flex;
  opacity:0;transform:translate(-4px,4px);transition:opacity .3s,transform .3s}
.spektral .ab-blog__card:hover .ab-blog__arrow{opacity:1;transform:none}
.spektral .ab-blog__arrow svg{width:18px;height:18px}

/* waitlist band, compact, centred sign-up. Narrow measure keeps it clear of
   the fixed bottom-left nav and reads as one tidy object. Lives in the warm
   part of the page gradient; a light field surface lifts it off the wash. */
.spektral .wl{box-sizing:border-box;width:100%;max-width:var(--maxw);margin:0 auto;
  padding:clamp(78px,13vh,140px) var(--pad)}
.spektral .wl__in{max-width:1080px;margin:0;display:grid;grid-template-columns:1fr;
  gap:clamp(30px,5vw,52px);text-align:left}
@media (min-width:860px){.spektral .wl__in{grid-template-columns:1.12fr 0.88fr;gap:clamp(44px,6vw,92px);align-items:center}}
/* left: editorial copy */
.spektral .wl__tag{margin:0 0 clamp(16px,2vw,22px);font-family:"Space Mono",monospace;
  text-transform:uppercase;letter-spacing:.18em;font-size:clamp(11px,.85vw,13px);color:var(--terra)}
.spektral .wl__h{margin:0;font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;
  letter-spacing:-0.015em;line-height:1.04;color:var(--ink);font-size:clamp(30px,5vw,58px);max-width:12ch}
.spektral .wl__h-i{color:var(--accent-hi);font-style:italic;padding-right:.14em}
.spektral .wl__lead{margin:clamp(18px,2.2vw,26px) 0 0;max-width:40ch;
  font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;
  font-size:clamp(16px,1.25vw,19px);color:var(--ink);opacity:.80}
/* right: minimal underline signup */
.spektral .wl__right{width:100%}
.spektral .wl__form{width:100%;max-width:420px}
.spektral .wl__flabel{display:block;margin:0 0 clamp(10px,1.2vw,14px);font-family:"Space Mono",monospace;
  text-transform:uppercase;letter-spacing:.16em;font-size:clamp(10px,.78vw,11.5px);color:var(--ink);opacity:.72}
.spektral .wl__field{display:flex;align-items:center;gap:12px;width:100%;
  border-bottom:1.5px solid rgba(42,14,4,.32);padding:clamp(8px,1vw,12px) 0;
  transition:border-color .25s ease}
.spektral .wl__field:focus-within{border-color:var(--accent-hi)}
.spektral .wl__input{flex:1 1 auto;min-width:0;background:transparent;border:none;outline:none;
  font-family:"Space Mono",monospace;font-size:clamp(14px,1.15vw,16px);color:var(--ink);padding:0}
.spektral .wl__input::placeholder{color:rgba(42,14,4,.36)}
.spektral .wl__go{flex:0 0 auto;cursor:pointer;background:none;border:none;padding:4px;
  display:inline-flex;color:var(--ink);transition:color .2s ease}
.spektral .wl__go svg{width:clamp(20px,1.8vw,24px);height:clamp(20px,1.8vw,24px);
  transition:transform .3s cubic-bezier(.16,.84,.3,1)}
.spektral .wl__go:hover{color:var(--accent-hi)}
.spektral .wl__go:hover svg{transform:translateX(3px)}
.spektral .wl__field--err{border-color:#b3331a}
.spektral .wl__note{margin:clamp(12px,1.4vw,16px) 0 0;font-family:"Space Mono",monospace;
  font-size:clamp(11px,.8vw,12px);letter-spacing:.05em;color:var(--ink);opacity:.72}
.spektral .wl__note--err{color:#b3331a;opacity:1}
.spektral .wl__done{margin:0;max-width:22ch;font-family:"Archivo",sans-serif;font-weight:500;font-stretch:78%;
  letter-spacing:-0.01em;line-height:1.32;font-size:clamp(20px,2.1vw,28px);color:var(--ink)}
.spektral .wl__done-i{color:var(--accent-hi);font-style:italic}

/* heritage band, carries the whole cream→accent gradient so the content above
   stays on the original cream. Ink type reads across the light-to-orange wash
   (same ink-on-warm as the sections above); left padding clears the fixed nav. */
.spektral .her{position:relative;box-sizing:border-box;width:100%;color:var(--ink);
  padding:clamp(78px,13vh,148px) 0}
.spektral .her__grain{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 46%,rgba(0,0,0,0) 80%);
          mask-image:linear-gradient(to bottom,#000 0%,#000 46%,rgba(0,0,0,0) 80%)}
.spektral .her__in{position:relative;z-index:1;box-sizing:border-box;width:100%;max-width:var(--maxw);margin:0 auto;padding:0 var(--pad)}
@media (min-width:880px){.spektral .her__in{padding-left:var(--pad)}}
.spektral .her__head{display:grid;grid-template-columns:1fr;gap:clamp(16px,2.4vw,24px);
  margin-bottom:clamp(40px,6vh,72px)}
@media (min-width:880px){.spektral .her__head{
  grid-template-columns:minmax(0,1fr) minmax(0,540px);align-items:start;
  column-gap:clamp(32px,5vw,72px);row-gap:clamp(14px,2vw,22px)}}
.spektral .her__label{font-family:"Space Mono",monospace;text-transform:uppercase;letter-spacing:.18em;
  font-size:clamp(11px,.85vw,13px);color:var(--terra);text-decoration:none;justify-self:start;
  transition:opacity .2s ease}
.spektral .her__label:hover{opacity:.7}
.spektral .her__h{margin:0;font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.015em;
  line-height:1.04;color:var(--ink);font-size:clamp(30px,5vw,58px)}
.spektral .her__h-i{color:var(--accent-hi)}
@media (min-width:880px){
  .spektral .her__label{grid-column:1;grid-row:1}
  .spektral .her__h{grid-column:1;grid-row:2}
  .spektral .her__tag{grid-column:2;grid-row:1 / span 2;padding-top:4px}
}
.spektral .her__tag{font-family:"Archivo",sans-serif;font-weight:410;font-stretch:78%;line-height:1.55;
  font-size:clamp(16px,1.25vw,19px);color:var(--ink);opacity:.80;max-width:62ch}
.spektral .her__tag p{margin:0}
.spektral .her__tag p + p{margin-top:clamp(12px,1.4vw,16px)}
.spektral .her__list{list-style:none;margin:0;padding:0}
.spektral .her__row{}
.spektral .her__rowtop{width:100%;display:flex;align-items:center;gap:clamp(14px,2vw,26px);
  background:none;border:none;cursor:pointer;color:inherit;text-align:left;font-family:inherit;
  padding:clamp(18px,2.5vw,30px) 0}
.spektral .her__no{flex:0 0 auto;font-family:"Space Mono",monospace;font-size:clamp(12px,.95vw,14px);
  color:rgba(42,14,4,.5)}
.spektral .her__title{flex:1 1 auto;font-family:"Archivo",sans-serif;font-weight:460;font-stretch:78%;letter-spacing:-0.012em;
  font-size:clamp(22px,2.6vw,36px);color:var(--ink);line-height:1.1}
.spektral .her__cat{flex:0 0 auto;font-family:"Space Mono",monospace;text-transform:uppercase;
  letter-spacing:.18em;font-size:clamp(10px,.8vw,12px);color:rgba(42,14,4,.5)}
.spektral .her__chev{flex:0 0 auto;display:inline-flex;color:rgba(42,14,4,.55);
  transition:transform .35s cubic-bezier(.16,.84,.3,1)}
.spektral .her__chev svg{width:clamp(18px,1.8vw,22px);height:clamp(18px,1.8vw,22px);display:block}
.spektral .her__chev{transition:transform .35s cubic-bezier(.16,.84,.3,1)}
.spektral .her__rowtop.is-open .her__chev{transform:rotate(180deg)}
/* grid-rows accordion, matched to FurnishesApp's FAQ accordions (fp-qa__b/fs-qa__b):
   same .45s duration and the same cubic-bezier(.16,.84,.3,1) curve used across the
   whole product app, so landing and app share one motion language. 0fr→1fr animates
   the TRUE content height, so open and close stay symmetric. */
.spektral .her__body{display:grid;grid-template-rows:0fr;
  transition:grid-template-rows .45s cubic-bezier(.16,.84,.3,1)}
.spektral .her__body.is-open{grid-template-rows:1fr}
.spektral .her__body-in{overflow:hidden;min-height:0;opacity:0;transform:translateY(-3px);
  transition:opacity .3s cubic-bezier(.16,.84,.3,1) .04s,transform .3s cubic-bezier(.16,.84,.3,1) .04s}
.spektral .her__body.is-open .her__body-in{opacity:1;transform:none}
.spektral .her__body p{margin:0;padding:0 0 clamp(20px,2.6vw,30px) clamp(34px,4vw,58px);max-width:68ch;
  font-family:"Archivo",sans-serif;font-weight:430;font-stretch:78%;line-height:1.6;
  font-size:clamp(16px,1.25vw,19px);color:var(--ink);opacity:.78}
@media (max-width:600px){.spektral .her__cat{display:none}}

/* full-bleed accent footer (from the zip): a peach→accent gradient melts the
   warm content above into the brand orange, then solid accent with cream copy */
.spektral .foot{
  max-width:none;width:100%;margin:0;overflow:hidden;box-sizing:border-box;
  display:flex;flex-direction:column;gap:clamp(26px,4vh,44px);
  background:var(--accent-hi);
  color:#f9e9c2;
  padding:clamp(48px,7vh,80px) 0 clamp(18px,2.6vh,28px);
}
.spektral .foot__cta,
.spektral .foot__grid,
.spektral .foot__legal{
  max-width:1320px;margin-left:auto;margin-right:auto;
  padding-left:clamp(20px,5vw,64px);padding-right:clamp(20px,5vw,64px);
}
.spektral .foot__cta{
  position:relative;
  display:flex;justify-content:center;align-items:baseline;flex-wrap:nowrap;white-space:nowrap;
  gap:0.15em;
  text-decoration:none;color:#FBF0DC;
  font-family:"Archivo",sans-serif;font-weight:500;font-stretch:78%;letter-spacing:-0.02em;line-height:1;
  font-size:clamp(1.6rem,4.6vw,4rem);
  padding-top:clamp(4px,1vh,10px);padding-bottom:clamp(14px,2.4vh,26px);
}
.spektral .foot__cta-a,.spektral .foot__cta-b{
  flex:0 0 auto;transition:transform .42s cubic-bezier(.16,.84,.3,1);
}
.spektral .foot__cta:hover .foot__cta-a{transform:translateX(-0.42em)}
.spektral .foot__cta:hover .foot__cta-b{transform:translateX(0.42em)}
.spektral .foot__cta-mid{position:relative;width:0;flex:0 0 auto;align-self:stretch;
  display:flex;align-items:center;justify-content:center}
.spektral .foot__cta-mid svg{flex:0 0 auto;width:0.62em;height:0.62em;
  opacity:0;transform:scale(.5);
  transition:opacity .28s ease,transform .4s cubic-bezier(.16,.84,.3,1)}
.spektral .foot__cta:hover .foot__cta-mid svg{opacity:1;transform:scale(1)}

.spektral .foot__grid{
  display:grid;grid-template-columns:1fr;gap:clamp(26px,3vw,36px);
  justify-items:start;text-align:left;
  padding-top:clamp(8px,2vh,20px);padding-bottom:clamp(8px,2vh,20px);
}
@media (min-width:560px){.spektral .foot__grid{grid-template-columns:1fr 1fr;column-gap:clamp(28px,4vw,56px);row-gap:clamp(30px,4vh,44px)}}
@media (min-width:1000px){.spektral .foot__grid{grid-template-columns:1.7fr 1fr 1fr 1fr;column-gap:clamp(32px,4vw,72px);align-items:start}}
.spektral .foot__brand{max-width:42ch}
@media (min-width:560px) and (max-width:999px){.spektral .foot__brand{grid-column:1 / -1}}
.spektral .foot__mark{font-family:"Space Mono",monospace;font-weight:700;letter-spacing:.03em;line-height:1;
  font-size:clamp(19px,1.5vw,24px);color:#FBF0DC;margin-bottom:clamp(10px,1.2vw,14px)}
.spektral .foot__brand-p{max-width:40ch;opacity:.82}
.spektral .foot__h{margin:0 0 clamp(11px,1.2vw,15px);font-family:"Space Mono",monospace;
  text-transform:uppercase;letter-spacing:.18em;font-size:clamp(13px,1.05vw,16px);line-height:1.3;opacity:.72}
.spektral .foot__p{margin:0;font-family:"Archivo",sans-serif;font-weight:400;font-stretch:78%;font-size:clamp(16px,1.25vw,19px);line-height:1.55;opacity:.9}
.spektral .foot__social{list-style:none;margin:clamp(10px,1.2vw,14px) 0 0;padding:0;display:flex;flex-direction:column;gap:4px;
  font-family:"Archivo",sans-serif;font-weight:400;font-stretch:78%;font-size:clamp(16px,1.25vw,19px);line-height:1.55;opacity:.9}
.spektral .foot__coord{margin:clamp(10px,1.2vw,14px) 0 0;font-family:"Space Mono",monospace;font-size:clamp(12px,1vw,15px);letter-spacing:.04em;opacity:.6}
.spektral .foot__link{color:inherit;text-decoration:none;border-bottom:1px solid transparent;transition:border-color .2s ease,opacity .2s ease}
.spektral .foot__link:hover{border-color:currentColor}
.spektral .foot__link--disabled{opacity:.5;cursor:default;border-bottom-color:transparent}
.spektral .foot__link--disabled:hover{border-color:transparent}
.spektral .foot__legal{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;
  padding-top:clamp(16px,2.6vh,30px);font-family:"Archivo",sans-serif;font-weight:400;font-stretch:78%;
  font-size:clamp(14px,1.1vw,16px);
}
.spektral .foot__legal-links{display:flex;flex-wrap:wrap;gap:clamp(16px,2vw,32px)}
.spektral .foot__copy{opacity:.92}

/* reveal on scroll */
.spektral .reveal{opacity:0;transform:translateY(22px);
  transition:opacity .85s cubic-bezier(.16,.84,.3,1),transform .85s cubic-bezier(.16,.84,.3,1)}
.spektral .reveal.in{opacity:1;transform:none}

/* full-screen menu */
.spektral .menu{
  position:fixed;top:0;left:0;right:0;bottom:auto;z-index:40;color:var(--on-orange);
  min-height:100dvh;max-height:100dvh;overflow:auto;
  clip-path:inset(0 0 100% 0);opacity:0;pointer-events:none;
  transition:clip-path .55s cubic-bezier(.16,.84,.3,1),opacity .3s ease;
  background:
    radial-gradient(135% 100% at 50% 100%, rgba(255,237,223,0.15) 0%, rgba(255,237,223,0) 56%),
    linear-gradient(to bottom, var(--accent-hi) 0%, #e95f1f 50%, #ed7129 100%);
}
.spektral .menu.open{clip-path:inset(0 0 0% 0);opacity:1;pointer-events:auto}
.spektral .m-grain{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.5;mix-blend-mode:overlay}
.spektral .m-wrap{position:relative;z-index:1;max-width:1180px;margin:0 auto;
  display:flex;flex-direction:column;justify-content:flex-start;
  padding:calc(var(--nav-h,60px) + clamp(16px,3.2vh,34px)) var(--pad) clamp(30px,5vh,58px)}
.spektral .m-grid{display:grid;grid-template-columns:1.62fr 1fr;position:relative}
.spektral .m-vline{position:absolute;left:62%;top:6px;bottom:6px;width:1px;background:rgba(251,240,220,.24);
  transform:scaleY(0);transform-origin:top;transition:transform .65s cubic-bezier(.16,.84,.3,1) .22s}
.spektral .menu.open .m-vline{transform:scaleY(1)}
.spektral .m-left{padding-right:32px;position:relative}
.spektral .m-right{padding-left:36px}

.spektral .m-block{display:grid;grid-template-columns:1.1fr .9fr;gap:10px}
.spektral .m-eyebrow{font-family:"Space Mono",monospace;font-size:clamp(11px,.85vw,13px);letter-spacing:.18em;color:rgba(251,240,220,.72);text-transform:uppercase}
.spektral .m-h{font-family:"Archivo",sans-serif;font-size:clamp(26px,3vw,36px);font-weight:800;letter-spacing:-.01em;margin:8px 0 0;text-transform:uppercase}
.spektral .m-items{padding-top:4px}
.spektral .m-li{font-size:15px;color:rgba(251,240,220,.88);padding:4px 0;cursor:pointer;display:inline-block;transition:color .18s,transform .18s}
.spektral .m-li:hover{color:#fff;transform:translateX(6px)}
.spektral .m-tag{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.08em;color:rgba(251,240,220,.6);margin-left:9px}
.spektral .m-cta{display:inline-flex;align-items:center;gap:7px;margin-top:14px;cursor:pointer}
.spektral .m-cta .ctt{font-size:13px;color:rgba(251,240,220,.95);border-bottom:1px solid rgba(251,240,220,.5);padding-bottom:2px;transition:color .18s,border-color .18s}
.spektral .m-cta .car{font-family:"Space Mono",monospace;opacity:0;transform:translateX(-6px);transition:opacity .2s,transform .2s}
.spektral .m-cta:hover .ctt{color:#fff;border-color:#fff}
.spektral .m-cta:hover .car{opacity:1;transform:translateX(0)}

.spektral .m-nav{font-family:"Archivo",sans-serif;font-size:clamp(20px,2.2vw,24px);font-weight:700;padding:6px 0;color:rgba(251,240,220,.86);
  cursor:pointer;display:flex;align-items:baseline;transition:transform .2s cubic-bezier(.16,.84,.3,1),color .2s;text-transform:uppercase;letter-spacing:-.01em}
.spektral .m-nav .ix{font-family:"Space Mono",monospace;font-size:13px;color:rgba(251,240,220,.45);margin-right:12px;transition:color .2s;letter-spacing:0;font-weight:400}
.spektral .m-nav:hover{color:#fff;transform:translateX(8px)}
.spektral .m-nav:hover .ix{color:#fff}
.spektral .m-nav.act,.spektral .m-nav.act .ix{color:#fff}
.spektral .m-sub{font-size:clamp(16px,1.8vw,19px)}
.spektral .m-sub--disabled{opacity:.45;cursor:default;pointer-events:none}
.spektral .m-cnt{font-family:"Space Mono",monospace;font-size:13px;color:rgba(251,240,220,.62);margin-left:6px}

.spektral .m-rev{opacity:0;clip-path:inset(0 100% 0 0);
  transition:clip-path .72s cubic-bezier(.16,.84,.3,1),opacity .5s ease}
.spektral .menu.open .m-rev{opacity:1;clip-path:inset(0 0 0 0)}

/* Motion restored: the menu, its per-item reveals, the divider, and the hero
   entrance always animate. (Previously a @media (prefers-reduced-motion:reduce)
   block snapped them to their final state; removed so the full choreography plays
   regardless of the OS "reduce motion" setting — matching the hero 3D and intro.) */
html.menu-lock .spektral .topbar::before{opacity:0}
html.menu-lock .spektral .topbar .band__grain{opacity:0}

/* NOTE: the menu open (clip-path) + per-item (.m-rev) + divider (.m-vline)
   animations always play; there is no reduced-motion suppression on this site
   (consistent with the hero 3D, the intro loader, and the scroll reveals). */
@media (max-width:760px){
  .spektral .m-grid{grid-template-columns:1fr}
  .spektral .m-vline{display:none}
  .spektral .m-left{padding-right:0;padding-bottom:8px}
  .spektral .m-right{padding-left:0;margin-top:24px}
}

/* entrance motion, each piece arrives on its OWN beat (one by one), with long silky easing, while the
   3D house drops in + slowly pushes forward. The right-hand blurb and the "Move in…" tagline are held
   back entirely and only ease in once the opening settles into its circling overview (introDone). */
@keyframes spk-rise{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}
.spektral .util__menu {animation:spk-rise 1.05s cubic-bezier(.16,.84,.3,1) .45s both}   /* topbar, left→right */
.spektral .util__brand{}  /* brand persists from the loader, no re-entrance */
.spektral .util__cta  {animation:spk-rise 1.05s cubic-bezier(.16,.84,.3,1) 1.25s both}
@keyframes spk-rise-rev{from{opacity:0;transform:translateY(15px)}to{opacity:var(--o,1);transform:none}}
.spektral .title__lg,.spektral .title__rev{animation:spk-rise-rev 1.7s cubic-bezier(.16,.84,.3,1) both;animation-play-state:paused} /* held until the scene settles (.title.is-in) */

/* returning from the account view: render the landing already-settled, no entrance
   replay. Neutralises the mount animations + scroll-reveal initial state. */
.spektral.instant .reveal{opacity:1 !important;transform:none !important;transition:none !important}
.spektral.instant .util__menu,
.spektral.instant .util__cta{animation:none !important;opacity:1 !important;transform:none !important}
.spektral.instant .title__lg,
.spektral.instant .title__rev{animation:none !important;opacity:var(--o,1) !important;transform:none !important}
.spektral.instant .sidenav,
.spektral.instant .sindex{transition:none !important}
.spektral .title.is-in .title__lg,.spektral .title.is-in .title__rev{animation-play-state:running}
.spektral .title.is-in>*:nth-child(1){animation-delay:0s}
.spektral .title.is-in>*:nth-child(2){animation-delay:.14s}
.spektral .title.is-in>*:nth-child(3){animation-delay:.26s}
.spektral .title.is-in>*:nth-child(4){animation-delay:.36s}
.spektral .title.is-in>*:nth-child(5){animation-delay:.44s}
@keyframes sidenav-item-in{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.spektral .sidenav__item{animation:sidenav-item-in 1.1s cubic-bezier(.16,.84,.3,1) both}
.spektral .sidenav__item:nth-child(1){animation-delay:0.8s}
.spektral .sidenav__item:nth-child(2){animation-delay:1.1s}
.spektral .sidenav__item:nth-child(3){animation-delay:1.4s}
.spektral .sidenav__item:nth-child(4){animation-delay:1.7s}
.spektral .sidenav__item:nth-child(5){animation-delay:2.0s}
/* held back until the camera settles (introDone → .is-in), then eased in one after the other */
.spektral .lockup__right{opacity:0;transform:translateY(30px);transition:opacity 1.8s ease 1.8s,transform 1.9s cubic-bezier(.16,.84,.3,1) 1.8s}
.spektral .lockup__right.is-in{opacity:1;transform:none}
.spektral .hero__tag{opacity:0;transform:translateY(32px);transition:opacity 1.8s ease 2.6s,transform 1.9s cubic-bezier(.16,.84,.3,1) 2.6s}
.spektral .hero__tag.is-in{opacity:1;transform:none}
/* (This landing intentionally plays its full motion regardless of the OS
   "reduce motion" setting, the reduced-motion override that used to kill all
   CSS animations, the .reveal scroll-in, and the lockup/hero entrances has been
   removed so the section-text animations always run.) */

/* mobile: let it flow */
@media (max-width:720px){
  .spektral{--hero-shift:0px}
  .spektral .stage{height:auto;overflow:visible}
  .spektral .band{height:auto !important;padding-top:calc(var(--nav-h,76px) + 14px);padding-bottom:26px;gap:40px}
  .spektral .util{grid-template-columns:1fr auto}
  .spektral .util__brand{order:3;grid-column:1/-1;justify-self:start;padding-top:8px}
  .spektral .lockup{flex-direction:column;align-items:flex-start;gap:14px}
  .spektral .lockup__right{margin-left:0;transform:none;flex:initial;width:auto}
  .spektral .hero__tag{width:auto;margin:0;align-self:flex-start}
  .spektral .main{height:auto !important;min-height:78vh}
  .spektral .hero{min-height:62vh}
}

/* Wide-but-short viewports (e.g. the preview maximised on an ultrawide monitor):
   100vh made the hero too short for the title lockup, so the title spilled out
   of the band and collided with the 3D figures and the section index. Give the
   stage a height floor (it may scroll a touch, fine) and drive the title /
   tagline / index off viewport-height so they shrink to fit instead of overflowing. */
@media (min-width:720px) and (max-height:760px){
  .spektral .stage{min-height:560px}
  .spektral .main__stage{top:0}   /* don't let the house rise over the title at short heights */
  .spektral .title{font-size:clamp(26px,8.6vh,76px)}
  .spektral .hero__tagline{font-size:clamp(20px,5.2vh,46px)}
  .spektral .hero__mark{font-size:clamp(18px,4vh,36px)}
  .spektral .sindex{top:calc(var(--nav-h,64px) + clamp(14px,2.6vh,28px))}
}
`;

/* ============================================================================
   FURNISHES INTRO, the loading splash shown first; on completion it reveals
   (via the center-out 'hole') and hands off to the landing below. Adapted from
   the uploaded FurnishesIntro.jsx (loader only; the Demo wrapper is dropped). */

const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
const BONE  = "#EBDABA"; // warm off-white
const OCHRE = "#F2521F"; // orange

/* 2×2 checkerboard seat block → corner sofa. Colours alternate everywhere.
   seats:  A W · B O · C O · D W      (W/O checkerboard)
   backs:  each contrasts its own seat, so each wall reads O–W–O–W
   stack:  orange cushion + white back on the open white seat (D)            */
const CELL = 0.72;
const PIECES = [
  { id: "A",   type: "block", w: 0.70, h: 0.34, d: 0.70, x: 0.00, y: 0.17, z: 0.00, color: BONE  }, // seat (corner)
  { id: "B",   type: "block", w: 0.70, h: 0.34, d: 0.70, x: CELL, y: 0.17, z: 0.00, color: OCHRE }, // seat
  { id: "C",   type: "block", w: 0.70, h: 0.34, d: 0.70, x: 0.00, y: 0.17, z: CELL, color: OCHRE }, // seat
  { id: "D",   type: "block", w: 0.70, h: 0.34, d: 0.70, x: CELL, y: 0.17, z: CELL, color: BONE  }, // seat
  { id: "bAz", type: "back",  w: 0.70, x: 0.00, y: 0.30, z: -0.43, rotY: 0,           color: OCHRE }, // back wall, behind A(W)
  { id: "bBz", type: "back",  w: 0.70, x: CELL, y: 0.30, z: -0.43, rotY: 0,           color: BONE  }, // back wall, behind B(O)
  { id: "bAx", type: "back",  w: 0.70, x: -0.43, y: 0.30, z: 0.00, rotY: Math.PI / 2, color: OCHRE }, // left wall, behind A(W)
  { id: "bCx", type: "back",  w: 0.70, x: -0.43, y: 0.30, z: CELL, rotY: Math.PI / 2, color: BONE  }, // left wall, behind C(O)
  { id: "su",  type: "block", w: 0.54, h: 0.22, d: 0.50, x: CELL, y: 0.45, z: CELL,  color: OCHRE }, // stacked cushion on D(W), orange
  { id: "sb",  type: "back",  w: 0.54, h2: 0.40, x: CELL, y: 0.54, z: 0.50, rotX: -0.16, color: BONE }, // stacked back, white
];
const N = PIECES.length;

const MIN_MS = 6000;
const FALLBACK_MS = 6500;
const DROP_MS = 720;
const DWELL_MS = 750;   // hold on the finished piece at 100
const EXIT_MS = 1000;   // lead 150 + hop 300 + collapse 520 + tail
const REVEAL_MS = 1100; // center-out dissolve into the landing

function roundedBox(w, h, d) {
  const r = Math.min(0.06, Math.min(w, h) * 0.45);
  const bevel = Math.min(r, d * 0.45);
  const depth = Math.max(d - 2 * bevel, 0.001);
  const x = w / 2, y = h / 2, s = new THREE.Shape();
  s.moveTo(-x, -y + r);
  s.lineTo(-x, y - r); s.quadraticCurveTo(-x, y, -x + r, y);
  s.lineTo(x - r, y);  s.quadraticCurveTo(x, y, x, y - r);
  s.lineTo(x, -y + r); s.quadraticCurveTo(x, -y, x - r, -y);
  s.lineTo(-x + r, -y);s.quadraticCurveTo(-x, -y, -x, -y + r);
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 3,
  });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals();
  return g;
}

/* rounded-rectangle Shape (for the square hole that matches the drawn loop) */
function roundedRectShape(w, d, r) {
  const x = w / 2, y = d / 2, s = new THREE.Shape();
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);  s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r);s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/* rounded-rectangle loop in the XZ plane, rotated to START (and close) at the
   corner nearest the camera so the seam meets in front of the viewer */
function loopPoints(x0, x1, z0, z1, r, y) {
  const raw = [], EDGE = 30, ARC = 12;
  const lerp = (a, b, t) => a + (b - a) * t;
  const arc = (cx, cz, a0, a1) => {
    for (let i = 0; i <= ARC; i++) { const a = lerp(a0, a1, i / ARC); raw.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); }
  };
  for (let i = 0; i < EDGE; i++) raw.push(new THREE.Vector3(lerp(x0 + r, x1 - r, i / EDGE), y, z0));
  arc(x1 - r, z0 + r, -Math.PI / 2, 0);
  for (let i = 0; i < EDGE; i++) raw.push(new THREE.Vector3(x1, y, lerp(z0 + r, z1 - r, i / EDGE)));
  arc(x1 - r, z1 - r, 0, Math.PI / 2);
  for (let i = 0; i < EDGE; i++) raw.push(new THREE.Vector3(lerp(x1 - r, x0 + r, i / EDGE), y, z1));
  arc(x0 + r, z1 - r, Math.PI / 2, Math.PI);
  for (let i = 0; i < EDGE; i++) raw.push(new THREE.Vector3(x0, y, lerp(z1 - r, z0 + r, i / EDGE)));
  arc(x0 + r, z0 + r, Math.PI, Math.PI * 1.5);
  let best = 0, bestV = -Infinity;
  raw.forEach((p, i) => { const v = p.x + p.z; if (v > bestV) { bestV = v; best = i; } });
  const pts = raw.slice(best).concat(raw.slice(0, best));
  pts.push(pts[0].clone());
  return pts;
}

function FurnishesIntro({ ready = false, forceRelease = false, onReveal, onDone, onRendererReleased }) {
  const [reduced] = useState(false);   // motion restored: always play the loader's piece-by-piece drop-in opening.

  const mountRef = useRef(null);
  const navRef = useRef(null);
  const [pct, setPct] = useState(0);
  const [landed, setLanded] = useState(0);
  const [phase, setPhase] = useState("run");

  const readyRef = useRef(ready);
  const onDoneRef = useRef(onDone);
  const onRevealRef = useRef(onReveal);
  const onRendererReleasedRef = useRef(onRendererReleased);
  const forceReleaseRef = useRef(forceRelease);
  const releaseRef = useRef(null);   // exposes releaseRenderer to the force-release effect
  const phaseRef = useRef("run");
  const skipRef = useRef(false);
  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  // match the landing's --nav-h during loading so the background band height (and
  // thus the orange→cream transition length) lines up exactly with the real page
  useEffect(() => {
    const tb = navRef.current;
    if (!tb) return;
    const root = document.documentElement;
    const prevNavH = root.style.getPropertyValue("--nav-h");   // restore on unmount, same as the main surface
    const set = () => { root.style.setProperty("--nav-h", tb.offsetHeight + "px"); };
    set();
    let fontsDisposed = false;
    const safeSet = () => { if (!fontsDisposed) set(); };
    const t = setTimeout(set, 250);
    window.addEventListener("resize", set);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(safeSet);
    return () => {
      fontsDisposed = true;
      clearTimeout(t);
      window.removeEventListener("resize", set);
      if (prevNavH) root.style.setProperty("--nav-h", prevNavH);
      else root.style.removeProperty("--nav-h");
    };
  }, []);
  useEffect(() => { onRevealRef.current = onReveal; }, [onReveal]);
  useEffect(() => { onRendererReleasedRef.current = onRendererReleased; }, [onRendererReleased]);
  useEffect(() => { forceReleaseRef.current = forceRelease; }, [forceRelease]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth, height = mount.clientHeight;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (err) {
      console.warn("WebGL unavailable, skipping the loading animation.", err);
      if (onRevealRef.current) onRevealRef.current();
      if (onDoneRef.current) onDoneRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.72;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const VIEW = 5.6;
    const target = new THREE.Vector3(0.30, 0.42, 0.30);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.copy(target).add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(20));
    camera.lookAt(target);
    const setFrustum = () => {
      const a = width / height;
      camera.top = VIEW / 2; camera.bottom = -VIEW / 2;
      camera.left = (-VIEW * a) / 2; camera.right = (VIEW * a) / 2;
      camera.updateProjectionMatrix();
    };
    setFrustum();

    scene.add(new THREE.HemisphereLight(col("#ffe9d6"), col("#d24a10"), 0.45));
    const keyL = new THREE.DirectionalLight(col("#ffeede"), 1.45);
    keyL.position.set(4.5, 9, 5.5);
    keyL.castShadow = true;
    keyL.shadow.mapSize.set(1024, 1024);
    keyL.shadow.camera.near = 1; keyL.shadow.camera.far = 40;
    keyL.shadow.camera.left = -6; keyL.shadow.camera.right = 6;
    keyL.shadow.camera.top = 6; keyL.shadow.camera.bottom = -6;
    keyL.shadow.bias = -0.0012; keyL.shadow.radius = 4;
    scene.add(keyL);
    scene.add(new THREE.AmbientLight(col("#ffceac"), 0.14));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.24 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const matOf = (hex) => new THREE.MeshStandardMaterial({ color: col(hex), roughness: 0.82, metalness: 0, transparent: true });
    const makeGeo = (p) => {
      if (p.type === "block") return roundedBox(p.w, p.h, p.d);
      if (p.type === "back")  return roundedBox(p.w, p.h2 || 0.55, 0.16);
      return roundedBox(0.5, 0.5, 0.5);
    };
    // even, metronomic drop schedule, one piece placed per beat across the load,
    // independent of the progress number so the cadence never clumps
    const ASSEMBLE = MIN_MS * 0.88;                          // all pieces down by ~88%
    const STAGGER = (ASSEMBLE - DROP_MS) / Math.max(N - 1, 1);
    const BASE_DELAY = 140;                                  // let the counter start first
    const anim = PIECES.map((p, i) => {
      const mesh = new THREE.Mesh(makeGeo(p), matOf(p.color));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.rotY || 0;
      mesh.rotation.x = p.rotX || 0;
      const fromY = p.y + 5;
      if (reduced) mesh.position.y = p.y; else { mesh.position.y = fromY; mesh.visible = false; }
      scene.add(mesh);
      return { p, mesh, fromY, dropStart: BASE_DELAY + i * STAGGER, started: reduced, t0: 0, landedAt: 0 };
    });

    // encircling thread, a thin tube so it's a touch thicker than a 1px line
    const lp = loopPoints(-0.95, 1.30, -0.95, 1.30, 0.30, 0.03);
    const curve = new THREE.CatmullRomCurve3(lp, false);
    const tubeGeo = new THREE.TubeGeometry(curve, 280, 0.02, 7, false);
    const line = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: col("#C2542A"), transparent: true }));
    line.renderOrder = 2; tubeGeo.setDrawRange(0, 0); scene.add(line);
    const IDX = tubeGeo.index.count;

    // centre of the composition, furniture collapses toward here on exit.
    // (No coloured hole plane: the page behind is the same orange, so a filled
    //  hole would be invisible anyway. The white loop is the visible rim.)
    const HB = { cx: 0.175, cz: 0.175 };

    // ── pacing: ease-OUT number (fast start, glides to 100) + metronomic drops ──
    let raf = 0, prog = 0, lastPct = -1, lastLanded = -1, exitStart = 0;
    const exitTimers = [];   // exit-sequence timeouts, cleared on unmount so they can't fire on a dead component
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 1.55); // immediate feedback, decelerates into 100
    const fall = (t) => Math.min(1, t * t);           // gravity drop
    const eOut = (t) => 1 - Math.pow(1 - t, 3);

    let released = false;
    // Release the loader's WebGL context at reveal so it never runs alongside the hero's.
    const releaseRenderer = () => {
      if (released) return;
      released = true;
      cancelAnimationFrame(raf);
      exitTimers.forEach(clearTimeout);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.filter(Boolean).forEach((m) => {
          m.map?.dispose?.();
          m.alphaMap?.dispose?.();
          m.bumpMap?.dispose?.();
          m.normalMap?.dispose?.();
          m.roughnessMap?.dispose?.();
          m.metalnessMap?.dispose?.();
          m.dispose?.();
        });
      });
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      if (onRendererReleasedRef.current) onRendererReleasedRef.current();
    };
    releaseRef.current = releaseRenderer;
    const doLift = () => {
      if (phaseRef.current !== "run") return;
      if (reduced) { setPhase("wipe"); releaseRenderer(); onRevealRef.current && onRevealRef.current(); exitTimers.push(setTimeout(() => { setPhase("gone"); onDoneRef.current && onDoneRef.current(); }, 480)); return; }
      setPhase("breath");                                   // dwell on the finished piece at 100
      exitTimers.push(setTimeout(() => setPhase("exit"), DWELL_MS));         // text slides out · furniture bounces & drops
      exitTimers.push(setTimeout(() => { setPhase("wipe"); releaseRenderer(); onRevealRef.current && onRevealRef.current(); }, DWELL_MS + EXIT_MS));  // hole opens → mount + start the real landing underneath
      exitTimers.push(setTimeout(() => { setPhase("gone"); onDoneRef.current && onDoneRef.current(); }, DWELL_MS + EXIT_MS + REVEAL_MS));
    };

    const loop = (now) => {
      const elapsed = now - start;
      const skip = skipRef.current;
      const done = skip || readyRef.current || elapsed > FALLBACK_MS;
      const exiting = phaseRef.current === "exit" || phaseRef.current === "wipe" || phaseRef.current === "gone";

      if (exiting && !reduced) {
        // ── EXIT: text leads, furniture bounces, then is swallowed into the hole ──
        if (exitStart === 0) exitStart = now;
        const te = now - exitStart;
        const LEAD = 150;                                                   // text starts first; furniture a beat later
        const tf = Math.max(0, te - LEAD);
        const HOP_MS = 300, COL_MS = 520, HOP_H = 0.55;
        anim.forEach((a) => {
          if (tf < HOP_MS) {                                               // spring up in place
            a.mesh.position.set(a.p.x, a.p.y + HOP_H * eOut(tf / HOP_MS), a.p.z);
            a.mesh.scale.setScalar(1);
            a.mesh.material.opacity = 1;
          } else {                                                         // collapse into the opening
            const f = Math.min((tf - HOP_MS) / COL_MS, 1), e = eOut(f);
            a.mesh.position.x = a.p.x + (HB.cx - a.p.x) * e;               // pulled toward the hole centre
            a.mesh.position.z = a.p.z + (HB.cz - a.p.z) * e;
            a.mesh.position.y = a.p.y + HOP_H * (1 - e) - 0.6 * f;         // descend from the hop, dip in
            a.mesh.scale.setScalar(Math.max(0, 1 - e));                    // shrink to nothing (no poking legs)
            a.mesh.material.opacity = Math.max(0, 1 - f * 1.15);           // fade as it's swallowed
          }
        });
        // the floor thread dissolves TOGETHER with the furniture (lingers through
        // the hop, then fades as the pieces are swallowed, not all at once at the end)
        const lf = Math.min(tf / (HOP_MS + COL_MS), 1);
        line.material.opacity = Math.max(0, 1 - lf * lf);
        renderer.render(scene, camera);
        if (phaseRef.current === "gone") return;
        raf = requestAnimationFrame(loop);
        return;
      }

      // number + line, ease-out, immediate feedback, smooth approach to 100
      if (skip) prog += (1 - prog) * 0.3;
      else prog = easeOut(Math.min(elapsed / MIN_MS, 1));
      if (prog > 0.9995) prog = 1;
      const cPct = Math.round(prog * 100);
      if (cPct !== lastPct) { lastPct = cPct; setPct(cPct); }
      tubeGeo.setDrawRange(0, Math.floor(prog * IDX));

      // furniture, steady cadence, decoupled from the number; never clumps
      let started = 0, allLanded = true;
      anim.forEach((a) => {
        if (!a.started && (skip || elapsed >= a.dropStart)) { a.started = true; a.t0 = now; a.mesh.visible = true; }
        if (a.started) started++; else allLanded = false;
        if (a.started && a.landedAt === 0 && !reduced) {
          if (skip) { a.mesh.position.y = a.p.y; a.landedAt = now; }
          else {
            const t = (now - a.t0) / DROP_MS;
            if (t >= 1) { a.mesh.position.y = a.p.y; a.landedAt = now; }
            else { a.mesh.position.y = a.fromY + (a.p.y - a.fromY) * fall(t); allLanded = false; }
          }
        }
        if (a.landedAt) {
          const s = (now - a.landedAt) / 150;
          if (s < 1) { const sq = 1 - Math.sin(s * Math.PI) * 0.12; a.mesh.scale.set(2 - sq, sq, 2 - sq); }
          else if (a.mesh.scale.y !== 1) a.mesh.scale.set(1, 1, 1);
        }
      });
      if (reduced) allLanded = true;
      if (started !== lastLanded) { lastLanded = started; setLanded(started); }

      renderer.render(scene, camera);
      // lift only once the piece is fully built AND the number reached 100 AND ready
      if (prog >= 1 && allLanded && done && phaseRef.current === "run") doLift();
      if (phaseRef.current === "gone") return;
      raf = requestAnimationFrame(loop);   // keep rendering through breath → exit → wipe
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => { width = mount.clientWidth; height = mount.clientHeight; renderer.setSize(width, height); setFrustum(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      exitTimers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
      if (!released) {
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        });
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [reduced]);

  // Stall fallback: if the loader never finishes, force a clean release (dispose the
  // renderer + fire onRendererReleased once) BEFORE the hero mounts, then finish.
  useEffect(() => {
    if (forceRelease && releaseRef.current) {
      releaseRef.current();
      setPhase("gone");
      if (onDoneRef.current) onDoneRef.current();
    }
  }, [forceRelease]);

  const skip = () => { skipRef.current = true; };
  const exiting = phase === "exit" || phase === "wipe" || phase === "gone";
  const wiping = phase === "wipe" || phase === "gone";
  const cls = "intro" + (reduced ? " reduced" : "") + (exiting ? " exit" : "") + (wiping ? " wipe" : "");

  return (
    <div className={cls} role="dialog" aria-label="Loading Furnishes" aria-busy={phase === "run"}>
      <style>{CSS}</style>
      <style>{css}</style>
      <div ref={mountRef} className="intro-canvas" aria-hidden="true" />
      <div className="spektral intro-bg-wrap" aria-hidden="true">
        <div className="topbar intro-navprobe" ref={navRef} style={{ visibility: "hidden" }}>
          <div className="band__row util">
            <button className="util__menu label">Menu</button>
            <button className="util__brand">furnishes.</button>
            <button className="util__cta label">login</button>
          </div>
        </div>
        <div className="stage">
          <header className="band">
            <Grain id="iBandGrain" className="band__grain" />
            <div className="band__row lockup">
              <div className="lockup__title">
                <div className="title" role="text" aria-label="Interior Revolution">
                  <span className="title__lg">Interior</span>
                  <span className="title__rev">Revolution</span>
                  <span className="title__rev">Revolution</span>
                  <span className="title__rev">Revolution</span>
                  <span className="title__rev">Revolution</span>
                </div>
              </div>
            </div>
          </header>
          <div className="main">
            <div className="main__grain">
              <Grain id="iMainTex" className="grain-fill grain-fill--tex" />
              <WarmGrain id="iMainWarm" className="grain-fill grain-fill--warm" />
            </div>
          </div>
        </div>
      </div>
      <div className="intro-brand" aria-hidden="true">furnishes.</div>
      <div className="intro-count">
        <div className="intro-count-label">loading</div>
        <div className="intro-count-num"><span className="ic-br ic-br--o">「</span>{String(pct).padStart(2, "0")}<span className="ic-br ic-br--c">」</span><span className="ic-pct">%</span></div>
      </div>
      <div className="intro-meta">
        <div className="intro-meta-mono">[ Visual development · 3D ]</div>
        <div className="intro-meta-top">Soft Architecture</div>
      </div>
    </div>
  );
}

const CSS = `
/* Fonts are loaded once by the wrapper (STANDALONE_GLOBAL_CSS, variable wdth+wght axis); no per-component @import. */
.intro{ position:fixed; inset:0; z-index:80; overflow:hidden; color:#FBF0DC;
  background:transparent;
  transition:opacity .4s ease; font-family:"Archivo",sans-serif; }
/* exit: the loader's background already equals the landing's, so there is NO
   reveal/expand animation, the loader simply fades out uniformly and the live
   landing (same background) shows through; only the landing's text gently surfaces. */
/* exit: the background already equals the landing's, so no reveal animation, the
   loader's CONTENT simply fades out (the brand at top is excluded so it stays put
   and hands off seamlessly to the landing's own brand underneath). */
.intro.wipe .intro-canvas,
.intro.wipe .intro-bg-wrap,
.intro.wipe .intro-count,
.intro.wipe .intro-meta{ opacity:0; transition:opacity ${REVEAL_MS}ms cubic-bezier(.16,.84,.3,1); }
.intro.exit{ pointer-events:none; }
/* counter just lifts a touch and fades, no big slide */
@keyframes txt-exit{ from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-12px)} }
.intro.exit .intro-count, .intro.exit .intro-meta{ animation:txt-exit ${EXIT_MS}ms cubic-bezier(.16,.84,.3,1) forwards; }
.intro.exit .intro-mark, .intro.exit .intro-skip{ opacity:0; transition:opacity .25s ease; pointer-events:none; }
.intro-canvas{ position:absolute; inset:0; width:100%; height:100%; z-index:2; }
@keyframes intro-brand-in{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
@keyframes intro-el-in{ from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
.intro-count{ animation:intro-el-in .9s cubic-bezier(.16,.84,.3,1) .35s both; }
.intro-meta{ animation:intro-el-in .9s cubic-bezier(.16,.84,.3,1) .55s both; }
.intro-brand{ position:absolute; top:0; left:0; right:0; height:var(--nav-h,52px); z-index:6;
  display:flex; align-items:center; justify-content:center;
  font-family:"Space Mono",monospace; font-weight:700;
  font-size:clamp(14px,1.05vw,16px); letter-spacing:.03em; color:#FBF0DC;
  pointer-events:none; animation:intro-brand-in 1s cubic-bezier(.16,.84,.3,1) .35s both; }
/* background replica: identical .spektral band+main behind everything (shares --nav-h
   from :root with the real landing, so the gradient split lines up exactly). */
.intro-bg-wrap{ position:absolute; inset:0; pointer-events:none; }
.intro-bg-wrap .title{ visibility:hidden; }            /* it only sizes the band; never shown */
.intro-bg-wrap .title__lg, .intro-bg-wrap .title__rev{ animation:none !important; }
.intro-navprobe, .intro-navprobe *{ animation:none !important; pointer-events:none; }
.intro-mark{ position:absolute; top:clamp(18px,3vh,30px); left:clamp(20px,5vw,64px); font-weight:700; letter-spacing:-.02em; font-size:clamp(15px,1.4vw,18px); color:rgba(251,240,220,.92); user-select:none; }
.intro-mark span{ margin-left:2px; font-size:.8em; vertical-align:.08em; }
.intro-skip{ position:absolute; top:clamp(16px,3vh,28px); right:clamp(20px,5vw,64px); appearance:none; border:1px solid rgba(251,240,220,.35); background:transparent; color:rgba(251,240,220,.82); cursor:pointer; border-radius:999px; font-family:"Space Mono",monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; padding:7px 14px; transition:border-color .2s,color .2s,background .2s; }
.intro-skip:hover{ color:#fff; border-color:#fff; background:rgba(251,240,220,.08); }
.intro-skip:focus-visible{ outline:2px solid #FBF0DC; outline-offset:3px; }
.intro-skip span{ margin-left:6px; opacity:.7; }
.intro-count{ position:absolute; left:clamp(20px,5vw,64px); bottom:clamp(34px,7vh,72px); line-height:.78; z-index:3; }
.intro-count-label{ font-family:"Space Mono",monospace; text-transform:uppercase; letter-spacing:.22em; font-size:clamp(10px,.85vw,12px); color:rgba(42,14,4,.5); margin-bottom:clamp(8px,1.4vh,16px); }
.intro-count-num{ font-family:"Archivo",sans-serif; font-weight:800; letter-spacing:-.04em; font-size:clamp(44px,7vw,96px); color:#6b2c12; font-variant-numeric:tabular-nums; }
.intro-count-num .ic-br{ font-weight:400; font-size:.5em; opacity:.38; }
.intro-count-num .ic-br--o{ vertical-align:.5em; margin-right:.04em; }
.intro-count-num .ic-br--c{ vertical-align:-.06em; margin-left:.04em; }
.intro-count-num .ic-pct{ font-weight:600; font-size:.32em; opacity:.5; vertical-align:.92em; margin-left:.05em; }
.intro-meta{ position:absolute; right:clamp(20px,5vw,64px); bottom:clamp(34px,7vh,72px); text-align:right; z-index:3; }
.intro-meta-top{ font-family:"Archivo",sans-serif; font-weight:600; font-stretch:78%; font-size:clamp(26px,3vw,44px); letter-spacing:-.02em; line-height:.95; color:#6b2c12; }
.intro-meta-mono{ font-family:"Space Mono",monospace; font-size:clamp(12px,1vw,15px); letter-spacing:.18em; text-transform:uppercase; color:rgba(42,14,4,.5); margin-bottom:clamp(10px,1.4vh,14px); }
.intro.reduced{ transition:opacity .5s ease; }
.intro.reduced.wipe{ opacity:0; }
@media (max-width:760px){ .intro-count-num{ font-size:clamp(38px,12vw,68px); } .intro-meta{ display:none; } }
`;

/* ============================================================================
   ROOT, the loader sits on top of the landing. The moment its exit "hole" begins
   to open (onReveal) we mount the real landing UNDERNEATH, so the landing starts
   its own 3D opening + text exactly as the hole reveals it (they're one shot). The
   loader is only removed once the hole has fully opened (onDone). */
/* ──────────────────────────────────────────────────────────────
   Standalone demo wrapper. Owns everything page-level and demo-only:
   webfont loading, global scroll/scrollbar chrome, a preview <title>,
   the opening loader, and the navigation adapter. The reusable
   <SpektralLandingSurface /> above owns none of this.
   ────────────────────────────────────────────────────────────── */

export const LANDING_DESTINATIONS = {
  home: "home",
  products: "products",
  work: "work",
  capabilities: "capabilities",
  studio: "studio",
  journal: "journal",
  contact: "contact",
  login: "login",
};

/* Demo-only global chrome. Hiding the document scrollbar keeps the loader->landing
   hand-off from shifting the layout ~15px; native smooth scroll is enabled here
   (and disabled under reduced-motion). A real host owns these; the surface doesn't. */
const STANDALONE_GLOBAL_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62.5..125,100..900&family=Space+Mono:wght@400;700&display=swap");
html{scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none}
html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

/* Contain a render-time crash in the surface instead of white-screening the page. */
class ViewErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e, info) { console.error("[SpektralLanding] surface crashed:", e, info); }
  render() {
    if (this.state.err) {
      return (
        <div role="alert" style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "18px",
          textAlign: "center", padding: "24px",
          background: "#FFEDDF", color: "#6e1810",
          fontFamily: "'Archivo', system-ui, sans-serif",
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontStretch: "78%", fontSize: "clamp(18px,3vw,24px)" }}>
            Something went wrong on this page.
          </p>
          <button type="button"
            onClick={() => { this.setState({ err: false }); this.props.onReset && this.props.onReset(); }}
            style={{
              cursor: "pointer", fontFamily: "'Space Mono', monospace", textTransform: "uppercase",
              letterSpacing: ".12em", fontSize: "12px", padding: "10px 18px", borderRadius: "999px",
              border: "1px solid #6e1810", background: "#6e1810", color: "#FBF0DC",
            }}>
            Reload landing
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StandaloneSpektralLanding() {
  const [introGone, setIntroGone] = useState(false); // loader fully removed
  const [loaderReleased, setLoaderReleased] = useState(false); // loader WebGL context released
  const [forceReleaseLoader, setForceReleaseLoader] = useState(false); // stall fallback → intro force-releases
  const [boundaryKey, setBoundaryKey] = useState(0);

  // Preview <title> + demo-only global scroll/scrollbar/font chrome. Cleaned up on
  // unmount so nothing here permanently mutates the document for a host app.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Furnishes \u00b7 Interior Design & 3D Studio";
    const style = document.createElement("style");
    style.setAttribute("data-standalone-landing", "");
    style.textContent = STANDALONE_GLOBAL_CSS;
    document.head.appendChild(style);
    return () => { document.title = prevTitle; style.remove(); };
  }, []);

  // Safety net: however the loader behaves, make sure the landing appears.
  useEffect(() => {
    const t1 = setTimeout(() => setForceReleaseLoader(true), 9000);   // do NOT mount the hero without disposing the loader
    const t2 = setTimeout(() => setIntroGone(true), 10500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Temporary navigation adapter. A real integration replaces these with routing.
  const handleNavigate = (destination) => {
    console.log("[landing] navigate \u2192", destination);
  };
  const handleLogin = () => {
    console.log("[landing] login requested");
    // Real integration: window.location.assign("/login") or a router push.
  };
  const handleSubmitWaitlist = async (email) => {
    console.log("[landing] waitlist \u2192", email);
    return { ok: true };
  };

  return (
    <ViewErrorBoundary key={boundaryKey} onReset={() => setBoundaryKey((k) => k + 1)}>
      {loaderReleased && (
        <SpektralLandingSurface
          skipIntro={false}
          onNavigate={handleNavigate}
          onLogin={handleLogin}
          onSubmitWaitlist={handleSubmitWaitlist}
        />
      )}
      {!introGone && (
        <FurnishesIntro
          ready
          forceRelease={forceReleaseLoader}
          onRendererReleased={() => setLoaderReleased(true)}
          onDone={() => setIntroGone(true)}
        />
      )}
    </ViewErrorBoundary>
  );
}
