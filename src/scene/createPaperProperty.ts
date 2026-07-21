import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

/** Paper → property — blueprint lines draw, then walls lift into soft massing. */
export function createPaperProperty(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0xe8dfd0,
    fogColor: 0xe8dfd0,
    fogDensity: 0.012,
    exposure: 1.12,
    bloomStrength: 0.18,
    shadows: true,
  });
  const { scene, camera, isMobile } = kit;

  scene.add(new THREE.AmbientLight(0xfff4e5, 0.7));
  const sun = new THREE.DirectionalLight(0xffe2c0, 1.1);
  sun.position.set(12, 22, 8);
  sun.castShadow = true;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d4e0, 0.35);
  fill.position.set(-10, 8, -12);
  scene.add(fill);

  // Parchment sheet
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = 512;
  paperCanvas.height = 512;
  const ctx = paperCanvas.getContext('2d')!;
  ctx.fillStyle = '#ebe2d2';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(120,95,70,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  // faint grid
  ctx.strokeStyle = 'rgba(90,110,130,0.12)';
  ctx.lineWidth = 1;
  for (let g = 0; g < 512; g += 32) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(512, g);
    ctx.stroke();
  }
  const paperTex = new THREE.CanvasTexture(paperCanvas);
  paperTex.colorSpace = THREE.SRGBColorSpace;

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({
      map: paperTex,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  paper.rotation.x = -Math.PI / 2;
  paper.receiveShadow = true;
  scene.add(paper);

  // Floor-plan polyline (animated reveal)
  const planPts: THREE.Vector3[] = [];
  const rooms: Array<[number, number, number, number]> = [
    [-8, -6, 8, -6],
    [8, -6, 8, 6],
    [8, 6, -8, 6],
    [-8, 6, -8, -6],
    [0, -6, 0, 2],
    [-8, 2, 0, 2],
    [0, -2, 8, -2],
    [-4, 2, -4, 6],
    [3, -6, 3, -2],
  ];
  rooms.forEach(([x1, z1, x2, z2]) => {
    planPts.push(new THREE.Vector3(x1, 0.04, z1), new THREE.Vector3(x2, 0.04, z2));
  });

  const maxSeg = planPts.length;
  const drawGeo = new THREE.BufferGeometry();
  const drawPos = new Float32Array(maxSeg * 3);
  drawGeo.setAttribute('position', new THREE.BufferAttribute(drawPos, 3));
  drawGeo.setDrawRange(0, 0);
  const ink = new THREE.LineSegments(
    drawGeo,
    new THREE.LineBasicMaterial({ color: 0x2a3a48, transparent: true, opacity: 0.85 })
  );
  scene.add(ink);

  // Rising walls from plan
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd9d0c2,
    roughness: 0.75,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
  });
  const walls: THREE.Mesh[] = [];
  const wallDefs = [
    { x: 0, z: -6, w: 16, d: 0.35 },
    { x: 0, z: 6, w: 16, d: 0.35 },
    { x: -8, z: 0, w: 0.35, d: 12 },
    { x: 8, z: 0, w: 0.35, d: 12 },
    { x: 0, z: -2, w: 0.35, d: 8 },
    { x: -4, z: 4, w: 0.35, d: 4 },
    { x: 4, z: -4, w: 8, d: 0.35 },
  ];
  wallDefs.forEach((w) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, 1, w.d), wallMat.clone());
    m.position.set(w.x, 0.5, w.z);
    m.castShadow = true;
    m.scale.y = 0.01;
    scene.add(m);
    walls.push(m);
  });

  // Soft massing blocks that appear later
  const massMat = new THREE.MeshStandardMaterial({
    color: 0xc4b8a6,
    roughness: 0.65,
    metalness: 0.08,
    transparent: true,
    opacity: 0,
  });
  const masses = [
    { x: -4, z: -2, w: 6, h: 3.2, d: 6 },
    { x: 4, z: 2, w: 6, h: 4.5, d: 6 },
    { x: -2, z: 4, w: 4, h: 2.4, d: 3 },
  ].map((b) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), massMat.clone());
    m.position.set(b.x, b.h / 2, b.z);
    m.castShadow = true;
    m.scale.set(1, 0.02, 1);
    scene.add(m);
    return m;
  });

  // Floating ink dots / annotation marks
  const noteCount = 12;
  const notes = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.15, 10),
    new THREE.MeshBasicMaterial({ color: 0xb85c38, transparent: true, opacity: 0.7 }),
    noteCount
  );
  const tmp = new THREE.Object3D();
  for (let i = 0; i < noteCount; i++) {
    tmp.position.set(rand(-10, 10), 0.06, rand(-10, 10));
    tmp.rotation.x = -Math.PI / 2;
    tmp.updateMatrix();
    notes.setMatrixAt(i, tmp.matrix);
  }
  scene.add(notes);

  camera.position.set(0, 28, 0.01);
  camera.lookAt(0, 0, 0);

  const cycle = 18; // seconds for full story loop
  return kit.startLoop((t) => {
    const u = (t % cycle) / cycle;

    // Draw lines 0→0.35
    const drawProgress = Math.min(1, u / 0.35);
    const visible = Math.floor(drawProgress * maxSeg);
    for (let i = 0; i < visible; i++) {
      const p = planPts[i];
      drawPos[i * 3] = p.x;
      drawPos[i * 3 + 1] = p.y;
      drawPos[i * 3 + 2] = p.z;
    }
    drawGeo.attributes.position.needsUpdate = true;
    drawGeo.setDrawRange(0, visible);

    // Walls rise 0.25→0.55
    const wallU = THREE.MathUtils.smoothstep(u, 0.25, 0.55);
    walls.forEach((w, i) => {
      const h = 1.8 + (i % 3) * 0.4;
      w.scale.y = 0.02 + wallU * (h - 0.02);
      w.position.y = (w.scale.y * h) / 2;
      (w.material as THREE.MeshStandardMaterial).opacity = 0.15 + wallU * 0.75;
    });

    // Massing 0.5→0.85
    const massU = THREE.MathUtils.smoothstep(u, 0.5, 0.85);
    masses.forEach((m, i) => {
      m.scale.y = 0.02 + massU * 0.98;
      (m.material as THREE.MeshStandardMaterial).opacity = massU * 0.9;
      m.position.y = ((m.geometry as THREE.BoxGeometry).parameters.height * m.scale.y) / 2;
      m.rotation.y = Math.sin(t * 0.15 + i) * 0.02;
    });

    // Camera: top-down → cinematic 3/4
    const camU = THREE.MathUtils.smoothstep(u, 0.15, 0.9);
    const elev = THREE.MathUtils.lerp(28, isMobile ? 14 : 16, camU);
    const dist = THREE.MathUtils.lerp(0.5, isMobile ? 18 : 22, camU);
    const angle = t * 0.08;
    camera.position.set(Math.sin(angle) * dist, elev, Math.cos(angle) * dist);
    camera.lookAt(0, massU * 1.5, 0);

    // Soft paper breathe
    paper.position.y = Math.sin(t * 0.4) * 0.02;
  });
}
