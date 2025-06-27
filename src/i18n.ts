import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ja: {
    translation: {
      title: 'オセロ',
      selectMode: 'モードを選択してください',
      cpuMatch: 'CPU対戦',
      cpuVsCpu: 'CPU vs CPU',
      twoPlayers: '2人対戦',
      onlineMatch: 'オンライン対戦',
      buildTime: 'ビルド日時',
      back: '戻る',
      start: '開始',
      language: '言語',
      playerName: 'プレイヤー名',
      theme: 'テーマ',
      light: 'ライト',
      dark: 'ダーク',
      system: 'システム',
      darkMode: 'ダークモード',
      resume: '再戦する',
      giveup: '降参',
      stop: '中止',
    },
  },
  en: {
    translation: {
      title: 'Othello',
      selectMode: 'Select Mode',
      cpuMatch: 'CPU Match',
      cpuVsCpu: 'CPU vs CPU',
      twoPlayers: '2 Players',
      onlineMatch: 'Online Match',
      buildTime: 'Build Time',
      back: 'Back',
      start: 'Start',
      language: 'Language',
      playerName: 'Player Name',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      darkMode: 'Dark Mode',
      resume: 'Play Again',
      giveup: 'Give Up',
      stop: 'Stop',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ja',
  fallbackLng: 'ja',
  interpolation: { escapeValue: false },
});

export default i18n;
