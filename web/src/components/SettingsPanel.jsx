import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SettingsPanel.module.css';
import {
  SETTINGS_SCHEMA, useSettings,
  setSetting, resetSetting, resetAll, isOverridden,
} from '../providers/settingsStore';
import { idbClearAll, idbEstimateSize, idbStoreCounts } from '../utils/idbCache';
import { setLanguage, getLanguage } from '../i18n';

function GearIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.58 0h2.84l.44 2.61a7.5 7.5 0 0 1 1.64.68l2.12-1.6 2.01 2.01-1.6 2.12c.28.52.5 1.07.68 1.64L19.32 8v2.84l-2.61.44a7.5 7.5 0 0 1-.68 1.64l1.6 2.12-2.01 2.01-2.12-1.6a7.5 7.5 0 0 1-1.64.68L11.42 19H8.58l-.44-2.61a7.5 7.5 0 0 1-1.64-.68l-2.12 1.6-2.01-2.01 1.6-2.12a7.5 7.5 0 0 1-.68-1.64L.68 11.16V8.32l2.61-.44a7.5 7.5 0 0 1 .68-1.64L2.37 4.12l2.01-2.01 2.12 1.6a7.5 7.5 0 0 1 1.64-.68L8.58 0zM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>
    </svg>
  );
}

function SettingRow({ item }) {
  const { t } = useTranslation();
  const settings = useSettings();
  const value = settings[item.key];
  const modified = isOverridden(item.key);

  function handleChange(e) {
    const v = Number(e.target.value);
    if (!isNaN(v)) setSetting(item.key, v);
  }

  return (
    <div className={styles.row}>
      <span className={styles.label} title={item.key}>{t(item.label)}</span>
      {item.desc && <span className={styles.helpIcon} title={t(item.desc)}>?</span>}
      <input
        type="number"
        className={`${styles.input} ${modified ? styles.inputModified : ''}`}
        value={value}
        min={item.min}
        max={item.max}
        step={item.step}
        onChange={handleChange}
      />
      <button
        className={styles.resetBtn}
        onClick={() => resetSetting(item.key)}
        title={t('settings.restoreDefault')}
      >
        ↺
      </button>
    </div>
  );
}

function Section({ section, open, onToggle }) {
  const { t } = useTranslation();
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionLabel}>{t(section.section)}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
      </div>
      {open && (
        <div className={styles.sectionBody}>
          {section.items.map(item => (
            <SettingRow key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function CacheSection({ open, onToggle }) {
  const { t } = useTranslation();
  const [idbInfo, setIdbInfo] = useState(null);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    const [estimate, counts] = await Promise.all([idbEstimateSize(), idbStoreCounts()]);
    setIdbInfo({ estimate, counts });
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  async function handleClear() {
    setClearing(true);
    await idbClearAll();
    await refresh();
    setClearing(false);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionLabel}>{t('cache.title')}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
      </div>
      {open && (
        <div className={styles.sectionBody}>
          {idbInfo?.estimate && (
            <div className={styles.row}>
              <span className={styles.label}>{t('cache.usage')}</span>
              <span className={styles.infoValue}>{fmt(idbInfo.estimate.usage)}</span>
            </div>
          )}
          {idbInfo?.counts && Object.entries(idbInfo.counts).map(([store, count]) => (
            <div className={styles.row} key={store}>
              <span className={styles.label}>{store}</span>
              <span className={styles.infoValue}>{count} {count === 1 ? t('cache.entry') : t('cache.entries')}</span>
            </div>
          ))}
          <button className={styles.dangerBtn} onClick={handleClear} disabled={clearing}>
            {clearing ? t('cache.clearing') : t('cache.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
}

function DbSizeSection({ open, onToggle }) {
  const { t } = useTranslation();
  const [dbInfo, setDbInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || dbInfo) return;
    setLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(`${apiUrl}/api/health/db-size`)
      .then(r => r.json())
      .then(setDbInfo)
      .catch(() => setDbInfo(null))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionLabel}>{t('db.title')}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
      </div>
      {open && (
        <div className={styles.sectionBody}>
          {loading && <span className={styles.label}>{t('db.loading')}</span>}
          {dbInfo && (
            <>
              <div className={styles.row}>
                <span className={styles.label}>{t('db.total')}</span>
                <span className={styles.infoValue}>{fmt(dbInfo.total)}</span>
              </div>
              {dbInfo.tables?.map(tbl => (
                <div className={styles.row} key={tbl.name}>
                  <span className={styles.label}>{tbl.name}</span>
                  <span className={styles.infoValue}>{fmt(tbl.size)}</span>
                </div>
              ))}
            </>
          )}
          {!loading && !dbInfo && <span className={styles.label}>{t('db.connectionError')}</span>}
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  return (
    <>
      <button
        className={`${styles.btn} ${open ? styles.btnActive : ''}`}
        onClick={() => setOpen(v => !v)}
        title={t('settings.title')}
      >
        <GearIcon />
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.header}>
              <span className={styles.title}>{t('settings.title')}</span>
              <div className={styles.headerActions}>
                <button className={styles.resetAll} onClick={resetAll}>Reset</button>
                <button className={styles.close} onClick={() => setOpen(false)}>×</button>
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.row}>
                <span className={styles.label}>{t('settings.language')}</span>
                <select
                  className={styles.input}
                  value={getLanguage()}
                  onChange={e => setLanguage(e.target.value)}
                  style={{ width: 'auto', minWidth: 100 }}
                >
                  <option value="en">English</option>
                  <option value="pt-BR">Português (BR)</option>
                </select>
              </div>
            </div>
            <div className={styles.divider} />
            {SETTINGS_SCHEMA.map((section, i) => (
              <React.Fragment key={section.section}>
                {i > 0 && <div className={styles.divider} />}
                <Section
                  section={section}
                  open={openSection === section.section}
                  onToggle={() => setOpenSection(v => v === section.section ? null : section.section)}
                />
              </React.Fragment>
            ))}
            <div className={styles.divider} />
            <CacheSection
              open={openSection === '__cache__'}
              onToggle={() => setOpenSection(v => v === '__cache__' ? null : '__cache__')}
            />
            <div className={styles.divider} />
            <DbSizeSection
              open={openSection === '__dbsize__'}
              onToggle={() => setOpenSection(v => v === '__dbsize__' ? null : '__dbsize__')}
            />
          </div>
        </>
      )}
    </>
  );
}
