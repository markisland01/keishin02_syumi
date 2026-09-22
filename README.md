# 経審シミュレーター

## 今回の更新をReplitに反映する

更新は `master` ブランチへ統合します。Replit側に未コミットの編集がある場合は、先にGitツールでコミットして保存してください。

1. ReplitのShellで次を順番に実行します。途中でエラーが出たら、後続を実行せず内容を確認してください。

   ```sh
   git fetch origin
   git switch master
   git pull --ff-only origin master
   npm ci
   npm test
   npm run build
   ```

2. Runを再起動し、グラフ固定、1〜10年の切替、4つの入力タブ、「現在」だけのPDF取込を確認します。操作マニュアルはグラフ下のリンク、または `/manual.html` で開けます。
3. OCRを使う場合は、Secretsと公開環境の設定に `GEMINI_API_KEY` があることを確認します。登録済みなら同じキーを使えます。
4. Publishingで公開設定を確認して再公開します。公開タイプは **Autoscale**、ビルドは `npm run build`、起動は `npm start`、ポートは `5173` です。Node.js 22を使用します。設定は `.replit` にも記載しています。
5. 公開URLを再読み込みし、グラフと操作マニュアルを確認します。Gitからの取得やRunの再起動だけでは公開済みアプリは更新されません。

同じ公開URLを使い続けると、ブラウザーに保存している入力を引き続き利用できます。ローカルのプレビュー入力はReplitへ転送されません。

参考：[ReplitのGit操作](https://docs.replit.com/features/workspace-tools/git-interface)、[公開方式](https://docs.replit.com/features/publishing/deployment-types)、[Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets)。

## ReplitでGemini OCRを設定する

1. Replitの **Secrets → New Secret** を開きます。
2. Keyに `GEMINI_API_KEY`、ValueにGeminiのAPIキーを入力して保存します。
3. アプリを再起動します。開発時の実行コマンドは `npm run dev` です。
4. 建設工事の種別を選び、経審PDFを取り込みます。文字抽出で読み取れない場合、自動でGemini OCRを利用します。

APIキーはサーバーの環境変数から読み込みます。画面への入力は不要です。`VITE_` を付けた環境変数には登録しないでください（ブラウザへ公開されるため）。OCR時はPDFから作成したページ画像をサーバー経由でGeminiに送信します。

公開は **Autoscale** または **Reserved VM** を使用してください。ビルドコマンドは `npm run build`、起動コマンドは `npm start` です。公開環境にも `GEMINI_API_KEY` が設定されていることを確認して再公開してください。Static Deploymentではサーバー側のOCRを実行できません。

キー未設定でも文字を抽出できるPDFは取り込めます。OCRが必要なPDFでは、設定を促すメッセージが表示されます。

参考: [Replit Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets)、[Viteの環境変数](https://vite.dev/guide/env-and-mode)

## ローカル開発

Node.js 22以降を使用します。`npm install` を実行し、`.env.example` を `.env` にコピーして `GEMINI_API_KEY` を設定した後、`npm run dev` を実行します。`.env` はGitの対象外です。

検証: `npm test`、`npm run build`。

## 詳細計算・PDF実績照合

新しいデータは右側の入力エリアの「財務の詳細計算と実績照合」に当期・前期の原票値を入力します。表示単位を変えても金額は維持されます。X2用の自己資本とY用の当期純資産は別管理です。空欄は未入力として扱い、不足時は詳細Y・Pを算定しません。

PDFは業種を指定して取り込み、確認画面で会社・期・単位・数値を原本と照合してから反映します。通知書の評点は比較用に保存され、W等を自動上書きしません。申請日が不明な資料のW・Pは正式な一致率から除外します。

各期CFの直接入力、2期平均CFの入力、残高増減からのCF計算に対応します。簡易CF・簡易Y・将来コピーは参考推計です。新しい詳細計算の財務値は入札や売上スライダーから自動生成されません。

旧保存データは旧方式を保持します。「新しい詳細計算へ切替」を選び、不足する原票値を補完してください。保存形式は2で、更新前データのバックアップをブラウザ内に保持します。

実PDFによる確認結果と対象範囲：[検証レポート](docs/accuracy-validation-results.md)。
