# 経審シミュレーター

## 公開とデプロイ

このプロジェクトは Replit の **Static** 公開を使います。アプリはビルド済みの `dist` を配信します。

```sh
npm ci
npm run build
```

Publishing の公開方式は **Static**、公開ディレクトリーは `dist` にします。Static公開では `npm start` や Autoscale の設定は使いません。OCRサーバーはこのプロジェクトとは別の既存サーバーで稼働します。

既存のReplitログイン画面と、公開ビルドで使う `VITE_LOGIN_ID` / `VITE_LOGIN_PASSWORD` は保持します。値を変更したときは再ビルドと再公開が必要です。

## マージ競合からの復旧

現在のReplit側でマージ中の状態が残っている場合は、バックアップがリモートにあることを確認したうえで、Shellで次を順に実行します。途中でエラーが出たら後続を実行しません。

```sh
git merge --abort &&
git fetch origin &&
git switch master &&
git pull --ff-only origin master &&
npm ci &&
npm test &&
npm run build
```

最終的な master のマージコミットが反映されるまで待ってから、Static / `dist` を再公開します。公開URLを再読み込みし、ログイン、初回案内、固定グラフ、1〜10年切替、PDF取込、操作マニュアルを確認します。Runの再起動だけではStatic公開中の画面は更新されません。

## OCRサーバー

画像PDFのOCRは、既存の別プロジェクト **https://ai-interview.replit.app** のAPIを使います。Staticアプリはサーバーを起動しません。接続先は次のエンドポイントです。

```
https://ai-interview.replit.app/api/keishin-ocr
```

OCRサーバー側のSecretsと環境変数：

- `GEMINI_API_KEY`：既存のAI面接サーバーのSecretsに設定済みのGemini APIキーを使います。Staticアプリやブラウザーへ公開しません。
- `KEISHIN_OCR_ACCESS_TOKEN`：管理者が決めたOCR利用コードです。PDF取込画面で利用者が入力するコードと一致させます。
- `KEISHIN_OCR_ALLOWED_ORIGINS`：`https://keishin-02-syumi.replit.app` を設定します。Static公開URLを変更したときだけ、許可元も更新します。

Staticアプリの「現在」→「PDF取込（現在のみ）」→「画像PDF用 OCRサーバー設定（任意）」で、OCRサーバーURLとOCR利用コードを設定します。コードは現在のブラウザーセッションだけで使われ、シナリオには保存されません。Gemini APIキーを画面へ入力する欄はありません。

文字PDFの読み取りはOCRサーバーなしで使えます。画像PDFでOCRを使うと、PDFのページ画像が指定サーバーを経由してGeminiへ送られます。OCRの結果はプレビューで修正・除外し、会社・期・業種・単位・読取値を原本と照合してから反映します。

## ログインの範囲

ReplitのID・パスワード画面とログインセッションを引き継いでいます。これはStatic画面内の簡易ログインです。`VITE_` の値は公開JavaScriptへ含まれるため、サーバー認証やOCR APIのアクセス制限にはなりません。OCR APIの保護は `KEISHIN_OCR_ACCESS_TOKEN` と許可オリジンの設定で行います。

## ローカル開発

Node.js 22以降を使用します。

```sh
npm ci
npm run dev
```

ローカルでは `VITE_LOGIN_ID` / `VITE_LOGIN_PASSWORD` をローカル用に設定します。OCR接続先を確認するときは、管理者から案内された完全なHTTPS URLを入力してください。

## 詳細計算・PDF実績照合

新しいデータは右側の入力エリアの「財務の詳細計算と実績照合」に当期・前期の原票値を入力します。表示単位を変えても金額は維持されます。空欄は未入力として扱い、不足時は詳細Y・Pを算定しません。

PDFは業種を指定して取り込み、確認画面で会社・期・単位・数値を原本と照合してから反映します。通知書の評点は比較用に保存され、W等を自動上書きしません。簡易CF・簡易Y・将来コピーは参考推計です。新しい詳細計算の財務値は入札や売上スライダーから自動生成されません。

検証結果と対象範囲：[検証レポート](docs/accuracy-validation-results.md)。

## 参照

- [ReplitのGit操作](https://docs.replit.com/features/workspace-tools/git-interface)
- [Static公開](https://docs.replit.com/features/publishing/deployment-types)
- [Replit Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets)
- [Viteの環境変数](https://vite.dev/guide/env-and-mode)
