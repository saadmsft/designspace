/* Space Studio — Scene-switching 3D Room Tour
 * Five curated, colorful rooms. Smooth orbit camera, no walking/jump.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

const canvas = document.getElementById('xp-canvas');
const loadingEl = document.getElementById('xpLoading');

/* ---------- Renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

/* ---------- Scene & Camera ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0f);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(6, 4, 8);

/* ---------- Env map (gives materials pleasant reflections) ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* ---------- Controls ---------- */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 16;
controls.minPolarAngle = Math.PI * 0.18;
controls.maxPolarAngle = Math.PI * 0.52;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.target.set(0, 1.2, 0);

/* ---------- Lighting (scene-level; rooms add their own accents) ---------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x141420, 0.4);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.0005;
scene.add(sun);

/* ---------- Helpers ---------- */
const m = (hex, opts = {}) => new THREE.MeshStandardMaterial({
  color: hex, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0.05,
  emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0
});
const box = (w, h, d, x, y, z, mat, parent) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.position.set(x, y + h / 2, z);
  b.castShadow = true; b.receiveShadow = true;
  parent.add(b); return b;
};
const flat = (w, d, mat, parent) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  p.rotation.x = -Math.PI / 2; p.receiveShadow = true; parent.add(p); return p;
};
const wall = (w, h, mat, parent) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.receiveShadow = true; parent.add(p); return p;
};
const cyl = (rT, rB, h, seg, mat, parent) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat);
  c.castShadow = true; c.receiveShadow = true; parent.add(c); return c;
};
const sph = (r, mat, parent) => {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
  s.castShadow = true; s.receiveShadow = true; parent.add(s); return s;
};
// curtain-like plane
const drape = (w, h, mat, parent) => {
  const g = new THREE.PlaneGeometry(w, h, 20, 4);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(x * 6) * 0.04);
  }
  g.computeVertexNormals();
  const p = new THREE.Mesh(g, mat);
  p.castShadow = true; p.receiveShadow = true; parent.add(p); return p;
};

/* ================================================================
   ROOMS — each builds a THREE.Group and adds accent lights.
   Dimensions: 10w × 4h × 10d.
   Camera orbits a target roughly at (0, 1.3, 0).
   =============================================================== */

function buildShell(wallCol, floorCol, rugCol, accent) {
  const g = new THREE.Group();
  const W = 10, H = 4, D = 10;

  // Floor
  flat(W, D, m(floorCol, { rough: 0.55 }), g);

  // Back + side walls (player looks toward -Z, so back wall at z=-5)
  const wallMat = m(wallCol, { rough: 0.95 });
  const back = wall(W, H, wallMat, g); back.position.set(0, H/2, -D/2);
  const left = wall(D, H, wallMat, g); left.position.set(-W/2, H/2, 0); left.rotation.y = Math.PI/2;
  const right = wall(D, H, wallMat, g); right.position.set(W/2, H/2, 0); right.rotation.y = -Math.PI/2;

  // Subtle ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), m(0xf4efe6, { rough: 0.95 }));
  ceil.rotation.x = Math.PI/2; ceil.position.y = H; g.add(ceil);

  // Rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.6), m(rugCol, { rough: 0.95 }));
  rug.rotation.x = -Math.PI/2; rug.position.y = 0.002; rug.receiveShadow = true; g.add(rug);

  // Baseboards
  const bb = m(0x151515, { rough: 0.8 });
  box(W, 0.08, 0.02, 0, 0, -D/2 + 0.012, bb, g);
  box(0.02, 0.08, D, -W/2 + 0.012, 0, 0, bb, g);
  box(0.02, 0.08, D,  W/2 - 0.012, 0, 0, bb, g);

  // Two colored accent point lights
  const l1 = new THREE.PointLight(accent, 28, 14, 2);
  l1.position.set(-2.4, 2.6, 2); l1.castShadow = false; g.add(l1);
  const l2 = new THREE.PointLight(0xfff1d4, 22, 14, 2);
  l2.position.set(2.8, 2.4, -2); g.add(l2);

  return g;
}

