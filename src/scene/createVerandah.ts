import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

/** Golden-hour verandah — intimate courtyard atmosphere for “charcha”. */
export function createVerandah(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0xc48a52,
    fogColor: 0xd4a06a,
    fogDensity: 0.018,
    exposure: 1.15,
    bloomStrength: 0.25,
  });
  const { scene, camera, isMobile } = kit;

  // Warm dusk sky gradient via fog + lights
  const hemi = new THREE.HemisphereLight(0xffc078, 0x4a3020, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb060, 1.6);
  sun.position.set(-18, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);
  const lamp = new THREE.PointLight(0xffaa66, 1.2, 18, 2);
  lamp.position.set(0, 3.2, -1.5);
  scene.add(lamp);

  // Courtyard floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 22),
    new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.88, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Inner stone patio
  const patio = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 32),
    new THREE.MeshStandardMaterial({ color: 0x9a8570, roughness: 0.9 })
  );
  patio.rotation.x = -Math.PI / 2;
  patio.position.y = 0.03;
  patio.receiveShadow = true;
  scene.add(patio);

  const plaster = new THREE.MeshStandardMaterial({
    color: 0xe8d8c4,
    roughness: 0.85,
    metalness: 0.03,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x5c3d28,
    roughness: 0.7,
    metalness: 0.05,
  });
  const terracotta = new THREE.MeshStandardMaterial({
    color: 0xa85a3a,
    roughness: 0.75,
    metalness: 0.04,
  });

  // Back wall + side walls (open verandah)
  const back = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 0.45), plaster);
  back.position.set(0, 2.75, -6);
  back.castShadow = true;
  back.receiveShadow = true;
  scene.add(back);

  [-7.5, 7.5].forEach((x) => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 8), plaster);
    side.position.set(x, 2.75, -2);
    side.castShadow = true;
    scene.add(side);
  });

  // Roof slab
  const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.35, 10), wood);
  roof.position.set(0, 5.5, -2.2);
  roof.castShadow = true;
  scene.add(roof);

  // Columns
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.2, 10), plaster);
    col.position.set(-5.5 + i * 3.7, 2.6, 1.2);
    col.castShadow = true;
    scene.add(col);
  }

  // Low railing
  const rail = new THREE.Mesh(new THREE.BoxGeometry(15, 0.7, 0.18), wood);
  rail.position.set(0, 0.55, 2.4);
  scene.add(rail);

  // Curtains (swaying planes)
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xf0e4d4,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    roughness: 0.95,
  });
  const curtains: THREE.Mesh[] = [];
  [-3.2, 3.2].forEach((x) => {
    const geo = new THREE.PlaneGeometry(2.4, 3.8, 8, 12);
    const c = new THREE.Mesh(geo, curtainMat.clone());
    c.position.set(x, 3.4, -5.6);
    scene.add(c);
    curtains.push(c);
  });

  // Planter + neem-like canopy
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.7, 10), terracotta);
  pot.position.set(-4.2, 0.35, 0.5);
  pot.castShadow = true;
  scene.add(pot);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6), wood);
  trunk.position.set(-4.2, 1.5, 0.5);
  scene.add(trunk);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 0.9 })
  );
  canopy.position.set(-4.2, 3.2, 0.5);
  canopy.castShadow = true;
  scene.add(canopy);

  const pot2 = pot.clone();
  pot2.position.set(4.2, 0.35, 0.8);
  scene.add(pot2);
  const trunk2 = trunk.clone();
  trunk2.position.set(4.2, 1.5, 0.8);
  scene.add(trunk2);
  const canopy2 = canopy.clone();
  canopy2.position.set(4.2, 3.0, 0.8);
  canopy2.scale.setScalar(0.85);
  scene.add(canopy2);

  // Distant soft city glow
  const farMat = new THREE.MeshStandardMaterial({
    color: 0x6a4a38,
    transparent: true,
    opacity: 0.35,
    roughness: 1,
  });
  for (let i = 0; i < 10; i++) {
    const h = rand(4, 12);
    const b = new THREE.Mesh(new THREE.BoxGeometry(rand(2, 4), h, rand(2, 3)), farMat);
    b.position.set(rand(-40, 40), h / 2, -28 - rand(0, 20));
    scene.add(b);
  }

  // Floating dust / pollen
  const dustN = isMobile ? 40 : 80;
  const dust = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.04, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.45 }),
    dustN
  );
  const dustState = Array.from({ length: dustN }, () => ({
    x: rand(-8, 8),
    y: rand(0.5, 5),
    z: rand(-5, 4),
    s: rand(0.5, 1.4),
    ph: rand(0, Math.PI * 2),
  }));
  const tmp = new THREE.Object3D();
  scene.add(dust);

  // Hanging lantern
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffc080,
      emissive: 0xff8830,
      emissiveIntensity: 1.8,
      roughness: 0.4,
    })
  );
  lantern.position.set(0, 4.6, -1.2);
  scene.add(lantern);

  camera.position.set(0, 2.4, 9);
  camera.lookAt(0, 2.2, -2);

  return kit.startLoop((t, dt) => {
    // Slow cinematic sway / push
    const breath = Math.sin(t * 0.25) * 0.35;
    camera.position.x = Math.sin(t * 0.12) * 1.2;
    camera.position.y = 2.3 + breath * 0.15;
    camera.position.z = 8.5 + Math.cos(t * 0.18) * 0.8;
    camera.lookAt(0.2 * Math.sin(t * 0.1), 2.4, -2);

    curtains.forEach((c, i) => {
      const geo = c.geometry as THREE.PlaneGeometry;
      const p = geo.attributes.position;
      for (let vi = 0; vi < p.count; vi++) {
        const y = p.getY(vi);
        const x = p.getX(vi);
        // restore base from parametric - use x and lower-half sway
        const baseZ = 0;
        const sway = Math.sin(t * 1.4 + x * 2 + i) * 0.12 * Math.max(0, 1.6 - y);
        p.setZ(vi, baseZ + sway);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    });

    canopy.rotation.y = Math.sin(t * 0.4) * 0.08;
    canopy.rotation.z = Math.sin(t * 0.55) * 0.04;
    canopy2.rotation.y = Math.sin(t * 0.35 + 1) * 0.1;

    lantern.material = lantern.material as THREE.MeshStandardMaterial;
    (lantern.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.5 + Math.sin(t * 2.2) * 0.35;
    lamp.intensity = 1.0 + Math.sin(t * 2.2) * 0.2;

    dustState.forEach((d, i) => {
      d.y += dt * 0.12;
      if (d.y > 5.5) d.y = 0.4;
      tmp.position.set(
        d.x + Math.sin(t * 0.6 + d.ph) * 0.3,
        d.y,
        d.z + Math.cos(t * 0.5 + d.ph) * 0.25
      );
      tmp.scale.setScalar(d.s);
      tmp.updateMatrix();
      dust.setMatrixAt(i, tmp.matrix);
    });
    dust.instanceMatrix.needsUpdate = true;

    sun.position.x = -18 + Math.sin(t * 0.05) * 2;
  });
}
