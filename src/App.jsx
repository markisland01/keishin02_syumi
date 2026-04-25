import { useEffect, useMemo, useState } from 'react';
import {
  calcAllScores,
  createDefaultYears,
  getRank,
  RANK_THRESHOLDS,
} from './utils/calculations';
import PScoreChart from './components/PScoreChart';
import YearPanel from './components/YearPanel';

const STORAGE_KEY = 'keishin-simulator-state-v1';
const STORAGE_VERSION = 1;
const SCENARIOS_KEY = 'keishin-scenarios-v1';
const ACTIVE_SCENARIO_KEY = 'keishin-active-scenario-v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, savedAt: new Date().toISOString(), data })
    );
    return true;
  } catch {
    return false;
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function loadScenarios() {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return {};
    return parsed.scenarios || {};
  } catch {
    return {};
  }
}

function saveScenariosToStorage(scenarios) {
  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify({ version: 1, scenarios }));
  } catch {
    // ignore
  }
}

function loadActiveScenarioId() {
  try {
    return localStorage.getItem(ACTIVE_SCENARIO_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveScenarioId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_SCENARIO_KEY, id);
    else localStorage.removeItem(ACTIVE_SCENARIO_KEY);
  } catch {
    // ignore
  }
}

function generateScenarioId() {
  return `scen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const RANK_COLORS = { A: '#43A047', B: '#1E88E5', C: '#FB8C00', D: '#E53935' };
const YEAR_OPTIONS = [1, 2, 3, 4, 5, 7, 10];
const GROWTH_OPTIONS = [
  { value: 1.0, label: '成長なし（0%）' },
  { value: 1.05, label: '+5%/年' },
  { value: 1.1, label: '+10%/年' },
  { value: 1.15, label: '+15%/年' },
  { value: 1.2, label: '+20%/年' },
  { value: 1.3, label: '+30%/年' },
  { value: 1.5, label: '+50%/年' },
  { value: 1.75, label: '+75%/年' },
  { value: 2.0, label: '+100%/年' },
  { value: 2.5, label: '+150%/年' },
  { value: 3.0, label: '+200%/年' },
];

function RankBadge({ rank, size = 'md' }) {
  const sz = size === 'lg'
    ? { fontSize: 20, padding: '3px 14px' }
    : { fontSize: 13, padding: '2px 9px' };

  return (
    <span
      style={{
        ...sz,
        fontWeight: 'bold',
        borderRadius: 5,
        color: 'white',
        background: RANK_COLORS[rank],
      }}
    >
      {rank}
    </span>
  );
}

function SettingLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: '#666',
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
}

function cloneWInput(wInput = {}) {
  return {
    welfare: { ...(wInput.welfare || {}) },
    continuity: { ...(wInput.continuity || {}) },
    accounting: { ...(wInput.accounting || {}) },
    research: { ...(wInput.research || {}) },
    machinery: { ...(wInput.machinery || {}) },
    certification: { ...(wInput.certification || {}) },
  };
}

function cloneZInput(zInput = {}) {
  return {
    level1WithCertificate: zInput.level1WithCertificate || 0,
    level1: zInput.level1 || 0,
    kanriAssistant: zInput.kanriAssistant || 0,
    coreSkill: zInput.coreSkill || 0,
    level2: zInput.level2 || 0,
    other: zInput.other || 0,
  };
}

function getBusinessYearsValue(value, yearOffset = 0) {
  return Math.max(0, Number(value || 0) + yearOffset);
}

const AUTO_BID_SYNC_KEYS = new Set([
  'industry',
  'staff',
  'bidsPerStaff',
  'constructionBidRatio',
  'winRate',
  'otherWinRate',
  'avgContractAmount',
  'constructionAvgContractAmount',
  'otherAvgContractAmount',
  'avgMethod',
  'motoukeSameAsKansei',
  'motoukeKoujidaka',
]);

function applyWInputValue(wInput, path, value, yearOffset = 0) {
  const nextWInput = cloneWInput(wInput);
  let target = nextWInput;

  for (let idx = 0; idx < path.length - 1; idx += 1) {
    target = target[path[idx]];
  }

  const leafKey = path[path.length - 1];
  const nextValue = path[0] === 'continuity' && leafKey === 'businessYears'
    ? getBusinessYearsValue(value, yearOffset)
    : value;

  target[leafKey] = nextValue;
  return nextWInput;
}

function cloneFutureYear(baseYear, yearOffset = 0) {
  const nextWInput = cloneWInput(baseYear.wInput);
  nextWInput.continuity = {
    ...(nextWInput.continuity || {}),
    businessYears: getBusinessYearsValue(baseYear.wInput?.continuity?.businessYears, yearOffset),
  };

  return {
    ...baseYear,
    zInput: cloneZInput(baseYear.zInput),
    wItems: { ...baseYear.wItems },
    wInput: nextWInput,
    wOverride: { ...(baseYear.wOverride || { enabled: false, value: 0 }) },
    avgRevenueOverride: { ...(baseYear.avgRevenueOverride || { enabled: false, completionRevenue: 0, principalRevenue: 0 }) },
    financialDoc: { ...(baseYear.financialDoc || {}) },
  };
}

function syncAutoBidYears(currentYears, baseYear, growthRate) {
  const baseTotal = baseYear.staff * baseYear.bidsPerStaff;

  return currentYears.map((year, index) => {
    if (index === 0) return baseYear;

    const mult = Math.pow(growthRate, index);
    const targetTotal = baseTotal * mult;
    const rawStaff = baseYear.staff * Math.sqrt(mult);
    const nextStaff = Math.min(10, Math.max(1, Math.round(rawStaff)));
    const rawBidsPerStaff = targetTotal / nextStaff;
    const nextBidsPerStaff = Math.min(20, Math.max(1, Math.round(rawBidsPerStaff * 2) / 2));

    return {
      ...year,
      industry: baseYear.industry,
      staff: nextStaff,
      bidsPerStaff: nextBidsPerStaff,
      constructionBidRatio: baseYear.constructionBidRatio,
      winRate: baseYear.winRate,
      otherWinRate: baseYear.otherWinRate ?? baseYear.winRate,
      avgContractAmount: baseYear.avgContractAmount,
      constructionAvgContractAmount: baseYear.constructionAvgContractAmount ?? baseYear.avgContractAmount,
      otherAvgContractAmount: baseYear.otherAvgContractAmount ?? baseYear.avgContractAmount,
      avgMethod: baseYear.avgMethod,
      motoukeSameAsKansei: baseYear.motoukeSameAsKansei,
      motoukeKoujidaka: baseYear.motoukeSameAsKansei === false
        ? Math.round(Number(baseYear.motoukeKoujidaka || 0) * mult)
        : year.motoukeKoujidaka,
    };
  });
}

export default function App() {
  const saved = useMemo(() => loadFromStorage(), []);
  const [n, setN] = useState(saved?.n ?? 2);
  const [targetRank, setTargetRank] = useState(saved?.targetRank ?? 'C');
  const [targetP, setTargetP] = useState(saved?.targetP ?? RANK_THRESHOLDS.C);
  const [activeYear, setActiveYear] = useState(0);
  const [years, setYears] = useState(() => saved?.years ?? createDefaultYears(2));
  const [revenueGrowthRate, setRevenueGrowthRate] = useState(saved?.revenueGrowthRate ?? 1.0);
  const [yModel, setYModel] = useState(saved?.yModel ?? 'simple');
  const [inputMode, setInputMode] = useState(saved?.inputMode ?? 'manual');
  const [savedAt, setSavedAt] = useState(saved ? new Date() : null);
  const [scenarios, setScenarios] = useState(() => loadScenarios());
  const [activeScenarioId, setActiveScenarioId] = useState(() => loadActiveScenarioId());

  useEffect(() => {
    const data = { n, targetRank, targetP, years, revenueGrowthRate, yModel, inputMode };
    saveToStorage(data);
    if (activeScenarioId) {
      setScenarios(prev => {
        const existing = prev[activeScenarioId];
        if (!existing) return prev;
        const updated = { ...existing, data, updatedAt: new Date().toISOString() };
        const next = { ...prev, [activeScenarioId]: updated };
        saveScenariosToStorage(next);
        return next;
      });
    }
    setSavedAt(new Date());
  }, [n, targetRank, targetP, years, revenueGrowthRate, yModel, inputMode, activeScenarioId]);

  useEffect(() => {
    saveActiveScenarioId(activeScenarioId);
  }, [activeScenarioId]);

  const scenarioList = useMemo(
    () => Object.values(scenarios).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [scenarios]
  );
  const activeScenario = activeScenarioId ? scenarios[activeScenarioId] : null;

  function applyScenarioData(data) {
    if (!data) return;
    setN(data.n ?? 2);
    setTargetRank(data.targetRank ?? 'C');
    setTargetP(data.targetP ?? RANK_THRESHOLDS.C);
    setYears(data.years ?? createDefaultYears(data.n ?? 2));
    setRevenueGrowthRate(data.revenueGrowthRate ?? 1.0);
    setYModel(data.yModel ?? 'simple');
    setInputMode(data.inputMode ?? 'manual');
    setActiveYear(0);
  }

  function handleSaveAsNewScenario() {
    const name = window.prompt(
      '新しいシナリオ名を入力してください',
      activeScenario?.name ? `${activeScenario.name} のコピー` : '無題のシナリオ'
    );
    if (!name || !name.trim()) return;
    const id = generateScenarioId();
    const now = new Date().toISOString();
    const data = { n, targetRank, targetP, years, revenueGrowthRate, yModel, inputMode };
    const newScenario = { id, name: name.trim(), createdAt: now, updatedAt: now, data };
    const next = { ...scenarios, [id]: newScenario };
    setScenarios(next);
    saveScenariosToStorage(next);
    setActiveScenarioId(id);
  }

  function handleLoadScenario(id) {
    if (!id) {
      setActiveScenarioId(null);
      return;
    }
    const target = scenarios[id];
    if (!target) return;
    if (activeScenarioId !== id) {
      const ok = window.confirm(
        `シナリオ「${target.name}」を読み込みます。\n現在の編集内容は${activeScenarioId ? '現在のシナリオに保存されてから' : '破棄されて'}切り替えます。`
      );
      if (!ok) return;
    }
    applyScenarioData(target.data);
    setActiveScenarioId(id);
  }

  function handleRenameScenario() {
    if (!activeScenario) return;
    const name = window.prompt('シナリオ名を変更', activeScenario.name);
    if (!name || !name.trim() || name === activeScenario.name) return;
    const updated = { ...activeScenario, name: name.trim(), updatedAt: new Date().toISOString() };
    const next = { ...scenarios, [activeScenario.id]: updated };
    setScenarios(next);
    saveScenariosToStorage(next);
  }

  function handleDeleteScenario() {
    if (!activeScenario) return;
    const ok = window.confirm(`シナリオ「${activeScenario.name}」を削除します。元に戻せません。よろしいですか？`);
    if (!ok) return;
    const next = { ...scenarios };
    delete next[activeScenario.id];
    setScenarios(next);
    saveScenariosToStorage(next);
    setActiveScenarioId(null);
  }

  function handleResetAll() {
    const ok = window.confirm(
      '現在の編集内容をリセットして初期状態に戻します。\n\n保存済みのシナリオは残ります。よろしいですか？'
    );
    if (!ok) return;
    clearStorage();
    setN(2);
    setTargetRank('C');
    setTargetP(RANK_THRESHOLDS.C);
    setActiveYear(0);
    setYears(createDefaultYears(2));
    setRevenueGrowthRate(1.0);
    setYModel('simple');
    setInputMode('manual');
    setActiveScenarioId(null);
    setSavedAt(null);
  }

  const scores = useMemo(
    () => calcAllScores(years, yModel, inputMode),
    [years, yModel, inputMode]
  );

  const currentScore = scores[0];
  const latestScore = scores[scores.length - 1];
  const targetMet = latestScore.p >= targetP;
  const gap = targetP - latestScore.p;

  function handleTargetRankChange(rank) {
    setTargetRank(rank);
    setTargetP(RANK_THRESHOLDS[rank]);
  }

  function handleTargetPChange(val) {
    const p = parseInt(val, 10);
    if (Number.isNaN(p) || p < 0 || p > 2000) return;

    setTargetP(p);
    if (p >= RANK_THRESHOLDS.A) setTargetRank('A');
    else if (p >= RANK_THRESHOLDS.B) setTargetRank('B');
    else setTargetRank('C');
  }

  function applyGrowthRate(rate, currentYears) {
    const base = currentYears[0];
    const baseTotal = base.staff * base.bidsPerStaff;

    return currentYears.map((y, i) => {
      if (i === 0) return y;

      const mult = Math.pow(rate, i);
      const targetTotal = baseTotal * mult;
      const rawStaff = base.staff * Math.sqrt(mult);
      const newStaff = Math.min(10, Math.max(1, Math.round(rawStaff)));
      const rawBps = targetTotal / newStaff;
      const newBps = Math.min(20, Math.max(1, Math.round(rawBps * 2) / 2));
      const newAvgProfit = Math.round(base.avgProfit * mult);
      const newEquity = Math.round(base.equity * Math.sqrt(mult));
      const newFixedAssets = Math.round(base.fixedAssets * Math.sqrt(mult));
      const newOperatingCF = Math.round(base.operatingCF * mult);
      const newRetainedEarnings = Math.round(base.retainedEarnings * Math.sqrt(mult));
      const newKanseikoujidaka = Math.round(base.kanseikoujidaka * mult);
      const newUriage = Math.round(base.uriage * mult);
      const newMotoukeKoujidaka = Math.round(base.motoukeKoujidaka * mult);

      return {
        ...y,
        staff: newStaff,
        bidsPerStaff: newBps,
        avgProfit: newAvgProfit,
        equity: newEquity,
        fixedAssets: newFixedAssets,
        operatingCF: newOperatingCF,
        retainedEarnings: newRetainedEarnings,
        kanseikoujidaka: newKanseikoujidaka,
        uriage: newUriage,
        motoukeKoujidaka: newMotoukeKoujidaka,
      };
    });
  }

  function handleGrowthRateChange(rate) {
    setRevenueGrowthRate(rate);
    setYears(prev => applyGrowthRate(rate, prev));
  }

  function handleNChange(newN) {
    setN(newN);
    setYears(prev => {
      let next;

      if (newN + 1 > prev.length) {
        next = [...prev];
        for (let i = prev.length; i <= newN; i += 1) {
          const source = next[i - 1] || prev[0];
          next.push(cloneFutureYear(source, 1));
        }
      } else {
        next = prev.slice(0, newN + 1);
      }

      return revenueGrowthRate !== 1.0 ? applyGrowthRate(revenueGrowthRate, next) : next;
    });

    if (activeYear > newN) setActiveYear(newN);
  }

  function handleSliderChange(yearIdx, key, value) {
    setYears(prev => {
      const nextYears = prev.map((y, i) => (i === yearIdx ? { ...y, [key]: value } : y));

      if (inputMode === 'auto' && yearIdx === 0 && AUTO_BID_SYNC_KEYS.has(key)) {
        return syncAutoBidYears(nextYears, nextYears[0], revenueGrowthRate);
      }

      return nextYears;
    });
  }

  function handleWInputChange(yearIdx, path, value) {
    setYears(prev =>
      prev.map((y, i) => {
        if (i < yearIdx) return y;
        return {
          ...y,
          wInput: applyWInputValue(y.wInput, path, value, i - yearIdx),
        };
      })
    );
  }

  function handleFinancialDocChange(yearIdx, partial) {
    setYears(prev =>
      prev.map((y, i) => (
        i === yearIdx
          ? { ...y, financialDoc: { ...(y.financialDoc || {}), ...partial } }
          : y
      ))
    );
  }

  function handleMultiSliderChange(yearIdx, updates) {
    setYears(prev => prev.map((y, i) => (i === yearIdx ? { ...y, ...updates } : y)));
  }

  function handlePropagateCurrent() {
    if (years.length <= activeYear + 1) return;
    const sourceLabel = activeYear === 0 ? '現在' : `${activeYear}年後`;
    const ok = window.confirm(
      `「${sourceLabel}」のデータ（経審オーバーライド・決算書・技術職員数・W点など）を、それ以降のすべての年にコピーします。\n\n各年ですでに入力した内容は上書きされます。よろしいですか？`
    );
    if (!ok) return;
    setYears(prev => {
      const base = prev[activeYear];
      const next = prev.map((y, i) => (i <= activeYear ? y : cloneFutureYear(base, i - activeYear)));
      return revenueGrowthRate !== 1.0 ? applyGrowthRate(revenueGrowthRate, next) : next;
    });
  }

  function handleAvgRevenueOverrideChange(yearIdx, partial) {
    setYears(prev =>
      prev.map((y, i) => {
        if (i !== yearIdx) return y;
        const current = y.avgRevenueOverride || { enabled: false, completionRevenue: 0, principalRevenue: 0 };
        return {
          ...y,
          avgRevenueOverride: { ...current, ...partial },
        };
      })
    );
  }

  function handleWOverrideChange(yearIdx, partial) {
    setYears(prev =>
      prev.map((y, i) => {
        if (i < yearIdx) return y;
        const current = y.wOverride || { enabled: false, value: 0 };
        return {
          ...y,
          wOverride: { ...current, ...partial },
        };
      })
    );
  }

  function handleZInputChange(yearIdx, key, value) {
    setYears(prev =>
      prev.map((y, i) => (
        i === yearIdx
          ? { ...y, zInput: { ...cloneZInput(y.zInput), [key]: value } }
          : y
      ))
    );
  }

  function handleInputModeChange(mode) {
    if (mode === 'manual' && inputMode === 'auto') {
      setYears(prev => {
        const autoScores = calcAllScores(prev, yModel, 'auto');

        return prev.map((y, i) => {
          const autoScore = autoScores[i] || {};
          return {
            ...y,
            kanseikoujidaka: Math.round(autoScore.rawRevenue || 0),
            uriage: Math.round(autoScore.revenueForY || 0),
            motoukeKoujidaka: Math.round(autoScore.principalRevenue || 0),
          };
        });
      });
    }

    setInputMode(mode);
  }

  const targetRankLabel = targetP >= RANK_THRESHOLDS.A
    ? 'A'
    : targetP >= RANK_THRESHOLDS.B
      ? 'B'
      : targetP >= RANK_THRESHOLDS.C
        ? 'C'
        : 'D';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 14, background: '#f0f2f8', minHeight: '100vh' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a237e, #283593)',
          color: 'white',
          borderRadius: '10px 10px 0 0',
          padding: '14px 22px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 'bold', letterSpacing: 1 }}>
              経審スコアシミュレーター
            </h1>
            <p style={{ fontSize: 11, marginTop: 3, opacity: 0.7 }}>
              建設業 経営事項審査 P点 将来シミュレーション
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={activeScenarioId || ''}
              onChange={e => handleLoadScenario(e.target.value || null)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 5,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                maxWidth: 220,
              }}
            >
              <option value="" style={{ color: '#333' }}>— シナリオ未選択（編集中）—</option>
              {scenarioList.map(s => (
                <option key={s.id} value={s.id} style={{ color: '#333' }}>
                  {s.name} ({fmtDateShort(s.updatedAt)})
                </option>
              ))}
            </select>
            <button type="button" onClick={handleSaveAsNewScenario} title="現在の入力を新しいシナリオとして保存" style={scenarioBtnStyle}>
              ➕ 新規保存
            </button>
            {activeScenario && (
              <>
                <button type="button" onClick={handleRenameScenario} title="シナリオ名を変更" style={scenarioBtnStyle}>
                  ✎ 名前変更
                </button>
                <button
                  type="button"
                  onClick={handleDeleteScenario}
                  title="現在のシナリオを削除"
                  style={{ ...scenarioBtnStyle, background: 'rgba(255,100,100,0.2)' }}
                >
                  🗑
                </button>
              </>
            )}
            <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 4 }}>
              {savedAt
                ? `✓ ${savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : '—'}
            </span>
            <button type="button" onClick={handleResetAll} style={scenarioBtnStyle}>
              全リセット
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#e8eaf6',
          border: '1.5px solid #9fa8da',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '14px 20px 16px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: '#3949ab',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          設定項目
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <SettingLabel>目標年数</SettingLabel>
            <select value={n} onChange={e => handleNChange(Number(e.target.value))} style={selectStyle}>
              {YEAR_OPTIONS.map(v => (
                <option key={v} value={v}>
                  {v}年後
                </option>
              ))}
            </select>
          </div>

          <div>
            <SettingLabel>目標ランク / 必要P点</SettingLabel>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={targetRank}
                onChange={e => handleTargetRankChange(e.target.value)}
                style={{ ...selectStyle, flex: '0 0 auto', width: 100 }}
              >
                {['C', 'B', 'A'].map(r => (
                  <option key={r} value={r}>
                    {r}ランク
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={targetP}
                min={300}
                max={2000}
                step={10}
                onChange={e => handleTargetPChange(e.target.value)}
                style={{
                  ...selectStyle,
                  flex: 1,
                  width: 0,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: RANK_COLORS[targetRankLabel],
                }}
              />
              <span style={{ fontSize: 12, color: '#555', flexShrink: 0 }}>点</span>
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
              ランク選択で自動入力、数値は直接変更できます。
            </div>
          </div>

          <div>
            <SettingLabel>売上成長率（年）</SettingLabel>
            <select
              value={revenueGrowthRate}
              onChange={e => handleGrowthRateChange(parseFloat(e.target.value))}
              style={selectStyle}
            >
              {GROWTH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {revenueGrowthRate !== 1.0 && years[n] && (
              <div style={{ fontSize: 10, color: '#3949ab', marginTop: 4 }}>
                {n}年後: 在宅{years[n].staff}名 × {years[n].bidsPerStaff.toFixed(1)}件/名
                = {Math.round(years[n].staff * years[n].bidsPerStaff)}件/月
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px dashed #9fa8da',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <SettingLabel>Y点計算モデル</SettingLabel>
          <label
            style={{
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: yModel === 'simple' ? '#3949ab' : 'white',
              color: yModel === 'simple' ? 'white' : '#555',
              border: '1px solid #9fa8da',
            }}
          >
            <input
              type="radio"
              name="yModel"
              value="simple"
              checked={yModel === 'simple'}
              onChange={() => setYModel('simple')}
              style={{ margin: 0 }}
            />
            簡易・近似（4指標）
          </label>
          <label
            style={{
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: yModel === 'full' ? '#3949ab' : 'white',
              color: yModel === 'full' ? 'white' : '#555',
              border: '1px solid #9fa8da',
            }}
          >
            <input
              type="radio"
              name="yModel"
              value="full"
              checked={yModel === 'full'}
              onChange={() => setYModel('full')}
              style={{ margin: 0 }}
            />
            詳細・公式式（実経審8指標）
          </label>
          <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>
            {yModel === 'simple'
              ? '※ 4指標による独自近似式（公式式ではありません）。経審を再現するなら「詳細」推奨。'
              : '※ 国交省告示の公式式 Y = 167.3 × A + 583（実経審8指標）で計算します。'}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px dashed #9fa8da',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <SettingLabel>入力モード</SettingLabel>
          <label
            style={{
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: inputMode === 'manual' ? '#3949ab' : 'white',
              color: inputMode === 'manual' ? 'white' : '#555',
              border: '1px solid #9fa8da',
            }}
          >
            <input
              type="radio"
              name="inputMode"
              value="manual"
              checked={inputMode === 'manual'}
              onChange={() => handleInputModeChange('manual')}
              style={{ margin: 0 }}
            />
            手動（完成工事高・売上を直接入力）
          </label>
          <label
            style={{
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: inputMode === 'auto' ? '#3949ab' : 'white',
              color: inputMode === 'auto' ? 'white' : '#555',
              border: '1px solid #9fa8da',
            }}
          >
            <input
              type="radio"
              name="inputMode"
              value="auto"
              checked={inputMode === 'auto'}
              onChange={() => handleInputModeChange('auto')}
              style={{ margin: 0 }}
            />
            自動（入札活動から推計）
          </label>
          <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>
            {inputMode === 'auto'
              ? '※ 在宅 × 月間入札 × 落札率 × 平均落札金額 × 12 で完成工事高と売上高を推計'
              : '※ 手動入力では、完成工事高・元請完成工事高・売上高を別々に入力します。'}
          </span>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 10,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>現在</span>
          <RankBadge rank={currentScore.rank} size="lg" />
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{currentScore.p}点</span>
        </div>
        <span style={{ fontSize: 22, color: '#bbb' }}>&rarr;</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>{n}年後</span>
          <RankBadge rank={latestScore.rank} size="lg" />
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>{latestScore.p}点</span>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            background: targetMet ? '#E8F5E9' : '#FFF3E0',
            color: targetMet ? '#2E7D32' : '#E65100',
            borderRadius: 20,
            padding: '7px 18px',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          {targetMet
            ? `目標（${targetP}点）達成`
            : `目標 ${targetP}点まで あと ${gap}点`}
        </div>
      </div>

      <PScoreChart scores={scores} n={n} targetRank={targetRank} targetP={targetP} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
          padding: '0 4px',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: '#666' }}>
          年別シミュレーション（編集中の年を起点に、それ以降の年へコピーできます）
        </span>
        <button
          type="button"
          onClick={handlePropagateCurrent}
          disabled={years.length <= activeYear + 1}
          style={{
            padding: '6px 14px',
            fontSize: 11,
            fontWeight: 'bold',
            color: years.length <= activeYear + 1 ? '#999' : 'white',
            background: years.length <= activeYear + 1 ? '#e0e0e0' : '#3949ab',
            border: 'none',
            borderRadius: 6,
            cursor: years.length <= activeYear + 1 ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ▶ 「{activeYear === 0 ? '現在' : `${activeYear}年後`}」のデータを以降の年にコピー
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
        {scores.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveYear(i)}
            style={{
              flex: 1,
              padding: '10px 6px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              fontSize: 13,
              background: activeYear === i ? 'white' : '#dde1ee',
              fontWeight: activeYear === i ? 'bold' : 'normal',
              boxShadow: activeYear === i ? '0 -1px 4px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              transition: 'background 0.15s',
            }}
          >
            <span>{i === 0 ? '現在' : `${i}年後`}</span>
            <RankBadge rank={s.rank} />
            <span style={{ fontSize: 11, color: '#666' }}>{s.p}点</span>
          </button>
        ))}
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '0 0 10px 10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <YearPanel
          yearData={years[activeYear]}
          score={scores[activeYear]}
          yModel={yModel}
          inputMode={inputMode}
          onSliderChange={(key, val) => handleSliderChange(activeYear, key, val)}
          onZInputChange={(key, val) => handleZInputChange(activeYear, key, val)}
          onWInputChange={(path, val) => handleWInputChange(activeYear, path, val)}
          onWOverrideChange={partial => handleWOverrideChange(activeYear, partial)}
          onAvgRevenueOverrideChange={partial => handleAvgRevenueOverrideChange(activeYear, partial)}
          onFinancialDocChange={partial => handleFinancialDocChange(activeYear, partial)}
          onMultiSliderChange={updates => handleMultiSliderChange(activeYear, updates)}
        />
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', paddingBottom: 16 }}>
        ※ 計算式は簡易近似です。実際の経審評点は審査機関の算定によります。
      </p>
    </div>
  );
}

const scenarioBtnStyle = {
  fontSize: 10,
  color: 'white',
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: 5,
  padding: '4px 10px',
  cursor: 'pointer',
};

const selectStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #c5cae9',
  background: 'white',
  fontSize: 13,
  color: '#333',
  cursor: 'pointer',
};