/* ---------- ROOM 1: LIVING ROOM (terracotta & olive) ---------- */
function roomLiving() {
  const g = buildShell(0xe8d8b8, 0x6a4a35, 0x9d4a2a, 0xffb37a);

  // Feature wall panel (terracotta)
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.2), m(0xb95c3c, { rough: 0.85 }));
  panel.position.set(0, 1.7, -4.99); g.add(panel);
  // arched mirror
  const arch = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32, 0, Math.PI),
    m(0xf2e8d8, { rough: 0.1, metal: 0.9 }));
  arch.position.set(-1.4, 2.2, -4.98); g.add(arch);
  const archB = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3), m(0xf2e8d8, { rough: 0.1, metal: 0.9 }));
  archB.position.set(-1.4, 1.55, -4.98); g.add(archB);

  // Curved sofa (olive) — three padded blocks
  const sofa = new THREE.Group();
  const sofaMat = m(0x6e7a3a, { rough: 0.95 });
  const base = box(3.6, 0.45, 1.1, 0, 0.18, 0, sofaMat, sofa);
  const back = box(3.6, 0.7, 0.25, 0, 0.65, -0.43, sofaMat, sofa);
  for (let i = -1; i <= 1; i++) box(1.1, 0.22, 0.95, i * 1.15, 0.6, 0.05, sofaMat, sofa);
  box(0.22, 0.6, 1.1, -1.9, 0.48, 0, sofaMat, sofa);
  box(0.22, 0.6, 1.1,  1.9, 0.48, 0, sofaMat, sofa);
  // throw pillows (mustard + rust)
  sph(0.22, m(0xd89a3a, { rough: 0.9 }), sofa).position.set(-1.2, 0.82, 0.1);
  sph(0.22, m(0xb84e2f, { rough: 0.9 }), sofa).position.set(1.1, 0.82, 0.1);
  sofa.position.set(0, 0, 1.6);
  g.add(sofa);

  // Coffee table (travertine)
  const coffee = box(1.5, 0.08, 0.9, 0, 0.4, 0.2, m(0xe6d4b0, { rough: 0.5 }), g);
  // legs
  const legMat = m(0x151515, { rough: 0.4, metal: 0.8 });
  for (const sx of [-1,1]) for (const sz of [-1,1])
    box(0.05, 0.4, 0.05, sx * (0.7), 0, 0.2 + sz * 0.4, legMat, g);
  // book + vase
  box(0.45, 0.03, 0.28, -0.4, 0.44, 0.2, m(0xc2472a, { rough: 0.7 }), g);
  const vase = cyl(0.12, 0.15, 0.38, 24, m(0xe2d8c6, { rough: 0.3 }), g);
  vase.position.set(0.3, 0.63, 0.2);
  // flowers (simple pink bloom)
  for (let i = 0; i < 5; i++) {
    const petal = sph(0.06, m(0xf06a8f, { rough: 0.7 }), g);
    petal.position.set(0.3 + Math.cos(i) * 0.08, 0.9 + Math.sin(i) * 0.02, 0.2 + Math.sin(i) * 0.08);
  }

  // Armchair (rust)
  const chair = new THREE.Group();
  const chairMat = m(0xb34b2c, { rough: 0.9 });
  box(0.95, 0.4, 0.95, 0, 0.2, 0, chairMat, chair);
  box(0.95, 0.85, 0.18, 0, 0.6, -0.38, chairMat, chair);
  box(0.12, 0.55, 0.95, -0.42, 0.45, 0, chairMat, chair);
  box(0.12, 0.55, 0.95, 0.42, 0.45, 0, chairMat, chair);
  chair.position.set(3.2, 0, 1.4); chair.rotation.y = -0.6; g.add(chair);

  // Floor lamp (brass)
  const lampG = new THREE.Group();
  cyl(0.02, 0.02, 2.0, 10, m(0xc9a760, { rough: 0.3, metal: 0.8 }), lampG).position.set(0, 1.0, 0);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 24, 1, true),
    m(0xf2dba9, { rough: 0.6 })); shade.material.side = THREE.DoubleSide;
  shade.position.set(0, 1.9, 0); lampG.add(shade);
  const bulb = sph(0.12, m(0xfff2c9, { emissive: 0xffe3a0, emissiveIntensity: 2.2 }), lampG);
  bulb.position.set(0, 2.0, 0);
  lampG.position.set(-3.4, 0, 1.4);
  g.add(lampG);
  const lampLight = new THREE.PointLight(0xffdfa0, 18, 10, 2);
  lampLight.position.set(-3.4, 2.0, 1.4); g.add(lampLight);

  // Window on right wall with warm light (sunset)
  const winFrame = box(0.06, 2.4, 4, 4.99, 0.9, 0, m(0x1a1a1a, { rough: 0.4 }), g);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.2), m(0xffd59a, { rough: 0.1, emissive: 0xffb679, emissiveIntensity: 0.8 }));
  winGlass.position.set(4.98, 2.1, 0); winGlass.rotation.y = -Math.PI/2; g.add(winGlass);
  const sunRay = new THREE.RectAreaLight(0xffb980, 6, 3.8, 2.2);
  sunRay.position.set(4.5, 2.1, 0); sunRay.lookAt(0, 1, 0); g.add(sunRay);

  // Plant in corner
  const pot = cyl(0.3, 0.35, 0.5, 24, m(0x2f2a24, { rough: 0.6 }), g);
  pot.position.set(-4, 0.25, -3.7);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8),
      m([0x4e6a2f,0x6b8a3a,0x3e5a25][i%3], { rough: 0.9 }));
    leaf.scale.set(0.3, 1.4, 0.3);
    leaf.position.set(-4 + Math.cos(i) * 0.25, 1.0 + Math.sin(i * 1.3) * 0.3, -3.7 + Math.sin(i) * 0.25);
    leaf.rotation.z = (i - 3) * 0.25; leaf.rotation.x = Math.sin(i) * 0.3;
    g.add(leaf);
  }

  return g;
}

