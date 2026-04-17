/* Space Studio — Immersive 3D Interior Walkthrough
 * Three.js first-person experience with pointer-lock controls,
 * AABB collision, procedural monochrome interior.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const canvas = document.getElementById('xp-canvas');
const startEl = document.getElementById('xpStart');
const enterBtn = document.getElementById('xpEnterBtn');
const loadingEl = document.getElementById('xpLoading');

/* ---------- Renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

/* ---------- Scene & Camera ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 18, 60);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 200);
const EYE_HEIGHT = 1.65;
camera.position.set(0, EYE_HEIGHT, 8);

/* ---------- Lighting ---------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.35);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(14, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(sun.target);

// Warm interior accent lights (still monochrome — just white at low intensity)
const accent1 = new THREE.PointLight(0xffffff, 18, 12, 2);
accent1.position.set(-4, 2.4, -3); scene.add(accent1);
const accent2 = new THREE.PointLight(0xffffff, 14, 10, 2);
accent2.position.set(5, 2.3, 2); scene.add(accent2);
const accent3 = new THREE.PointLight(0xffffff, 10, 8, 2);
accent3.position.set(0, 2.3, -9); scene.add(accent3);

/* ---------- Materials (monochrome palette) ---------- */
const MAT = {
  floor:    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.55, metalness: 0.05 }),
  floorRug: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
  wall:     new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.9 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 }),
  ceiling:  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.95 }),
  baseboard:new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 }),
  wood:     new THREE.MeshStandardMaterial({ color: 0x2d2a27, roughness: 0.4, metalness: 0.05 }),
  stone:    new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.65 }),
  fabric:   new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 }),
  metal:    new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.25, metalness: 0.85 }),
  white:    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
  glass:    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 0.9, transparent: true, opacity: 0.25 }),
  canvas:   new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.8 })
};

/* ---------- Collision registry (AABBs on XZ plane) ---------- */
const colliders = []; // { minX, maxX, minZ, maxZ }

function addCollider(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  colliders.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
}

function addBox(w, h, d, x, y, z, mat, { collide = true, shadow = true, parent = scene } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  parent.add(m);
  if (collide) addCollider(m);
  return m;
}

/* ---------- Build the house ---------- */
// House footprint: 20 (X) × 24 (Z), height 3.2
const W = 20, D = 24, H = 3.2;
const halfW = W / 2, halfD = D / 2;

// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), MAT.floor);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), MAT.ceiling);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = H;
scene.add(ceiling);

// Outer ground plane (visible through windows)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
scene.add(ground);

// Walls — build with gaps for doorways/windows using box segments.
// Wall thickness
const T = 0.2;

// North wall (z = -halfD) — solid
addBox(W, H, T, 0, 0, -halfD - T/2, MAT.wall);
// South wall (z = +halfD) — has entry doorway
const doorW = 2.2, doorH = 2.3;
// left segment
addBox((W - doorW) / 2, H, T, -(W + doorW) / 4, 0, halfD + T/2, MAT.wall);
// right segment
addBox((W - doorW) / 2, H, T, (W + doorW) / 4, 0, halfD + T/2, MAT.wall);
// lintel above door
addBox(doorW, H - doorH, T, 0, doorH, halfD + T/2, MAT.wall);

// West wall (x = -halfW) — with large window void
const winW = 6, winH = 1.8, winY = 0.9;
// bottom
addBox(T, winY, D, -halfW - T/2, 0, 0, MAT.wall);
// top
addBox(T, H - (winY + winH), D, -halfW - T/2, winY + winH, 0, MAT.wall);
// left of window
addBox(T, winH, (D - winW) / 2, -halfW - T/2, winY, -(D + winW) / 4, MAT.wall);
// right of window
addBox(T, winH, (D - winW) / 2, -halfW - T/2, winY, (D + winW) / 4, MAT.wall);
// glass pane
const glass1 = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), MAT.glass);
glass1.rotation.y = Math.PI / 2;
glass1.position.set(-halfW + 0.01, winY + winH / 2, 0);
scene.add(glass1);

