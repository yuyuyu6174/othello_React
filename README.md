# othello_React

React + TypeScript + Vite で構築されたオセロ（リバーシ）ゲームです。
CPU対戦、2人対戦、オンライン対戦に対応しています。

## 主な機能

- プレイヤー同士の2人対戦
- 複数レベルのCPUと対戦可能
- プレイヤーの色（黒／白／ランダム）選択機能
- CPUの思考をWeb Workerで非同期処理
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

オンライン対戦機能では Colyseus サーバー
`wss://othello-server-11z5.onrender.com` を利用します。
接続先は環境変数 `VITE_ONLINE_SERVER_URL` で上書き可能です（例: `ws://localhost:2567`）。

### ビルド日時の表示

タイトル画面の下部に、アプリをビルドした日時が表示されます。Vite の `define` オプションで注入された `__BUILD_TIME__` 定数を利用しています。
