import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { SettingsProvider } from './hooks/useSettings';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </I18nextProvider>
  </React.StrictMode>
);