/* ---------- ROOM 2: BEDROOM (dusty rose & deep teal) ---------- */
function roomBedroom() {
  const g = buildShell(0xf2dce1, 0x6b3b3a, 0x2a4a4a, 0xff9ea7);

  // Panelled back wall (deep teal)
  const teal = m(0x1f3a3e, { rough: 0.85 });
  for (let i = -2; i <= 2; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), teal);
    p.position.set(i * 1.85, 1.7, -4.98); g.add(p);
    // vertical gold line
    box(0.02, 3.2, 0.01, i * 1.85 + 0.9, 0.1, -4.97, m(0xcba15a, { rough: 0.3, metal: 0.8 }), g);
  }

  // Bed
  const bed = new THREE.Group();
  // frame
  box(2.4, 0.35, 2.1, 0, 0.18, 0, m(0x3e2a29, { rough: 0.5 }), bed);
  // mattress (cream)
  box(2.25, 0.28, 1.95, 0, 0.5, 0, m(0xf5ede2, { rough: 0.9 }), bed);
  // duvet (rose)
  box(2.25, 0.12, 1.4, 0, 0.67, 0.25, m(0xd98ea0, { rough: 0.9 }), bed);
  // pillows
  box(0.85, 0.14, 0.45, -0.55, 0.72, -0.7, m(0xffffff, { rough: 0.9 }), bed);
  box(0.85, 0.14, 0.45, 0.55, 0.72, -0.7, m(0xffffff, { rough: 0.9 }), bed);
  box(0.6, 0.1, 0.32, -0.55, 0.86, -0.62, m(0xcf6077, { rough: 0.9 }), bed);
  box(0.6, 0.1, 0.32, 0.55, 0.86, -0.62, m(0xcf6077, { rough: 0.9 }), bed);
  // headboard (velvet teal)
  box(2.7, 1.5, 0.15, 0, 0.75, -1.05, m(0x284a4f, { rough: 0.95 }), bed);
  bed.position.set(0, 0, -1.4);
  g.add(bed);

  // Nightstands + lamps
  for (const sx of [-1, 1]) {
    const ns = box(0.6, 0.55, 0.45, sx * 1.85, 0, -1.8, m(0x3e2a29, { rough: 0.5 }), g);
    const lampBase = cyl(0.09, 0.12, 0.1, 16, m(0xcba15a, { rough: 0.3, metal: 0.8 }), g);
    lampBase.position.set(sx * 1.85, 0.6, -1.8);
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 20),
      m(0xf2e0c4, { rough: 0.7, emissive: 0xffd8a0, emissiveIntensity: 0.7 }));
    lampShade.position.set(sx * 1.85, 0.85, -1.8); g.add(lampShade);
    const pl = new THREE.PointLight(0xffd199, 8, 5, 2);
    pl.position.set(sx * 1.85, 0.9, -1.8); g.add(pl);
  }

  // Bench at foot of bed
  box(1.8, 0.4, 0.5, 0, 0.2, 0.5, m(0xcba15a, { rough: 0.6, metal: 0.3 }), g);
  box(1.7, 0.08, 0.42, 0, 0.44, 0.5, m(0xd08599, { rough: 0.9 }), g);

  // Rug accent (plum)
  const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), m(0x4c2233, { rough: 0.95 }));
  rug2.rotation.x = -Math.PI/2; rug2.position.y = 0.004; g.add(rug2);

  // Window with cool blue evening glow on left wall
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.0), m(0x6a8bc9, { emissive: 0x3a5a9a, emissiveIntensity: 0.7 }));
  glass.position.set(-4.98, 2.0, 2.2); glass.rotation.y = Math.PI/2; g.add(glass);
  const coolLight = new THREE.RectAreaLight(0x6fa0ff, 4, 2.4, 2.0);
  coolLight.position.set(-4.5, 2.0, 2.2); coolLight.lookAt(0, 1, 0); g.add(coolLight);
  // curtains
  drape(0.9, 2.6, m(0xf5dfe3, { rough: 1 }), g).position.set(-4.96, 1.5, 3.4),
  drape(0.9, 2.6, m(0xf5dfe3, { rough: 1 }), g).position.set(-4.96, 1.5, 1.0);

  return g;
}

