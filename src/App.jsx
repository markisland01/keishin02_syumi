import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  calcAllScores,
  createDefaultYears,
  getRank,
  getMissingDetailedYInputKeys,
  hasCompleteDetailedYInputs,
  migrateSavedYears,
  RANK_THRESHOLDS,
  Y_DETAIL_FIELD_KEYS,
  Y_DETAIL_FIELD_LABELS,
} from './utils/calculations';
import { extractKeishinPdf } from './utils/keishinPdfParser';
import KeishinPdfImport from './components/KeishinPdfImport';
import PScoreChart from './components/PScoreChart';
import YearPanel from './components/YearPanel';
import AccuracyPanel from './components/AccuracyPanel';
import { applyFinancialImport, cloneForecastAccuracy } from './utils/accuracyState.js';
import { changeDocumentUnit } from './utils/financialCalculations.js';
import './simulator-layout.css';

const STORAGE_KEY = 'keishin-simulator-state-v1';
const STORAGE_VERSION = 2;
const SCENARIOS_KEY = 'keishin-scenarios-v1';
const ACTIVE_SCENARIO_KEY = 'keishin-active-scenario-v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (![1, STORAGE_VERSION].includes(parsed?.version)) return null;
    return {
      ...parsed.data,
      years: parsed.data?.years ? migrateSavedYears(parsed.data.years) : undefined,
    };
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  try {
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous && !localStorage.getItem(STORAGE_KEY + '-backup')) localStorage.setItem(STORAGE_KEY + '-backup', previous);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, savedAt: new Date().toISOString(), data })
    );
    return JSON.parse(localStorage.getItem(STORAGE_KEY))?.version === STORAGE_VERSION;
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
    if (![1, 2].includes(parsed?.version)) return {};
    return parsed.scenarios || {};
  } catch {
    return {};
  }
}

function saveScenariosToStorage(scenarios) {
  try {
    const previous = localStorage.getItem(SCENARIOS_KEY);
    if (previous && !localStorage.getItem(SCENARIOS_KEY + '-backup')) localStorage.setItem(SCENARIOS_KEY + '-backup', previous);
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify({ version: 2, scenarios }));
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
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);
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

function cloneScoreOverrides(scoreOverrides = {}) {
  return {
    w: scoreOverrides?.w != null && scoreOverrides.w !== '' && Number.isFinite(Number(scoreOverrides.w)) ? Math.round(Number(scoreOverrides.w)) : null,
  };
}

function cloneProvidedInputs(providedInputs = {}) {
  return {
    detailedY: {
      grossProfitRate: Boolean(providedInputs?.detailedY?.grossProfitRate),
      fixedAssets: Boolean(providedInputs?.detailedY?.fixedAssets),
      operatingCF: Boolean(providedInputs?.detailedY?.operatingCF),
      retainedEarnings: Boolean(providedInputs?.detailedY?.retainedEarnings),
    },
  };
}

function cloneBaselineYears(sourceYears) {
  return sourceYears.map(year => structuredClone(year));
}

