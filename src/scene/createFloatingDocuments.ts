import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

function makeDocTexture(kind: 'deed' | 'blueprint' | 'survey' | 'contract') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 680;
  const ctx = c.getContext('2d')!;

  if (kind === 'blueprint') {
    ctx.fillStyle = '#1a3a55';
    ctx.fillRect(0, 0, 512, 680);
    ctx.strokeStyle = 'rgba(140, 200, 230, 0.55)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 512; g += 24) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 680);
      ctx.stroke();
    }
    for (let g = 0; g < 680; g += 24) {
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(512, g);
      ctx.stroke();
    }
    ctx.strokeStyle = '#9fd4f0';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(80, 120, 340, 420);
    ctx.strokeRect(80, 120, 160, 200);
    ctx.strokeRect(240, 320, 180, 220);
    ctx.fillStyle = '#b8e0f5';
    ctx.font = '600 28px "DM Sans", sans-serif';
    ctx.fillText('FLOOR PLAN', 160, 70);
  } else if (kind === 'survey') {
    ctx.fillStyle = '#f2ebe0';
    ctx.fillRect(0, 0, 512, 680);
    ctx.strokeStyle = '#5a6a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 160);
    ctx.lineTo(420, 140);
    ctx.lineTo(450, 480);
    ctx.lineTo(90, 520);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(120, 220, 240, 200);
    ctx.setLineDash([]);
    ctx.fillStyle = '#3d4a38';
    ctx.font = '600 26px "DM Sans", sans-serif';
    ctx.fillText('SURVEY MAP', 160, 80);
    ctx.font = '16px "DM Sans", sans-serif';
    ctx.fillText('Plot 42 · Sector B', 170, 110);
  } else if (kind === 'contract') {
    ctx.fillStyle = '#f7f4ef';
    ctx.fillRect(0, 0, 512, 680);
    ctx.fillStyle = '#2a3340';
    ctx.font = '600 26px "DM Sans", sans-serif';
    ctx.fillText('AGREEMENT', 170, 70);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = `rgba(40,50,60,${0.25 + (i % 3) * 0.1})`;
      ctx.fillRect(60, 110 + i * 32, 380 - (i % 4) * 30, 8);
    }
    ctx.strokeStyle = '#8a6a4a';
    ctx.strokeRect(40, 40, 432, 600);
  } else {
    // sale deed
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(0, 0, 512, 680);
    ctx.fillStyle = '#6b3a2a';
    ctx.font = '700 30px "Cormorant Garamond", serif';
    ctx.fillText('SALE DEED', 160, 80);
    ctx.font = '16px "DM Sans", sans-serif';
    ctx.fillStyle = '#4a3a30';
    ctx.fillText('Zameen pe charcha', 175, 115);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(60,45,35,${0.2 + (i % 3) * 0.08})`;
      ctx.fillRect(70, 150 + i * 34, 360 - (i % 5) * 20, 7);
    }
    ctx.strokeStyle = '#a08060';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, 456, 624);
    // seal
    ctx.beginPath();
    ctx.arc(400, 560, 36, 0, Math.PI * 2);
    ctx.strokeStyle = '#b04030';
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Floating property documents — deeds, blueprints, surveys in soft space. */
export function createFloatingDocuments(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0x1a222c,
    fogColor: 0x1a222c,
    fogDensity: 0.025,
    exposure: 1.1,
    bloomStrength: 0.28,
  });
  const { scene, camera, isMobile } = kit;
  let simSpeed = 1;

  scene.add(new THREE.AmbientLight(0xb0c0d0, 0.55));
  const key = new THREE.DirectionalLight(0xffe6c8, 1.2);
  key.position.set(8, 12, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aacc, 0.4);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  const kinds: Array<'deed' | 'blueprint' | 'survey' | 'contract'> = [
    'deed',
    'blueprint',
    'survey',
    'contract',
    'deed',
    'blueprint',
    'survey',
    'contract',
  ];
  const count = isMobile ? 6 : 8;

  type Doc = {
    mesh: THREE.Mesh;
    base: THREE.Vector3;
    phase: number;
    spin: number;
    unfold: number;
    kind: (typeof kinds)[number];
  };

  const docs: Doc[] = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const mat = new THREE.MeshStandardMaterial({
      map: makeDocTexture(kind),
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), mat);
    mesh.castShadow = true;
    const base = new THREE.Vector3(
      rand(-8, 8),
      rand(-2, 4),
      rand(-6, 4)
    );
    mesh.position.copy(base);
    scene.add(mesh);
    docs.push({
      mesh,
      base,
      phase: rand(0, Math.PI * 2),
      spin: rand(0.08, 0.22) * (Math.random() > 0.5 ? 1 : -1),
      unfold: rand(0, Math.PI * 2),
      kind,
    });
  }

  // Dust motes
  const dustN = isMobile ? 50 : 100;
  const dust = new THREE.Points(
    (() => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        pos[i * 3] = rand(-12, 12);
        pos[i * 3 + 1] = rand(-6, 8);
        pos[i * 3 + 2] = rand(-10, 6);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return geo;
    })(),
    new THREE.PointsMaterial({
      color: 0xe8dcc8,
      size: 0.04,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  scene.add(dust);

  // Soft marker glow that highlights one doc
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.55, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  scene.add(marker);

  camera.position.set(0, 1, 12);
  camera.lookAt(0, 0.5, 0);

  let focus = 0;
  const handle = kit.startLoop((t, dt) => {
    const sdt = dt * simSpeed;
    focus += sdt * 0.15;

    docs.forEach((d, i) => {
      const floatY = Math.sin(t * simSpeed * 0.6 + d.phase) * 0.35;
      const floatX = Math.sin(t * simSpeed * 0.35 + d.phase * 1.3) * 0.25;
      d.mesh.position.set(d.base.x + floatX, d.base.y + floatY, d.base.z);
      d.mesh.rotation.y = t * d.spin * simSpeed + d.phase;
      d.mesh.rotation.x = Math.sin(t * 0.4 * simSpeed + d.phase) * 0.12;
      d.mesh.rotation.z = Math.cos(t * 0.3 * simSpeed + d.phase) * 0.08;

      // Occasional unfold (scale punch for blueprints)
      const unfoldPulse = Math.sin(t * simSpeed * 0.5 + d.unfold);
      if (d.kind === 'blueprint' && unfoldPulse > 0.92) {
        d.mesh.scale.setScalar(1.08);
      } else {
        d.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
      }

      // Subtle opacity depth
      const dist = camera.position.distanceTo(d.mesh.position);
      const mat = d.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.clamp(1.3 - dist * 0.06, 0.35, 1);
      mat.transparent = true;
    });

    const fi = Math.floor(focus) % docs.length;
    const target = docs[fi].mesh.position;
    marker.position.lerp(target.clone().add(new THREE.Vector3(0, 0, 0.05)), 0.06);
    marker.lookAt(camera.position);
    (marker.material as THREE.MeshBasicMaterial).opacity =
      0.25 + Math.sin(t * 3) * 0.2;

    camera.position.x = Math.sin(t * 0.12 * simSpeed) * 2.5;
    camera.position.y = 1 + Math.sin(t * 0.18 * simSpeed) * 0.6;
    camera.position.z = 11 + Math.cos(t * 0.1 * simSpeed) * 1.2;
    camera.lookAt(0, 0.4, 0);

    dust.rotation.y = t * 0.02 * simSpeed;
  });

  handle.setSimSpeed = (s) => {
    simSpeed = Math.max(0.25, Math.min(8, s));
  };
  handle.getSimSpeed = () => simSpeed;
  return handle;
}
