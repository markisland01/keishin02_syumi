// ===== デフォルト値（売上約1億円規模の建設会社） =====
export const DEFAULT_YEAR_DATA = {
  staff: 2,               // 在宅スタッフ数（名）
  bidsPerStaff: 3.5,      // 1名当たりの月間入札数（件/名/月）
  winRate: 0.30,          // 落札率
  avgContractAmount: 400, // 平均落札金額（万円）
  profitRate: 0.06,       // 経常利益率
  equity: 3000,           // 自己資本（万円）
  debt: 4000,             // 借入金残高（万円）
  interest: 80,           // 支払利息（万円/年）
  avgProfit: 300,         // 平均利益（万円/年）
  // --- 詳細版(8指標)用の追加入力 ---
  grossProfitRate: 0.15,  // 売上総利益率（粗利率）※建設業15%前後
  fixedAssets: 2800,      // 固定資産（万円）※総資本の約40%
  operatingCF: 390,       // 営業キャッシュフロー（万円/年）
  retainedEarnings: 1800, // 利益剰余金（万円）
  // ---
  level1: 1,              // 1級技術者数
  level2: 2,              // 2級技術者数
  wItems: {
    socialInsurance: true,
    kenkyukyo: true,
    legalAccident: false,
    retirementPlan: false,
    iso9001: false,
    iso14001: false,
    youngWorkers: false,
  },
};

export const RANK_THRESHOLDS = { A: 900, B: 800, C: 700 };

export const RANK_TARGET_OPTIONS = ['C', 'B', 'A'];

// スライダーの設定
export const SLIDER_CONFIGS = {
  staff: {
    label: '在宅スタッフ数',
    min: 1, max: 10, step: 1, unit: '名',
  },
  bidsPerStaff: {
    label: '1名あたり月間入札数',
    min: 1, max: 20, step: 0.5, unit: '件/名',
    display: v => v.toFixed(1),
  },
  winRate: {
    label: '落札率',
    min: 0.05, max: 0.80, step: 0.01, unit: '%',
    display: v => Math.round(v * 100),
  },
  avgContractAmount: {
    label: '平均落札金額',
    min: 100, max: 5000, step: 50, unit: '万円',
  },
  profitRate: {
    label: '利益率（経常）',
    min: 0.01, max: 0.20, step: 0.005, unit: '%',
    display: v => (v * 100).toFixed(1),
  },
  equity: {
    label: '自己資本',
    min: 500, max: 50000, step: 500, unit: '万円',
  },
  debt: {
    label: '借入金残高',
    min: 0, max: 50000, step: 500, unit: '万円',
  },
  interest: {
    label: '支払利息',
    min: 0, max: 2000, step: 10, unit: '万円/年',
  },
  grossProfitRate: {
    label: '売上総利益率（粗利率）',
    min: 0.05, max: 0.40, step: 0.005, unit: '%',
    display: v => (v * 100).toFixed(1),
  },
  fixedAssets: {
    label: '固定資産',
    min: 0, max: 50000, step: 100, unit: '万円',
  },
  operatingCF: {
    label: '営業キャッシュフロー',
    min: -2000, max: 20000, step: 50, unit: '万円/年',
  },
  retainedEarnings: {
    label: '利益剰余金',
    min: 0, max: 100000, step: 100, unit: '万円',
  },
  level1: {
    label: '1級技術者数',
    min: 0, max: 15, step: 1, unit: '名',
  },
  level2: {
    label: '2級技術者数',
    min: 0, max: 15, step: 1, unit: '名',
  },
};

export const W_ITEMS_CONFIG = [
  { key: 'socialInsurance', label: '社会保険完備',          points: 15 },
  { key: 'kenkyukyo',       label: '建退共加入',            points: 15 },
  { key: 'legalAccident',   label: '法定外労災保険',        points: 10 },
  { key: 'retirementPlan',  label: '退職金制度（中退共等）', points: 8  },
  { key: 'iso9001',         label: 'ISO 9001',              points: 7  },
  { key: 'iso14001',        label: 'ISO 14001',             points: 5  },
  { key: 'youngWorkers',    label: '若年・女性技術者配慮',  points: 5  },
];

