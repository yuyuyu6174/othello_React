import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/useSettings';
import type { ThemeMode } from '../hooks/useSettings';
import '../style.css';

const SettingsMenu = () => {
  const { t, i18n } = useTranslation();
  const { language, setLanguage, playerName, setPlayerName, theme, setTheme } = useSettings();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);

  const changeLang = (lang: 'ja' | 'en') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <>
      <button id="menu-btn" onClick={toggle}>☰</button>
      <div id="menu" className={open ? 'open' : ''}>
        <label>
          {t('language')}:
          <select value={language} onChange={e => changeLang(e.target.value as 'ja' | 'en')}>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {t('playerName')}:
          <input value={playerName} onChange={e => setPlayerName(e.target.value)} />
        </label>
        <label>
          {t('theme')}:
          <select value={theme} onChange={e => setTheme(e.target.value as ThemeMode)}>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
            <option value="system">{t('system')}</option>
          </select>
        </label>
      </div>
    </>
  );
};

export default SettingsMenu;
