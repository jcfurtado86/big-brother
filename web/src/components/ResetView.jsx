import { useTranslation } from 'react-i18next';
import styles from './ResetView.module.css';

export default function ResetView({ onReset }) {
  const { t } = useTranslation();
  return (
    <button className={styles.btn} onClick={onReset} title={t('resetView.title')}>
      🎯
    </button>
  );
}
