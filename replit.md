# Keishin Score Simulator（経審スコアシミュレーター）

## Project Overview

React + Vite の経審スコアシミュレーターです。ログイン、年別入力、P点グラフ、PDF取込、詳細財務計算、シナリオ保存をブラウザー上で行います。

## Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite 5
- **Charting:** Recharts 2
- **Language:** JavaScript (JSX)
- **Package Manager:** npm

## Score Formula

P = 0.25×X1 + 0.15×X2 + 0.20×Y + 0.25×Z + 0.15×W

- **X1** – 完成工事高
- **X2** – 自己資本・利益
- **Y** – 経営状況（簡易4指標または詳細8指標）
- **Z** – 技術力（技術職員、元請完成工事高）
- **W** – 社会性等

## Static Deployment

このプロジェクトは Replit の **Static** 公開です。

- Build: `npm ci && npm run build`
- Publish directory: `dist`
- `npm start` は使わない
- Autoscale には公開しない

既存のReplitログイン環境変数 `VITE_LOGIN_ID` / `VITE_LOGIN_PASSWORD` は公開ビルドで使用するため、値を変更したら再ビルド・再公開します。

## External OCR Server

画像PDFのOCRだけは、別プロジェクトの既存サーバーを使います。

- Server: `https://ai-interview.replit.app`
- Endpoint: `https://ai-interview.replit.app/api/keishin-ocr`
- Allowed origin: `https://keishin-02-syumi.replit.app`

OCRサーバー側：

- `GEMINI_API_KEY`：AI面接サーバーの既存Secrets
- `KEISHIN_OCR_ACCESS_TOKEN`：管理者が決めたOCR利用コード
- `KEISHIN_OCR_ALLOWED_ORIGINS=https://keishin-02-syumi.replit.app`

Gemini APIキーはStaticアプリやブラウザーへ渡しません。Static側のPDF取込画面ではOCRサーバーURLとOCR利用コードを入力します。利用コードはブラウザーセッションだけに保持し、シナリオへ保存しません。

## Recovery From a Merge Conflict

バックアップはリモートにある前提です。Replit側にマージ中の状態が残っているときは、Shellで次を順番に実行します。

```sh
git merge --abort &&
git fetch origin &&
git switch master &&
git pull --ff-only origin master &&
npm ci &&
npm test &&
npm run build
```

最終 master マージコミットが反映されたことを確認してから、Static / `dist` を再公開します。

## Development

```sh
npm ci
npm run dev
npm test
npm run build
```

## Project Structure

```
src/
  main.jsx
  App.jsx
  components/
    Login.jsx
    PScoreChart.jsx
    YearPanel.jsx
    KeishinPdfImport.jsx
    AccuracyPanel.jsx
  utils/
    calculations.js
    financialCalculations.js
    accuracyState.js
    keishinPdfParser.js
    geminiOcrClient.mjs
public/
  manual.html
  manual-images/
```
