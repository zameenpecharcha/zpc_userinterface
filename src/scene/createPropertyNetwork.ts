import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

/** Property network — LinkedIn × Maps: buildings linked by social/listing activity. */
export function createPropertyNetwork(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0x0e161c,
    fogColor: 0x121c24,
    fogDensity: 0.015,
    exposure: 1.0,
    bloomStrength: 0.5,
  });
  const { scene, camera, isMobile } = kit;
  let simSpeed = 1;

  scene.add(new THREE.AmbientLight(0x6a8898, 0.4));
  const key = new THREE.DirectionalLight(0xd8ecf0, 0.7);
  key.position.set(12, 24, 10);
  scene.add(key);

  // Soft map grid
  const grid = new THREE.GridHelper(70, 35, 0x2a4a55, 0x1a3038);
  grid.position.y = 0.01;
  scene.add(grid);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({
      color: 0x101820,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  type Node = {
    group: THREE.Group;
    pos: THREE.Vector3;
    phase: number;
    marker: THREE.Mesh;
    activity: number;
  };

  const count = isMobile ? 16 : 26;
  const nodes: Node[] = [];
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0xc8d0d6,
    roughness: 0.5,
    metalness: 0.2,
    emissive: 0x1a3038,
    emissiveIntensity: 0.25,
  });

  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const h = rand(1.5, 7);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(rand(1.2, 2.4), h, rand(1.2, 2.2)),
      buildingMat.clone()
    );
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xffc878,
        emissive: 0xff9030,
        emissiveIntensity: 1.8,
      })
    );
    marker.position.y = h + 0.6;
    g.add(marker);

    // listing pin ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 20),
      new THREE.MeshBasicMaterial({
        color: 0x7ec8b0,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);

    const pos = new THREE.Vector3(rand(-28, 28), 0, rand(-28, 28));
    if (Math.abs(pos.x) < 4 && Math.abs(pos.z) < 4) pos.x += 8;
    g.position.copy(pos);
    scene.add(g);
    nodes.push({
      group: g,
      pos,
      phase: rand(0, Math.PI * 2),
      marker,
      activity: rand(0, 1),
    });
  }

  // Edges
  type Edge = { a: number; b: number; phase: number };
  const edges: Edge[] = [];
  nodes.forEach((n, i) => {
    const nearest = nodes
      .map((o, j) => ({ j, d: n.pos.distanceTo(o.pos) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    nearest.forEach(({ j }) => {
      if (i < j) edges.push({ a: i, b: j, phase: rand(0, Math.PI * 2) });
    });
  });

  const linePos = new Float32Array(edges.length * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0x5eb8a0, transparent: true, opacity: 0.4 })
  );
  scene.add(lines);

  // Activity pulses
  const pulseN = isMobile ? 8 : 14;
  const pulses = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe0b0,
      emissive: 0xffb060,
      emissiveIntensity: 2.4,
    }),
    pulseN
  );
  scene.add(pulses);
  const pulseState = Array.from({ length: pulseN }, () => ({
    e: Math.floor(rand(0, Math.max(1, edges.length))),
    u: rand(0, 1),
    speed: rand(0.2, 0.45),
  }));
  const tmp = new THREE.Object3D();

  // Floating social chips (like / comment / visit)
  const chipCanvas = document.createElement('canvas');
  chipCanvas.width = 256;
  chipCanvas.height = 64;
  const cctx = chipCanvas.getContext('2d')!;
  const drawChip = (text: string) => {
    cctx.clearRect(0, 0, 256, 64);
    cctx.fillStyle = 'rgba(20,30,36,0.75)';
    cctx.roundRect?.(12, 10, 232, 44, 14);
    if (!cctx.roundRect) {
      cctx.fillRect(12, 10, 232, 44);
    } else {
      cctx.beginPath();
      cctx.roundRect(12, 10, 232, 44, 14);
      cctx.fill();
    }
    cctx.fillStyle = '#e8f4ef';
    cctx.font = '600 22px "DM Sans", sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText(text, 128, 40);
  };
  drawChip('New listing');
  const chipTex = new THREE.CanvasTexture(chipCanvas);
  chipTex.colorSpace = THREE.SRGBColorSpace;
  const chip = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshBasicMaterial({
      map: chipTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  scene.add(chip);
  const chipLabels = ['New listing', '12 people chatting', '3 visits', 'Saved', 'Rated 4.8'];
  let chipTimer = 0;
  let chipNode = 0;

  camera.position.set(0, 22, 36);
  camera.lookAt(0, 0, 0);

  let orbit = 0;
  let spawnTimer = 0;

  const handle = kit.startLoop((t, dt) => {
    const sdt = dt * simSpeed;
    orbit += sdt * 0.1;
    spawnTimer += sdt;
    chipTimer += sdt;

    nodes.forEach((n, i) => {
      n.activity = 0.6 + Math.sin(t * simSpeed * 1.5 + n.phase) * 0.4;
      n.marker.scale.setScalar(0.7 + n.activity * 0.8);
      const mat = (n.marker.material as THREE.MeshStandardMaterial);
      mat.emissiveIntensity = 1.2 + n.activity;

      // Occasional new listing pop
      if (spawnTimer > 3.5 && i === Math.floor(t * 3) % nodes.length) {
        n.group.scale.setScalar(1.15);
      } else {
        n.group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
      }
    });
    if (spawnTimer > 3.5) spawnTimer = 0;

    edges.forEach((e, i) => {
      const a = nodes[e.a].group.position;
      const b = nodes[e.b].group.position;
      const ah = (nodes[e.a].group.children[0] as THREE.Mesh).position.y * 2;
      linePos[i * 6] = a.x;
      linePos[i * 6 + 1] = 0.3 + ah * 0.15;
      linePos[i * 6 + 2] = a.z;
      linePos[i * 6 + 3] = b.x;
      linePos[i * 6 + 4] = 0.3 + (nodes[e.b].group.children[0] as THREE.Mesh).position.y * 0.3;
      linePos[i * 6 + 5] = b.z;
    });
    lineGeo.attributes.position.needsUpdate = true;

    pulseState.forEach((p, i) => {
      p.u += sdt * p.speed;
      if (p.u > 1) {
        p.u = 0;
        p.e = Math.floor(rand(0, edges.length));
      }
      const e = edges[p.e];
      if (!e) return;
      const a = nodes[e.a].group.position;
      const b = nodes[e.b].group.position;
      tmp.position.set(
        THREE.MathUtils.lerp(a.x, b.x, p.u),
        1.2 + Math.sin(p.u * Math.PI) * 2.5,
        THREE.MathUtils.lerp(a.z, b.z, p.u)
      );
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      pulses.setMatrixAt(i, tmp.matrix);
    });
    pulses.instanceMatrix.needsUpdate = true;

    if (chipTimer > 4) {
      chipTimer = 0;
      chipNode = Math.floor(rand(0, nodes.length));
      drawChip(chipLabels[Math.floor(rand(0, chipLabels.length))]);
      chipTex.needsUpdate = true;
      (chip.material as THREE.MeshBasicMaterial).opacity = 0.95;
    }
    const cn = nodes[chipNode];
    chip.position.set(cn.pos.x, 8 + Math.sin(t * 2) * 0.2, cn.pos.z);
    chip.quaternion.copy(camera.quaternion);
    const chipMat = chip.material as THREE.MeshBasicMaterial;
    chipMat.opacity = Math.max(0, chipMat.opacity - sdt * 0.25);

    const radius = isMobile ? 32 : 40;
    camera.position.set(
      Math.sin(orbit) * radius,
      16 + Math.sin(t * 0.2) * 2,
      Math.cos(orbit) * radius
    );
    camera.lookAt(0, 2, 0);
  });

  handle.setSimSpeed = (s) => {
    simSpeed = Math.max(0.25, Math.min(8, s));
  };
  handle.getSimSpeed = () => simSpeed;
  return handle;
}