// ===== 計算関数 =====

// 月間入札件数（合計）= 在宅スタッフ数 × 1名あたり月間入札数
export function getMonthlyBids(staff, bidsPerStaff) {
  return Math.round(staff * bidsPerStaff);
}

// 完成工事高の2年 or 3年平均（有利な方）
export function calcAvgRevenue(revenues) {
  if (!revenues || revenues.length === 0) return 0;
  if (revenues.length === 1) return revenues[0];
  const n = revenues.length;
  const avg2 = (revenues[n - 2] + revenues[n - 1]) / 2;
  if (n < 3) return avg2;
  const avg3 = (revenues[n - 3] + revenues[n - 2] + revenues[n - 1]) / 3;
  return Math.max(avg2, avg3);
}

// X1点：完成工事高 → 評点（実経審X1表の近似）
// 1億円=634点, 10倍ごとに+125点（実表: 1億634→10億763→100億885 にフィット）
export function calcX1(avgRevenueMan) {
  if (avgRevenueMan <= 0) return 397;
  const base = 634;
  const delta = 125 * Math.log10(avgRevenueMan / 10000);
  return Math.round(Math.max(397, Math.min(2309, base + delta)));
}

// X2点：自己資本・平均利益 → 評点（簡易計算）
export function calcX2(equityMan, avgProfitMan) {
  const base = 600;
  const eD = Math.min(150, equityMan / 40);
  const pD = Math.min(80, avgProfitMan / 8);
  return Math.round(base + eD + pD);
}

// Y点：経営状況分析（簡易版・4指標近似）
// 主要4指標から近似：自己資本比率・売上高経常利益率・支払利息比率・負債回転期間
export function calcY({ revenue, profitRate, equity, debt, interest }) {
  if (revenue <= 0) return 620;
  const totalCap = equity + debt;
  const eqRatio = totalCap > 0 ? equity / totalCap : 0;
  const intRatio = revenue > 0 ? interest / revenue : 0;
  const debtTurn = revenue > 0 ? debt / (revenue / 12) : 0;

  let y = 720;
  y += profitRate * 500;              // 利益率6% → +30
  y += (eqRatio - 0.3) * 200;        // 自己資本比率（30%基準）
  y -= intRatio * 1000;              // 支払利息比率（低いほど良い）
  y -= (debtTurn - 4) * 5;          // 負債回転期間（4ヶ月基準）
  return Math.round(Math.max(450, Math.min(900, y)));
}

// Y点：経営状況分析（詳細版・実経審8指標の近似）
// 実経審公式: Y = 167.3 × A + 583 （A = 8指標評点の平均）
// 8指標:
//   1. 純支払利息比率    2. 負債回転期間
//   3. 総資本売上総利益率 4. 売上高経常利益率
//   5. 自己資本対固定資産比率 6. 自己資本比率
//   7. 営業キャッシュフロー(絶対額) 8. 利益剰余金(絶対額)
export function calcYFull({
  revenue, profitRate, equity, debt, interest,
  grossProfitRate, fixedAssets, operatingCF, retainedEarnings,
}) {
  if (revenue <= 0) return 583;
  const totalCap = equity + debt;
  const grossProfit = revenue * grossProfitRate;

  // 8指標の算定値
  const r1 = (interest / revenue) * 100;                                    // 純支払利息比率(%)
  const r2 = debt / (revenue / 12);                                         // 負債回転期間(月)
  const r3 = totalCap > 0 ? (grossProfit / totalCap) * 100 : 0;             // 総資本売上総利益率(%)
  const r4 = profitRate * 100;                                              // 売上高経常利益率(%)
  const r5 = fixedAssets > 0 ? (equity / fixedAssets) * 100 : 200;          // 自己資本対固定資産比率(%)
  const r6 = totalCap > 0 ? (equity / totalCap) * 100 : 0;                  // 自己資本比率(%)
  const r7 = operatingCF / 10000;                                           // 営業CF(億円)
  const r8 = retainedEarnings / 10000;                                      // 利益剰余金(億円)

  // 各指標を 0〜2点 にマッピング（標準=1点）
  const clip = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const f1 = clip(2 - r1 / 2, 0, 2);          // 0%→2, 4%→0
  const f2 = clip(2 - (r2 - 1) / 3.5, 0, 2);  // 1月→2, 8月→0
  const f3 = clip((r3 - 5) / 12.5, 0, 2);     // 5%→0, 30%→2
  const f4 = clip(r4 / 5, 0, 2);               // 0%→0, 10%→2
  const f5 = clip((r5 - 50) / 125, 0, 2);     // 50%→0, 300%→2
  const f6 = clip(r6 / 30, 0, 2);              // 0%→0, 60%→2
  const f7 = clip(1 + r7 * 0.5, 0, 2);        // 0億→1, 2億→2
  const f8 = clip(1 + r8 * 0.1, 0, 2);        // 0億→1, 10億→2

  const A = (f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8) / 8;
  const y = 167.3 * A + 583;
  return Math.round(Math.max(450, Math.min(900, y)));
}

