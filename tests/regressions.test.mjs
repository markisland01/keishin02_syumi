import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/utils/calculations.js', import.meta.url), 'utf8');
const calc = await import('../src/utils/calculations.js');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

function legacyYear() {
  const year = calc.createDefaultYears(0)[0];
  delete year.providedInputs;
  delete year.calculationVersion;
  delete year.accuracy;
  return { ...year, grossProfitRate: 0.25, fixedAssets: 10000, operatingCF: 2000, retainedEarnings: 5000 };
}

test('legacy saved values retain detailed Y calculation after migration', () => {
  const original = legacyYear();
  const [year] = calc.migrateSavedYears([original]);
  const score = calc.calcAllScores([year], 'full', 'manual')[0];
  assert.equal(score.yDetail.appliedModel, 'full');
  assert.equal(score.y, calc.calcYFull({ ...original, revenue: original.uriage }));
  assert.equal(original.providedInputs, undefined);
  assert.deepEqual(calc.migrateSavedYears([year]), [year]);
});

test('migration accepts zero, rejects missing values, and preserves explicit flags', () => {
  const legacy = { ...legacyYear(), operatingCF: 0, retainedEarnings: '' };
  delete legacy.fixedAssets;
  const [year] = calc.migrateSavedYears([legacy]);
  assert.deepEqual(calc.getMissingDetailedYInputKeys(year), ['fixedAssets', 'retainedEarnings']);
  const fresh = calc.createDefaultYears(0)[0];
  assert.equal(calc.migrateSavedYears([fresh])[0], fresh);
  assert.equal(calc.hasCompleteDetailedYInputs(fresh), false);
});

// Execute the actual App callbacks with state setters and a deferred PDF reader.
// No OCR service or browser storage is contacted by these regression tests.
function harness() {
  const pending = [];
  const context = vm.createContext({
    ...calc,
    years: [legacyYear()], activeYear: 0,
    pdfImportRequest: { current: 0 },
    pdfImportState: { status: 'idle' },
    extractKeishinPdf: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    buildPdfImportResult: (_year, result) => result,
    mergeKeishinImportPatch: (year, patch) => ({ ...year, ...patch }),
    shouldSwitchToManualMode: () => true,
    setInputMode: value => { context.inputMode = value; },
    setYModel: value => { context.yModel = value; },
    setYears: value => { context.years = typeof value === 'function' ? value(context.years) : value; },
    setPdfImportState: value => { context.pdfImportState = value; },
    setBaselineYears: value => { context.baselineYears = typeof value === 'function' ? value(context.baselineYears) : value; },
    cloneBaselineYears: years => years.map(year => ({ ...year })),
    setN() {}, setTargetRank() {}, setTargetP() {}, setRevenueGrowthRate() {},
    setActiveYear: value => { context.activeYear = value; },
  });
  for (const [start, end] of [
    ['  function invalidatePdfImport()', '  useLayoutEffect('],
    ['  function applyScenarioData(', '  function handleSaveAsNewScenario('],
    ['  async function handlePdfFileSelect(', '  function handlePdfImportApply('],
  ]) {
    vm.runInContext(app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start))), context);
  }
  return { context, pending };
}

const result = { detectedFields: ['uriage'], patch: { uriage: 99999 } };

test('switching scenario while PDF loads preserves the new scenario and clears import status', async () => {
  const { context: c, pending } = harness();
  const loading = c.handlePdfFileSelect({ name: 'old.pdf' });
  c.applyScenarioData({ years: [{ ...legacyYear(), uriage: 12345 }], yModel: 'full', inputMode: 'auto' });
  pending[0].resolve(result);
  await loading;
  assert.equal(c.years[0].uriage, 12345);
  assert.equal(c.pdfImportState.status, 'idle');
  assert.equal(c.inputMode, 'auto');
  assert.equal(c.yModel, 'full');
  assert.equal(calc.hasCompleteDetailedYInputs(c.years[0]), true);
});

test('an invalidated PDF failure cannot replace the cleared status', async () => {
  const { context: c, pending } = harness();
  const loading = c.handlePdfFileSelect({ name: 'old.pdf' });
  c.invalidatePdfImport();
  pending[0].reject(new Error('late OCR failure'));
  await loading;
  assert.equal(c.pdfImportState.status, 'idle');
});

test('latest PDF stays in preview until confirmation and an older request cannot overwrite it', async () => {
  const { context: c, pending } = harness();
  const old = c.handlePdfFileSelect({ name: 'old.pdf' });
  const latest = c.handlePdfFileSelect({ name: 'new.pdf' });
  pending[1].resolve(result);
  await latest;
  pending[0].resolve({ ...result, patch: { uriage: 1 } });
  await old;
  assert.equal(c.years[0].uriage, 10000);
  assert.equal(c.pdfImportState.result.patch.uriage, 99999);
  assert.equal(c.pdfImportState.fileName, 'new.pdf');
  assert.equal(c.pdfImportState.status, 'ready');
});

test('PDF selection is ignored for future years', async () => {
  const { context: c, pending } = harness();
  c.activeYear = 1;
  await c.handlePdfFileSelect({ name: 'future.pdf' });
  assert.equal(pending.length, 0);
  assert.equal(c.pdfImportState.status, 'idle');
});

test('changing the visible period preserves hidden forecast edits', () => {
  const context = vm.createContext({
    revenueGrowthRate: 1.2,
    activeYear: 0,
    years: [{ id: 'y0' }, { id: 'y1' }, { id: 'y2' }],
    baselineYears: [{ id: 'b0' }, { id: 'b1' }, { id: 'b2' }],
    setN: value => { context.n = value; },
    setActiveYear: value => { context.activeYear = value; },
    setYears: value => { context.years = typeof value === 'function' ? value(context.years) : value; },
    setBaselineYears: value => { context.baselineYears = typeof value === 'function' ? value(context.baselineYears) : value; },
    cloneFutureYear: (year, offset) => ({ ...year, id: `${year.id}+${offset}` }),
    applyGrowthRate: (_rate, values) => values.map((year, index) => ({ ...year, grown: index })),
  });
  vm.runInContext(app.slice(app.indexOf('  function handleNChange('), app.indexOf('  function handleSliderChange(', app.indexOf('  function handleNChange('))), context);

  context.handleNChange(4);
  const hiddenEdit = context.years[4];
  assert.equal(context.years[0].id, 'y0');
  assert.equal(context.years[2].id, 'y2');
  context.handleNChange(1);
  context.handleNChange(4);
  assert.deepEqual(context.years[4], hiddenEdit);
});

test('automatic storage restore also migrates legacy years', () => {
  const context = vm.createContext({
    migrateSavedYears: calc.migrateSavedYears,
    STORAGE_KEY: 'test', STORAGE_VERSION: 1,
    localStorage: { getItem: () => JSON.stringify({ version: 1, data: { years: [legacyYear()], yModel: 'full' } }) },
  });
  vm.runInContext(app.slice(app.indexOf('function loadFromStorage()'), app.indexOf('function saveToStorage(')), context);
  assert.equal(calc.hasCompleteDetailedYInputs(context.loadFromStorage().years[0]), true);
});
