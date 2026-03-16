import styles from './ReceiverCard.module.css';

const TYPE_META = {
  adsb: { label: 'ADS-B Receiver', color: '#40C4FF' },
  ais:  { label: 'AIS Station',    color: '#69F0AE' },
};

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return <>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </>;
}

export default function ReceiverCard({ receiver, onClose }) {
  if (!receiver) return null;

  const meta = TYPE_META[receiver.type] ?? TYPE_META.adsb;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.name} style={{ color: meta.color }}>
            {receiver.user || receiver.name || receiver.id}
          </div>
          <div className={styles.sub}>{meta.label}</div>
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.divider} />

      <div className={styles.grid}>
        <Row label="Tipo" value={meta.label} />
        {receiver.type === 'adsb' && (
          <>
            <Row label="Regiao" value={receiver.region} />
            <Row label="Peers" value={receiver.peers} />
            <Row label="Bad syncs" value={receiver.badSyncs} />
          </>
        )}
        {receiver.type === 'ais' && (
          <Row label="MMSI" value={receiver.mmsi} />
        )}
        <Row label="Posicao" value={
          receiver.lat != null
            ? `${receiver.lat.toFixed(4)}°, ${receiver.lon.toFixed(4)}°`
            : null
        } />
      </div>
    </div>
  );
}