// Z点：技術力 → 評点（簡易計算）
export function calcZ(level1, level2) {
  return Math.round(Math.min(1000, 700 + level1 * 60 + level2 * 20));
}

// W点：社会性等
export function calcW(items) {
  let w = 0;
  if (items.socialInsurance) w += 15;
  if (items.kenkyukyo)       w += 15;
  if (items.legalAccident)   w += 10;
  if (items.retirementPlan)  w += 8;
  if (items.iso9001)         w += 7;
  if (items.iso14001)        w += 5;
  if (items.youngWorkers)    w += 5;
  return Math.min(100, w);
}

// P点 = 0.25X1 + 0.15X2 + 0.20Y + 0.25Z + 0.15W
export function calcP(x1, x2, y, z, w) {
  return Math.round(0.25 * x1 + 0.15 * x2 + 0.20 * y + 0.25 * z + 0.15 * w);
}

// ランク判定
export function getRank(p, thresholds = RANK_THRESHOLDS) {
  if (p >= thresholds.A) return 'A';
  if (p >= thresholds.B) return 'B';
  if (p >= thresholds.C) return 'C';
  return 'D';
}

// 全年度のスコアを一括計算
// 完成工事高は前年の実績を引き継いで2〜3年平均を算出
// yModel: 'simple' = 4指標簡易版, 'full' = 8指標詳細版
export function calcAllScores(years, yModel = 'simple') {
  const scores = [];
  const revenueHistory = [];
  const yFunc = yModel === 'full' ? calcYFull : calcY;

  for (const yd of years) {
    const monthlyBids = getMonthlyBids(yd.staff, yd.bidsPerStaff);
    const rawRevenue = monthlyBids * yd.winRate * yd.avgContractAmount * 12;

    const all = [...revenueHistory, rawRevenue];
    const avgRevenue = calcAvgRevenue(all.slice(-3));

    const x1 = calcX1(avgRevenue);
    const x2 = calcX2(yd.equity, yd.avgProfit);
    const y = yFunc({
      revenue: rawRevenue,
      profitRate: yd.profitRate,
      equity: yd.equity,
      debt: yd.debt,
      interest: yd.interest,
      grossProfitRate: yd.grossProfitRate,
      fixedAssets: yd.fixedAssets,
      operatingCF: yd.operatingCF,
      retainedEarnings: yd.retainedEarnings,
    });
    const z = calcZ(yd.level1, yd.level2);
    const w = calcW(yd.wItems);
    const p = calcP(x1, x2, y, z, w);

    scores.push({
      rawRevenue,
      avgRevenue,
      x1, x2, y, z, w, p,
      rank: getRank(p),
      monthlyBids,
    });
    revenueHistory.push(rawRevenue);
  }
  return scores;
}

// N年分のデフォルトyears配列を生成
export function createDefaultYears(n) {
  return Array.from({ length: n + 1 }, () => ({
    ...DEFAULT_YEAR_DATA,
    wItems: { ...DEFAULT_YEAR_DATA.wItems },
  }));
}
