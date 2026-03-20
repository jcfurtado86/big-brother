import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WEBCAM_CATEGORY_META } from '../providers/webcamIcons';
import { Row, styles } from './DetailCardParts';

const DURATION = 350;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Card styles
const CARD_STYLE = {
  position: 'fixed',
  top: 16,
  left: 16,
  width: 480,
  maxWidth: '90vw',
  padding: '16px 18px',
  background: 'rgba(20, 20, 30, 0.88)',
  borderRadius: 16,
  zIndex: 10,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.55)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: 13,
};

// Fullscreen styles
const FS_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  padding: 0,
  background: 'transparent',
  borderRadius: 0,
  zIndex: 1000,
  backdropFilter: 'none',
  boxShadow: 'none',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

export default function WebcamCard({ webcam, onClose }) {
  const { t } = useTranslation();
  if (!webcam) return null;

  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);
  const rectBeforeRef = useRef(null);
  const meta = WEBCAM_CATEGORY_META[webcam.category] ?? WEBCAM_CATEGORY_META.live;
  const location = [webcam.city, webcam.region, webcam.country].filter(Boolean).join(', ');

  // Always embed the day/timelapse player (works reliably in iframe)
  const embedUrl = webcam.playerFallbackUrl ?? webcam.playerUrl;
  const liveUrl = webcam.category === 'live' ? webcam.playerUrl : null;
  const streamUrl = webcam.streamUrl ?? null;
  const previewUrl = webcam.imageUrl;

  const toggle = useCallback(() => {
    if (containerRef.current) {
      rectBeforeRef.current = containerRef.current.getBoundingClientRect();
    }
    setFullscreen(f => !f);
  }, []);

  // FLIP animation after layout change
  useLayoutEffect(() => {
    const el = containerRef.current;
    const before = rectBeforeRef.current;
    if (!el || !before) return;
    rectBeforeRef.current = null;

    const after = el.getBoundingClientRect();
    const dx = before.left + before.width / 2 - (after.left + after.width / 2);
    const dy = before.top + before.height / 2 - (after.top + after.height / 2);

    el.animate([
      { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
      { transform: 'translate(0, 0)', opacity: 1 },
    ], { duration: DURATION, easing: EASING });
  }, [fullscreen]);

  // Auto-refresh media that isn't a true live stream (iframe/HLS)
  const isSnapshot = !embedUrl && !streamUrl && !!previewUrl;
  const isClip = !embedUrl && !!streamUrl && !streamUrl.includes('.m3u8');
  const refreshBase = isSnapshot ? previewUrl : isClip ? streamUrl : null;
  const [mediaSrc, setMediaSrc] = useState(refreshBase);

  const bustCache = useCallback((url) => {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_t=${Date.now()}`;
  }, []);

  // Unified refresh: snapshots every 10s, clips every 60s (server update cadence)
  useEffect(() => {
    if (!refreshBase) return;
    setMediaSrc(refreshBase);
    const interval = isSnapshot ? 10_000 : 60_000;
    const id = setInterval(() => setMediaSrc(bustCache(refreshBase)), interval);
    return () => clearInterval(id);
  }, [refreshBase, isSnapshot, bustCache]);

  const containerStyle = fullscreen ? FS_STYLE : CARD_STYLE;

  const playerStyle = fullscreen ? {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  } : {
    width: '100%',
    aspectRatio: '16 / 9',
    border: 'none',
    borderRadius: 8,
    background: '#000',
  };

  // Constrain fullscreen to 16:9 so no blurred fill appears
  const playerWrapStyle = fullscreen ? {
    width: 'min(90vw, calc(80vh * 16 / 9))',
    height: 'min(80vh, calc(90vw * 9 / 16))',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#000',
    pointerEvents: 'auto',
    boxShadow: '0 4px 40px rgba(0,0,0,0.5)',
  } : null;

  const imgStyle = fullscreen ? {
    maxWidth: '90vw',
    maxHeight: '85vh',
    borderRadius: 12,
    objectFit: 'contain',
    display: 'block',
    pointerEvents: 'auto',
    background: '#000',
    boxShadow: '0 4px 40px rgba(0,0,0,0.5)',
  } : {
    width: '100%',
    borderRadius: 8,
    objectFit: 'contain',
    background: '#000',
    display: 'block',
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Header — hidden in fullscreen */}
      {!fullscreen && (
        <>
          <div className={styles.header}>
            <div>
              <div className={styles.name} style={{ color: meta.color }}>
                {webcam.title || 'Camera'}
              </div>
              <div className={styles.sub}>{location || t(meta.label)}</div>
            </div>
            <button className={styles.close} onClick={onClose}>×</button>
          </div>
          <div className={styles.divider} />
        </>
      )}

      {/* Player / image */}
      <div style={{ position: 'relative', marginBottom: fullscreen ? 0 : 10 }}>
        {embedUrl ? (
          fullscreen ? (
            <div style={playerWrapStyle}>
              <iframe
                src={embedUrl}
                style={playerStyle}
                allow="autoplay; fullscreen"
                allowFullScreen
                title={webcam.title}
              />
            </div>
          ) : (
            <iframe
              src={embedUrl}
              style={playerStyle}
              allow="autoplay; fullscreen"
              allowFullScreen
              title={webcam.title}
            />
          )
        ) : streamUrl ? (
          fullscreen ? (
            <div style={playerWrapStyle}>
              <video
                src={isClip ? mediaSrc : streamUrl}
                style={playerStyle}
                controls
                autoPlay
                muted
                title={webcam.title}
              />
            </div>
          ) : (
            <video
              src={isClip ? mediaSrc : streamUrl}
              style={playerStyle}
              controls
              autoPlay
              muted
              title={webcam.title}
            />
          )
        ) : previewUrl ? (
          <img src={mediaSrc} alt={webcam.title} style={imgStyle} />
        ) : null}

        {(embedUrl || streamUrl || previewUrl) && (
          <button
            onClick={toggle}
            style={{
              position: 'absolute',
              ...(fullscreen
                ? { top: 10, right: 10, fontSize: 24, padding: '2px 10px' }
                : { bottom: 6, right: 6, fontSize: 16, padding: '2px 8px' }),
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: 4,
              lineHeight: 1.4,
              pointerEvents: 'auto',
            }}
            title={fullscreen ? t('webcam.minimize') : t('webcam.fullscreen')}
          >
            ⛶
          </button>
        )}
      </div>

      {/* Grid details — hidden in fullscreen */}
      {!fullscreen && (
        <>
          {(liveUrl || streamUrl) && (
            <a
              href={liveUrl || streamUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '6px 0',
                marginBottom: 8,
                background: 'rgba(0, 230, 118, 0.15)',
                border: '1px solid rgba(0, 230, 118, 0.4)',
                borderRadius: 6,
                color: '#00E676',
                fontSize: 12,
                fontWeight: 'bold',
                textDecoration: 'none',
                letterSpacing: 0.5,
              }}
            >
              {t('webcam.openLiveStream')}
            </a>
          )}
          <div className={styles.grid}>
            <Row label={t('card.status')} value={t(meta.label)} />
            <Row label={t('control.provider')} value={webcam.provider ?? 'Windy'} />
            <Row label={t('card.country')} value={webcam.country} />
            <Row label={t('card.position')} value={
              webcam.lat != null
                ? `${webcam.lat.toFixed(4)}°, ${webcam.lon.toFixed(4)}°`
                : null
            } />
          </div>
        </>
      )}
    </div>
  );
}
