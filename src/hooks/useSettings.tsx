import { createContext, useContext, useEffect, useState, type FC } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  language: 'ja' | 'en';
  playerName: string;
  theme: ThemeMode;
  setLanguage: (lang: 'ja' | 'en') => void;
  setPlayerName: (name: string) => void;
  setTheme: (theme: ThemeMode) => void;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);
const STORAGE_KEY = 'othello_settings';

export const SettingsProvider: FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<'ja' | 'en'>('ja');
  const [playerName, setPlayerName] = useState('Player');
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.language) setLanguage(data.language);
        if (data.playerName) setPlayerName(data.playerName);
        if (data.theme) setTheme(data.theme);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ language, playerName, theme }));
  }, [language, playerName, theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const actual = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
      document.body.dataset.theme = actual;
    };
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => theme === 'system' && applyTheme();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <SettingsContext.Provider value={{ language, playerName, theme, setLanguage, setPlayerName, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('SettingsProvider missing');
  return ctx;
};
