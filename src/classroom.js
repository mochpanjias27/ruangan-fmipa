// Scene 3D ruang kelas (prosedural, tanpa aset eksternal) untuk hero.
import * as THREE from 'three';

const C = {
  green: 0x32643a, greenDark: 0x1f3f25, gold: 0xf9b315, red: 0xdc3028, ink: 0x1d1d1b,
  wallBack: 0xece4d6, wallSide: 0xf5efe4, cap: 0xfbf8f1, wood: 0xe8d2ae, woodDark: 0xc9a77a,
  desk: 0xf1dfc2, metal: 0x2a2a28, board: 0xfdfdfb, chalk: 0x2f4a33,
};

const W = 12, D = 10, H = 4.2, T = 0.3; // lebar (x), dalam (z), tinggi, tebal dinding

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.0, ...opts });
}
function box(w, h, d, color, x, y, z, opts = {}) {
  const { cast, ...mo } = opts;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color.isMaterial ? color : mat(color, mo));
  m.position.set(x, y + h / 2, z);
  m.castShadow = cast !== false;
  m.receiveShadow = true;
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function floorTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e8d2ae'; g.fillRect(0, 0, w, h);
    const rows = 16, ph = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 180;
      for (let x = -off; x < w; x += 360) {
        const shade = 225 + Math.round(Math.random() * 14);
        g.fillStyle = `rgb(${shade + 8},${shade - 16},${shade - 52})`;
        g.fillRect(x + 2, r * ph + 2, 356, ph - 4);
      }
      g.fillStyle = 'rgba(120,90,50,0.18)'; g.fillRect(0, r * ph, w, 2);
    }
  });
}

function boardTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#fdfdfb'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(50,100,58,0.10)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#32643a';
    g.font = '44px "Unpad Sans", sans-serif';
    g.fillText('Jadwal Ruang FMIPA', 48, 80);
    g.fillStyle = '#1d1d1b';
    g.font = '34px "Unpad Sans", sans-serif';
    g.fillText('1 SKS = 50 menit', 48, 140);
    g.fillText('Sesi 1: 07.30 – 08.20', 48, 190);
    g.fillText('f(x) = ∫ e^x dx', 48, 250);
    // grafik batang kecil
    const vals = [45, 62, 53, 63, 58, 32, 64, 66, 45];
    vals.forEach((v, i) => {
      g.fillStyle = i === 5 ? '#f9b315' : '#32643a';
      g.fillRect(560 + i * 46, 400 - v * 4.2, 32, v * 4.2);
    });
    g.strokeStyle = '#1d1d1b'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(548, 60); g.lineTo(548, 404); g.lineTo(980, 404); g.stroke();
    g.fillStyle = '#dc3028'; g.font = '28px "Unpad Sans", sans-serif';
    g.fillText('keterisian per sesi', 600, 450);
  });
}

function posterTexture() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#32643a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f9b315'; g.fillRect(0, h - 70, w, 70);
    g.fillStyle = '#fbf8f1'; g.font = '64px "Unpad Sans", sans-serif';
    g.fillText('∑', 30, 120);
    g.font = '30px "Unpad Sans", sans-serif';
    g.fillText('FMIPA', 30, 190);
    g.fillStyle = '#1f3f25'; g.font = '26px "Unpad Sans", sans-serif';
    g.fillText('Unpad', 30, h - 26);
  });
}

function clockTexture() {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fbf8f1'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#32643a'; g.lineWidth = 10; g.stroke();
    g.fillStyle = '#1d1d1b';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = 96, r2 = i % 3 === 0 ? 76 : 86;
      g.save(); g.translate(w / 2, w / 2); g.rotate(a);
      g.fillRect(-3, -r1, 6, r1 - r2);
      g.restore();
    }
  });
}

