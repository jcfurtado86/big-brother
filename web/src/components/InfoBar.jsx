import React, { useState, useEffect, useRef } from 'react';
import styles from './InfoBar.module.css';

function useFps() {
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    let rafId;
    const tick = () => {
      framesRef.current++;
      const now = performance.now();
      if (now - lastRef.current >= 1000) {
        setFps(framesRef.current);
        framesRef.current = 0;
        lastRef.current = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return fps;
}

export default function InfoBar({ coords, mouseCoords }) {
  const display = mouseCoords ?? coords;
  const { lat, lon } = display;
  const fps = useFps();
  return (
    <div className={styles.bar}>
      <span>Lat: {lat ?? '—'}  Lon: {lon ?? '—'}</span>
      <span>Alt: {coords.alt != null ? `${coords.alt} km` : '—'}</span>
      <span className={fps < 30 ? styles.fpsLow : styles.fps}>{fps} FPS</span>
    </div>
  );
}
