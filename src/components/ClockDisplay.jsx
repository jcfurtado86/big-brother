import React, { useState, useEffect } from 'react';
import styles from './ClockDisplay.module.css';

export default function ClockDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={styles.wrapper}>
      <span>{date}</span>
      <span>{time}</span>
    </div>
  );
}