// ---------- perabot ----------
function studentDesk() {
  const g = new THREE.Group();
  const top = box(2.2, 0.07, 0.85, C.desk, 0, 1.15, 0);
  g.add(top);
  for (const [x, z] of [[-1.02, -0.36], [1.02, -0.36], [-1.02, 0.36], [1.02, 0.36]]) g.add(box(0.06, 1.15, 0.06, C.metal, x, 0, z));
  return g;
}
function chair() {
  const g = new THREE.Group();
  g.add(box(0.62, 0.05, 0.58, C.desk, 0, 0.72, 0));
  g.add(box(0.62, 0.5, 0.05, C.desk, 0, 1.12, 0.28));
  // rangka cantilever
  g.add(box(0.04, 0.04, 0.6, C.metal, -0.3, 0.0, 0.0));
  g.add(box(0.04, 0.04, 0.6, C.metal, 0.3, 0.0, 0.0));
  g.add(box(0.04, 0.74, 0.04, C.metal, -0.3, 0.0, 0.3));
  g.add(box(0.04, 0.74, 0.04, C.metal, 0.3, 0.0, 0.3));
  g.add(box(0.04, 0.6, 0.04, C.metal, -0.3, 0.76, 0.3));
  g.add(box(0.04, 0.6, 0.04, C.metal, 0.3, 0.76, 0.3));
  return g;
}
function backpack(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.28, 6, 12), mat(color));
  body.scale.set(1, 1, 0.7); body.position.y = 0.38; body.castShadow = true;
  g.add(body);
  g.add(box(0.3, 0.18, 0.08, C.gold, 0, 0.2, 0.15));
  return g;
}
function book(color, w = 0.32, d = 0.24, h = 0.05) { return box(w, h, d, color, 0, 0, 0); }

function plant() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 20), mat(C.gold));
  pot.position.y = 0.275; pot.castShadow = true; g.add(pot);
  const leafMat = mat(C.green, { roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), leafMat);
    const a = (i / 9) * Math.PI * 2;
    leaf.scale.set(0.55, 1.6, 0.25);
    leaf.position.set(Math.cos(a) * 0.18, 1.0 + (i % 3) * 0.18, Math.sin(a) * 0.18);
    leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
    leaf.castShadow = true;
    g.add(leaf);
  }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mat(C.red));
  tip.scale.set(0.6, 1.4, 0.3); tip.position.set(0, 1.6, 0); g.add(tip);
  g.userData.sway = true;
  return g;
}

