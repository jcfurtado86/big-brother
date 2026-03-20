import React, { useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

/**
 * Merge sorted 5-min bucket timestamps into continuous coverage segments.
 * Returns [{ left%, width% }] relative to the time range.
 */
function buildCoverageSegments(buckets, start, end) {
  if (!buckets || buckets.length === 0) return [];
  const BUCKET = 5 * 60_000;
  const range = end - start;
  if (range <= 0) return [];

  const segments = [];
  let segStart = buckets[0];
  let segEnd = buckets[0] + BUCKET;

  for (let i = 1; i < buckets.length; i++) {
    if (buckets[i] <= segEnd) {
      segEnd = buckets[i] + BUCKET;
    } else {
      segments.push({ s: segStart, e: segEnd });
      segStart = buckets[i];
      segEnd = buckets[i] + BUCKET;
    }
  }
  segments.push({ s: segStart, e: segEnd });

  return segments.map(({ s, e }) => ({
    left: Math.max(0, (s - start) / range) * 100,
    width: Math.min(100, (Math.min(e, end) - Math.max(s, start)) / range * 100),
  }));
}

export default function TimelineBar() {
  const tl = useTimeline();
  const { t } = useTranslation();
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

  const segments = useMemo(() => {
    if (!tl.coverage || !tl.timeRange) return [];
    return buildCoverageSegments(tl.coverage, tl.timeRange.start, tl.timeRange.end);
  }, [tl.coverage, tl.timeRange?.start, tl.timeRange?.end]);

  if (!tl.active || !tl.timeRange) return null;

  return (
    <div className={styles.bar} onKeyDown={onKeyDown} tabIndex={0}>
      <button className={styles.btn} onClick={tl.togglePlay} title={tl.playing ? t('timeline.pause') : t('timeline.play')}>
        {tl.playing ? '⏸' : '▶'}
      </button>

      <button className={styles.speedBtn} onClick={tl.cycleSpeed} title={t('timeline.speed')}>
        {tl.speed}×
      </button>

      <div className={styles.sliderWrap}>
        <div className={styles.coverageTrack}>
          {segments.map((seg, i) => (
            <div
              key={i}
              className={styles.coverageSeg}
              style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
            />
          ))}
        </div>
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
      </div>

      <span className={styles.time}>{formatTime(tl.currentTime)}</span>

      <input
        type="date"
        className={styles.datePicker}
        value={toDateValue(tl.timeRange.start)}
        max={toDateValue(Date.now())}
        onChange={onDateChange}
      />

      <button className={styles.closeBtn} onClick={tl.deactivate} title={t('timeline.backToLive')}>
        ×
      </button>
    </div>
  );
}
