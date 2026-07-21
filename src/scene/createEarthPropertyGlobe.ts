import * as THREE from 'three';
import { createSceneKit, rand } from './sceneKit';
import { SceneHandle } from './types';

type Pin = {
  lat: number;
  lon: number;
  mesh: THREE.Group;
  phase: number;
};

const TEX_BASE = `${process.env.PUBLIC_URL || ''}/textures/earth`;

function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function configureMap(tex: THREE.Texture, renderer: THREE.WebGLRenderer, color = true) {
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (t) => resolve(t),
      undefined,
      () => resolve(null)
    );
  });
}

function makeStarfield(count: number, size: number, color: number, opacity: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 90 + Math.random() * 280;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.userData = {
    baseOpacity: opacity,
    phase: Math.random() * Math.PI * 2,
  };
  return points;
}

function makeAtmosphere(radius: number) {
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.12, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x7ec8ff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, 1.0) * intensity * 1.25;
        }
      `,
    })
  );
  return outer;
}

/**
 * Sun-lit Earth for the login hero — directional daylight + dense starfield.
 */
export function createEarthPropertyGlobe(container: HTMLElement): SceneHandle {
  const kit = createSceneKit(container, {
    bg: 0x050b14,
    exposure: 1.35,
    disableBloom: true,
    shadows: false,
  });
  const { scene, camera, isMobile, renderer } = kit;

  let simSpeed = 1;
  const disposables: THREE.Texture[] = [];

  // Daylight: bright warm sun on the face toward camera, soft blue fill on night side
  const hemi = new THREE.HemisphereLight(0xb8d4ff, 0x1a2838, 0.45);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x6a8098, 0.28);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff2dd, 3.6);
  sun.position.set(28, 18, 55);
  scene.add(sun);
  const sunFill = new THREE.DirectionalLight(0xa8c8ff, 0.55);
  sunFill.position.set(-35, -10, -20);
  scene.add(sunFill);

  // Soft sun disc in the sky (visual cue for daylight)
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfff0c8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  );
  sunDisc.position.copy(sun.position).normalize().multiplyScalar(85);
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffd080,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sunGlow.position.copy(sunDisc.position);
  scene.add(sunGlow);

  // Layered starfield — dense background + bright foreground sparks
  const starLayers = [
    makeStarfield(isMobile ? 2200 : 4800, 0.22, 0xa8bce0, 0.55),
    makeStarfield(isMobile ? 900 : 1800, 0.38, 0xd8e8ff, 0.85),
    makeStarfield(isMobile ? 180 : 360, 0.72, 0xffffff, 0.95),
  ];
  starLayers.forEach((s) => scene.add(s));

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const R = 10;
  const segments = isMobile ? 80 : 112;

  // Lit surface — sun creates a real day/night terminator
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x7ab0d8,
    roughness: 0.72,
    metalness: 0.05,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, segments, segments), earthMat);
  earthGroup.add(earth);

  const cloudsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  });
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.012, segments, segments),
    cloudsMat
  );
  earthGroup.add(clouds);

  // City lights on the night side (additive / emissive)
  const nightMat = new THREE.MeshBasicMaterial({
    color: 0xffcc88,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nightLayer = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.004, segments, segments),
    nightMat
  );
  earthGroup.add(nightLayer);

  earthGroup.add(makeAtmosphere(R));

  const surfaceLayer = new THREE.Group();
  earthGroup.add(surfaceLayer);

  (async () => {
    const [dayA, dayB, cloudsTex, night] = await Promise.all([
      loadTexture(`${TEX_BASE}/earth_blue_marble.jpg`),
      loadTexture(`${TEX_BASE}/earth_day.jpg`),
      loadTexture(`${TEX_BASE}/earth_clouds.png`),
      loadTexture(`${TEX_BASE}/earth_night.jpg`),
    ]);

    const day = dayA || dayB;
    if (day) {
      configureMap(day, renderer, true);
      disposables.push(day);
      earthMat.map = day;
      earthMat.color.setRGB(1.12, 1.1, 1.08);
      earthMat.needsUpdate = true;
    } else {
      console.warn('[Earth] Day texture failed to load — using solid ocean color');
    }

    if (cloudsTex) {
      configureMap(cloudsTex, renderer, true);
      disposables.push(cloudsTex);
      cloudsMat.map = cloudsTex;
      cloudsMat.opacity = 0.38;
      cloudsMat.color.setRGB(1.05, 1.05, 1.05);
      cloudsMat.needsUpdate = true;
    }

    if (night) {
      configureMap(night, renderer, true);
      disposables.push(night);
      nightMat.map = night;
      nightMat.opacity = 0.55;
      nightMat.needsUpdate = true;
      // Soft emissive so dark side stays readable while sun lights the day side
      earthMat.emissiveMap = night;
      earthMat.emissive = new THREE.Color(0xffaa66);
      earthMat.emissiveIntensity = 0.35;
      earthMat.needsUpdate = true;
    }
  })();

  const focus = latLonToVec3(21, 78, 1).normalize();

  const pinDefs = [
    { lat: 28.6, lon: 77.2 },
    { lat: 19.1, lon: 72.9 },
    { lat: 12.97, lon: 77.59 },
    { lat: 17.4, lon: 78.5 },
    { lat: 13.08, lon: 80.27 },
    { lat: 22.57, lon: 88.36 },
    { lat: 26.9, lon: 75.8 },
    { lat: 23.0, lon: 72.6 },
    { lat: 18.5, lon: 73.85 },
    { lat: 30.7, lon: 76.8 },
  ];

  const pins: Pin[] = [];
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xffc060 });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffe0a0,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });

  pinDefs.forEach((d) => {
    const g = new THREE.Group();
    g.position.copy(latLonToVec3(d.lat, d.lon, R * 1.02));
    g.lookAt(0, 0, 0);
    g.rotateX(Math.PI / 2);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), pinMat);
    stem.position.y = 0.24;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), pinMat.clone());
    head.position.y = 0.5;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.24, 28), ringMat.clone());
    ring.rotation.x = -Math.PI / 2;
    g.add(stem, head, ring);
    surfaceLayer.add(g);
    pins.push({ ...d, mesh: g, phase: rand(0, Math.PI * 2) });
  });

  const arcs = new THREE.Group();
  surfaceLayer.add(arcs);
  const arcMat = new THREE.LineBasicMaterial({
    color: 0x9ad8ff,
    transparent: true,
    opacity: 0.45,
  });
  for (let i = 0; i < pins.length; i++) {
    const j = (i + 1 + (i % 3)) % pins.length;
    const a = latLonToVec3(pins[i].lat, pins[i].lon, R * 1.016);
    const b = latLonToVec3(pins[j].lat, pins[j].lon, R * 1.016);
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.15);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    arcs.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
        arcMat.clone()
      )
    );
  }

  const pulseGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
  const pulses = Array.from({ length: isMobile ? 6 : 10 }, () => {
    const m = new THREE.Mesh(pulseGeo, pulseMat);
    surfaceLayer.add(m);
    return {
      mesh: m,
      i: Math.floor(rand(0, pins.length)),
      u: rand(0, 1),
      speed: rand(0.12, 0.28),
    };
  });

  camera.near = 0.3;
  camera.far = 600;
  camera.fov = isMobile ? 38 : 34;
  camera.updateProjectionMatrix();
  camera.position.set(0, 3, 48);
  camera.lookAt(0, 0, 0);

  const indiaQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    focus.clone()
  );
  earthGroup.quaternion.copy(indiaQuat);

  let intro = 0;
  let orbit = 0;
  let simTime = 0;
  const sunDir = new THREE.Vector3();
  const sunNorm = new THREE.Vector3();

  const baseHandle = kit.startLoop((_t, dt) => {
    const sdt = dt * simSpeed;
    simTime += sdt;
    intro = Math.min(1, intro + sdt * 0.12);

    const spin = simTime * 0.03;
    earth.rotation.y = spin;
    nightLayer.rotation.y = spin;
    surfaceLayer.rotation.y = spin;
    clouds.rotation.y = simTime * 0.042;
    clouds.rotation.x = Math.sin(simTime * 0.04) * 0.012;

    // Keep sun lighting the camera-facing hemisphere (daylight on India view)
    sunDir.set(
      22 + Math.sin(simTime * 0.05) * 4,
      14 + Math.cos(simTime * 0.04) * 2,
      48
    );
    sun.position.copy(sunDir);
    sunNorm.copy(sunDir).normalize().multiplyScalar(85);
    sunDisc.position.copy(sunNorm);
    sunGlow.position.copy(sunNorm);

    // Gentle star twinkle
    starLayers.forEach((layer, i) => {
      const mat = layer.material as THREE.PointsMaterial;
      const base = (layer.userData as { baseOpacity: number; phase: number }).baseOpacity;
      const phase = (layer.userData as { phase: number }).phase;
      mat.opacity = base * (0.82 + Math.sin(simTime * (0.7 + i * 0.35) + phase) * 0.18);
    });

    pins.forEach((p) => {
      const pulse = 0.92 + Math.sin(simTime * 2.0 + p.phase) * 0.18;
      p.mesh.scale.setScalar(pulse);
      const ring = p.mesh.children[2] as THREE.Mesh;
      if (ring?.material) {
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.3;
      }
    });

    pulses.forEach((p) => {
      p.u += sdt * p.speed;
      if (p.u > 1) {
        p.u = 0;
        p.i = Math.floor(rand(0, pins.length));
      }
      const aPin = pins[p.i];
      const bPin = pins[(p.i + 2) % pins.length];
      const a = latLonToVec3(aPin.lat, aPin.lon, R * 1.016);
      const b = latLonToVec3(bPin.lat, bPin.lon, R * 1.016);
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.16);
      p.mesh.position.copy(new THREE.QuadraticBezierCurve3(a, mid, b).getPoint(p.u));
    });

    earthGroup.quaternion.slerp(indiaQuat, 0.025);

    orbit += sdt * 0.08;
    // Keep Earth further back so the login card stays the focus
    const dist = THREE.MathUtils.lerp(
      52,
      isMobile ? 28 : 30,
      THREE.MathUtils.smoothstep(intro, 0, 1)
    );
    camera.position.set(
      Math.sin(orbit * 0.22) * dist * 0.12,
      3.2 + Math.sin(simTime * 0.15) * 0.25,
      dist
    );
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit * 0.035);
    camera.lookAt(0, 0, 0);
  });

  return {
    setReducedMotion: baseHandle.setReducedMotion,
    setSimSpeed: (speed: number) => {
      simSpeed = Math.max(0.25, Math.min(8, speed));
    },
    getSimSpeed: () => simSpeed,
    dispose: () => {
      baseHandle.dispose();
      disposables.forEach((tex) => tex.dispose());
    },
  };
}
