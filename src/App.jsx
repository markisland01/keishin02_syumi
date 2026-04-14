import { useState, useMemo } from 'react';
import {
  calcAllScores, createDefaultYears,
  getRank, RANK_THRESHOLDS,
} from './utils/calculations';
import PScoreChart from './components/PScoreChart';
import YearPanel from './components/YearPanel';

const RANK_COLORS = { A: '#43A047', B: '#1E88E5', C: '#FB8C00', D: '#E53935' };
const YEAR_OPTIONS = [1, 2, 3, 4, 5, 7, 10];
const GROWTH_OPTIONS = [
  { value: 1.0,  label: '成長率なし（0%）' },
  { value: 1.05, label: '+5%/年' },
  { value: 1.10, label: '+10%/年' },
  { value: 1.15, label: '+15%/年' },
  { value: 1.20, label: '+20%/年' },
  { value: 1.30, label: '+30%/年' },
  { value: 1.50, label: '+50%/年' },
  { value: 1.75, label: '+75%/年' },
  { value: 2.00, label: '+100%/年' },
  { value: 2.50, label: '+150%/年' },
  { value: 3.00, label: '+200%/年' },
];

function RankBadge({ rank, size = 'md' }) {
  const sz = size === 'lg'
    ? { fontSize: 20, padding: '3px 14px' }
    : { fontSize: 13, padding: '2px 9px' };
  return (
    <span style={{
      ...sz, fontWeight: 'bold', borderRadius: 5,
      color: 'white', background: RANK_COLORS[rank],
    }}>{rank}</span>
  );
}

// 設定ラベル共通スタイル
function SettingLabel({ children }) {
  return (
    <div style={{ fontSize: 11, color: '#666', fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 }}>
      {children}
    </div>
  );
}

