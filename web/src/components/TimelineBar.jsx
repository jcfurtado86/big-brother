import React, { useCallback, useRef } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import styles from './TimelineBar.module.css';

function formatTime(epochMs) {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${min}:${ss}`;
}

function toDateValue(epochMs) {
  const d = new Date(epochMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function TimelineBar() {
  const tl = useTimeline();
  const wasPlayingRef = useRef(false);

  const onSliderDown = useCallback(() => {
    wasPlayingRef.current = tl.playing;
    if (tl.playing) tl.pause();
  }, [tl]);

  const onSliderUp = useCallback(() => {
    if (wasPlayingRef.current) tl.play();
  }, [tl]);

  const onSliderChange = useCallback((e) => {
    tl.seek(Number(e.target.value));
  }, [tl]);

  const onDateChange = useCallback((e) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const startMs = start.getTime();
    // If selected day is today, end = now. Otherwise end = 23:59:59
    const today = new Date();
    const isToday = start.getFullYear() === today.getFullYear()
      && start.getMonth() === today.getMonth()
      && start.getDate() === today.getDate();
    const endMs = isToday ? Date.now() : startMs + 24 * 60 * 60_000 - 1;
    tl.activate(startMs, endMs, { followLive: isToday });
  }, [tl]);

  const onKeyDown = useCallback((e) => {
    if (e.key === ' ') { e.preventDefault(); tl.togglePlay(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); tl.seek(tl.currentTime - 5 * 60_000); }
    if (e.key === 'ArrowRight') { e.preventDefault(); tl.seek(tl.currentTime + 5 * 60_000); }
  }, [tl]);

  if (!tl.active || !tl.timeRange) return null;

  return (
    <div className={styles.bar} onKeyDown={onKeyDown} tabIndex={0}>
      <button className={styles.btn} onClick={tl.togglePlay} title={tl.playing ? 'Pausar' : 'Reproduzir'}>
        {tl.playing ? '⏸' : '▶'}
      </button>

      <button className={styles.speedBtn} onClick={tl.cycleSpeed} title="Velocidade">
        {tl.speed}×
      </button>

      <input
        type="range"
        className={styles.slider}
        min={tl.timeRange.start}
        max={tl.timeRange.end}
        value={tl.currentTime}
        step={1000}
        onChange={onSliderChange}
        onMouseDown={onSliderDown}
        onMouseUp={onSliderUp}
        onTouchStart={onSliderDown}
        onTouchEnd={onSliderUp}
      />

      <span className={styles.time}>{formatTime(tl.currentTime)}</span>

      <input
        type="date"
        className={styles.datePicker}
        value={toDateValue(tl.timeRange.start)}
        max={toDateValue(Date.now())}
        onChange={onDateChange}
      />

      <button className={styles.closeBtn} onClick={tl.deactivate} title="Voltar ao live">
        ×
      </button>
    </div>
  );
}
