import styles from './ResetView.module.css';

export default function ResetView({ onReset }) {
  return (
    <button className={styles.btn} onClick={onReset} title="Centralizar globo">
      🎯
    </button>
  );
}
