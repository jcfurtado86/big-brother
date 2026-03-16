import React, { useState, useEffect } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import styles from './ClockDisplay.module.css';

export default function ClockDisplay() {
  const tl = useTimeline();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (tl.active) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [tl.active]);

  const displayDate = tl.active ? new Date(tl.currentTime) : now;
  const date = displayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = displayDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={`${styles.wrapper} ${tl.active ? styles.history : ''}`}>
      {tl.active && <span className={styles.badge}>HISTORICO</span>}
      <span>{date}</span>
      <span>{time}</span>
    </div>
  );
}
