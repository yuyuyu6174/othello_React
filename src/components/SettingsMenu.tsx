import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/useSettings';
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
      <button id="menu-btn" onClick={toggle}>{open ? '✕' : '≡'}</button>
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
          {t('darkMode')}:
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </label>
      </div>
    </>
  );
};

export default SettingsMenu;
