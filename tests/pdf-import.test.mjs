import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { applyFinancialImport, compareAssessment } from '../src/utils/accuracyState.js';
import { build, transformSync } from 'esbuild';

const calc = await import('../src/utils/calculations.js');
const compiled = await build({
  entryPoints: ['src/utils/keishinPdfParser.js'], bundle: true, write: false, format: 'esm', platform: 'node',
  external: ['pdfjs-dist/legacy/build/pdf.mjs'],
  plugins: [{ name: 'worker-url', setup(b) {
    b.onResolve({ filter: /\?url$/ }, () => ({ path: 'worker', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export default "unused"' }));
  } }],
});
const parser = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const app = readFileSync('src/App.jsx', 'utf8');
const context = vm.createContext({ ...calc });
vm.runInContext(transformSync(app.slice(app.indexOf('const STORAGE_KEY'), app.indexOf('export default function App')), { loader: 'jsx' }).code, context);

function notice() {
  return {
    documentUnit: 'thousand_yen', primaryIndustry: '建築一式', multipleIndustries: true,
    amounts: {
      avgKanseikoujidaka: 153760, avgMotoukeKoujidaka: 147165,
      uriage: 308709, equity: 47958, currentNetAssets:47958, currentTotalCapital:275185, debt: 227227, interest: 2330, avgProfit: 18095,
      fixedAssets: 178282, grossProfit: 77628, operatingCFCurrent: -6540, operatingCFPrevious: 16868,
      retainedEarnings: 27958, ordinaryProfit: 1555, interestIncome: 4, previousTotalCapital: 288277,
    },
    // OCR can confuse capital-based and sales-based ratios; printed amounts win.
    ratios: { profitRatePercent: 0.504, grossProfitRatePercent: 27.554 },
    scores: { p: 658, x1: 758, x2: 655, y: 638, z: 724, w: 411 },
    technicalStaff: { level1: 2, level1WithCertificate: 2, level2: 1 },
  };
}

test('notice averages and profit are applied to X1/X2/Z2 without replacing current revenues', () => {
  const result = parser.buildParsedResultFromGeminiOcr(notice(), { forcedIndustry: '建築一式' });
  const original = calc.createDefaultYears(0)[0];
  const year = applyFinancialImport(context.mergeKeishinImportPatch(original, result.patch), result, {companyId:'test',periodEnd:'2025-06-30',ruleSetId:'2026-07'});
  assert.equal(year.kanseikoujidaka, original.kanseikoujidaka);
  assert.equal(year.motoukeKoujidaka, original.motoukeKoujidaka);
  assert.equal(year.avgRevenueOverride.enabled, true);
  assert.equal(year.avgRevenueOverride.completionRevenue, 15376);
  assert.equal(year.avgRevenueOverride.principalRevenue, 14716.5);
  assert.equal(year.avgProfit, 1809.5);
  assert.equal(year.equity, 4795.8);
  assert.equal(year.operatingCF, 516.4);
  assert.ok(Math.abs(year.grossProfitRate - 77628 / 308709) < 1e-12);
  assert.ok(Math.abs(year.profitRate - 1555 / 308709) < 1e-12);
  const score = calc.calcAllScores([year], 'full', 'manual')[0];
  assert.equal(score.avgRevenue, 15376);
  assert.equal(score.avgPrincipalRevenue, 14716.5);
  assert.equal(score.x1, 758);
  assert.equal(score.x2, 655);
  assert.equal(score.z, 724);
  assert.equal(score.w, 0);
  assert.equal(score.wOverridden, false);
  assert.equal(year.referenceAssessments[0].scores.w, 411);
  assert.equal(score.y, 638);
  assert.equal(score.p, 596);
});

test('ZATTA: selected rows, zero averages, Y inputs and negative kentaikyo evidence', () => {
  const raw = notice();
  raw.averageYears = 2;
  raw.amounts = {
    uriage: 219193, equity: 2276, currentNetAssets:2276, currentTotalCapital:111636, currentLiabilities: 58283, fixedLiabilities: 51076,
    interest: 923, interestIncome: 20, previousTotalCapital: 45614, avgProfit: 5937,
    fixedAssets: 19204, grossProfit: 66358, ordinaryProfit: 6064,
    operatingCFCurrent: 15586, operatingCFPrevious: -27655, retainedEarnings: 1276,
  };
  raw.scores = { p: 0, x1: 0, z: 0, x2: 502, y: 831, w: 0 };
  raw.flags = { kentaikyo: true };
  raw.flagSources = { kentaikyo: '建設業退職金共済事業制度加入の有無 無' };
  const staff = { level1: 2, level1WithCertificate: 1, level2: 1, kanriAssistant: 0, coreSkill: 0, other: 0 };
  raw.industryRows = [
    { industry: '建築一式', p: 611, x1: 762, z: 717, avgKanseikoujidaka: 160009, avgMotoukeKoujidaka: 160009, technicalStaffCells: [2, 1, 0, 0, 1, 0], technicalStaff: { ...staff, level2: null, other: 1 } },
    { industry: '内装仕上', p: 545, x1: 556, z: 659, avgKanseikoujidaka: 15883, avgMotoukeKoujidaka: 14142, technicalStaff: staff },
    { industry: '大工', p: 455, x1: 397, z: 456, avgKanseikoujidaka: 0, avgMotoukeKoujidaka: 0, technicalStaff: Object.fromEntries(Object.keys(staff).map(k => [k, 0])) },
  ];
  for (const row of raw.industryRows) {
    const result = parser.buildParsedResultFromGeminiOcr(raw, { forcedIndustry: row.industry });
    const year = applyFinancialImport(context.mergeKeishinImportPatch(calc.createDefaultYears(0)[0], result.patch), result, {companyId:'test',periodEnd:'2025-06-30',ruleSetId:'2026-07'});
    assert.equal(calc.calcAllScores([year], 'full', 'manual')[0].yDetail.status, 'invalid');
    year.accuracy.options.capitalReconciliation = true; // original notice total differs by 1千円 from rounded components
    assert.equal(year.avgMethod, '2year');
    assert.equal(year.wInput.welfare.kentaikyo, false);
    const score = calc.calcAllScores([year], 'full', 'manual')[0];
    for (const key of ['p', 'x1', 'z']) assert.equal(score[key], row[key], `${row.industry} ${key}`);
    assert.equal(score.y, 831);
  }
});

test('empty average falls back while explicit zero overrides existing construction revenue', () => {
  const year = calc.createDefaultYears(0)[0];
  year.avgRevenueOverride = { enabled: true, completionRevenue: 0, principalRevenue: null };
  const score = calc.calcAllScores([year], 'simple', 'manual')[0];
  assert.equal(score.avgRevenue, 0);
  assert.equal(score.avgPrincipalRevenue, year.motoukeKoujidaka);
});

test('independent comparison detects Z and W differences without changing computed scores', () => {
  const result = parser.buildParsedResultFromGeminiOcr(notice(), { forcedIndustry:'建築一式' });
  result.patch.zInput.level2 = 0;
  const year = applyFinancialImport(context.mergeKeishinImportPatch(calc.createDefaultYears(0)[0], result.patch), result, {companyId:'test',periodEnd:'2025-06-30',ruleSetId:'2026-07'});
  const score=calc.calcAllScores([year],'full','manual')[0];
  const rows=compareAssessment(score,year.referenceAssessments[0],year);
  assert.equal(rows.find(r=>r.key==='z').status,'差異あり');
  assert.equal(rows.find(r=>r.key==='w').delta,-411);
});

test('OCR cannot substitute sales or averages for current completed construction', () => {
  for (const evidence of [undefined, '売上高 308,709', '完成工事高 3年平均 308,709']) {
    const raw = notice();
    raw.amounts.kanseikoujidakaCurrent = 308709;
    raw.amountSources = { kanseikoujidakaCurrent: evidence };
    const result = parser.buildParsedResultFromGeminiOcr(raw);
    assert.equal(result.patch.kanseikoujidaka, undefined);
    assert.equal(result.patch.uriage, 30870.9);
  }
});

test('liability components supply debt and missing financial inputs are reported', () => {
  const raw = notice();
  raw.amounts.debt = null;
  raw.amounts.currentLiabilities = 60436;
  raw.amounts.fixedLiabilities = 166791;
  const result = parser.buildParsedResultFromGeminiOcr(raw);
  assert.ok(Math.abs(result.patch.debt - 22722.7) < 1e-9);
  delete raw.amounts.fixedLiabilities;
  const missing = parser.buildParsedResultFromGeminiOcr(raw);
  assert.equal(missing.patch.debt, undefined);
  assert.ok(missing.warnings.some(message => message.includes('負債総額') && message.includes('未取得')));
});

test('explicit current completed construction imports without inventing principal construction', () => {
  const raw = notice();
  raw.amounts.kanseikoujidakaCurrent = 120000;
  raw.amountSources = { kanseikoujidakaCurrent: '当期完成工事高 120,000 千円' };
  const parsed = parser.buildParsedResultFromGeminiOcr(raw);
  const original = calc.createDefaultYears(0)[0];
  const year = context.mergeKeishinImportPatch(original, parsed.patch);
  assert.equal(year.kanseikoujidaka, 12000);
  assert.equal(year.motoukeKoujidaka, original.motoukeKoujidaka);
});

test('text PDF average fields use the same import mapping', () => {
  const result = parser.parseKeishinText('金額単位：千円\n年間平均完成工事高 153760 千円\n年間平均元請完成工事高 147165 千円\n平均利益額 18095 千円');
  const year = applyFinancialImport(context.mergeKeishinImportPatch(calc.createDefaultYears(0)[0], result.patch), result, {companyId:'test',periodEnd:'2025-06-30',ruleSetId:'2026-07'});
  assert.equal(year.avgRevenueOverride.enabled, true);
  assert.equal(year.avgRevenueOverride.completionRevenue, 15376);
  assert.equal(year.avgRevenueOverride.principalRevenue, 14716.5);
  assert.equal(year.avgProfit, 1809.5);
});

test('text PDF retains original profit amounts and explicitly labelled periods', () => {
  const result=parser.parseKeishinText('金額単位：千円\n売上総利益 66358 千円\n経常利益 6064 千円\n当期純資産 2276 千円\n総資本(当期) 111636 千円\n総資本(前期) 45614 千円\n営業キャッシュフロー(当期) 15586 千円\n営業キャッシュフロー(前期) -27655 千円');
  assert.deepEqual(result.financialInputs.periods.current,{grossProfit:66358,ordinaryProfit:6064,netAssets:2276,totalAssets:111636,keishinOperatingCF:15586});
  assert.deepEqual(result.financialInputs.periods.prior,{totalAssets:45614,keishinOperatingCF:-27655});
});

test('multi-industry OCR leaves an unidentified principal amount blank', () => {
  const raw=notice();raw.amounts.motoukeKoujidakaCurrent=123456;
  raw.amountSources={motoukeKoujidakaCurrent:'当期元請完成工事高 123456 千円'};
  const result=parser.buildParsedResultFromGeminiOcr(raw);
  assert.equal(result.patch.motoukeKoujidaka,undefined);
  assert.ok(result.warnings.some(w=>w.includes('個別値を特定できない')));
});
