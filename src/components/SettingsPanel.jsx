import React, { useState } from 'react';
import styles from './SettingsPanel.module.css';
import {
  SETTINGS_SCHEMA, useSettings,
  setSetting, resetSetting, resetAll, isOverridden,
} from '../providers/settingsStore';

function GearIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.58 0h2.84l.44 2.61a7.5 7.5 0 0 1 1.64.68l2.12-1.6 2.01 2.01-1.6 2.12c.28.52.5 1.07.68 1.64L19.32 8v2.84l-2.61.44a7.5 7.5 0 0 1-.68 1.64l1.6 2.12-2.01 2.01-2.12-1.6a7.5 7.5 0 0 1-1.64.68L11.42 19H8.58l-.44-2.61a7.5 7.5 0 0 1-1.64-.68l-2.12 1.6-2.01-2.01 1.6-2.12a7.5 7.5 0 0 1-.68-1.64L.68 11.16V8.32l2.61-.44a7.5 7.5 0 0 1 .68-1.64L2.37 4.12l2.01-2.01 2.12 1.6a7.5 7.5 0 0 1 1.64-.68L8.58 0zM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>
    </svg>
  );
}

function SettingRow({ item }) {
  const settings = useSettings();
  const value = settings[item.key];
  const modified = isOverridden(item.key);

  function handleChange(e) {
    const v = Number(e.target.value);
    if (!isNaN(v)) setSetting(item.key, v);
  }

  return (
    <div className={styles.row}>
      <span className={styles.label} title={item.key}>{item.label}</span>
      {item.desc && <span className={styles.helpIcon} title={item.desc}>?</span>}
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
        title="Restaurar padrão"
      >
        ↺
      </button>
    </div>
  );
}

function Section({ section, open, onToggle }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionLabel}>{section.section}</span>
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

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  return (
    <>
      <button
        className={`${styles.btn} ${open ? styles.btnActive : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Configurações"
      >
        <GearIcon />
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.header}>
              <span className={styles.title}>Configurações</span>
              <div className={styles.headerActions}>
                <button className={styles.resetAll} onClick={resetAll}>Reset</button>
                <button className={styles.close} onClick={() => setOpen(false)}>×</button>
              </div>
            </div>
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
          </div>
        </>
      )}
    </>
  );
}
