import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

/** Conversation constellation — homes as nodes, charcha as connecting light. */
export function createConversationConstellation(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0x142028,
    fogColor: 0x1a2a32,
    fogDensity: 0.012,
    exposure: 1.0,
    bloomStrength: 0.55,
  });
  const { scene, camera, isMobile } = kit;

  scene.add(new THREE.AmbientLight(0x6a8a9a, 0.35));
  const key = new THREE.DirectionalLight(0xc8e0d8, 0.55);
  key.position.set(10, 20, 10);
  scene.add(key);

  type Node = {
    pos: THREE.Vector3;
    phase: number;
    size: number;
    born: number;
  };

  const nodeCount = isMobile ? 28 : 46;
  const nodes: Node[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const a = (i / nodeCount) * Math.PI * 2 + rand(-0.2, 0.2);
    const r = rand(4, 22) * (0.55 + (i % 5) * 0.12);
    nodes.push({
      pos: new THREE.Vector3(
        Math.cos(a) * r + rand(-2, 2),
        rand(-4, 8),
        Math.sin(a) * r + rand(-2, 2)
      ),
      phase: rand(0, Math.PI * 2),
      size: rand(0.25, 0.7),
      born: rand(0, 8),
    });
  }

  // Soft house-like markers (small cubes + roof cones)
  const houseGroup = new THREE.Group();
  scene.add(houseGroup);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd8cfc0,
    emissive: 0x3a5048,
    emissiveIntensity: 0.35,
    roughness: 0.55,
    metalness: 0.1,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xc4a070,
    emissive: 0x5a4030,
    emissiveIntensity: 0.25,
    roughness: 0.6,
  });
  const houseMeshes: THREE.Group[] = nodes.map((n) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 0.9), bodyMat.clone());
    body.position.y = 0.35;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 4), roofMat.clone());
    roof.position.y = 0.9;
    roof.rotation.y = Math.PI / 4;
    g.add(body, roof);
    g.position.copy(n.pos);
    g.scale.setScalar(n.size);
    houseGroup.add(g);
    return g;
  });

  // Glow cores
  const glow = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xa8e0c8,
      emissive: 0x60c8a0,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.9,
    }),
    nodeCount
  );
  scene.add(glow);
  const tmp = new THREE.Object3D();

  // Edges between nearby nodes
  const edges: Array<{ a: number; b: number; phase: number }> = [];
  for (let i = 0; i < nodeCount; i++) {
    const dists = nodes
      .map((n, j) => ({ j, d: nodes[i].pos.distanceTo(n.pos) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    dists.forEach(({ j }) => {
      if (i < j) edges.push({ a: i, b: j, phase: rand(0, Math.PI * 2) });
    });
  }

  const linePositions = new Float32Array(edges.length * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x7ec8b0,
    transparent: true,
    opacity: 0.35,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // Traveling pulses along edges
  const pulseCount = isMobile ? 10 : 18;
  const pulses = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe6c0,
      emissive: 0xffc070,
      emissiveIntensity: 2.5,
    }),
    pulseCount
  );
  scene.add(pulses);
  const pulseState = Array.from({ length: pulseCount }, () => ({
    edge: Math.floor(rand(0, edges.length)),
    u: rand(0, 1),
    speed: rand(0.15, 0.35),
  }));

  // Soft ground plane for depth
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0e181c,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.65,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -8;
  scene.add(ground);

  camera.position.set(0, 12, 28);
  camera.lookAt(0, 0, 0);

  let orbit = 0;
  return kit.startLoop((t, dt) => {
    orbit += dt * 0.1;

    nodes.forEach((n, i) => {
      const appear = THREE.MathUtils.smoothstep(t - n.born, 0, 1.5);
      const bob = Math.sin(t * 0.8 + n.phase) * 0.25;
      const g = houseMeshes[i];
      g.position.set(n.pos.x, n.pos.y + bob, n.pos.z);
      g.scale.setScalar(n.size * appear);
      g.rotation.y = t * 0.08 + n.phase;

      const glowScale = (0.4 + n.size) * appear * (0.85 + Math.sin(t * 2 + n.phase) * 0.2);
      tmp.position.copy(g.position);
      tmp.position.y += 0.2;
      tmp.scale.setScalar(glowScale);
      tmp.updateMatrix();
      glow.setMatrixAt(i, tmp.matrix);
    });
    glow.instanceMatrix.needsUpdate = true;

    edges.forEach((e, i) => {
      const pa = houseMeshes[e.a].position;
      const pb = houseMeshes[e.b].position;
      linePositions[i * 6] = pa.x;
      linePositions[i * 6 + 1] = pa.y;
      linePositions[i * 6 + 2] = pa.z;
      linePositions[i * 6 + 3] = pb.x;
      linePositions[i * 6 + 4] = pb.y;
      linePositions[i * 6 + 5] = pb.z;
    });
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.22 + Math.sin(t * 0.7) * 0.08;

    pulseState.forEach((p, i) => {
      p.u += dt * p.speed;
      if (p.u > 1) {
        p.u = 0;
        p.edge = Math.floor(rand(0, edges.length));
      }
      const e = edges[p.edge];
      if (!e) return;
      const a = houseMeshes[e.a].position;
      const b = houseMeshes[e.b].position;
      tmp.position.lerpVectors(a, b, p.u);
      tmp.scale.setScalar(1.2);
      tmp.updateMatrix();
      pulses.setMatrixAt(i, tmp.matrix);
    });
    pulses.instanceMatrix.needsUpdate = true;

    const radius = isMobile ? 24 : 30;
    camera.position.set(
      Math.sin(orbit) * radius,
      8 + Math.sin(t * 0.2) * 3,
      Math.cos(orbit) * radius
    );
    camera.lookAt(0, 0, 0);
  });
}