/* ---------- ROOM 3: KITCHEN / DINING (emerald & brass) ---------- */
function roomKitchen() {
  const g = buildShell(0xece2d0, 0x3a2f22, 0x1f4f3a, 0x5ee0b3);

  // Back wall: emerald cabinets
  const emerald = m(0x1f5a3d, { rough: 0.5 });
  for (let i = -2; i < 3; i++) {
    const cab = box(1.6, 2.0, 0.5, i * 1.7, 1.8, -4.75, emerald, g);
    // brass knob
    sph(0.04, m(0xe8c073, { rough: 0.2, metal: 0.9 }), g).position.set(i * 1.7, 2.9, -4.49);
  }
  // countertop
  box(9, 0.08, 0.65, 0, 0.9, -4.7, m(0xe8e3d4, { rough: 0.25 }), g);
  // base cabinets
  for (let i = -2; i < 3; i++)
    box(1.6, 0.9, 0.6, i * 1.7, 0, -4.72, m(0x173a2a, { rough: 0.5 }), g);

  // Range hood
  box(1.4, 1.2, 0.6, 0, 2.2, -4.7, m(0xe8c073, { rough: 0.3, metal: 0.8 }), g);
  box(1.0, 0.4, 0.05, 0, 1.3, -4.4, m(0x0a0a0a, { rough: 0.5 }), g); // range front

  // Dining table (walnut + marble top)
  const table = new THREE.Group();
  box(3.2, 0.08, 1.2, 0, 0.78, 0, m(0xf2ede1, { rough: 0.2 }), table);
  // trestle legs (brass)
  const brass = m(0xcf9a4e, { rough: 0.3, metal: 0.85 });
  for (const sx of [-1, 1]) {
    box(0.08, 0.76, 0.08, sx * 1.3, 0, -0.45, brass, table);
    box(0.08, 0.76, 0.08, sx * 1.3, 0, 0.45, brass, table);
    box(0.08, 0.06, 1.0, sx * 1.3, 0.42, 0, brass, table);
  }
  table.position.set(0, 0, 1.5);
  g.add(table);

  // Chairs
  function kChair(x, z, r) {
    const c = new THREE.Group();
    const mat = m(0x8c4b2a, { rough: 0.6 });
    box(0.5, 0.06, 0.48, 0, 0.45, 0, mat, c);
    box(0.5, 0.7, 0.06, 0, 0.8, -0.21, mat, c);
    for (const sx of [-1,1]) for (const sz of [-1,1])
      box(0.05, 0.45, 0.05, sx * 0.22, 0, sz * 0.21, mat, c);
    c.position.set(x, 0, z); c.rotation.y = r;
    g.add(c);
  }
  kChair(-1.1, 2.4, 0); kChair(0, 2.4, 0); kChair(1.1, 2.4, 0);
  kChair(-1.1, 0.6, Math.PI); kChair(0, 0.6, Math.PI); kChair(1.1, 0.6, Math.PI);

  // Pendant lamps
  for (let i = -1; i <= 1; i++) {
    const cord = cyl(0.01, 0.01, 1.2, 6, m(0x222222), g);
    cord.position.set(i * 1.0, 3.4, 1.5);
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      m(0xcf9a4e, { rough: 0.2, metal: 0.85 })); shade.material.side = THREE.DoubleSide;
    shade.rotation.x = Math.PI; shade.position.set(i * 1.0, 2.8, 1.5); g.add(shade);
    const bulb = sph(0.08, m(0xfff3c0, { emissive: 0xfff0b8, emissiveIntensity: 3 }), g);
    bulb.position.set(i * 1.0, 2.75, 1.5);
    const pl = new THREE.PointLight(0xfff3c0, 10, 6, 2);
    pl.position.set(i * 1.0, 2.75, 1.5); g.add(pl);
  }

  // Fruit bowl
  const bowl = cyl(0.32, 0.25, 0.12, 24, m(0xe8c073, { rough: 0.3, metal: 0.9 }), g);
  bowl.position.set(0, 0.88, 1.5);
  for (const [c, dx, dz] of [[0xe86d3f, -0.1, 0], [0xe86d3f, 0.1, 0.08], [0xe86d3f, 0, -0.08], [0xe8c463, 0.05, 0.12]])
    sph(0.09, m(c, { rough: 0.6 }), g).position.set(dx, 0.96, 1.5 + dz);
  // wine bottle + glasses
  cyl(0.05, 0.05, 0.35, 18, m(0x3a1a1a, { rough: 0.2 }), g).position.set(-1.0, 1.07, 1.5);
  sph(0.06, m(0xffffff, { rough: 0.05, metal: 0 }), g).position.set(-0.6, 1.0, 1.5);

  // Big window left wall (garden view)
  const gardenGlass = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), m(0x96c96e, { emissive: 0x6a9d43, emissiveIntensity: 0.6 }));
  gardenGlass.position.set(-4.98, 2.0, 0); gardenGlass.rotation.y = Math.PI/2; g.add(gardenGlass);
  const greenLight = new THREE.RectAreaLight(0x9fe0a2, 3.5, 4, 2.4);
  greenLight.position.set(-4.5, 2.0, 0); greenLight.lookAt(0, 1, 0); g.add(greenLight);

  return g;
}