// East wall (x = +halfW) — another window
addBox(T, winY, D, halfW + T/2, 0, 0, MAT.wall);
addBox(T, H - (winY + winH), D, halfW + T/2, winY + winH, 0, MAT.wall);
addBox(T, winH, (D - winW) / 2, halfW + T/2, winY, -(D + winW) / 4, MAT.wall);
addBox(T, winH, (D - winW) / 2, halfW + T/2, winY, (D + winW) / 4, MAT.wall);
const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), MAT.glass);
glass2.rotation.y = -Math.PI / 2;
glass2.position.set(halfW - 0.01, winY + winH / 2, 0);
scene.add(glass2);

// Interior partition — divides north (bedroom) from living area, with a doorway
const partZ = -4; // z position
const pDoorW = 2;
// left segment
addBox((W - pDoorW) / 2, H, T, -(W + pDoorW) / 4, 0, partZ, MAT.wall);
// right segment
addBox((W - pDoorW) / 2, H, T, (W + pDoorW) / 4, 0, partZ, MAT.wall);
// lintel
addBox(pDoorW, H - doorH, T, 0, doorH, partZ, MAT.wall);

// Baseboard trim (cosmetic, no collide) — simple line around perimeter at y=0
const tb = 0.08;
const baseMat = MAT.baseboard;
// just a subtle dark strip where feasible; skip doorway gaps for simplicity
addBox(W, tb, 0.02, 0, 0, -halfD + 0.01, baseMat, { collide: false });
addBox(W, tb, 0.02, 0, 0,  halfD - 0.01, baseMat, { collide: false });

/* ---------- Interior feature wall (dark monolith behind sofa) ---------- */
addBox(8, 2.6, 0.12, 0, 0.1, halfD - 1.5, MAT.wallDark, { collide: false });

/* ---------- Furniture ---------- */
// Living area (z > -4): centered around origin, sofa facing south
// Rug
const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), MAT.floorRug);
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.005, 2);
rug.receiveShadow = true;
scene.add(rug);

// Sofa — long blocky mass
function buildSofa(x, z, rotY = 0) {
  const g = new THREE.Group();
  // base
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.1), MAT.fabric);
  base.position.y = 0.25; base.castShadow = base.receiveShadow = true; g.add(base);
  // back
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 0.25), MAT.fabric);
  back.position.set(0, 0.9, -0.425); back.castShadow = back.receiveShadow = true; g.add(back);
  // cushions (3)
  for (let i = -1; i <= 1; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.95), MAT.fabric);
    c.position.set(i * 1.05, 0.62, 0.05); c.castShadow = c.receiveShadow = true; g.add(c);
  }
  // arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 1.1), MAT.fabric);
  armL.position.set(-1.7, 0.6, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 1.7; g.add(armR);

  g.position.set(x, 0, z); g.rotation.y = rotY;
  scene.add(g);
  addCollider(base);
}
buildSofa(0, 3.4);

// Coffee table
function buildTable(x, z, w = 1.6, d = 0.9, h = 0.4) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), MAT.stone);
  top.position.set(x, h, z); top.castShadow = top.receiveShadow = true; scene.add(top);
  addCollider(top);
  const legMat = MAT.metal;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.04), legMat);
    leg.position.set(x + sx * (w/2 - 0.08), h/2, z + sz * (d/2 - 0.08));
    leg.castShadow = true; scene.add(leg);
  }
}
buildTable(0, 1.5);

// Armchair (right of sofa area)
function buildChair(x, z, rotY = 0) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), MAT.fabric);
  seat.position.y = 0.24; seat.castShadow = seat.receiveShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.18), MAT.fabric);
  back.position.set(0, 0.7, -0.36); back.castShadow = back.receiveShadow = true; g.add(back);
  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  addCollider(seat);
}
buildChair(4.2, 2.4, -Math.PI / 5);
buildChair(-4.2, 2.4, Math.PI / 5);

// Floor lamp (emissive-ish — just bright white sphere over metal stem)
function buildFloorLamp(x, z) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 12), MAT.metal);
  stem.position.set(x, 0.9, z); stem.castShadow = true; scene.add(stem);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.5 }));
  bulb.position.set(x, 1.85, z); scene.add(bulb);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16), MAT.metal);
  base.position.set(x, 0.025, z); scene.add(base);
  const l = new THREE.PointLight(0xffffff, 10, 8, 2);
  l.position.set(x, 1.85, z); scene.add(l);
}
buildFloorLamp(-5.8, 3.2);
buildFloorLamp(5.8, 3.2);

