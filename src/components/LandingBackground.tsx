import React, { useEffect, useRef } from 'react';
import { BackgroundOption } from '../scene/backgroundRegistry';
import { SceneHandle } from '../scene/types';

type Props = {
  option: BackgroundOption;
  simSpeed: number;
  onHandle?: (handle: SceneHandle | null) => void;
};

const LandingBackground: React.FC<Props> = ({ option, simSpeed, onHandle }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<SceneHandle | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    el.replaceChildren();
    el.style.background = '';

    let handle: SceneHandle | null = null;
    try {
      handle = option.create(el);
      handleRef.current = handle;
      handle.setSimSpeed?.(simSpeed);
      onHandle?.(handle);
    } catch (err) {
      console.error(`Landing background "${option.id}" failed`, err);
      el.style.background =
        'radial-gradient(ellipse at 30% 20%, #1a2a40 0%, #0a1018 55%, #05080e 100%)';
      onHandle?.(null);
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => handle?.setReducedMotion(mq.matches);
    onMotion();
    mq.addEventListener?.('change', onMotion);

    return () => {
      mq.removeEventListener?.('change', onMotion);
      handle?.dispose();
      handleRef.current = null;
      onHandle?.(null);
      el.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on option id only
  }, [option.id]);

  useEffect(() => {
    handleRef.current?.setSimSpeed?.(simSpeed);
  }, [simSpeed]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: '#03060c',
      }}
    />
  );
};

export default LandingBackground;