/* ---------- ROOM 4: STUDY / LIBRARY (cobalt & ochre) ---------- */
function roomStudy() {
  const g = buildShell(0x17335a, 0x3a2418, 0x7a5a30, 0x4f8fff);

  // Bookshelves (back wall)
  const shelfMat = m(0x1a2640, { rough: 0.6 });
  box(9.6, 3.4, 0.4, 0, 0.2, -4.78, shelfMat, g);
  for (let r = 0; r < 4; r++) {
    box(9.4, 0.04, 0.35, 0, 0.65 + r * 0.7, -4.76, m(0xcf9a4e, { rough: 0.4 }), g);
    // books
    let x = -4.5;
    while (x < 4.5) {
      const bw = 0.1 + Math.random() * 0.12;
      const bh = 0.5 + Math.random() * 0.18;
      const col = [0xd84a3a, 0xe8a43e, 0xf2d27a, 0x3a7aa8, 0x7a3e8a, 0x2f6e4f, 0xd8cfc4, 0x1a1a1a][Math.floor(Math.random() * 8)];
      box(bw, bh, 0.2, x + bw/2, 0.68 + r * 0.7, -4.7, m(col, { rough: 0.8 }), g);
      x += bw + 0.015;
    }
  }

  // Leather wingback chair
  const chairG = new THREE.Group();
  const leather = m(0x7a2e25, { rough: 0.5 });
  box(1.0, 0.5, 1.0, 0, 0.25, 0, leather, chairG);
  box(1.0, 1.3, 0.2, 0, 0.9, -0.4, leather, chairG);
  box(0.2, 1.0, 1.0, -0.4, 0.65, 0, leather, chairG);
  box(0.2, 1.0, 1.0,  0.4, 0.65, 0, leather, chairG);
  chairG.position.set(-1.8, 0, 1.2); chairG.rotation.y = 0.35;
  g.add(chairG);

  // Side table with brass lamp
  const side = box(0.5, 0.55, 0.5, -1.0, 0, 2.4, m(0x2a1c12, { rough: 0.4 }), g);
  const lampBase2 = cyl(0.09, 0.12, 0.1, 16, m(0xcf9a4e, { rough: 0.3, metal: 0.9 }), g);
  lampBase2.position.set(-1.0, 0.6, 2.4);
  cyl(0.015, 0.015, 0.45, 10, m(0xcf9a4e, { rough: 0.3, metal: 0.9 }), g).position.set(-1.0, 0.88, 2.4);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 20, 1, true),
    m(0xf6d78f, { rough: 0.5, emissive: 0xfbc26a, emissiveIntensity: 1.5 }));
  shade.material.side = THREE.DoubleSide; shade.position.set(-1.0, 1.2, 2.4); g.add(shade);
  const studyLight = new THREE.PointLight(0xfdc96b, 14, 6, 2);
  studyLight.position.set(-1.0, 1.25, 2.4); g.add(studyLight);

  // Desk (right side)
  const desk = new THREE.Group();
  box(2.6, 0.08, 1.1, 0, 0.76, 0, m(0x3e2a1c, { rough: 0.45 }), desk);
  box(0.08, 0.76, 1.1, -1.25, 0, 0, m(0xcf9a4e, { rough: 0.3, metal: 0.85 }), desk);
  box(0.08, 0.76, 1.1,  1.25, 0, 0, m(0xcf9a4e, { rough: 0.3, metal: 0.85 }), desk);
  box(2.6, 0.08, 0.08, 0, 0.38, -0.5, m(0xcf9a4e, { rough: 0.3, metal: 0.85 }), desk);
  // laptop
  box(0.55, 0.02, 0.38, -0.4, 0.8, 0, m(0x1a1a1a, { rough: 0.3, metal: 0.5 }), desk);
  box(0.55, 0.38, 0.02, -0.4, 1.0, -0.18, m(0x0f0f0f, { emissive: 0x3a6bc9, emissiveIntensity: 0.9 }), desk);
  // books stack
  box(0.35, 0.06, 0.26, 0.7, 0.8, 0.2, m(0xd84a3a, { rough: 0.8 }), desk);
  box(0.35, 0.06, 0.26, 0.7, 0.86, 0.2, m(0xe8a43e, { rough: 0.8 }), desk);
  box(0.35, 0.06, 0.26, 0.7, 0.92, 0.2, m(0x3a7aa8, { rough: 0.8 }), desk);
  // cup
  cyl(0.06, 0.06, 0.12, 20, m(0xd8cfc4, { rough: 0.4 }), desk).position.set(0.2, 0.86, 0.25);
  desk.position.set(2.7, 0, -0.5); desk.rotation.y = -Math.PI/8;
  g.add(desk);

  // Desk chair
  const dchair = new THREE.Group();
  box(0.55, 0.06, 0.55, 0, 0.46, 0, m(0xcf9a4e, { rough: 0.3, metal: 0.85 }), dchair);
  box(0.55, 0.7, 0.06, 0, 0.85, -0.25, m(0x1a1a1a, { rough: 0.5 }), dchair);
  for (const sx of [-1,1]) for (const sz of [-1,1])
    box(0.04, 0.46, 0.04, sx * 0.24, 0, sz * 0.24, m(0xcf9a4e, { rough: 0.3, metal: 0.85 }), dchair);
  dchair.position.set(2.2, 0, 0.3); dchair.rotation.y = -Math.PI/2 - Math.PI/8;
  g.add(dchair);

  // Globe
  const globe = sph(0.22, m(0x2a4d6f, { rough: 0.5 }), g);
  globe.position.set(3.3, 0.9, 0.2);
  cyl(0.02, 0.02, 0.5, 12, m(0xcf9a4e, { rough: 0.3, metal: 0.9 }), g).position.set(3.3, 0.5, 0.2);

  // Rug (ochre)
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), m(0xa06a2c, { rough: 0.95 }));
  r2.rotation.x = -Math.PI/2; r2.position.y = 0.003; g.add(r2);

  return g;
}

