import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';

export type SmartCityHandle = {
  dispose: () => void;
  setReducedMotion: (v: boolean) => void;
};

type AnimTarget = {
  update: (t: number, dt: number) => void;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function makeBuildingTexture(color: string, rows: number, cols: number, warm = true) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 256);
  const lit = warm ? 'rgba(255, 214, 160, 0.85)' : 'rgba(180, 210, 255, 0.75)';
  const dark = 'rgba(20, 28, 40, 0.55)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = Math.random() > 0.35 ? lit : dark;
      const wx = 8 + x * (112 / cols);
      const wy = 10 + y * (236 / rows);
      ctx.fillRect(wx, wy, 112 / cols - 4, 236 / rows - 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createSmartCity(container: HTMLElement): SmartCityHandle {
  const isMobile = window.matchMedia('(max-width: 900px)').matches
    || window.matchMedia('(pointer: coarse)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reducedMotion = prefersReduced;

  const width = () => container.clientWidth || window.innerWidth;
  const height = () => container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
  renderer.setSize(width(), height());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8c9d9);
  scene.fog = new THREE.FogExp2(0xc5d4e2, 0.0042);

  const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.5, 400);
  camera.position.set(48, 22, 58);

  // Soft morning lighting
  const hemi = new THREE.HemisphereLight(0xffe6c8, 0x6a7f96, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd4a8, 1.55);
  sun.position.set(40, 55, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xa8c4e8, 0.28);
  fill.position.set(-30, 20, -40);
  scene.add(fill);

  // Physically based environment (HDR-like IBL without external assets)
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x6f7d6a,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.85, metalness: 0.05 });
  const roadH = new THREE.Mesh(new THREE.PlaneGeometry(220, 8), roadMat);
  roadH.rotation.x = -Math.PI / 2;
  roadH.position.y = 0.02;
  roadH.receiveShadow = true;
  scene.add(roadH);
  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(8, 220), roadMat);
  roadV.rotation.x = -Math.PI / 2;
  roadV.position.y = 0.025;
  roadV.receiveShadow = true;
  scene.add(roadV);
  // secondary roads
  [-36, 36].forEach((x) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 160), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.02, 0);
    r.receiveShadow = true;
    scene.add(r);
  });
  [-36, 36].forEach((z) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(160, 4.5), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.02, z);
    r.receiveShadow = true;
    scene.add(r);
  });

  const animators: AnimTarget[] = [];
  const tmp = new THREE.Object3D();

  // ---- Instanced buildings (skyline, offices, apartments) ----
  const facadeOffice = makeBuildingTexture('#4a5568', 14, 6, false);
  const facadeApt = makeBuildingTexture('#8b7355', 10, 5, true);
  const facadeGlass = makeBuildingTexture('#5c6b7a', 16, 7, false);

  function addInstancedBuildings(
    count: number,
    sizeRange: [number, number, number, number, number, number],
    texture: THREE.Texture,
    colorMul: number,
    placements: Array<{ x: number; z: number }>
  ) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      color: new THREE.Color(colorMul, colorMul, colorMul),
      roughness: 0.55,
      metalness: 0.18,
      envMapIntensity: 0.85,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    for (let i = 0; i < count; i++) {
      const p = placements[i] || { x: rand(-70, 70), z: rand(-70, 70) };
      const w = rand(sizeRange[0], sizeRange[1]);
      const h = rand(sizeRange[2], sizeRange[3]);
      const d = rand(sizeRange[4], sizeRange[5]);
      tmp.position.set(p.x, 0, p.z);
      tmp.scale.set(w, h, d);
      tmp.rotation.set(0, (Math.random() * Math.PI) / 8 - Math.PI / 16, 0);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }

  const officeSlots: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < (isMobile ? 18 : 32); i++) {
    let x = rand(-55, 55);
    let z = rand(-55, 55);
    if (Math.abs(x) < 8) x += Math.sign(x || 1) * 12;
    if (Math.abs(z) < 8) z += Math.sign(z || 1) * 12;
    officeSlots.push({ x, z });
  }
  addInstancedBuildings(officeSlots.length, [4, 8, 14, 32, 4, 8], facadeGlass, 1.05, officeSlots);

  const aptSlots: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < (isMobile ? 14 : 24); i++) {
    aptSlots.push({
      x: rand(-65, 65) + (Math.random() > 0.5 ? 20 : -20),
      z: rand(-65, 65),
    });
  }
  addInstancedBuildings(aptSlots.length, [5, 9, 8, 16, 5, 9], facadeApt, 1.0, aptSlots);

  // Luxury villas (low LOD groups)
  const villaMat = new THREE.MeshStandardMaterial({
    color: 0xe8dfd0,
    roughness: 0.7,
    metalness: 0.05,
    envMapIntensity: 0.5,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.8, metalness: 0.05 });
  for (let i = 0; i < (isMobile ? 6 : 10); i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(rand(5, 8), rand(2.2, 3.2), rand(4, 6)), villaMat);
    body.position.y = body.geometry.parameters.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(rand(4, 5.5), 1.6, 4), roofMat);
    roof.position.y = body.geometry.parameters.height + 0.7;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
    g.position.set(rand(-70, 70), 0, rand(40, 75) * (Math.random() > 0.5 ? 1 : -1));
    scene.add(g);
  }

  // ---- Trees (instanced) ----
  const treeCount = isMobile ? 40 : 80;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6);
  trunkGeo.translate(0, 0.7, 0);
  const canopyGeo = new THREE.SphereGeometry(1.1, 8, 6);
  canopyGeo.translate(0, 2.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3f6b46, roughness: 0.85, metalness: 0.02 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  trunks.castShadow = canopies.castShadow = true;
  const treeBase: THREE.Vector3[] = [];
  for (let i = 0; i < treeCount; i++) {
    const p = new THREE.Vector3(rand(-80, 80), 0, rand(-80, 80));
    if (Math.abs(p.x) < 6 && Math.abs(p.z) < 6) p.x += 15;
    treeBase.push(p);
    const s = rand(0.7, 1.4);
    tmp.position.copy(p);
    tmp.scale.setScalar(s);
    tmp.rotation.set(0, rand(0, Math.PI), 0);
    tmp.updateMatrix();
    trunks.setMatrixAt(i, tmp.matrix);
    canopies.setMatrixAt(i, tmp.matrix);
  }
  scene.add(trunks, canopies);
  animators.push({
    update: (t) => {
      for (let i = 0; i < treeCount; i++) {
        const sway = Math.sin(t * 1.2 + i) * 0.04;
        tmp.position.copy(treeBase[i]);
        const s = 0.7 + (i % 7) * 0.1;
        tmp.scale.set(s, s, s);
        tmp.rotation.set(sway, i, sway * 0.5);
        tmp.updateMatrix();
        canopies.setMatrixAt(i, tmp.matrix);
      }
      canopies.instanceMatrix.needsUpdate = true;
    },
  });

  // ---- Clouds ----
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const clouds: THREE.Mesh[] = [];
  for (let i = 0; i < (isMobile ? 6 : 10); i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(2.5, 4.5), 10, 8), cloudMat);
      puff.position.set(rand(-4, 4), rand(-0.5, 0.8), rand(-2, 2));
      cloud.add(puff);
    }
    cloud.position.set(rand(-90, 90), rand(28, 42), rand(-90, 90));
    scene.add(cloud);
    clouds.push(cloud as unknown as THREE.Mesh);
    animators.push({
      update: (_t, dt) => {
        cloud.position.x += dt * rand(0.8, 1.6) * 0.35;
        if (cloud.position.x > 100) cloud.position.x = -100;
      },
    });
  }

  // ---- Traffic (instanced cars) ----
  const carCount = isMobile ? 12 : 22;
  const carGeo = new THREE.BoxGeometry(1.6, 0.55, 0.9);
  carGeo.translate(0, 0.35, 0);
  const carColors = [0xc45c48, 0x2f5d8c, 0xe8e4dc, 0x2c2c2c, 0xd4a017];
  const carMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.55, envMapIntensity: 1 });
  const cars = new THREE.InstancedMesh(carGeo, carMat, carCount);
  cars.castShadow = true;
  const carState = Array.from({ length: carCount }, (_, i) => ({
    axis: i % 2 === 0 ? 'x' : 'z' as 'x' | 'z',
    lane: i % 2 === 0 ? (i % 4 < 2 ? 2.2 : -2.2) : (i % 4 < 2 ? 2.2 : -2.2),
    pos: rand(-90, 90),
    speed: rand(6, 12) * (i % 2 === 0 ? 1 : -1),
    color: pick(carColors),
  }));
  const color = new THREE.Color();
  carState.forEach((c, i) => {
    cars.setColorAt(i, color.setHex(c.color));
  });
  scene.add(cars);
  animators.push({
    update: (_t, dt) => {
      carState.forEach((c, i) => {
        c.pos += c.speed * dt;
        if (c.pos > 95) c.pos = -95;
        if (c.pos < -95) c.pos = 95;
        if (c.axis === 'x') {
          tmp.position.set(c.pos, 0, c.lane);
          tmp.rotation.set(0, 0, 0);
        } else {
          tmp.position.set(c.lane, 0, c.pos);
          tmp.rotation.set(0, Math.PI / 2, 0);
        }
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        cars.setMatrixAt(i, tmp.matrix);
      });
      cars.instanceMatrix.needsUpdate = true;
    },
  });

  // ---- Construction site: crane, excavator, mixer, trucks ----
  const site = new THREE.Group();
  site.position.set(28, 0, -28);
  scene.add(site);

  const concrete = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.15, 14),
    new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 0.95 })
  );
  concrete.position.y = 0.08;
  concrete.receiveShadow = true;
  site.add(concrete);

  // scaffolding / unfinished building
  const scaffold = new THREE.Mesh(
    new THREE.BoxGeometry(8, 10, 6),
    new THREE.MeshStandardMaterial({ color: 0xb0a090, roughness: 0.8, wireframe: false, transparent: true, opacity: 0.85 })
  );
  scaffold.position.set(-2, 5, 0);
  scaffold.castShadow = true;
  site.add(scaffold);
  const beams = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 0.3, 6.2),
    new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.35 })
  );
  beams.position.set(-2, 10.2, 0);
  site.add(beams);

  // Tower crane
  const crane = new THREE.Group();
  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 18, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf0c040, metalness: 0.6, roughness: 0.4 })
  );
  mast.position.y = 9;
  mast.castShadow = true;
  crane.add(mast);
  const jib = new THREE.Group();
  jib.position.y = 17.5;
  const jibArm = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.35, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf0c040, metalness: 0.6, roughness: 0.4 })
  );
  jibArm.position.x = 5;
  jibArm.castShadow = true;
  jib.add(jibArm);
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
  );
  counter.position.x = -5;
  jib.add(counter);
  const hook = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  hook.position.set(12, -4, 0);
  jib.add(hook);
  crane.add(jib);
  crane.position.set(6, 0, 2);
  site.add(crane);
  animators.push({
    update: (t) => {
      jib.rotation.y = t * 0.18;
      hook.position.y = -3.5 + Math.sin(t * 0.9) * 1.2;
    },
  });

  // Excavator
  const excavator = new THREE.Group();
  const excBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.1, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xe6a817, metalness: 0.4, roughness: 0.45 })
  );
  excBody.position.y = 0.9;
  excBody.castShadow = true;
  excavator.add(excBody);
  const armPivot = new THREE.Group();
  armPivot.position.set(1.0, 1.2, 0);
  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.28, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xe6a817, metalness: 0.4, roughness: 0.45 })
  );
  boom.position.x = 1.2;
  armPivot.add(boom);
  const stick = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.22, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xc48b0a, metalness: 0.4, roughness: 0.45 })
  );
  stick.position.set(2.6, -0.6, 0);
  stick.rotation.z = 0.6;
  armPivot.add(stick);
  const bucket = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  bucket.position.set(3.4, -1.3, 0);
  armPivot.add(bucket);
  excavator.add(armPivot);
  excavator.position.set(-6, 0, 3);
  site.add(excavator);
  animators.push({
    update: (t) => {
      armPivot.rotation.z = Math.sin(t * 1.1) * 0.35 - 0.15;
      stick.rotation.z = 0.5 + Math.sin(t * 1.1 + 0.5) * 0.25;
    },
  });

  // Concrete mixer + trucks on road loop near site
  function makeTruck(colorHex: number, mixer = false) {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.1, 1.3),
      new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.45, roughness: 0.4 })
    );
    cab.position.set(-1.2, 0.75, 0);
    cab.castShadow = true;
    g.add(cab);
    if (mixer) {
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 2.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 0.55, roughness: 0.3 })
      );
      drum.rotation.z = Math.PI / 2;
      drum.position.set(0.6, 1.1, 0);
      drum.castShadow = true;
      g.add(drum);
      animators.push({
        update: (t) => {
          drum.rotation.x = t * 2.2;
        },
      });
    } else {
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 1.35),
        new THREE.MeshStandardMaterial({ color: 0x5a616c, metalness: 0.3, roughness: 0.55 })
      );
      bed.position.set(0.7, 0.7, 0);
      bed.castShadow = true;
      g.add(bed);
    }
    return g;
  }
  const mixer = makeTruck(0xffffff, true);
  const truck1 = makeTruck(0x3d6ea5, false);
  const truck2 = makeTruck(0xb85c38, false);
  scene.add(mixer, truck1, truck2);
  const fleet = [
    { obj: mixer, t: 0, r: 42 },
    { obj: truck1, t: 2.1, r: 42 },
    { obj: truck2, t: 4.2, r: 48 },
  ];
  animators.push({
    update: (t) => {
      fleet.forEach((f) => {
        const a = t * 0.22 + f.t;
        f.obj.position.set(Math.cos(a) * f.r, 0, Math.sin(a) * f.r);
        f.obj.rotation.y = -a + Math.PI / 2;
      });
    },
  });

  // ---- Birds ----
  const birdCount = isMobile ? 8 : 16;
  const birdGeo = new THREE.ConeGeometry(0.15, 0.5, 3);
  birdGeo.rotateX(Math.PI / 2);
  const birdMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const birds = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
  scene.add(birds);
  animators.push({
    update: (t) => {
      for (let i = 0; i < birdCount; i++) {
        const a = t * 0.35 + i * 0.4;
        const r = 25 + (i % 5) * 4;
        tmp.position.set(
          Math.cos(a) * r,
          16 + Math.sin(a * 2 + i) * 2.5,
          Math.sin(a) * r - 10
        );
        tmp.lookAt(tmp.position.x + Math.cos(a + 0.2), tmp.position.y, tmp.position.z + Math.sin(a + 0.2));
        tmp.scale.setScalar(1);
        tmp.updateMatrix();
        birds.setMatrixAt(i, tmp.matrix);
      }
      birds.instanceMatrix.needsUpdate = true;
    },
  });

  // Distant soft skyline silhouettes (LOD far)
  const farMat = new THREE.MeshStandardMaterial({
    color: 0x7a8fa3,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.45,
  });
  for (let i = 0; i < 12; i++) {
    const h = rand(12, 28);
    const m = new THREE.Mesh(new THREE.BoxGeometry(rand(3, 7), h, rand(3, 7)), farMat);
    m.position.set(rand(-100, 100), h / 2, rand(-100, -75));
    scene.add(m);
  }

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(width(), height()),
    isMobile ? 0.22 : 0.35,
    0.6,
    0.85
  );
  composer.addPass(bloom);
  const fxaa = new ShaderPass(FXAAShader);
  fxaa.material.uniforms['resolution'].value.set(1 / width(), 1 / height());
  composer.addPass(fxaa);

  // Soft motion feel via subtle camera lag (true motion blur is too costly for 60fps)
  let orbit = 0.35;
  const camTarget = new THREE.Vector3(0, 6, 0);
  const clock = new THREE.Clock();
  let raf = 0;
  let disposed = false;

  const onResize = () => {
    const w = width();
    const h = height();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    fxaa.material.uniforms['resolution'].value.set(1 / w, 1 / h);
    bloom.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!reducedMotion) {
      orbit += dt * 0.045;
      const radius = isMobile ? 52 : 62;
      const heightY = 18 + Math.sin(t * 0.15) * 2.2;
      camera.position.set(
        Math.cos(orbit) * radius,
        heightY,
        Math.sin(orbit) * radius * 0.92
      );
      camTarget.y = 5.5 + Math.sin(t * 0.2) * 0.6;
      camera.lookAt(camTarget);
      animators.forEach((a) => a.update(t, dt));
    }

    composer.render();
  };
  tick();

  return {
    setReducedMotion: (v: boolean) => {
      reducedMotion = v;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      composer.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            Object.values(m).forEach((v) => {
              if (v instanceof THREE.Texture) v.dispose();
            });
            m.dispose();
          });
        }
      });
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