// Shelving unit against east wall
function buildShelf(x, z, rotY = 0) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 0.35), MAT.wood);
  frame.position.y = 1.1; g.add(frame);
  // shelves (lighter inner rects)
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 0.33), MAT.stone);
    s.position.y = 0.3 + i * 0.55; g.add(s);
  }
  // decorative objects
  const obj1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), MAT.stone);
  obj1.position.set(-1, 0.5, 0); g.add(obj1);
  const obj2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), MAT.white);
  obj2.position.set(0.2, 1.05, 0); g.add(obj2);
  const obj3 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 20), MAT.metal);
  obj3.position.set(1.1, 1.62, 0); g.add(obj3);

  g.position.set(x, 0, z); g.rotation.y = rotY;
  g.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  scene.add(g); addCollider(frame);
}
buildShelf(halfW - 0.5, 6, -Math.PI / 2);

// Dining area (back near front entrance, south side) — table + 4 chairs
function buildDining(cx, cz) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.0), MAT.wood);
  top.position.set(cx, 0.76, cz); top.castShadow = top.receiveShadow = true; scene.add(top);
  addCollider(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.76, 0.06), MAT.metal);
    leg.position.set(cx + sx * 1.1, 0.38, cz + sz * 0.4); scene.add(leg);
  }
  // chairs
  const positions = [
    { x: cx - 0.7, z: cz + 0.9, r: 0 },
    { x: cx + 0.7, z: cz + 0.9, r: 0 },
    { x: cx - 0.7, z: cz - 0.9, r: Math.PI },
    { x: cx + 0.7, z: cz - 0.9, r: Math.PI }
  ];
  for (const p of positions) buildDiningChair(p.x, p.z, p.r);
  // pendant lamp
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), MAT.metal);
  cord.position.set(cx, H - 0.6, cz); scene.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x111, side: THREE.DoubleSide, roughness: 0.7 }));
  shade.position.set(cx, H - 1.25, cz); scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8 }));
  bulb.position.set(cx, H - 1.3, cz); scene.add(bulb);
  const l = new THREE.PointLight(0xffffff, 12, 8, 2);
  l.position.set(cx, H - 1.25, cz); scene.add(l);
}
function buildDiningChair(x, z, rotY) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), MAT.wood);
  seat.position.y = 0.45; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.04), MAT.wood);
  back.position.set(0, 0.75, -0.23); g.add(back);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), MAT.wood);
    leg.position.set(sx * 0.22, 0.22, sz * 0.22); g.add(leg);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY;
  g.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  scene.add(g); addCollider(seat);
}
buildDining(5.5, 9);

// Kitchen counter (west side near entry)
function buildCounter() {
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 0.9, 0.7), MAT.wallDark);
  body.position.set(-6.5, 0.45, 9); body.castShadow = body.receiveShadow = true; scene.add(body); addCollider(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.05, 0.78), MAT.stone);
  top.position.set(-6.5, 0.925, 9); top.castShadow = top.receiveShadow = true; scene.add(top);
  // tall cabinet
  const tall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.6), MAT.wallDark);
  tall.position.set(-9.1, 1.2, 9); tall.castShadow = tall.receiveShadow = true; scene.add(tall); addCollider(tall);
}
buildCounter();

// Bedroom (north of partition, z < -4): bed + nightstands + wardrobe
function buildBed(cx, cz) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 2.0), MAT.wood);
  frame.position.set(cx, 0.175, cz); frame.castShadow = frame.receiveShadow = true; scene.add(frame); addCollider(frame);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.25, 1.85), MAT.white);
  mattress.position.set(cx, 0.48, cz); mattress.castShadow = mattress.receiveShadow = true; scene.add(mattress);
  const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.4), MAT.white);
  pillow1.position.set(cx - 0.45, 0.67, cz - 0.65); scene.add(pillow1);
  const pillow2 = pillow1.clone(); pillow2.position.x = cx + 0.45; scene.add(pillow2);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.1), MAT.wallDark);
  headboard.position.set(cx, 0.95, cz - 1.0); scene.add(headboard); addCollider(headboard);
  // nightstands
  for (const sx of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.45), MAT.wood);
    n.position.set(cx + sx * 1.5, 0.25, cz - 0.85); n.castShadow = n.receiveShadow = true; scene.add(n); addCollider(n);
    // lamp
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 }));
    lamp.position.set(cx + sx * 1.5, 0.62, cz - 0.85); scene.add(lamp);
    const pl = new THREE.PointLight(0xffffff, 4, 5, 2); pl.position.copy(lamp.position); scene.add(pl);
  }
}
buildBed(0, -9);

