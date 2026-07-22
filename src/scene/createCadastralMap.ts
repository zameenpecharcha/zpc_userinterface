import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

/** Living cadastral map — aerial plots pulsing with neighborhood “charcha”. */
export function createCadastralMap(container: HTMLElement): SceneHandle {
  const isMobileHint =
    window.matchMedia('(max-width: 900px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  const kit = createSceneKit(container, {
    bg: 0xc8d4c0,
    fogColor: 0xd5e0d4,
    fogDensity: 0.0065,
    exposure: 1.08,
    bloomStrength: isMobileHint ? 0.18 : 0.28,
  });
  const { scene, camera, isMobile } = kit;

  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x6a8068, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b8, 1.35);
  sun.position.set(30, 50, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 1536, isMobile ? 1024 : 1536);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  // Soft rolling terrain
  const terrainGeo = new THREE.PlaneGeometry(140, 140, 48, 48);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.08) * Math.cos(y * 0.07) * 1.6 + Math.sin(x * 0.03 + y * 0.04) * 0.8);
  }
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      color: 0x8fa682,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: false,
    })
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Cadastral plots
  const plotGroup = new THREE.Group();
  scene.add(plotGroup);
  const plots: Array<{
    mesh: THREE.Mesh;
    line: THREE.LineLoop;
    phase: number;
    cx: number;
    cz: number;
  }> = [];

  const cols = isMobile ? 6 : 9;
  const rows = isMobile ? 6 : 9;
  const cell = 10;
  const origin = -((cols - 1) * cell) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const w = cell * rand(0.55, 0.92);
      const d = cell * rand(0.55, 0.92);
      const cx = origin + c * cell + rand(-1.2, 1.2);
      const cz = origin + r * cell + rand(-1.2, 1.2);
      const shape = new THREE.Shape();
      const hw = w / 2;
      const hd = d / 2;
      // Slight irregular parcel edges
      shape.moveTo(-hw + rand(-0.4, 0.4), -hd);
      shape.lineTo(hw, -hd + rand(-0.3, 0.3));
      shape.lineTo(hw + rand(-0.3, 0.3), hd);
      shape.lineTo(-hw, hd + rand(-0.3, 0.3));
      shape.closePath();

      const fill = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.22 + Math.random() * 0.08, 0.25, 0.42 + Math.random() * 0.12),
          transparent: true,
          opacity: 0.22,
          roughness: 1,
          metalness: 0,
          side: THREE.DoubleSide,
        })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(cx, 0.12, cz);
      plotGroup.add(fill);

      const pts = shape.getPoints(24).map((p) => new THREE.Vector3(p.x, 0, p.y));
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0xf2e6c8,
          transparent: true,
          opacity: 0.55,
        })
      );
      line.position.set(cx, 0.2, cz);
      plotGroup.add(line);
      plots.push({ mesh: fill, line, phase: rand(0, Math.PI * 2), cx, cz });
    }
  }

  // Neighborhood lights / “charcha” pulses
  const lightCount = isMobile ? 28 : 48;
  const lightGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffd9a0,
    emissive: 0xffb060,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });
  const lights = new THREE.InstancedMesh(lightGeo, lightMat, lightCount);
  const lightState = Array.from({ length: lightCount }, () => ({
    x: rand(-45, 45),
    z: rand(-45, 45),
    phase: rand(0, Math.PI * 2),
    baseY: 0.35,
  }));
  const tmp = new THREE.Object3D();
  lightState.forEach((s, i) => {
    tmp.position.set(s.x, s.baseY, s.z);
    tmp.scale.setScalar(1);
    tmp.updateMatrix();
    lights.setMatrixAt(i, tmp.matrix);
  });
  scene.add(lights);

  // Soft river / path cutting through
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 120),
    new THREE.MeshStandardMaterial({ color: 0x7a9aaa, roughness: 0.55, metalness: 0.15 })
  );
  path.rotation.x = -Math.PI / 2;
  path.rotation.z = 0.35;
  path.position.y = 0.08;
  scene.add(path);

  camera.position.set(0, 48, 42);
  camera.lookAt(0, 0, 0);

  let drift = 0;
  return kit.startLoop((t, dt) => {
    drift += dt * 0.08;
    const radius = isMobile ? 38 : 46;
    camera.position.set(
      Math.sin(drift) * radius * 0.55,
      36 + Math.sin(t * 0.12) * 3,
      Math.cos(drift * 0.85) * radius
    );
    camera.lookAt(Math.sin(drift * 0.4) * 6, 0, Math.cos(drift * 0.3) * 4);

    plots.forEach((p) => {
      const pulse = 0.18 + (Math.sin(t * 0.9 + p.phase) * 0.5 + 0.5) * 0.28;
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = pulse;
      (p.line.material as THREE.LineBasicMaterial).opacity = 0.35 + pulse * 0.55;
    });

    lightState.forEach((s, i) => {
      const glow = 0.7 + Math.sin(t * 1.6 + s.phase) * 0.45;
      tmp.position.set(s.x, s.baseY + glow * 0.05, s.z);
      tmp.scale.setScalar(0.6 + glow * 0.9);
      tmp.updateMatrix();
      lights.setMatrixAt(i, tmp.matrix);
    });
    lights.instanceMatrix.needsUpdate = true;
  });
}
