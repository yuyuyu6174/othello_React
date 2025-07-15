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
      on: 'オン',
      off: 'オフ',
      darkMode: 'ダークモード',
      resume: '再戦する',
      giveup: '降参',
      stop: '中止',
      cpuMatchSettings: 'CPU対戦設定',
      cpuLevel: 'CPUレベル',
      yourColor: 'あなたの色',
      blackFirst: '黒（先手）',
      whiteSecond: '白（後手）',
      random: 'ランダム',
      cpuVsCpuSettings: 'CPU vs CPU 設定',
      cpu1Level: 'CPU1 レベル',
      cpu2Level: 'CPU2 レベル',
      cpu1Color: 'CPU1の色',
      delayMs: '待ち時間(ms)',
      matches: '対戦回数',
      results: '結果',
      downloadResults: '結果をダウンロード',
      confirmDownload: '結果をダウンロードしますか？',
      playAnyone: '誰とでも対戦',
      passcode: '合言葉',
      matchWithPasscode: '合言葉で対戦',
      matching: 'マッチング中...',
      waitingOpponent: '対戦相手を待っています',
      blackTurn: '黒の番です',
      whiteTurn: '白の番です',
      matchStart: '対戦開始',
      yourTurn: 'あなたの番です',
      opponentTurn: '相手の番です',
      youLoseSurrender: 'あなたの負け (降参)',
      opponentSurrendered: '相手が降参しました あなたの勝ち！',
      gameOver: 'ゲーム終了！ 黒:{{black}} 白:{{white}} → {{result}}',
      draw: '引き分け',
      blackWin: '黒の勝ち！',
      whiteWin: '白の勝ち！',
      cannotMove: '{{color}}は打てません。パス！',
      cpuThinking: 'CPU思考中...',
      vsCpu: 'VS CPU（{{name}}）',
      cpuVsCpuProgress: 'CPU vs CPU {{current}}/{{total}}（{{name1}} vs {{name2}}）',
      cpuVsCpuSummary: `CPU対CPU対戦結果（{{games}}戦）  {{date}}
{{cpuNames}}
AI1（{{color1}}）: {{name1}}
AI2（{{color2}}）: {{name2}}

勝敗: 黒 {{blackWins}}勝 / 白 {{whiteWins}}勝
平均黒スコア: {{avgBlackScore}} / 平均白スコア: {{avgWhiteScore}}
黒の平均応答時間: {{avgBlackTime}}ms
白の平均応答時間: {{avgWhiteTime}}ms
平均ターン数: {{avgTurns}}
黒の勝率: {{blackRate}}%`,
      score: '黒:{{black}} 白:{{white}}',
      black: '黒',
      white: '白',
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
      on: 'On',
      off: 'Off',
      darkMode: 'Dark Mode',
      resume: 'Play Again',
      giveup: 'Give Up',
      stop: 'Stop',
      cpuMatchSettings: 'CPU Match Settings',
      cpuLevel: 'CPU Level',
      yourColor: 'Your Color',
      blackFirst: 'Black (First)',
      whiteSecond: 'White (Second)',
      random: 'Random',
      cpuVsCpuSettings: 'CPU vs CPU Settings',
      cpu1Level: 'CPU1 Level',
      cpu2Level: 'CPU2 Level',
      cpu1Color: 'CPU1 Color',
      delayMs: 'Delay (ms)',
      matches: 'Matches',
      results: 'Results',
      downloadResults: 'Download Results',
      confirmDownload: 'Download the results?',
      playAnyone: 'Play Anyone',
      passcode: 'Passcode',
      matchWithPasscode: 'Play with Passcode',
      matching: 'Matching...',
      waitingOpponent: 'Waiting for opponent',
      blackTurn: "Black's turn",
      whiteTurn: "White's turn",
      matchStart: 'Match Start',
      yourTurn: 'Your turn',
      opponentTurn: "Opponent's turn",
      youLoseSurrender: 'You lose (surrender)',
      opponentSurrendered: 'Opponent surrendered. You win!',
      gameOver: 'Game over! Black:{{black}} White:{{white}} → {{result}}',
      draw: 'Draw',
      blackWin: 'Black wins!',
      whiteWin: 'White wins!',
      cannotMove: '{{color}} has no moves. Pass!',
      cpuThinking: 'CPU thinking...',
      vsCpu: 'VS CPU ({{name}})',
      cpuVsCpuProgress: 'CPU vs CPU {{current}}/{{total}} ({{name1}} vs {{name2}})',
      cpuVsCpuSummary: `CPU vs CPU Results ({{games}} games)  {{date}}
{{cpuNames}}
AI1 ({{color1}}): {{name1}}
AI2 ({{color2}}): {{name2}}

Wins: Black {{blackWins}} / White {{whiteWins}}
Avg Black Score: {{avgBlackScore}} / Avg White Score: {{avgWhiteScore}}
Avg Black Response: {{avgBlackTime}}ms
Avg White Response: {{avgWhiteTime}}ms
Avg Turns: {{avgTurns}}
Black Win Rate: {{blackRate}}%`,
      score: 'Black:{{black}} White:{{white}}',
      black: 'Black',
      white: 'White',
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
