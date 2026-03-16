import styles from './DetailCard.module.css';

export function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

export function LinkRow({ label, url, text }) {
  if (!url) return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>
      <a className={styles.link} href={url} target="_blank" rel="noreferrer">{text || url}</a>
    </span>
  </>;
}

export { styles };