function yearsDiffer(current, baseline) {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

function clearWOverride(scoreOverrides = {}) {
  return {
    ...cloneScoreOverrides(scoreOverrides),
    w: null,
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
    ...cloneForecastAccuracy(baseYear),
    zInput: cloneZInput(baseYear.zInput),
    wItems: { ...baseYear.wItems },
    wInput: nextWInput,
    wOverride: { ...(baseYear.wOverride || { enabled: false, value: 0 }) },
    avgRevenueOverride: { ...(baseYear.avgRevenueOverride || { enabled: false, completionRevenue: 0, principalRevenue: 0 }) },
    financialDoc: { ...(baseYear.financialDoc || {}) },
    scoreOverrides: cloneScoreOverrides(),
    providedInputs: cloneProvidedInputs(baseYear.providedInputs),
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

function mergeWInputPatch(baseWInput, patchWInput) {
  const nextWInput = cloneWInput(baseWInput);

  for (const [sectionKey, sectionPatch] of Object.entries(patchWInput || {})) {
    nextWInput[sectionKey] = {
      ...(nextWInput[sectionKey] || {}),
      ...(sectionPatch || {}),
    };
  }

  return nextWInput;
}

function mergeKeishinImportPatch(yearData, patch = {}) {
  const { zInput, wInput, scoreOverrides, _references, ...directValues } = patch;
  const nextYear = {
    ...yearData,
    ...directValues,
  };

  if (zInput) {
    nextYear.zInput = {
      ...cloneZInput(yearData.zInput),
      ...zInput,
    };
  }

  if (wInput) {
    nextYear.wInput = mergeWInputPatch(yearData.wInput, wInput);
  }

  // Notice averages are inputs to X1/Z2, not current-period revenue.
  if (_references?.avgKanseikoujidaka != null || _references?.avgMotoukeKoujidaka != null) {
    nextYear.avgRevenueOverride = {
      ...yearData.avgRevenueOverride,
      enabled: true,
      completionRevenue: _references.avgKanseikoujidaka ?? yearData.avgRevenueOverride?.completionRevenue ?? null,
      principalRevenue: _references.avgMotoukeKoujidaka ?? yearData.avgRevenueOverride?.principalRevenue ?? null,
    };
  }

  // Reference scores never enable an override.

  const nextProvidedInputs = cloneProvidedInputs(yearData.providedInputs);
  for (const key of Y_DETAIL_FIELD_KEYS) {
    if (patch[key] != null) nextProvidedInputs.detailedY[key] = true;
  }
  nextYear.providedInputs = nextProvidedInputs;

  if (patch.motoukeKoujidaka != null) {
    nextYear.motoukeSameAsKansei = patch.kanseikoujidaka != null
      ? Number(patch.motoukeKoujidaka) === Number(patch.kanseikoujidaka)
      : false;
  }

  return nextYear;
}

function hasManualRevenuePatch(patch = {}) {
  return ['kanseikoujidaka', 'uriage', 'motoukeKoujidaka'].some(key => patch[key] != null);
}

function hasDetailedYPatch(patch = {}) {
  return ['grossProfitRate', 'fixedAssets', 'operatingCF', 'retainedEarnings'].some(key => patch[key] != null);
}

function getMissingDetailedYLabels(yearData) {
  return getMissingDetailedYInputKeys(yearData).map(key => Y_DETAIL_FIELD_LABELS[key] || key);
}

function buildPdfImportResult(currentYear, rawResult) {
  const result = {
    ...rawResult,
    warnings: [...(rawResult?.warnings || [])],
  };
  const mergedYear = mergeKeishinImportPatch(currentYear, result.patch || {});
  const touchedDetailedY = hasDetailedYPatch(result.patch) || result?.referenceScores?.y != null;


  if (touchedDetailedY && !hasCompleteDetailedYInputs(mergedYear)) {
    const missingLabels = getMissingDetailedYLabels(mergedYear);
    if (missingLabels.length > 0) {
      result.warnings.push(
        `Y\u70b9\u306e\u8a73\u7d30\u8a08\u7b97\u306b\u5fc5\u8981\u306a\u9805\u76ee\u304c\u4e0d\u8db3\u3057\u3066\u3044\u308b\u305f\u3081\u3001\u7c21\u6613\u8a08\u7b97\u3092\u4f7f\u3044\u307e\u3059: ${missingLabels.join('\u3001')}`
      );
    }
  }

  return result;
}

function shouldSwitchToManualMode(patch = {}, result = null) {
  if (hasManualRevenuePatch(patch)) return true;
  if (patch?._references?.avgKanseikoujidaka != null) return true;
  if (patch?._references?.avgMotoukeKoujidaka != null) return true;
  if (result?.referenceScores?.x1 != null) return true;
  return false;
}

export default function App({ initialShowSettings = false }) {
  const saved = useMemo(() => loadFromStorage(), []);
  const [n, setN] = useState(saved?.n ?? 2);
  const [targetRank, setTargetRank] = useState(saved?.targetRank ?? 'C');
  const [targetP, setTargetP] = useState(saved?.targetP ?? RANK_THRESHOLDS.C);
  const [activeYear, setActiveYear] = useState(0);
  const [years, setYears] = useState(() => saved?.years ?? createDefaultYears(2));
  const [revenueGrowthRate, setRevenueGrowthRate] = useState(saved?.revenueGrowthRate ?? 1.0);
  const [yModel, setYModel] = useState(saved?.yModel ?? 'full');
  const [inputMode, setInputMode] = useState(saved?.inputMode ?? 'manual');
  const [baselineYears, setBaselineYears] = useState(() => cloneBaselineYears(saved?.years ?? createDefaultYears(2)));
  const [activeCategory, setActiveCategory] = useState('revenue');
  const [savedAt, setSavedAt] = useState(saved ? new Date() : null);
  const [showSettings, setShowSettings] = useState(initialShowSettings);
  const [scenarios, setScenarios] = useState(() => loadScenarios());
  const [activeScenarioId, setActiveScenarioId] = useState(() => loadActiveScenarioId());
  const pdfImportRequest = useRef(0);

  function invalidatePdfImport() {
    pdfImportRequest.current += 1;
    setPdfImportState({ status: 'idle' });
  }

  useLayoutEffect(() => {
    invalidatePdfImport();
    return () => { pdfImportRequest.current += 1; };
  }, [activeScenarioId, activeYear]);

  useEffect(() => {
    const data = { n, targetRank, targetP, years, revenueGrowthRate, yModel, inputMode };
    const didSave = saveToStorage(data);
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
    setSavedAt(didSave ? new Date() : null);
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
    invalidatePdfImport();
    const nextYears = data.years ? migrateSavedYears(data.years) : createDefaultYears(data.n ?? 2);
    setN(data.n ?? 2);
    setTargetRank(data.targetRank ?? 'C');
    setTargetP(data.targetP ?? RANK_THRESHOLDS.C);
    setYears(nextYears);
    setBaselineYears(cloneBaselineYears(nextYears));
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
    invalidatePdfImport();
    setN(2);
    setTargetRank('C');
    setTargetP(RANK_THRESHOLDS.C);
    setActiveYear(0);
    const resetYears = createDefaultYears(2);
    setYears(resetYears);
    setBaselineYears(cloneBaselineYears(resetYears));
    setRevenueGrowthRate(1.0);
    setYModel('simple');
    setInputMode('manual');
    setActiveScenarioId(null);
    setSavedAt(null);
  }
  const [pdfImportState, setPdfImportState] = useState({ status: 'idle' });

  const scores = useMemo(
    () => calcAllScores(years.slice(0, n + 1), yModel, inputMode),
    [years, n, yModel, inputMode]
  );
  const baselineScores = useMemo(
    () => calcAllScores(baselineYears.slice(0, n + 1), yModel, inputMode),
    [baselineYears, n, yModel, inputMode]
  );

  const currentScore = scores[0];
  const latestScore = scores[scores.length - 1];
  const selectedScore = scores[activeYear] || scores[0];
  const selectedBaselineScore = baselineScores[activeYear] || baselineScores[0];
  const selectedPDelta = selectedScore?.p != null && selectedBaselineScore?.p != null
    ? selectedScore.p - selectedBaselineScore.p
    : null;
  const selectedPLabel = selectedScore?.p == null
    ? '（未算定）'
    : yModel === 'simple' || selectedScore?.yDetail?.status === 'estimate'
      ? '（参考推計）'
      : selectedScore?.yDetail?.status === 'complete'
        ? '（詳細計算）'
        : selectedScore?.calculationVersion !== 'accuracy-v2'
          ? '（旧方式）'
          : '（参考推計）';
  const targetMet = latestScore.p != null && latestScore.p >= targetP;
  const gap = latestScore.p == null ? null : targetP - latestScore.p;

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
        ...cloneForecastAccuracy(y),
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
      let next = [...prev];
      const existingLength = prev.length;

      if (newN + 1 > prev.length) {
        for (let i = prev.length; i <= newN; i += 1) {
          const source = next[i - 1] || prev[0];
          next.push(cloneFutureYear(source, 1));
        }
      }

      if (revenueGrowthRate === 1.0 || existingLength > newN) return next;
      const grown = applyGrowthRate(revenueGrowthRate, next);
      return grown.map((year, index) => (index < existingLength ? next[index] : year));
    });
    setBaselineYears(prev => {
      let next = [...prev];
      if (newN + 1 > prev.length) {
        for (let i = prev.length; i <= newN; i += 1) {
          const source = next[i - 1] || prev[0];
          next.push(cloneFutureYear(source, 1));
        }
      }
      return next;
    });

    if (activeYear > newN) setActiveYear(newN);
  }

  function handleSliderChange(yearIdx, key, value) {
    setYears(prev => {
      const nextYears = prev.map((y, i) => {
        if (i !== yearIdx) return y;

        const nextYear = { ...y, [key]: value };
        if (Y_DETAIL_FIELD_KEYS.includes(key)) {
          nextYear.providedInputs = cloneProvidedInputs(y.providedInputs);
          nextYear.providedInputs.detailedY[key] = true;
        }
        return nextYear;
      });

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
          scoreOverrides: clearWOverride(y.scoreOverrides),
        };
      })
    );
  }

  function handleFinancialDocChange(yearIdx, partial) {
    setYears(prev =>
      prev.map((y, i) => (
        i === yearIdx
          ? { ...y, financialDoc: partial.unit ? changeDocumentUnit(y.financialDoc || {}, partial.unit) : { ...(y.financialDoc || {}), ...partial } }
          : y
      ))
    );
  }

  function handleMultiSliderChange(yearIdx, updates) {
    setYears(prev => prev.map((y, i) => {
      if (i !== yearIdx) return y;
      const providedInputs = cloneProvidedInputs(y.providedInputs);
      for (const key of Y_DETAIL_FIELD_KEYS) {
        if (updates[key] != null) providedInputs.detailedY[key] = true;
      }
      return { ...y, ...updates, providedInputs };
    }));
  }

  function handlePropagateCurrent() {
    if (activeYear >= n) return;
    const sourceLabel = activeYear === 0 ? '現在' : `${activeYear}年後`;
    const ok = window.confirm(
      `「${sourceLabel}」のデータ（経審オーバーライド・決算書・技術職員数・W点など）を、それ以降のすべての年にコピーします。\n\n各年ですでに入力した内容は上書きされます。よろしいですか？`
    );
    if (!ok) return;
    setYears(prev => {
      const base = prev[activeYear];
      const next = prev.map((y, i) => (i <= activeYear || i > n ? y : cloneFutureYear(base, i - activeYear)));
      if (revenueGrowthRate === 1.0) return next;
      const grown = applyGrowthRate(revenueGrowthRate, next);
      return grown.map((year, index) => (index > n ? next[index] : year));
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

  async function handlePdfFileSelect(file, options = {}) {
    if (activeYear !== 0) return;
    const requestId = ++pdfImportRequest.current;
    setPdfImportState({ status: 'reading', fileName: file.name });
    try {
      const result = await extractKeishinPdf(file, options);
      if (requestId !== pdfImportRequest.current) return;
      setPdfImportState({ status: 'ready', fileName: file.name, result, requestId });
    } catch (error) {
      if (requestId !== pdfImportRequest.current) return;
      setPdfImportState({ status: 'error', fileName: file.name, error: error.message });
    }
  }

  function handlePdfImportApply(result, confirmation = {}) {
    if (activeYear !== 0 || !result || pdfImportState.requestId !== pdfImportRequest.current) return;
    setYears(prev => prev.map((year, index) => index === activeYear
      ? applyFinancialImport(mergeKeishinImportPatch(year, result.patch), result, confirmation) : year));
    setInputMode('manual');
    setYModel('full');
    setPdfImportState(prev => ({ ...prev, status: 'applied' }));
  }

  const targetRankLabel = targetP >= RANK_THRESHOLDS.A
    ? 'A'
    : targetP >= RANK_THRESHOLDS.B
      ? 'B'
      : targetP >= RANK_THRESHOLDS.C
        ? 'C'
        : 'D';

  return (
    <div className="simulator-app">
      <div
        className="simulator-header"
        style={{
          background: 'linear-gradient(135deg, #1a237e, #283593)',
          color: 'white',
          borderRadius: '10px 10px 0 0',
          padding: '8px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div className="simulator-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
            <h1 className="simulator-title">経審スコアシミュレーター</h1>
            <button
              type="button"
              onClick={() => setShowSettings(prev => !prev)}
              autoFocus={initialShowSettings}
              title="初期設定"
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.4)',
                background: showSettings ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              {showSettings ? '▲' : '⚙'} 初期設定
            </button>
            <div className="simulator-header-score" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>現在</span>
              <RankBadge rank={currentScore.rank} size="md" />
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>{currentScore.p ?? '—'}</span>
            </div>
            <span className="simulator-header-score" style={{ fontSize: 14, opacity: 0.5 }}>&rarr;</span>
            <div className="simulator-header-score" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{n}年後</span>
              <RankBadge rank={latestScore.rank} size="md" />
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>{latestScore.p ?? '—'}</span>
            </div>
            <div className="simulator-header-target"
              style={{
                background: targetMet ? 'rgba(76,175,80,0.25)' : 'rgba(255,152,0,0.25)',
                color: targetMet ? '#A5D6A7' : '#FFCC80',
                border: targetMet ? '1px solid rgba(165,214,167,0.5)' : '1px solid rgba(255,204,128,0.5)',
                borderRadius: 12,
                padding: '2px 10px',
                fontWeight: 'bold',
                fontSize: 11,
                whiteSpace: 'nowrap',
              }}
            >
              {targetMet
                ? `目標達成`
                : `目標まで あと${gap ?? '—'}点`}
            </div>
          </div>
          <div className="simulator-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
            <select
              value={activeScenarioId || ''}
              onChange={e => handleLoadScenario(e.target.value || null)}
              style={{
                fontSize: 11,
                padding: '3px 6px',
                borderRadius: 5,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                maxWidth: 130,
              }}
            >
              <option value="" style={{ color: '#333' }}>— シナリオ —</option>
              {scenarioList.map(s => (
                <option key={s.id} value={s.id} style={{ color: '#333' }}>
                  {s.name} ({fmtDateShort(s.updatedAt)})
                </option>
              ))}
            </select>
            <button type="button" onClick={handleSaveAsNewScenario} title="現在の入力を新しいシナリオとして保存" style={scenarioBtnStyle}>
              ➕保存
            </button>
            {activeScenario && (
              <>
                <button type="button" onClick={handleRenameScenario} title="シナリオ名を変更" style={scenarioBtnStyle}>
                  ✎
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
            <button type="button" onClick={handleResetAll} title="全リセット" style={scenarioBtnStyle}>
              リセット
            </button>
          </div>
        </div>
      </div>

      <div
        className="simulator-settings"
        style={{
          background: '#e8eaf6',
          borderStyle: showSettings ? 'solid' : 'none',
          borderColor: '#9fa8da',
          borderWidth: showSettings ? '0 1.5px 1.5px' : 0,
          borderRadius: '0 0 10px 10px',
          padding: showSettings ? '14px 20px 16px' : '0 20px',
          marginBottom: showSettings ? 14 : 0,
          overflow: showSettings ? 'auto' : 'hidden',
          transition: 'padding 0.2s ease, margin 0.2s ease',
        }}
      >
        <div className="simulator-settings-inner" style={{
          maxHeight: showSettings ? 500 : 0,
          overflow: showSettings ? 'auto' : 'hidden',
          transition: 'max-height 0.3s ease',
        }}>

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
      </div>

      <div className="simulator-year-navigation">
        <label className="simulator-period-control">
          <span>計画期間</span>
          <select value={n} onChange={e => handleNChange(Number(e.target.value))} aria-label="計画期間">
            {YEAR_OPTIONS.map(value => <option key={value} value={value}>{value}年後</option>)}
          </select>
        </label>
        <label className="simulator-active-year-control">
          <span>編集中</span>
          <select value={activeYear} onChange={e => setActiveYear(Number(e.target.value))} aria-label="編集中の年">
            {scores.map((score, index) => <option key={index} value={index}>{index === 0 ? '現在' : `${index}年後`}（{score.p ?? '—'}点）</option>)}
          </select>
        </label>
        <span className="simulator-period-help">1〜10年後を選択できます。各年の点数と変更状態を確認できます。</span>
      </div>
      <div className="simulator-year-strip" role="tablist" aria-label="編集する期間">
        {scores.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={activeYear === i}
            onClick={() => setActiveYear(i)}
            className={`simulator-year-tab ${activeYear === i ? 'is-active' : ''}`}
          >
            <span>{i === 0 ? '現在' : `${i}年後`}</span>
            <span className="simulator-year-tab-score">{s.p ?? '—'}点</span>
            <span className="simulator-year-tab-meta">
              <RankBadge rank={s.rank} />
              {yearsDiffer(years[i], baselineYears[i]) && <span className="simulator-change-dot" title="基準から変更あり" aria-label="基準から変更あり">●</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="simulator-layout">
        <aside className="simulator-results" aria-label="点数結果">
          <div className="simulator-result-heading">
            <div>
              <span className="simulator-eyebrow">選択中の期間</span>
              <strong>{activeYear === 0 ? '現在' : `${activeYear}年後`}</strong>
            </div>
            <div className="simulator-result-p">
              <span>
                P点 {selectedPLabel}
              </span>
              <strong>{selectedScore?.p ?? '未算定'}</strong>
              {selectedPDelta != null && <em className={selectedPDelta >= 0 ? 'is-positive' : 'is-negative'}>{selectedPDelta >= 0 ? '+' : ''}{selectedPDelta} 基準差</em>}
            </div>
          </div>
          <PScoreChart
            scores={scores}
            baselineScores={baselineScores}
            activeYear={activeYear}
            onSelectYear={setActiveYear}
            targetRank={targetRank}
            targetP={targetP}
          />
          <a
            className="simulator-manual-link"
            href={`${import.meta.env.BASE_URL}manual.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            操作マニュアル（新しいタブで開く）
          </a>
          <div className="simulator-manual-actions">
            <div>
              <strong>年別シミュレーション</strong>
              <span>編集中の年を起点に、それ以降の年へコピーできます。</span>
            </div>
            <button
              type="button"
              onClick={handlePropagateCurrent}
              disabled={activeYear >= n}
            >
              ▶ 「{activeYear === 0 ? '現在' : `${activeYear}年後`}」を以降の年にコピー
            </button>
          </div>
        </aside>

        <section className="simulator-editor" aria-label="入力エディター">
          <div className="simulator-editor-heading">
            <div>
              <span className="simulator-eyebrow">編集エリア</span>
              <strong>{activeYear === 0 ? '現在' : `${activeYear}年後`}の入力</strong>
            </div>
            <span>右側だけスクロールします</span>
          </div>
          <div className="simulator-editor-category-tabs" role="tablist" aria-label="入力カテゴリ">
            {[
              { key: 'revenue', label: '工事高・売上高', color: '#1565C0', sub: `X1 ${selectedScore.x1}` },
              { key: 'tech', label: '技術力 Z', color: '#6A1B9A', sub: `${selectedScore.z}点` },
              { key: 'finance', label: '財務 Y・X2', color: '#2E7D32', sub: `Y${selectedScore.y ?? '—'}/X2${selectedScore.x2 ?? '—'}` },
              { key: 'social', label: '社会性 W', color: '#E65100', sub: `${selectedScore.w}点` },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeCategory === tab.key}
                onClick={() => setActiveCategory(tab.key)}
                style={{
                  background: activeCategory === tab.key ? tab.color : 'white',
                  color: activeCategory === tab.key ? 'white' : tab.color,
                  border: `1.5px solid ${tab.color}`,
                }}
              >
                {tab.label}<span>{tab.sub}</span>
              </button>
            ))}
          </div>
          <div className="simulator-editor-scroll">
            {activeYear === 0 && <details className="simulator-secondary" open={pdfImportState.status !== 'idle'}>
              <summary>PDF取込（現在のみ）</summary>
              <KeishinPdfImport
                activeYear={activeYear}
                currentYear={years[activeYear]}
                importState={pdfImportState}
                onFileSelect={handlePdfFileSelect}
                onApply={handlePdfImportApply}
                onDismiss={() => setPdfImportState({ status: 'idle' })}
              />
            </details>}
            <details className="simulator-secondary">
              <summary>財務の詳細計算と実績照合</summary>
              <AccuracyPanel year={years[activeYear]} score={scores[activeYear]}
                onDetailed={() => setYModel('full')}
                onChange={nextYear => setYears(prev => prev.map((y, i) => i === activeYear ? nextYear : y))} />
            </details>
            <YearPanel
              yearData={years[activeYear]}
              score={scores[activeYear]}
              yModel={yModel}
              inputMode={inputMode}
              activeCategory={activeCategory}
              hideInternalTabs
              onActiveCategoryChange={setActiveCategory}
              onSliderChange={(key, val) => handleSliderChange(activeYear, key, val)}
              onZInputChange={(key, val) => handleZInputChange(activeYear, key, val)}
              onWInputChange={(path, val) => handleWInputChange(activeYear, path, val)}
              onWOverrideChange={partial => handleWOverrideChange(activeYear, partial)}
              onAvgRevenueOverrideChange={partial => handleAvgRevenueOverrideChange(activeYear, partial)}
              onFinancialDocChange={partial => handleFinancialDocChange(activeYear, partial)}
              onMultiSliderChange={updates => handleMultiSliderChange(activeYear, updates)}
            />
          </div>
        </section>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', paddingBottom: 16 }}>
        ※ 詳細計算・参考推計・旧方式を区別して表示します。実績照合の対象条件は照合欄をご確認ください。
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