export default function App() {
  const [n, setN] = useState(2);
  const [targetRank, setTargetRank] = useState('C');
  const [targetP, setTargetP] = useState(RANK_THRESHOLDS['C']);   // 数値直接入力可
  const [activeYear, setActiveYear] = useState(0);
  const [years, setYears] = useState(() => createDefaultYears(2));
  const [revenueGrowthRate, setRevenueGrowthRate] = useState(1.0);
  const [yModel, setYModel] = useState('simple'); // 'simple' | 'full'

  const scores = useMemo(() => calcAllScores(years, yModel), [years, yModel]);
  const currentScore = scores[0];
  const latestScore = scores[scores.length - 1];
  const targetMet = latestScore.p >= targetP;
  const gap = targetP - latestScore.p;

  // 目標ランク変更 → 対応P点を自動セット
  function handleTargetRankChange(rank) {
    setTargetRank(rank);
    setTargetP(RANK_THRESHOLDS[rank]);
  }

  // P点直接入力 → ランク表示も追随
  function handleTargetPChange(val) {
    const p = parseInt(val, 10);
    if (!isNaN(p) && p >= 0 && p <= 2000) {
      setTargetP(p);
      // 対応するランクに更新（標準閾値ベース）
      if (p >= RANK_THRESHOLDS.A) setTargetRank('A');
      else if (p >= RANK_THRESHOLDS.B) setTargetRank('B');
      else setTargetRank('C');
    }
  }

  // 成長率適用：落札率・平均落札金額は固定。
  // 在宅スタッフ数 × 1名あたり月間入札数 を rate^i 倍にして配分。
  // さらに、売上増に伴い自己資本・平均利益も連動成長（X2・Y点が売上に反応するように）。
  function applyGrowthRate(rate, currentYears) {
    const base = currentYears[0];
    const baseTotal = base.staff * base.bidsPerStaff;
    return currentYears.map((y, i) => {
      if (i === 0) return y;
      const mult = Math.pow(rate, i);
      const targetTotal = baseTotal * mult;
      // staff は sqrt 配分で 1〜10 にクランプ
      const rawStaff = base.staff * Math.sqrt(mult);
      const newStaff = Math.min(10, Math.max(1, Math.round(rawStaff)));
      // bidsPerStaff は target / staff を 0.5 刻みで 1〜20 にクランプ
      const rawBps = targetTotal / newStaff;
      const newBps = Math.min(20, Math.max(1, Math.round(rawBps * 2) / 2));
      // 平均利益は売上と同比率で成長（利益率一定の仮定）
      const newAvgProfit = Math.round(base.avgProfit * mult);
      // 自己資本は内部留保で緩やかに成長（売上倍率の平方根 ≈ 穏やかな追従）
      const newEquity = Math.round(base.equity * Math.sqrt(mult));
      // 詳細版用: 固定資産・営業CF・利益剰余金も連動
      const newFixedAssets = Math.round(base.fixedAssets * Math.sqrt(mult)); // 自己資本と同じ穏やかな追従
      const newOperatingCF = Math.round(base.operatingCF * mult);            // 売上と同倍率
      const newRetainedEarnings = Math.round(base.retainedEarnings * Math.sqrt(mult));
      return {
        ...y,
        staff: newStaff,
        bidsPerStaff: newBps,
        avgProfit: newAvgProfit,
        equity: newEquity,
        fixedAssets: newFixedAssets,
        operatingCF: newOperatingCF,
        retainedEarnings: newRetainedEarnings,
      };
    });
  }

  function handleGrowthRateChange(rate) {
    setRevenueGrowthRate(rate);
    setYears(prev => applyGrowthRate(rate, prev));
  }

  // N年数変更
  function handleNChange(newN) {
    setN(newN);
    setYears(prev => {
      let next;
      if (newN + 1 > prev.length) {
        const base = prev[0];
        const extra = Array.from({ length: newN + 1 - prev.length }, () => ({
          ...base, wItems: { ...base.wItems },
        }));
        next = [...prev, ...extra];
      } else {
        next = prev.slice(0, newN + 1);
      }
      return revenueGrowthRate !== 1.0 ? applyGrowthRate(revenueGrowthRate, next) : next;
    });
    if (activeYear > newN) setActiveYear(newN);
  }

  function handleSliderChange(yearIdx, key, value) {
    setYears(prev => prev.map((y, i) => i === yearIdx ? { ...y, [key]: value } : y));
  }

  function handleWItemChange(yearIdx, key, value) {
    setYears(prev =>
      prev.map((y, i) => i === yearIdx ? { ...y, wItems: { ...y.wItems, [key]: value } } : y)
    );
  }

  // targetP に対応するランク名（カスタム値の場合も表示用）
  const targetRankLabel = targetP >= RANK_THRESHOLDS.A ? 'A'
    : targetP >= RANK_THRESHOLDS.B ? 'B'
    : targetP >= RANK_THRESHOLDS.C ? 'C' : 'D';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 14, background: '#f0f2f8', minHeight: '100vh' }}>

      {/* ヘッダー：タイトルのみ */}
      <div style={{
        background: 'linear-gradient(135deg, #1a237e, #283593)',
        color: 'white', borderRadius: '10px 10px 0 0',
        padding: '14px 22px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <h1 style={{ fontSize: 19, fontWeight: 'bold', letterSpacing: 1 }}>
          経審スコアシミュレーター
        </h1>
        <p style={{ fontSize: 11, marginTop: 3, opacity: 0.7 }}>
          建設業 経営事項審査 P点 将来シミュレーション
        </p>
      </div>

      {/* ── 設定項目 ── */}
      <div style={{
        background: '#e8eaf6',
        border: '1.5px solid #9fa8da',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        padding: '14px 20px 16px',
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 'bold', color: '#3949ab',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ⚙ 設定項目
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* 目標年数 */}
          <div>
            <SettingLabel>目標年数</SettingLabel>
            <select
              value={n}
              onChange={e => handleNChange(Number(e.target.value))}
              style={selectStyle}
            >
              {YEAR_OPTIONS.map(v => <option key={v} value={v}>{v}年後</option>)}
            </select>
          </div>

          {/* 目標ランク ＋ P点直接入力 */}
          <div>
            <SettingLabel>目標ランク / 必要P点</SettingLabel>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={targetRank}
                onChange={e => handleTargetRankChange(e.target.value)}
                style={{ ...selectStyle, flex: '0 0 auto', width: 100 }}
              >
                {['C', 'B', 'A'].map(r => (
                  <option key={r} value={r}>{r}ランク</option>
                ))}
              </select>
              <input
                type="number"
                value={targetP}
                min={300} max={2000} step={10}
                onChange={e => handleTargetPChange(e.target.value)}
                style={{
                  ...selectStyle, flex: 1, width: 0,
                  textAlign: 'center', fontWeight: 'bold',
                  color: RANK_COLORS[targetRankLabel],
                }}
              />
              <span style={{ fontSize: 12, color: '#555', flexShrink: 0 }}>点</span>
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
              ランク選択で自動入力・数値は直接変更可
            </div>
          </div>

          {/* 売上成長率 */}
          <div>
            <SettingLabel>売上成長率（年）</SettingLabel>
            <select
              value={revenueGrowthRate}
              onChange={e => handleGrowthRateChange(parseFloat(e.target.value))}
              style={selectStyle}
            >
              {GROWTH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {revenueGrowthRate !== 1.0 && years[n] && (
              <div style={{ fontSize: 10, color: '#3949ab', marginTop: 4 }}>
                {n}年後：在宅{years[n].staff}名 × {years[n].bidsPerStaff.toFixed(1)}件/名
                ＝ {Math.round(years[n].staff * years[n].bidsPerStaff)}件/月
              </div>
            )}
          </div>

        </div>

        {/* Y点計算モデル切替 */}
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '1px dashed #9fa8da',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <SettingLabel>Y点計算モデル</SettingLabel>
          <label style={{
            fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6,
            background: yModel === 'simple' ? '#3949ab' : 'white',
            color: yModel === 'simple' ? 'white' : '#555',
            border: '1px solid #9fa8da',
          }}>
            <input
              type="radio"
              name="yModel"
              value="simple"
              checked={yModel === 'simple'}
              onChange={() => setYModel('simple')}
              style={{ margin: 0 }}
            />
            簡易（4指標）
          </label>
          <label style={{
            fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6,
            background: yModel === 'full' ? '#3949ab' : 'white',
            color: yModel === 'full' ? 'white' : '#555',
            border: '1px solid #9fa8da',
          }}>
            <input
              type="radio"
              name="yModel"
              value="full"
              checked={yModel === 'full'}
              onChange={() => setYModel('full')}
              style={{ margin: 0 }}
            />
            詳細（実経審8指標）
          </label>
          <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>
            {yModel === 'simple'
              ? '※ 自己資本比率・利益率・利息比率・負債回転期間の4指標'
              : '※ 実経審8指標近似（Y = 167.3×A + 583）'}
          </span>
        </div>
      </div>

      {/* ステータスバー */}
      <div style={{
        background: 'white', borderRadius: 10, padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 20,
        marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>現在</span>
          <RankBadge rank={currentScore.rank} size="lg" />
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{currentScore.p}点</span>
        </div>
        <span style={{ fontSize: 22, color: '#bbb' }}>→</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>{n}年後</span>
          <RankBadge rank={latestScore.rank} size="lg" />
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{latestScore.p}点</span>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: targetMet ? '#E8F5E9' : '#FFF3E0',
          color: targetMet ? '#2E7D32' : '#E65100',
          borderRadius: 20, padding: '7px 18px',
          fontWeight: 'bold', fontSize: 14,
        }}>
          {targetMet
            ? `✓ 目標（${targetP}点）達成！`
            : `目標 ${targetP}点まで あと ${gap}点`
          }
        </div>
      </div>

      {/* グラフ */}
      <PScoreChart scores={scores} n={n} targetRank={targetRank} targetP={targetP} />

      {/* 年度タブ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
        {scores.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveYear(i)}
            style={{
              flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontSize: 13,
              background: activeYear === i ? 'white' : '#dde1ee',
              fontWeight: activeYear === i ? 'bold' : 'normal',
              boxShadow: activeYear === i ? '0 -1px 4px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'background 0.15s',
            }}
          >
            <span>{i === 0 ? '現在' : `${i}年後`}</span>
            <RankBadge rank={s.rank} />
            <span style={{ fontSize: 11, color: '#666' }}>{s.p}点</span>
          </button>
        ))}
      </div>

      {/* スライダーパネル */}
      <div style={{
        background: 'white', borderRadius: '0 0 10px 10px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden',
        marginBottom: 20,
      }}>
        <YearPanel
          yearData={years[activeYear]}
          score={scores[activeYear]}
          yModel={yModel}
          onSliderChange={(key, val) => handleSliderChange(activeYear, key, val)}
          onWItemChange={(key, val) => handleWItemChange(activeYear, key, val)}
        />
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', paddingBottom: 16 }}>
        ※ 計算式は簡易近似です。実際の経審評点は審査機関の算定によります。
      </p>
    </div>
  );
}

// 共通セレクト・インプットスタイル
const selectStyle = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '1px solid #c5cae9', background: 'white',
  fontSize: 13, color: '#333', cursor: 'pointer',
};
