import { useState } from 'react';
import App from '../App';
import './FirstVisitGuide.css';

// Kept separate from simulation/scenario storage so resetting inputs does not
// require the user to acknowledge the guide again. Completion is browser-local.
const GUIDE_KEY = 'keishin-manual-confirmed-v1';

function hasConfirmedGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) === 'confirmed';
  } catch {
    return false;
  }
}

export default function FirstVisitGuide() {
  const [confirmed, setConfirmed] = useState(hasConfirmedGuide);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  function start() {
    try {
      localStorage.setItem(GUIDE_KEY, 'confirmed');
    } catch {
      setStorageFailed(true);
    }
    setJustConfirmed(true);
    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <>
        {storageFailed && (
          <p role="status" className="first-visit-storage-notice">
            確認履歴をこのブラウザーに保存できませんでした。このまま利用できますが、次回も案内が表示されます。
          </p>
        )}
        <App initialShowSettings={justConfirmed} />
      </>
    );
  }

  return (
    <main className="first-visit">
      <header className="first-visit-header">経審スコアシミュレーター</header>
      <section className="first-visit-paper" aria-labelledby="first-visit-title">
        <p className="first-visit-eyebrow">はじめてご利用の方へ</p>
        <h1 id="first-visit-title">まずは、使い方を確認しましょう。</h1>
        <p>会社の現在の点数を知り、目標までの計画を立てるために。<br />入力を始める前に、3つのポイントをご確認ください。</p>
        <ol className="first-visit-points">
          <li><h2>最初に「初期設定」から</h2><p>目標年数・必要P点・売上成長率を設定します。まずは手動入力で、現在の実績を入力しましょう。</p></li>
          <li><h2>金額は、各入力欄の単位を確認</h2><p>「万円」などの表示に合わせて入力します。完成工事高・元請完成工事高・売上高は、それぞれ別の項目です。</p></li>
          <li><h2>表示される点数は、計画のための試算</h2><p>実際の経審評点は審査機関の算定によります。試算結果と正式な審査結果は区別してご利用ください。</p></li>
        </ol>
        <details>
          <summary>最初のシミュレーションの手順を見る</summary>
          <ol>
            <li>「初期設定」で目標年数と必要P点を決める。</li>
            <li>「現在」を選び、会社の実績に数値を置き換える。</li>
            <li>各年の計画を入力し、点数の変化を比較する。</li>
            <li>比較したい条件はシナリオとして保存する。</li>
          </ol>
        </details>
        <a className="first-visit-manual" href={`${import.meta.env.BASE_URL}manual.html`} target="_blank" rel="noopener noreferrer">
          画像付きの操作マニュアルを読む（新しいタブ）
        </a>
        <footer className="first-visit-footer">
          <p>この確認は、このブラウザーで初回のみです。<br />あとから「操作マニュアル」で見返せます。</p>
          <button type="button" onClick={start}>確認して利用を開始 →</button>
        </footer>
      </section>
    </main>
  );
}
