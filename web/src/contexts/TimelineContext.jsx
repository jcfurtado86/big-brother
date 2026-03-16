import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

const TimelineContext = createContext(null);

const SPEEDS = [1, 2, 5, 10, 30, 60];

export function TimelineProvider({ children }) {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [timeRange, setTimeRange] = useState(null); // { start, end }

  const rafRef = useRef(null);
  const lastFrameRef = useRef(null);
  const stateRef = useRef({ playing: false, speed: 1, currentTime: 0, timeRange: null });

  // Keep ref in sync (synchronous — avoids one-frame stale reads in rAF tick)
  stateRef.current = { playing, speed, currentTime, timeRange };

  // rAF playback loop
  useEffect(() => {
    if (!active || !playing) {
      lastFrameRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    function tick(now) {
      if (lastFrameRef.current != null) {
        const realDelta = now - lastFrameRef.current;
        const s = stateRef.current;
        const next = s.currentTime + realDelta * s.speed;
        const clamped = Math.min(next, s.timeRange?.end ?? next);
        if (Math.abs(clamped - s.currentTime) < 0.5) { lastFrameRef.current = now; rafRef.current = requestAnimationFrame(tick); return; }
        setCurrentTime(clamped);
        if (clamped >= (s.timeRange?.end ?? Infinity)) {
          setPlaying(false);
          return;
        }
      }
      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, playing]);

  const activate = useCallback((startMs, endMs) => {
    setTimeRange({ start: startMs, end: endMs });
    setCurrentTime(startMs);
    setPlaying(false);
    setSpeedState(1);
    setActive(true);
  }, []);

  const deactivate = useCallback(() => {
    setActive(false);
    setPlaying(false);
    setTimeRange(null);
    setCurrentTime(0);
  }, []);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const togglePlay = useCallback(() => setPlaying(v => !v), []);

  const setSpeed = useCallback((n) => {
    setSpeedState(n);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedState(s => {
      const idx = SPEEDS.indexOf(s);
      return SPEEDS[(idx + 1) % SPEEDS.length];
    });
  }, []);

  const seek = useCallback((epochMs) => {
    if (!timeRange) return;
    setCurrentTime(Math.max(timeRange.start, Math.min(epochMs, timeRange.end)));
  }, [timeRange]);

  const getTime = useCallback(() => {
    return active ? stateRef.current.currentTime : Date.now();
  }, [active]);

  const value = {
    active, playing, speed, currentTime, timeRange,
    activate, deactivate, play, pause, togglePlay,
    setSpeed, cycleSpeed, seek, getTime,
    SPEEDS,
  };

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error('useTimeline must be used within TimelineProvider');
  return ctx;
}