// Wardrobe against north wall
addBox(4, 2.4, 0.7, -6, 0, -halfD + 0.6, MAT.wallDark);

// Artwork on feature wall
const art = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), MAT.canvas);
art.position.set(0, 1.6, halfD - 1.56);
art.rotation.y = Math.PI;
scene.add(art);
// inner frame (white)
const artInner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8),
  new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.9 }));
artInner.position.set(0, 1.6, halfD - 1.555);
artInner.rotation.y = Math.PI;
scene.add(artInner);

/* ---------- Pointer Lock Controls ---------- */
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

controls.addEventListener('lock', () => startEl.classList.add('hidden'));
controls.addEventListener('unlock', () => startEl.classList.remove('hidden'));

enterBtn.addEventListener('click', () => controls.lock());
// Also allow click-anywhere-on-start to lock
startEl.addEventListener('click', (e) => {
  if (e.target === enterBtn) return;
  controls.lock();
});

/* ---------- Movement state ---------- */
const keys = { forward: false, back: false, left: false, right: false, sprint: false, jump: false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let verticalVel = 0;
let canJump = true;

const WALK = 3.6, RUN = 6.2, JUMP = 4.2, GRAVITY = 14;
const PLAYER_RADIUS = 0.35;

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    keys.forward = true; break;
    case 'KeyS': case 'ArrowDown':  keys.back = true; break;
    case 'KeyA': case 'ArrowLeft':  keys.left = true; break;
    case 'KeyD': case 'ArrowRight': keys.right = true; break;
    case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
    case 'Space':
      if (canJump) { verticalVel = JUMP; canJump = false; }
      break;
  }
});
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    keys.forward = false; break;
    case 'KeyS': case 'ArrowDown':  keys.back = false; break;
    case 'KeyA': case 'ArrowLeft':  keys.left = false; break;
    case 'KeyD': case 'ArrowRight': keys.right = false; break;
    case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
  }
});

/* ---------- Collision resolution ---------- */
function blocked(x, z) {
  for (const b of colliders) {
    if (x + PLAYER_RADIUS > b.minX && x - PLAYER_RADIUS < b.maxX &&
        z + PLAYER_RADIUS > b.minZ && z - PLAYER_RADIUS < b.maxZ) {
      return true;
    }
  }
  // House outer bounds (keep player inside)
  if (x < -halfW + PLAYER_RADIUS || x > halfW - PLAYER_RADIUS) return true;
  if (z < -halfD + PLAYER_RADIUS || z > halfD - PLAYER_RADIUS) return true;
  return false;
}

function move(dx, dz) {
  const obj = controls.getObject();
  const nx = obj.position.x + dx;
  const nz = obj.position.z + dz;
  // Slide along axes
  if (!blocked(nx, obj.position.z)) obj.position.x = nx;
  if (!blocked(obj.position.x, nz)) obj.position.z = nz;
}

/* ---------- Animation loop ---------- */
const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    const speed = keys.sprint ? RUN : WALK;
    direction.z = Number(keys.forward) - Number(keys.back);
    direction.x = Number(keys.right) - Number(keys.left);
    direction.normalize();

    velocity.x = direction.x * speed;
    velocity.z = direction.z * speed;

    // PointerLockControls.moveRight/moveForward move XZ in camera space
    const obj = controls.getObject();
    const forward = new THREE.Vector3();
    controls.getDirection(forward);
    forward.y = 0; forward.normalize();
    const strafe = new THREE.Vector3(forward.z, 0, -forward.x);

    const dx = (forward.x * velocity.z + strafe.x * velocity.x) * dt;
    const dz = (forward.z * velocity.z + strafe.z * velocity.x) * dt;
    move(dx, dz);

    // Vertical / gravity
    verticalVel -= GRAVITY * dt;
    obj.position.y += verticalVel * dt;
    if (obj.position.y <= EYE_HEIGHT) {
      obj.position.y = EYE_HEIGHT;
      verticalVel = 0;
      canJump = true;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/* ---------- Resize ---------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

/* ---------- Kickoff ---------- */
loadingEl.textContent = 'READY · CLICK TO ENTER';
animate();
