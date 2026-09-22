import { createFinancialData, D, present } from './financialCalculations.js';

export function upgradeYear(year) {
  const data = structuredClone(year.accuracy || createFinancialData());
  // Only original document fields are migrated. Old sliders may be averages or defaults.
  const doc = year.financialDoc || {}, scale = { en: '0.001', sen: 1, man: 10 }[doc.unit || 'man'];
  const map = { sales: 'sales', grossProfit: 'grossProfit', ordinaryProfit: 'ordinaryProfit', operatingProfit: 'operatingProfit', depreciation: 'depreciation', interest: 'interestPaid', corporateTax: 'corporateTaxes', netAssets: 'netAssets', totalDebt: 'totalDebt', fixedAssets: 'fixedAssets', retainedEarnings: 'retainedEarnings', operatingCF: 'keishinOperatingCF' };
  for (const [old, key] of Object.entries(map)) if (present(doc[old]) && !present(data.periods.current[key])) data.periods.current[key] = String(D(doc[old]).mul(scale).number());
  for (const [old, key] of Object.entries({ netAssetsPrior: 'netAssets', operatingProfitPrior: 'operatingProfit', depreciationPrior: 'depreciation', operatingCFPrior: 'keishinOperatingCF' })) if (present(doc[old]) && !present(data.periods.prior[key])) data.periods.prior[key] = String(D(doc[old]).mul(scale).number());
  return { ...year, calculationVersion: 'accuracy-v2', accuracy: data };
}

export function applyFinancialImport(year, result, confirmation) {
  // Each notice starts an independent financial record; missing values cannot leak from a different notice.
  const accuracy = createFinancialData();
  const patch = result.patch || {}, f = result.financialInputs || {};
  const mapping = { uriage: 'sales', debt: 'totalDebt', interest: 'interestPaid', interestIncome: 'interestDividendReceived', fixedAssets: 'fixedAssets', retainedEarnings: 'retainedEarnings' };
  const set = (period, key, value, sourceType = 'pdfText') => {
    if (!present(value)) return;
    accuracy.periods[period][key] = String(value);
    accuracy.sources[`${period}.${key}`] = { sourceType, sourceId: result.fileName, originalValue: String(value), originalUnit: '千円', verification: 'confirmed', updatedAt: new Date().toISOString() };
  };
  const sourceType = result.usedOcr ? 'ocr' : 'pdfText';
  for (const [old, key] of Object.entries(mapping)) if (present(patch[old])) set('current', key, D(patch[old]).mul(10).number(), sourceType);
  for (const [period, values] of Object.entries(f.periods || {})) for (const [key, value] of Object.entries(values)) set(period, key, value, sourceType);
  if (!present(accuracy.periods.current.netAssets) && present(accuracy.periods.current.totalAssets) && present(accuracy.periods.current.totalDebt)) set('current', 'netAssets', D(accuracy.periods.current.totalAssets).sub(accuracy.periods.current.totalDebt).number(), 'derived');
  if (present(patch.equity)) { accuracy.options.equityMode = 'direct'; accuracy.options.equityDirect = String(D(patch.equity).mul(10).number()); }
  if (present(patch.previousTotalCapital)) set('prior', 'totalAssets', D(patch.previousTotalCapital).mul(10).number(), sourceType);
  if (present(patch.operatingCF)) { accuracy.options.cfMode = 'average'; accuracy.options.averageCF = String(D(patch.operatingCF).mul(10).number()); }
  if (present(patch.avgProfit)) { accuracy.options.profitMode = 'direct'; accuracy.options.averageProfit = String(D(patch.avgProfit).mul(10).number()); }
  accuracy.context = { ...accuracy.context, ...(result.documentContext || {}), ...confirmation };
  accuracy.confirmed = true;
  accuracy.estimate = Boolean(year.accuracy?.estimate);
  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const reference = { id, scores: Object.fromEntries(Object.entries(result.referenceScores || {}).filter(([, v]) => present(v)).map(([k, v]) => [k, Number(v)])), context: { ...accuracy.context, industry: patch.industry || year.industry }, confirmed: true, fileName: result.fileName, importedAt: new Date().toISOString() };
  return { ...year, calculationVersion: 'accuracy-v2', accuracy, referenceAssessments: [...(year.referenceAssessments || []), reference], activeReferenceId: id };
}

export function cloneForecastAccuracy(year) {
  if (!year.accuracy) return {};
  const accuracy = structuredClone(year.accuracy);
  accuracy.estimate = true; accuracy.confirmed = false;
  for (const source of Object.values(accuracy.sources)) { source.sourceType = 'estimate'; source.verification = 'unconfirmed'; }
  accuracy.context.periodEnd = ''; accuracy.context.applicationDate = '';
  return { accuracy, referenceAssessments: [], activeReferenceId: null, verificationCases: [] };
}

export const SCORE_KEYS = ['x1', 'x2', 'y', 'z', 'w', 'p'];
export function compareAssessment(score, reference, year) {
  const c = year.accuracy?.context || {}, r = reference?.context || {};
  const identity = c.companyId && c.periodEnd && c.companyId === r.companyId && c.periodEnd === r.periodEnd;
  return SCORE_KEYS.map(key => {
    const actual = key === 'p' ? score.computedP : key === 'w' ? score.computedW : score[key];
    const expected = reference?.scores?.[key];
    const sameIndustry = !['x1', 'z', 'p'].includes(key) || year.industry === r.industry;
    const rules = ['w', 'p'].includes(key) ? c.ruleSetId === '2026-07' && r.ruleSetId === '2026-07' : true;
    const status = expected == null ? '参照値なし' : !identity || !sameIndustry || !rules ? '条件不一致' : !reference.confirmed || !year.accuracy?.confirmed ? '未確認資料' : year.accuracy?.estimate || score.yDetail?.status === 'estimate' || score.yDetail?.appliedModel !== 'full' ? '参考推計' : actual == null ? '入力不足' : actual === expected ? '一致' : '差異あり';
    const delta = actual == null || expected == null ? null : actual - expected;
    const weight = {x1:'.25',x2:'.15',y:'.2',z:'.25',w:'.15'}[key];
    return { key, expected: expected ?? null, actual, effective: score[key], delta, pContribution: delta == null || !weight ? null : D(delta).mul(weight).number(), status };
  });
}
export function summarizeCases(cases = []) {
  // Keep all snapshots, but count each source assessment only once using its latest verification.
  const latest = [...new Map(cases.map((c, i) => [c.referenceId || `case-${i}`, c])).values()];
  return SCORE_KEYS.map(key => {
    const rows = latest.filter(c => c.calculationVersion === 'accuracy-v2').map(c => c.rows.find(r => r.key === key)).filter(Boolean);
    const eligible = rows.filter(r => ['一致', '差異あり'].includes(r.status));
    const n = eligible.length, matches = eligible.filter(r => r.delta === 0).length;
    return { key, count: n, excluded: rows.length - n, matches, rate: n ? matches / n : null, mae: n ? eligible.reduce((s, r) => s + Math.abs(r.delta), 0) / n : null, max: n ? Math.max(...eligible.map(r => Math.abs(r.delta))) : null };
  });
}
