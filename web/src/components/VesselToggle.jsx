import styles from './NightToggle.module.css';
import vesselStyles from './VesselToggle.module.css';

export default function VesselToggle({ active, onToggle }) {
  return (
    <button
      className={`${styles.btn} ${vesselStyles.btn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      title={active ? 'Ocultar embarcações' : 'Exibir embarcações'}
    >
      <span className={styles.icon}>🚢</span>
    </button>
  );
}
