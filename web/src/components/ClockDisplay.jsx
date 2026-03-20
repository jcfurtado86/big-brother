import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimeline } from '../contexts/TimelineContext';
import styles from './ClockDisplay.module.css';

export default function ClockDisplay() {
  const tl = useTimeline();
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (tl.active) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [tl.active]);

  const displayDate = tl.active ? new Date(tl.currentTime) : now;
  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
  const date = displayDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = displayDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const cls = [
    styles.wrapper,
    tl.active ? styles.history : '',
    tl.active ? styles.timelineActive : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {tl.active && <span className={styles.badge}>{t('clock.history')}</span>}
      <span>{date}</span>
      <span>{time}</span>
    </div>
  );
}
