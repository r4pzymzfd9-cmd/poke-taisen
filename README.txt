ポケチャン計算・選出  PWA（個人用）
=====================================

■ 中身
  index.html            アプリ本体
  app.js                React込みの本体スクリプト（ビルド不要・オフライン動作）
  manifest.webmanifest  アプリ情報
  sw.js                 オフラインキャッシュ
  icon-192.png / 512    アイコン
  champions-calc.jsx    元のソース（データ追加・改造用）

■ 使うための前提
  PWA（ホーム画面にインストール）は「HTTPS」または「localhost」で開く必要があります。
  file:// で直接開くとインストール/オフラインは効きません（表示だけは可）。

■ 一番かんたん：スマホに入れる（GitHub Pages・無料HTTPS）
  1. GitHub で新規リポジトリを作成
  2. このフォルダの中身を全部アップロード
  3. Settings → Pages → Branch を main / (root) にして保存
  4. 数分後に出る https://ユーザー名.github.io/リポジトリ名/ を
     スマホのSafari/Chromeで開く
  5. 共有メニュー →「ホーム画面に追加」でインストール完了

■ PCで試す（localhost）
  このフォルダで以下のどれかを実行し、表示されたURLを開く：
    python3 -m http.server 8080     → http://localhost:8080
    npx serve                        → 表示されるURL
  Chromeならアドレスバー右のインストールアイコンから追加できます。

■ 改造したいとき
  データ（ポケモン・技・メガ）は champions-calc.jsx の上部にあります。
  編集後に app.js を作り直すには（Node環境）：
    npx esbuild main.jsx --bundle --minify --format=iife --outfile=app.js
  ※ main.jsx は「import App from './champions-calc.jsx'」で mount する数行の入口です。

■ 注意
  個人利用向けです。データは種族値等のゲーム事実のみを内蔵しています。