export function mountClassroom(canvas, opts = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const center = new THREE.Vector3(W / 2, 1.2, D / 2);

  // kamera isometrik
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  const camDir = new THREE.Vector3(-1, 0.86, 1).normalize();
  const camDist = 40;

  // cahaya
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a7458, 1.45));
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.target.position.copy(center);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(center.x - 14, center.y + 12, center.z + 16);
  fill.target.position.copy(center);
  scene.add(fill, fill.target);

  const room = new THREE.Group();
  scene.add(room);

  // lantai + alas
  const floorTex = floorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(1.4, 1.4);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), mat(C.wood, { map: floorTex, roughness: 0.65 }));
  floor.position.set(W / 2, -0.03, D / 2); floor.receiveShadow = true;
  room.add(floor);
  room.add(box(W + T, 0.45, D + T, C.green, W / 2 + T / 2 - T / 2, -0.51, D / 2 - T / 2, { cast: false }));
  room.add(box(W + T + 0.02, 0.06, D + T + 0.02, C.gold, W / 2, -0.12, D / 2 - T / 2, { cast: false }));

  // dinding belakang (z = 0)
  room.add(box(W + T, H, T, C.wallBack, W / 2 + T / 2, 0, -T / 2));
  room.add(box(W + T + 0.02, 0.08, T + 0.02, C.cap, W / 2 + T / 2, H, -T / 2, { cast: false }));

  // dinding kanan (x = W) berjendela
  const wins = [2.0, 5.0, 8.0], ww = 1.9, sill = 0.95, top = 3.55;
  const side = C.wallSide;
  room.add(box(T, sill, D, side, W + T / 2, 0, D / 2));
  room.add(box(T, H - top, D, side, W + T / 2, top, D / 2));
  let z0 = 0;
  for (const wz of wins) {
    const a = wz - ww / 2;
    if (a > z0) room.add(box(T, top - sill, a - z0, side, W + T / 2, sill, z0 + (a - z0) / 2));
    z0 = wz + ww / 2;
  }
  room.add(box(T, top - sill, D - z0, side, W + T / 2, sill, z0 + (D - z0) / 2));
  room.add(box(T + 0.02, 0.08, D + T + 0.02, C.cap, W + T / 2, H, D / 2 - T / 2, { cast: false }));

  // kusen, kaca, kerai
  const blinds = [];
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xfff8e6, emissive: 0xfff3d6, emissiveIntensity: 0.9, roughness: 0.2 });
  for (const wz of wins) {
    const x = W + 0.02;
    const frame = (w, h, d, y, z) => room.add(box(w, h, d, C.ink, x, y, z));
    frame(0.12, 0.06, ww, sill, wz); frame(0.12, 0.06, ww, top - 0.06, wz);
    frame(0.12, top - sill, 0.06, sill, wz - ww / 2); frame(0.12, top - sill, 0.06, sill, wz + ww / 2);
    frame(0.1, top - sill, 0.05, sill, wz); frame(0.1, 0.05, ww, sill + (top - sill) * 0.45, wz);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, top - sill), glassMat);
    glass.castShadow = false;
    glass.rotation.y = -Math.PI / 2; glass.position.set(W + 0.16, (sill + top) / 2, wz);
    room.add(glass);
    const bl = new THREE.Group();
    const slatMat = mat(C.gold, { roughness: 0.5 });
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, ww - 0.04), slatMat);
      s.position.set(0, -i * 0.085, 0); s.rotation.z = 0.35; s.castShadow = true;
      bl.add(s);
    }
    bl.add(box(0.14, 0.1, ww + 0.1, C.green, 0, 0.02, 0));
    bl.position.set(W - 0.12, top - 0.06, wz);
    room.add(bl);
    blinds.push(bl);
  }

  // langit-langit tak terlihat: hanya memberi bayangan, sehingga sinar masuk lewat jendela
  const ceilMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 0.1, D + 6), ceilMat);
  ceil.position.set(W / 2 - 3, H + 0.05, D / 2); ceil.castShadow = true; ceil.receiveShadow = false;
  room.add(ceil);

  // papan tulis
  room.add(box(5.4, 2.3, 0.08, C.ink, 5.2, 1.15, 0.04));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.1), new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.35 }));
  board.position.set(5.2, 2.3, 0.09); board.receiveShadow = true;
  room.add(board);
  room.add(box(5.4, 0.06, 0.18, C.ink, 5.2, 1.12, 0.12));
  room.add(box(0.3, 0.05, 0.06, C.red, 4.2, 1.18, 0.14));
  room.add(box(0.3, 0.05, 0.06, C.green, 4.7, 1.18, 0.14));

  // papan kapur hijau + kertas pengumuman
  room.add(box(1.3, 1.8, 0.06, C.woodDark, 1.2, 1.2, 0.03));
  room.add(box(1.16, 1.66, 0.04, C.chalk, 1.2, 1.27, 0.06));
  room.add(box(0.5, 0.65, 0.02, 0xfbf8f1, 1.2, 3.1, 0.03));

  // rak buku + poster
  for (const [y, n] of [[2.45, 5], [1.75, 2]]) {
    room.add(box(1.4, 0.06, 0.32, C.ink, 9.4, y, 0.17));
    const cols = [C.green, C.gold, C.red, 0x6f8f72, 0xf3d38a];
    for (let i = 0; i < n; i++) {
      const b = box(0.13, 0.42 + (i % 2) * 0.06, 0.26, cols[i % cols.length], 8.9 + i * 0.16, y + 0.06, 0.17);
      b.rotation.z = i === n - 1 ? -0.18 : 0;
      room.add(b);
    }
  }
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.06), new THREE.MeshStandardMaterial({ map: posterTexture(), roughness: 0.6 }));
  poster.position.set(9.4, 3.35, 0.02);
  room.add(poster);

  // jam dinding (real time) di dinding jendela
  const clock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshStandardMaterial({ map: clockTexture(), roughness: 0.5 }));
  clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 40), mat(C.green));
  clock.add(rim);
  const mkHand = (w, len, color, z) => {
    const p = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.02), mat(color));
    h.position.set(0, len / 2 - 0.04, z);
    p.add(h); clock.add(p); return p;
  };
  const hP = mkHand(0.035, 0.22, C.ink, 0.02), mP = mkHand(0.025, 0.34, C.ink, 0.03), sP = mkHand(0.012, 0.36, C.red, 0.04);
  clock.position.set(W - 0.03, 3.3, 6.5); clock.rotation.y = -Math.PI / 2;
  room.add(clock);

  // meja dosen
  const anim = []; // objek dengan animasi masuk
  const tDesk = new THREE.Group();
  tDesk.add(box(2.6, 0.08, 1.0, C.desk, 0, 1.15, 0));
  tDesk.add(box(2.5, 0.75, 0.05, C.wood, 0, 0.35, -0.45));
  for (const [x, z] of [[-1.24, -0.44], [1.24, -0.44], [-1.24, 0.44], [1.24, 0.44]]) tDesk.add(box(0.07, 1.15, 0.07, C.metal, x, 0, z));
  // laptop
  const lap = new THREE.Group();
  lap.add(box(0.7, 0.03, 0.48, 0xdedad2, 0, 0, 0));
  const scr = box(0.7, 0.46, 0.03, 0xdedad2, 0, 0, 0);
  scr.geometry.translate(0, 0, 0); scr.position.set(0, 0.03, -0.24); scr.rotation.x = -0.25;
  lap.add(scr);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshStandardMaterial({ color: C.green, emissive: C.green, emissiveIntensity: 0.6 }));
  screen.position.set(0, 0.26, -0.215); screen.rotation.x = -0.25; lap.add(screen);
  lap.position.set(-0.3, 1.23, 0.05); lap.rotation.y = Math.PI;
  tDesk.add(lap);
  // globe berputar
  const globe = new THREE.Group();
  globe.add(box(0.26, 0.04, 0.26, C.ink, 0, 0, 0));
  globe.add(box(0.03, 0.3, 0.03, C.ink, 0, 0.04, 0));
  const sphereTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#5fa3b0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#32643a';
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(Math.random() * w, 20 + Math.random() * (h - 40), 10 + Math.random() * 26, 6 + Math.random() * 14, Math.random(), 0, 7); g.fill(); }
    g.fillStyle = '#f9b315'; g.beginPath(); g.ellipse(190, 70, 10, 5, 0.4, 0, 7); g.fill();
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), mat(0xffffff, { map: sphereTex, roughness: 0.4 }));
  sphere.position.y = 0.48; sphere.rotation.z = 0.4; sphere.castShadow = true;
  globe.add(sphere);
  globe.position.set(0.85, 1.23, 0.1);
  tDesk.add(globe);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 16), mat(C.red));
  mug.position.set(0.35, 1.31, 0.25); mug.castShadow = true; tDesk.add(mug);
  const lever = new THREE.Group(); lever.add(box(0.3, 0.22, 0.24, 0x5fb3b8, 0, 0, 0)); lever.add(box(0.3, 0.22, 0.24, 0x5fb3b8, 0, 0.23, 0));
  lever.position.set(-1.0, 1.23, -0.2); tDesk.add(lever);
  tDesk.position.set(8.7, 0, 2.1);
  room.add(tDesk); anim.push(tDesk);
  const tChair = chair(); tChair.position.set(8.9, 0, 1.15); tChair.rotation.y = Math.PI; room.add(tChair); anim.push(tChair);

  // meja mahasiswa 2 kolom × 3 baris
  const bagCols = [C.gold, C.green, C.red, 0xf3c79a];
  let k = 0;
  for (const z of [4.4, 6.6, 8.8]) for (const x of [3.6, 7.6]) {
    const d = studentDesk(); d.position.set(x, 0, z); room.add(d); anim.push(d);
    for (const dx of [-0.55, 0.55]) {
      const c = chair(); c.position.set(x + dx, 0, z + 0.85); room.add(c); anim.push(c);
    }
    const b1 = book([C.green, C.gold, C.red][k % 3]); b1.position.set(x - 0.5 + (k % 2) * 0.6, 1.25, z - 0.05); b1.rotation.y = 0.3 * (k % 2 ? 1 : -1); room.add(b1); anim.push(b1);
    if (k % 2 === 0) { const b2 = book(0xfbf8f1, 0.3, 0.22, 0.02); b2.position.set(x + 0.5, 1.23, z); room.add(b2); anim.push(b2); }
    if (k % 3 !== 1) { const bp = backpack(bagCols[k % 4]); bp.position.set(x + (k % 2 ? 0.95 : -0.95), 0, z + 1.35); bp.rotation.y = 0.4 * k; room.add(bp); anim.push(bp); }
    k++;
  }

  // tanaman (pengganti kerangka di pojok)
  const pl = plant(); pl.position.set(0.8, 0, 0.9); room.add(pl); anim.push(pl);
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 18, 1, true), mat(0x9aa39b, { side: THREE.DoubleSide, wireframe: false, transparent: true, opacity: 0.85 }));
  bin.position.set(1.7, 0.25, 0.5); bin.castShadow = true; room.add(bin);

  // debu di berkas cahaya
  const N = 140, dust = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dust[i * 3] = 6 + Math.random() * 6; dust[i * 3 + 1] = 0.5 + Math.random() * 3; dust[i * 3 + 2] = 1 + Math.random() * 8.5; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe3a0, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false }));
  room.add(dustPts);

  // posisi akhir untuk animasi masuk
  anim.forEach((o, i) => { o.userData.y0 = o.position.y; o.userData.delay = 0.25 + i * 0.035; });

  // ukuran & kamera
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    // lebar ruangan terproyeksi ±19 unit; jaga ~85% lebar kanvas dan tinggi ≥ 15 unit
    const half = Math.max((opts.width || 10.4) / aspect, 7.6);
    cam.left = -half * aspect; cam.right = half * aspect; cam.top = half; cam.bottom = -half;
    cam.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let visible = true, raf = 0, last = performance.now(), t = 0;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) loop(); });
  io.observe(canvas);
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  const back = (x) => { x = Math.min(Math.max(x, 0), 1); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  function frame(dt) {
    t += reduced ? 0 : dt;
    const intro = reduced ? 10 : t;
    // kamera: ayunan pelan + parallax
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    const yaw = (reduced ? 0 : Math.sin(t * 0.18) * 0.16) + pointer.x * 0.08 + (1 - ease(intro / 2.2)) * -0.6;
    const dir = camDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    dir.y += pointer.y * 0.05;
    cam.position.copy(center).addScaledVector(dir.normalize(), camDist);
    cam.zoom = 0.82 + 0.18 * ease(intro / 2.2);
    cam.updateProjectionMatrix();
    cam.lookAt(center);
    room.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.06;

    // matahari bergerak → bayangan jendela bergeser di lantai
    const sa = 0.55 + (reduced ? 0 : Math.sin(t * 0.12) * 0.35);
    sun.position.set(center.x + 16, center.y + 13, center.z + Math.sin(sa) * 9);

    // kerai naik-turun pelan
    blinds.forEach((b, i) => {
      const open = reduced ? 0.55 : 0.5 + 0.3 * Math.sin(t * 0.35 + i * 1.3);
      b.children.forEach((s, j) => { if (j < 18) { s.position.y = -j * 0.085 * open; s.rotation.z = 0.2 + 0.5 * open; } });
    });

    // animasi masuk perabot
    for (const o of anim) {
      const p = (intro - o.userData.delay) / 0.7;
      o.position.y = o.userData.y0 + (1 - back(p)) * 5;
      o.visible = p > -0.05;
    }
    sphere.rotation.y += reduced ? 0 : dt * 0.8;
    pl.rotation.z = reduced ? 0 : Math.sin(t * 1.1) * 0.025;

    // jam real time
    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000, min = now.getMinutes() + sec / 60, hr = (now.getHours() % 12) + min / 60;
    sP.rotation.z = -sec / 60 * Math.PI * 2; mP.rotation.z = -min / 60 * Math.PI * 2; hP.rotation.z = -hr / 12 * Math.PI * 2;

    // debu
    if (!reduced) {
      const p = dustGeo.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = p.getY(i) + dt * 0.08 * (0.5 + (i % 5) / 5);
        if (y > 3.6) y = 0.4;
        p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * 0.0015);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, cam);
  }
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    const now = performance.now();
    frame(Math.min((now - last) / 1000, 0.05)); last = now;
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); if (!document.hidden && !raf) loop(); });
  // tunggu font agar teks papan tulis memakai Unpad Sans
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    board.material.map = boardTexture(); poster.material.map = posterTexture();
    board.material.needsUpdate = poster.material.needsUpdate = true;
  });
  loop();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove); renderer.dispose(); };
}