/* ---------- ROOM 5: GARDEN ATRIUM (sage, lavender, blush) ---------- */
function roomAtrium() {
  const g = buildShell(0xf2ead6, 0xc8bfa7, 0xd9b9a0, 0x9fe0a2);
  // override ceiling -> sky-ish
  // Find & adjust: replace material of the existing ceiling (last mesh with plane at y=H)
  g.children.forEach(ch => {
    if (ch.isMesh && ch.geometry.type === 'PlaneGeometry' && ch.rotation.x === Math.PI/2) {
      ch.material = m(0xdfeaf4, { rough: 0.9 });
    }
  });

  // Back wall arched garden view (bright greens)
  const archGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const archMat = m(0x9fd07a, { emissive: 0x6fa05a, emissiveIntensity: 0.8 });
  const archWin = new THREE.Mesh(archGeo, archMat);
  archWin.position.set(0, 1.7, -4.97); g.add(archWin);
  // arched white frame (two columns + top disc)
  box(0.15, 3.2, 0.1, -1.65, 0.1, -4.9, m(0xffffff), g);
  box(0.15, 3.2, 0.1,  1.65, 0.1, -4.9, m(0xffffff), g);
  const archTop = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 16, 32, Math.PI), m(0xffffff));
  archTop.rotation.x = Math.PI; archTop.position.set(0, 3.3, -4.88); g.add(archTop);
  const gardenAccent = new THREE.RectAreaLight(0xbaf0a8, 5, 3.2, 3.2);
  gardenAccent.position.set(0, 1.8, -4.6); gardenAccent.lookAt(0, 1, 0); g.add(gardenAccent);

  // Central fountain — circular water feature
  const basin = cyl(1.4, 1.5, 0.25, 48, m(0xe6d7bd, { rough: 0.4 }), g);
  basin.position.set(0, 0.12, 0.5);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48),
    new THREE.MeshPhysicalMaterial({ color: 0x4fa8c9, roughness: 0.05, metalness: 0, transmission: 0.5, transparent: true, opacity: 0.8 }));
  water.rotation.x = -Math.PI/2; water.position.set(0, 0.25, 0.5); g.add(water);
  const col = cyl(0.1, 0.12, 0.45, 24, m(0xe6d7bd, { rough: 0.4 }), g);
  col.position.set(0, 0.48, 0.5);
  sph(0.18, m(0x5fbfd9, { rough: 0.2, emissive: 0x2a8fa9, emissiveIntensity: 0.4 }), g).position.set(0, 0.8, 0.5);

  // Plants — lots of potted greenery
  const plantSpots = [
    { x: -3.5, z: -3, h: 2.0, col: 0x3a6a2c },
    { x:  3.5, z: -3, h: 2.2, col: 0x4a7e34 },
    { x: -4.0, z:  2, h: 1.6, col: 0x6b8a3a },
    { x:  4.0, z:  2, h: 1.8, col: 0x5a7f2e },
    { x: -2.5, z:  3, h: 1.3, col: 0x88b254 },
    { x:  2.5, z:  3, h: 1.2, col: 0x9fc96e },
  ];
  for (const p of plantSpots) {
    const pot = cyl(0.35, 0.4, 0.5, 24, m([0xd8b0a2, 0xe8c5b4, 0xc88f7e][Math.floor(Math.random()*3)], { rough: 0.6 }), g);
    pot.position.set(p.x, 0.25, p.z);
    // foliage cluster
    for (let i = 0; i < 10; i++) {
      const leaf = sph(0.25, m(p.col, { rough: 0.9 }), g);
      leaf.scale.set(0.4 + Math.random() * 0.3, 1.2 + Math.random() * 0.4, 0.4 + Math.random() * 0.3);
      leaf.position.set(
        p.x + (Math.random() - 0.5) * 0.6,
        0.6 + Math.random() * p.h,
        p.z + (Math.random() - 0.5) * 0.6
      );
      leaf.rotation.z = (Math.random() - 0.5) * 0.8;
      leaf.rotation.x = (Math.random() - 0.5) * 0.4;
    }
  }
  // small flowers (lavender + blush)
  for (let i = 0; i < 60; i++) {
    const c = [0xb58ad8, 0xe78fae, 0xf2b8a2, 0xfff2a0][i % 4];
    const f = sph(0.06, m(c, { rough: 0.6, emissive: c, emissiveIntensity: 0.1 }), g);
    const theta = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.random() * 2.2;
    f.position.set(Math.cos(theta) * r, 0.05 + Math.random() * 0.15, Math.sin(theta) * r);
  }

  // Bench (blush marble)
  const bench = box(2.4, 0.4, 0.5, 0, 0.2, 3.2, m(0xe7c3b9, { rough: 0.3 }), g);
  box(0.12, 0.4, 0.5, -1.15, 0, 3.2, m(0xcfa596, { rough: 0.4 }), g);
  box(0.12, 0.4, 0.5,  1.15, 0, 3.2, m(0xcfa596, { rough: 0.4 }), g);

  // Skylight-ish bright downlight
  const skylight = new THREE.RectAreaLight(0xfff4dc, 6, 5, 5);
  skylight.position.set(0, 3.9, 0); skylight.lookAt(0, 0, 0); g.add(skylight);

  // Hanging vines from ceiling corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const v = sph(0.1, m(0x6a8a3a, { rough: 0.9 }), g);
      v.scale.set(0.4, 2, 0.4);
      v.position.set(sx * (4.3 - i * 0.1), 3.5 - i * 0.35, sz * (4.3 - i * 0.1));
    }
  }

  return g;
}

