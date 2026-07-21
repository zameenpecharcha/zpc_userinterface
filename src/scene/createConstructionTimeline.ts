import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

type Stage = 'empty' | 'foundation' | 'frame' | 'floors' | 'skin' | 'lights' | 'landscape' | 'done';

const STAGE_ORDER: Stage[] = [
  'empty',
  'foundation',
  'frame',
  'floors',
  'skin',
  'lights',
  'landscape',
  'done',
];

/** Procedural construction timeline — land → community, looping. */
export function createConstructionTimeline(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0xb7c4c8,
    fogColor: 0xc5d0d4,
    fogDensity: 0.008,
    exposure: 1.08,
    bloomStrength: 0.22,
  });
  const { scene, camera, isMobile } = kit;
  let simSpeed = 1;

  scene.add(new THREE.HemisphereLight(0xffe8d0, 0x6a7a88, 0.75));
  const sun = new THREE.DirectionalLight(0xffd8b0, 1.4);
  sun.position.set(25, 40, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 1536, isMobile ? 1024 : 1536);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0x7a8a6e, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(18, 40),
    new THREE.MeshStandardMaterial({ color: 0x8a7358, roughness: 1 })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.02;
  scene.add(dirt);

  type Site = {
    group: THREE.Group;
    foundation: THREE.Mesh;
    columns: THREE.Group;
    slabs: THREE.Group;
    walls: THREE.Group;
    glass: THREE.Mesh;
    windows: THREE.PointLight[];
    trees: THREE.Group;
    stageIndex: number;
    progress: number;
    period: number;
    offset: number;
  };

  const sites: Site[] = [];
  const slots = isMobile
    ? [
        [0, 0],
        [-10, 6],
        [10, -4],
      ]
    : [
        [0, 0],
        [-12, 5],
        [11, -6],
        [-8, -10],
        [9, 9],
      ];

  const craneMat = new THREE.MeshStandardMaterial({
    color: 0xe8b020,
    metalness: 0.55,
    roughness: 0.4,
  });

  slots.forEach(([x, z], idx) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);

    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.35, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 0.9 })
    );
    foundation.position.y = 0.1;
    foundation.castShadow = true;
    foundation.scale.set(0.01, 0.01, 0.01);
    group.add(foundation);

    const columns = new THREE.Group();
    group.add(columns);
    for (let c = 0; c < 6; c++) {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 8, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xc8c2b8, roughness: 0.75 })
      );
      col.position.set((c % 3) * 2.2 - 2.2, 4, Math.floor(c / 3) * 2.8 - 1.4);
      col.scale.y = 0.01;
      col.castShadow = true;
      columns.add(col);
    }

    const slabs = new THREE.Group();
    group.add(slabs);
    for (let f = 0; f < 4; f++) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.25, 4.9),
        new THREE.MeshStandardMaterial({ color: 0xb0aaa0, roughness: 0.85 })
      );
      slab.position.y = 2 + f * 2;
      slab.scale.set(0.01, 0.01, 0.01);
      slab.castShadow = true;
      slabs.add(slab);
    }

    const walls = new THREE.Group();
    group.add(walls);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd8cfc2,
      roughness: 0.7,
      transparent: true,
      opacity: 0,
    });
    [
      [0, 4.5, -2.4, 6, 8, 0.2],
      [0, 4.5, 2.4, 6, 8, 0.2],
      [-3, 4.5, 0, 0.2, 8, 4.6],
      [3, 4.5, 0, 0.2, 8, 4.6],
    ].forEach(([px, py, pz, sx, sy, sz]) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat.clone());
      w.position.set(px, py, pz);
      w.castShadow = true;
      walls.add(w);
    });

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 7.2, 4.4),
      new THREE.MeshStandardMaterial({
        color: 0x7a9bb0,
        metalness: 0.55,
        roughness: 0.2,
        transparent: true,
        opacity: 0,
        envMapIntensity: 1,
      })
    );
    glass.position.y = 4.5;
    group.add(glass);

    const windows: THREE.PointLight[] = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffd2a0, 0, 6, 2);
      l.position.set(rand(-2, 2), 2 + i * 1.8, 2.6);
      group.add(l);
      windows.push(l);
    }

    const trees = new THREE.Group();
    group.add(trees);
    for (let t = 0; t < 4; t++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.8, 5),
        new THREE.MeshStandardMaterial({ color: 0x5a3d28 })
      );
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x3f6b42 })
      );
      canopy.position.y = 0.9;
      const tg = new THREE.Group();
      tg.add(trunk, canopy);
      tg.position.set(rand(-4.5, 4.5), 0.4, rand(-4, 4));
      tg.scale.setScalar(0.01);
      trees.add(tg);
    }

    // Crane per site
    const crane = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.25, 12, 0.25), craneMat);
    mast.position.set(4.5, 6, 3);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 0.25), craneMat);
    jib.position.set(4.5, 12, 3);
    jib.geometry.translate(3, 0, 0);
    crane.add(mast, jib);
    group.add(crane);

    sites.push({
      group,
      foundation,
      columns,
      slabs,
      walls,
      glass,
      windows,
      trees,
      stageIndex: idx % STAGE_ORDER.length,
      progress: rand(0, 0.6),
      period: 10 + idx * 1.5,
      offset: idx * 2.2,
    });

    (crane.userData as { jib: THREE.Mesh }).jib = jib;
  });

  // Workers (simple capsules)
  const workers: Array<{ mesh: THREE.Group; site: number; phase: number }> = [];
  for (let i = 0; i < (isMobile ? 4 : 8); i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8a020 : 0x3a6ea5 })
    );
    body.position.y = 0.55;
    g.add(body);
    scene.add(g);
    workers.push({ mesh: g, site: i % sites.length, phase: rand(0, Math.PI * 2) });
  }

  // Mixer truck looping
  const mixer = new THREE.Group();
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.4 })
  );
  cab.position.set(-0.9, 0.7, 0);
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xd0d5dc, metalness: 0.5, roughness: 0.35 })
  );
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0.5, 0.95, 0);
  mixer.add(cab, drum);
  scene.add(mixer);

  camera.position.set(22, 14, 26);
  camera.lookAt(0, 3, 0);

  let orbit = 0.4;
  const handle = kit.startLoop((t, dt) => {
    const sdt = dt * simSpeed;
    orbit += sdt * 0.08;
    camera.position.set(
      Math.cos(orbit) * 28,
      12 + Math.sin(t * 0.15) * 1.5,
      Math.sin(orbit) * 28
    );
    camera.lookAt(0, 3.5, 0);

    sites.forEach((site) => {
      site.progress += sdt / site.period;
      if (site.progress >= 1) {
        site.progress = 0;
        site.stageIndex = (site.stageIndex + 1) % STAGE_ORDER.length;
      }
      const stage = STAGE_ORDER[site.stageIndex];
      const p = THREE.MathUtils.smoothstep(site.progress, 0, 1);

      const setScale = (obj: THREE.Object3D, s: number) => {
        obj.scale.setScalar(Math.max(0.01, s));
      };

      setScale(site.foundation, stage === 'empty' ? 0.01 : Math.min(1, stage === 'foundation' ? p : 1));
      site.columns.children.forEach((c, i) => {
        const on = ['frame', 'floors', 'skin', 'lights', 'landscape', 'done'].includes(stage);
        const local = stage === 'frame' ? Math.max(0.01, p - i * 0.08) : on ? 1 : 0.01;
        c.scale.y = Math.max(0.01, Math.min(1, local));
      });
      site.slabs.children.forEach((s, i) => {
        const on = ['floors', 'skin', 'lights', 'landscape', 'done'].includes(stage);
        const local = stage === 'floors' ? Math.max(0.01, p - i * 0.15) : on ? 1 : 0.01;
        setScale(s, Math.min(1, local));
      });
      site.walls.children.forEach((w) => {
        const mat = (w as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (stage === 'skin') mat.opacity = p * 0.95;
        else if (['lights', 'landscape', 'done'].includes(stage)) mat.opacity = 0.95;
        else mat.opacity = 0;
      });
      const glassMat = site.glass.material as THREE.MeshStandardMaterial;
      if (stage === 'skin') glassMat.opacity = p * 0.45;
      else if (['lights', 'landscape', 'done'].includes(stage)) glassMat.opacity = 0.5;
      else glassMat.opacity = 0;

      site.windows.forEach((l, i) => {
        if (stage === 'lights') l.intensity = p * (0.6 + (i % 2) * 0.4);
        else if (['landscape', 'done'].includes(stage)) l.intensity = 0.8 + Math.sin(t * 2 + i) * 0.15;
        else l.intensity = 0;
      });

      site.trees.children.forEach((tr, i) => {
        if (stage === 'landscape') setScale(tr, Math.min(1, p + i * 0.1));
        else if (stage === 'done') setScale(tr, 1);
        else setScale(tr, 0.01);
      });

      const building = stage !== 'empty' && stage !== 'done' && stage !== 'landscape';
      site.group.children.forEach((child) => {
        if (child instanceof THREE.Group && child.children.length >= 2) {
          const maybeJib = child.children[1];
          if (building) maybeJib.rotation.y = t * 0.4 * simSpeed + site.offset;
          maybeJib.visible = stage !== 'done' && stage !== 'empty';
          child.visible = stage !== 'done';
        }
      });
    });

    workers.forEach((w) => {
      const site = sites[w.site];
      const a = t * 0.7 * simSpeed + w.phase;
      w.mesh.position.set(
        site.group.position.x + Math.cos(a) * 4.5,
        0,
        site.group.position.z + Math.sin(a) * 3.5
      );
      w.mesh.rotation.y = -a + Math.PI / 2;
      w.mesh.visible = STAGE_ORDER[site.stageIndex] !== 'done';
    });

    const ma = t * 0.25 * simSpeed;
    mixer.position.set(Math.cos(ma) * 16, 0, Math.sin(ma) * 16);
    mixer.rotation.y = -ma + Math.PI / 2;
    drum.rotation.x = t * 3 * simSpeed;
  });

  handle.setSimSpeed = (speed: number) => {
    simSpeed = Math.max(0.25, Math.min(8, speed));
  };
  handle.getSimSpeed = () => simSpeed;
  return handle;
}
