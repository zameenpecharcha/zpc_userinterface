export type SceneHandle = {
  dispose: () => void;
  setReducedMotion: (v: boolean) => void;
  /** Optional simulation clock multiplier (Earth / timeline scenes). */
  setSimSpeed?: (speed: number) => void;
  getSimSpeed?: () => number;
};

export type SceneFactory = (container: HTMLElement) => SceneHandle;