/* ---------- Scene registry ---------- */
const ROOMS = [
  {
    id: 'living',
    name: 'LIVING ROOM',
    sub: 'THE COMMONS · SOUTH FACING',
    desc: 'A conversation pit anchored by a travertine hearth — saturated terracotta, layered textiles, and a golden window at sunset.',
    palette: ['#b95c3c', '#6e7a3a', '#e8d8b8', '#1a1a1a'],
    build: roomLiving,
    camera: { pos: [6, 3.2, 7], target: [0, 1.2, 1] },
    bg: 0x1a1410
  },
  {
    id: 'bedroom',
    name: 'BEDROOM',
    sub: 'THE NEST · QUIET WING',
    desc: 'Deep teal panelling with brass reveals, a velvet headboard, and soft rose bedding warmed by the last blue of evening.',
    palette: ['#1f3a3e', '#d98ea0', '#cba15a', '#f2dce1'],
    build: roomBedroom,
    camera: { pos: [5.5, 3.0, 6.5], target: [0, 1.0, -0.8] },
    bg: 0x111820
  },
  {
    id: 'kitchen',
    name: 'KITCHEN & DINING',
    sub: 'THE HEARTH · GARDEN FACING',
    desc: 'Emerald cabinetry meets brass trestles — a pool of pendant light over a marble table, and a long green view beyond.',
    palette: ['#1f5a3d', '#cf9a4e', '#e8c073', '#e8e3d4'],
    build: roomKitchen,
    camera: { pos: [6.5, 3.2, 6], target: [0, 1.3, 0.5] },
    bg: 0x10221a
  },
  {
    id: 'study',
    name: 'STUDY & LIBRARY',
    sub: 'THE READING ROOM · EAST WING',
    desc: 'Cobalt-blue stacks wrap the room, counterbalanced by ochre leather, brass, and the glow of a single desk lamp.',
    palette: ['#17335a', '#7a2e25', '#cf9a4e', '#a06a2c'],
    build: roomStudy,
    camera: { pos: [7, 3.2, 6], target: [0, 1.3, 0.2] },
    bg: 0x0f1524
  },
  {
    id: 'atrium',
    name: 'GARDEN ATRIUM',
    sub: 'THE WINTERGARDEN · CENTRAL COURT',
    desc: 'A skylit court built around a small fountain — sage greens, lavender blooms, and blush stone underfoot.',
    palette: ['#9fd07a', '#b58ad8', '#e7c3b9', '#f2ead6'],
    build: roomAtrium,
    camera: { pos: [7, 3.8, 7], target: [0, 1.1, 0] },
    bg: 0x14201a
  }
];

