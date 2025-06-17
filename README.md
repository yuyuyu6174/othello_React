# othello_React

React + TypeScript + Vite で構築されたオセロ（リバーシ）ゲームです。  
CPU対戦、2人対戦、今後はオンライン対戦も予定されています。

## 主な機能

- プレイヤー同士の2人対戦
- 複数レベルのCPUと対戦可能
- プレイヤーの色（黒／白／ランダム）選択機能
- CPUの思考をWeb Workerで非同期処理
- CPUの思考遅延時間の調整が可能
- 再戦機能あり

## デモページ

GitHub Pages にて公開中  
[https://yuyuyu6174.github.io/othello_React](https://yuyuyu6174.github.io/othello_React)

## 使用技術

- React（Hooks）
- TypeScript
- Vite
- Web Worker（CPU処理用）
- CSS

## 開発環境の構築

```bash
git clone https://github.com/yuyuyu6174/othello_React.git
cd othello_React
npm install
npm run dev
