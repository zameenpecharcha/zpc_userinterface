import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SceneHandle } from './types';

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export type KitOptions = {
  bg: number;
  fogColor?: number;
  fogDensity?: number;
  exposure?: number;
  bloomStrength?: number;
  /** When true, skip UnrealBloom (it darkens midtones — bad for Earth albedo). */
  disableBloom?: boolean;
  shadows?: boolean;
  clearAlpha?: boolean;
};

export type SceneKit = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  isMobile: boolean;
  width: () => number;
  height: () => number;
  startLoop: (onFrame: (t: number, dt: number) => void) => SceneHandle;
};

export function createSceneKit(container: HTMLElement, opts: KitOptions): SceneKit {
  const isMobile =
    window.matchMedia('(max-width: 900px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reducedMotion = prefersReduced;

  const width = () => container.clientWidth || window.innerWidth;
  const height = () => container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: 'high-performance',
    alpha: !!opts.clearAlpha,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
  renderer.setSize(width(), height());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.05;
  renderer.shadowMap.enabled = opts.shadows !== false;
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
  scene.background = new THREE.Color(opts.bg);
  if (opts.fogColor != null) {
    scene.fog = new THREE.FogExp2(opts.fogColor, opts.fogDensity ?? 0.004);
  }

  const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.4, 500);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomStrength = opts.disableBloom ? 0 : (opts.bloomStrength ?? (isMobile ? 0.2 : 0.32));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(width(), height()),
    bloomStrength,
    0.55,
    0.82
  );
  // Bloom pass darkens the base frame even at low strength — skip entirely when disabled
  if (!opts.disableBloom && bloomStrength > 0) {
    composer.addPass(bloom);
  }
  const fxaa = new ShaderPass(FXAAShader);
  fxaa.material.uniforms['resolution'].value.set(1 / width(), 1 / height());
  composer.addPass(fxaa);

  const startLoop = (onFrame: (t: number, dt: number) => void): SceneHandle => {
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
      if (!reducedMotion) onFrame(t, dt);
      composer.render();
    };
    tick();

    return {
      setReducedMotion: (v) => {
        reducedMotion = v;
      },
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        composer.dispose();
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
  };

  return { renderer, scene, camera, composer, bloom, isMobile, width, height, startLoop };
}