/* ---------- Room rendering & switching ---------- */
let currentGroup = null;
let currentIndex = -1;

function switchRoom(i, animate = true) {
  if (i === currentIndex) return;
  const room = ROOMS[i];
  const info = document.getElementById('xpInfo');

  const doSwap = () => {
    if (currentGroup) {
      scene.remove(currentGroup);
      disposeGroup(currentGroup);
    }
    currentGroup = room.build();
    scene.add(currentGroup);
    scene.background = new THREE.Color(room.bg);

    // Update camera/target
    camera.position.set(...room.camera.pos);
    controls.target.set(...room.camera.target);
    controls.update();
    currentIndex = i;
    updateInfo(room, i);
    if (info) info.classList.remove('swapping');
  };

  if (animate && info) {
    info.classList.add('swapping');
    setTimeout(doSwap, 260);
  } else {
    doSwap();
  }

  // Highlight button
  document.querySelectorAll('#xpRooms button').forEach((b, idx) => {
    b.classList.toggle('active', idx === i);
  });
}

function updateInfo(room, i) {
  document.getElementById('xpEyebrow').textContent = `+ROOM ${String(i+1).padStart(2,'0')} / ${String(ROOMS.length).padStart(2,'0')}`;
  document.getElementById('xpTitle').textContent = room.name;
  document.getElementById('xpSub').textContent = room.sub;
  document.getElementById('xpDesc').textContent = room.desc;
  const pal = document.getElementById('xpPalette');
  pal.innerHTML = room.palette.map(c => `<span style="background:${c}"></span>`).join('');
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose && m.dispose());
      else o.material.dispose && o.material.dispose();
    }
  });
}

/* ---------- Build room selector ---------- */
const roomsEl = document.getElementById('xpRooms');
ROOMS.forEach((r, i) => {
  const btn = document.createElement('button');
  btn.innerHTML = `<span class="swatch" style="--swatch:${r.palette[0]}"></span><span class="label">${r.name}</span><span class="count">0${i+1}</span>`;
  btn.addEventListener('click', () => switchRoom(i));
  roomsEl.appendChild(btn);
});

document.getElementById('xpPrev').addEventListener('click', () => {
  switchRoom((currentIndex - 1 + ROOMS.length) % ROOMS.length);
});
document.getElementById('xpNext').addEventListener('click', () => {
  switchRoom((currentIndex + 1) % ROOMS.length);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  switchRoom((currentIndex - 1 + ROOMS.length) % ROOMS.length);
  if (e.key === 'ArrowRight') switchRoom((currentIndex + 1) % ROOMS.length);
});

/* ---------- Resize ---------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

/* ---------- Animate ---------- */
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/* ---------- Kickoff ---------- */
switchRoom(0, false);
loadingEl.classList.add('hidden');
animate();
