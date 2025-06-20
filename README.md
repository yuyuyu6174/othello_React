# othello_React

React + TypeScript + Vite で構築されたオセロ（リバーシ）ゲームです。
CPU対戦、2人対戦、オンライン対戦に対応しています。

## 主な機能

- プレイヤー同士の2人対戦
- 複数レベルのCPUと対戦可能
- プレイヤーの色（黒／白／ランダム）選択機能
- CPUの思考をWeb Workerで非同期処理
- CPUの思考遅延時間の調整が可能
- 再戦機能あり
- オンライン対戦

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
```

オンライン対戦機能では公開 WebSocket サーバー
`wss://othello-server-11z5.onrender.com/othello` を利用します。
接続先は環境変数 `VITE_ONLINE_SERVER_URL` で上書き可能です（例: `ws://localhost:10000/othello`）。
同梱のサーバーを利用する場合は `npm run server` で起動し、
`VITE_ONLINE_SERVER_URL=ws://localhost:8080/othello` を設定してください。
