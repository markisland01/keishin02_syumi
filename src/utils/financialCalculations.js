// Exact decimal rational arithmetic. Rounding is HALF_UP, including negatives.
const gcd = (a, b) => b ? gcd(b, a % b) : (a < 0n ? -a : a);
export class Decimal {
  constructor(n, d = 1n) { n = BigInt(n); d = BigInt(d); if (!d) throw new Error('zero divisor'); const g = gcd(n, d); this.n = n / g * (d < 0n ? -1n : 1n); this.d = (d < 0n ? -d : d) / g; }
  static from(value) {
    if (value instanceof Decimal) return value;
    const s = String(value).trim().replace(/^([+-]?)\./, '$10.'); const m = s.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
    if (!m) throw new Error('invalid decimal');
    const digits = (m[3] || '').length - Number(m[4] || 0);
    const n = BigInt((m[1] === '-' ? '-' : '') + m[2] + (m[3] || ''));
    return digits >= 0 ? new Decimal(n, 10n ** BigInt(digits)) : new Decimal(n * 10n ** BigInt(-digits));
  }
  add(v) { v = Decimal.from(v); return new Decimal(this.n * v.d + v.n * this.d, this.d * v.d); }
  sub(v) { return this.add(Decimal.from(v).mul(-1)); }
  mul(v) { v = Decimal.from(v); return new Decimal(this.n * v.n, this.d * v.d); }
  div(v) { v = Decimal.from(v); return new Decimal(this.n * v.d, this.d * v.n); }
  round(digits = 0) { const scale = 10n ** BigInt(digits); const abs = this.n < 0n ? -this.n : this.n; let q = abs * scale / this.d; if (abs * scale % this.d * 2n >= this.d) q++; return new Decimal((this.n < 0n ? -q : q), scale); }
  number() { return Number(this.n) / Number(this.d); }
}
export const D = v => Decimal.from(v);
export const roundDecimal = (v, digits = 0) => D(v).round(digits).number();
export const present = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));
export const FINANCIAL_FIELDS = {
  sales: '売上高', grossProfit: '売上総利益', ordinaryProfit: '経常利益', operatingProfit: '営業利益', depreciation: '減価償却実施額',
  interestPaid: '支払利息', interestDividendReceived: '受取利息配当金', corporateTaxes: '法人税等', netAssets: '純資産',
  totalDebt: '負債総額', totalAssets: '総資本', fixedAssets: '固定資産', retainedEarnings: '利益剰余金', keishinOperatingCF: '経審用営業CF',
  allowanceForDoubtfulAccounts: '貸倒引当金', tradeReceivables: '売掛債権', tradePayables: '仕入債務', inventories: '棚卸資産', advancesReceived: '未成工事受入金',
};
export const CF_BALANCES = ['allowanceForDoubtfulAccounts', 'tradeReceivables', 'tradePayables', 'inventories', 'advancesReceived'];
export const Y_RULES = [
  ['純支払利息比率', '-0.4650', -0.3, 5.1], ['負債回転期間', '-0.0508', 0.9, 18], ['総資本売上総利益率', '0.0264', 6.5, 63.6],
  ['売上高経常利益率', '0.0277', -8.5, 5.1], ['自己資本対固定資産比率', '0.0011', -76.5, 350], ['自己資本比率', '0.0089', -68.6, 68.5],
  ['営業キャッシュフロー', '0.0818', -10, 15], ['利益剰余金', '0.0172', -3, 100],
];
export function createFinancialData() {
  return { periods: { current: {}, prior: {}, prior2: {} }, options: { cfMode: 'periods', equityMode: 'current', profitMode: 'average', averageCF: '', equityDirect: '', averageProfit: '' },
    context: { companyId: '', periodEnd: '', applicationDate: '', months: 12, priorMonths: 12, entityType: 'corporation', consolidated: false, ruleSetId: 'unknown' }, sources: {}, confirmed: false, estimate: false };
}
export function calculateDetailedY(data = createFinancialData()) {
  const { periods = {}, options = {}, context = {} } = data;
  const missing = new Set(), errors = [], warnings = []; const c = periods.current || {}, p = periods.prior || {};
  const names = { current: '当期', prior: '前期', prior2: '前々期' };
  const read = (period, key) => {
    const v = periods[period]?.[key];
    if (!present(v)) { missing.add(`${names[period]} ${FINANCIAL_FIELDS[key] || key}`); return D(0); }
    return D(v);
  };
  for (const [period, values] of Object.entries(periods)) for (const [key, value] of Object.entries(values)) {
    if (value == null || value === '') continue;
    if (!present(value)) errors.push(`${names[period]} ${FINANCIAL_FIELDS[key] || key}: 数値を入力してください`);
    else if (['sales', 'totalAssets', 'totalDebt', 'fixedAssets', ...CF_BALANCES].includes(key) && Number(value) < 0) errors.push(`${names[period]} ${FINANCIAL_FIELDS[key]}: 負数は使用できません`);
  }
  const total = period => {
    const v = periods[period] || {};
    if (present(v.totalAssets)) {
      if (present(v.netAssets) && present(v.totalDebt)) {
        const difference = D(v.netAssets).add(v.totalDebt).sub(v.totalAssets).number();
        if (difference !== 0) {
          if (options.capitalReconciliation && Math.abs(difference) <= 1) warnings.push(`${names[period]}: 原本の総資本を採用（純資産＋負債との差 ${difference}千円、原本確認済み）`);
          else errors.push(`${names[period]}: 総資本と純資産＋負債が一致しません（差 ${difference}千円）`);
        }
      }
      return read(period, 'totalAssets');
    }
    return read(period, 'netAssets').add(read(period, 'totalDebt'));
  };
  const sales = read('current', 'sales'), equity = read('current', 'netAssets'), debt = read('current', 'totalDebt');
  const capital = total('current'), priorCapital = total('prior');
  const avgCapital = D(Math.max(30000, capital.add(priorCapital).div(2).number()));
  const gross = read('current', 'grossProfit'), ordinary = read('current', 'ordinaryProfit');
  const interest = read('current', 'interestPaid').sub(read('current', 'interestDividendReceived'));
  const fixed = read('current', 'fixedAssets'), retained = read('current', 'retainedEarnings');
  const cfTrace = [];
  const cf = (period, previous) => {
    if (options.cfMode === 'periods') return read(period, 'keishinOperatingCF');
    let v = read(period, 'ordinaryProfit').add(read(period, 'depreciation')).sub(read(period, 'corporateTaxes'));
    const base = v.number(), changes = {};
    if (options.cfMode !== 'simple') CF_BALANCES.forEach((key, i) => { const delta = read(period, key).sub(read(previous, key)); changes[key] = delta.number(); v = v.add(delta.mul([1, -1, 1, -1, 1][i])); });
    cfTrace.push({ period, base, changes, value: v.number() }); return v;
  };
  let avgCF;
  if (options.cfMode === 'average') { if (!present(options.averageCF)) missing.add('2期平均営業CF'); avgCF = D(present(options.averageCF) ? options.averageCF : 0); }
  else avgCF = cf('current', 'prior').add(cf('prior', 'prior2')).div(2);
  const values = [sales.n === 0n ? D(5.1) : interest.div(sales).mul(100), sales.n === 0n ? D(18) : debt.mul(12).div(sales),
    gross.div(avgCapital).mul(100), sales.n === 0n ? D(-8.5) : ordinary.div(sales).mul(100),
    fixed.n === 0n ? D(equity.n > 0n ? 350 : -76.5) : equity.div(fixed).mul(100), capital.n === 0n ? D(-68.6) : equity.div(capital).mul(100), avgCF.div(100000), retained.div(100000)];
  let a = D('0.1906');
  const indicators = values.map((v, i) => {
    const [label, coefficient, min, max] = Y_RULES[i]; const rounded = v.round(3);
    const bounded = D(Math.max(min, Math.min(max, rounded.number()))), contribution = bounded.mul(coefficient); a = a.add(contribution);
    return { key: `y${i + 1}`, label, raw: v.number(), rounded: rounded.number(), bounded: bounded.number(), coefficient: Number(coefficient), contribution: contribution.number() };
  });
  const unsupported = context.entityType !== 'corporation' || Boolean(context.consolidated) || Number(context.months) !== 12 || Number(context.priorMonths) !== 12;
  const status = unsupported ? 'unsupported' : errors.length ? 'invalid' : missing.size ? 'missing' : data.estimate || options.cfMode === 'simple' ? 'estimate' : 'complete';
  const canCalculate = status === 'complete' || status === 'estimate'; const aRounded = a.round(2), yRaw = aRounded.mul('167.3').add(583);
  return { status, missingFields: [...missing], validationErrors: errors, warnings, indicators: canCalculate ? indicators : [], cfTrace,
    inputs: { current: { ...c }, prior: { ...p }, averageCapital: avgCapital.number(), averageCF: avgCF.number() },
    aRaw: canCalculate ? a.number() : null, aRounded: canCalculate ? aRounded.number() : null, yRaw: canCalculate ? yRaw.number() : null,
    y: canCalculate ? Math.max(0, Math.min(1595, yRaw.round().number())) : null, calculationVersion: 'accuracy-v2' };
}
export function financialX2(data) {
  const c = data?.periods?.current || {}, p = data?.periods?.prior || {}, o = data?.options || {};
  const avg = (a, b) => present(a) && present(b) ? D(a).add(b).div(2).number() : null;
  const equity = o.equityMode === 'direct' ? (present(o.equityDirect) ? Number(o.equityDirect) : null) : o.equityMode === 'average' ? avg(c.netAssets, p.netAssets) : present(c.netAssets) ? Number(c.netAssets) : null;
  const profit = o.profitMode === 'direct' ? (present(o.averageProfit) ? Number(o.averageProfit) : null) : [c.operatingProfit, c.depreciation, p.operatingProfit, p.depreciation].every(present) ? D(c.operatingProfit).add(c.depreciation).add(p.operatingProfit).add(p.depreciation).div(2).number() : null;
  return { equity, profit };
}
export function changeDocumentUnit(doc, unit) {
  const scale = { en: '0.001', sen: '1', man: '10' };
  const next = { ...doc, unit };
  for (const [key, v] of Object.entries(doc)) if (key !== 'unit' && typeof v !== 'boolean' && present(v)) next[key] = String(D(v).mul(scale[doc.unit || 'man']).div(scale[unit]).number());
  return next;
}
