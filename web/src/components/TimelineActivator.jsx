import React from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import styles from './TimelineActivator.module.css';

export default function TimelineActivator() {
  const tl = useTimeline();

  function handleClick() {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    tl.activate(startOfDay.getTime(), now, { followLive: true });
  }

  if (tl.active) return null;

  return (
    <button className={styles.tab} onClick={handleClick} title="Timeline histórica">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>TIMELINE</span>
    </button>
  );
}
