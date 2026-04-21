// ===== デフォルト値（売上約1億円規模の建設会社） =====
export const DEFAULT_YEAR_DATA = {
  staff: 2,               // 在宅スタッフ数（名）
  bidsPerStaff: 3.5,      // 1名当たりの月間入札数（件/名/月）
  winRate: 0.30,          // 落札率
  otherWinRate: 0.30,     // 役務・物販の落札率
  avgContractAmount: 400, // 平均落札金額（万円）
  constructionBidRatio: 1, // 入札のうち工事案件の割合
  constructionAvgContractAmount: 400, // 工事の平均落札金額（万円）
  otherAvgContractAmount: 400, // 役務・物販の平均落札金額（万円）
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
  // --- 手動入力モード用（inputMode === 'manual' の時のみ有効） ---
  kanseikoujidaka: 10000, // 完成工事高（万円/年）≒ 1億円
  uriage: 10000,          // 売上高（万円/年）
  motoukeSameAsKansei: true,
  motoukeKoujidaka: 10000, // 元請完成工事高（万円/年）
  avgMethod: '2year',
  industry: '土木一式',
  // ---
  level1: 0,              // 1級技術者数（旧互換）
  level2: 0,              // 2級技術者数（旧互換）
  zInput: {
    level1WithCertificate: 0,
    level1: 0,
    kanriAssistant: 0,
    coreSkill: 0,
    level2: 0,
    other: 0,
  },
  wItems: {
    socialInsurance: false,
    kenkyukyo: false,
    legalAccident: false,
    retirementPlan: false,
    iso9001: false,
    iso14001: false,
    youngWorkers: false,
  },
  wInput: {
    welfare: {
      kentaikyo: false,
      retirementOrPension: false,
      extraAccident: false,
      youngEngineerRatio: false,
      newYoungEngineerRatio: false,
      skillUpScore: 0,
      workLifeBalance: 'none',
      careerHistory: 'none',
      declaration: false,
    },
    continuity: {
      businessYears: 0,
      rehabilitation: 'none',
      disasterSupport: false,
      legalAction: 'none',
    },
    accounting: {
      auditStatus: 'none',
      cpaCount: 0,
      level2AccountingCount: 0,
    },
    research: {
      amount: 0,
    },
    machinery: {
      eligibleCount: 0,
    },
    certification: {
      iso9001: false,
      iso14001: false,
      ecoAction21: false,
    },
  },
};

export const RANK_THRESHOLDS = { A: 900, B: 800, C: 700 };

export const RANK_TARGET_OPTIONS = ['C', 'B', 'A'];

export const AVERAGE_METHOD_OPTIONS = [
  { value: '2year', label: '2年平均' },
  { value: '3year', label: '3年平均' },
];

export const INDUSTRY_OPTIONS = [
  '土木一式', '建築一式', '大工', '左官', 'とび・土工・コンクリート', '石', '屋根',
  '電気', '管', 'タイル・れんが・ブロック', '鋼構造物', '鉄筋', '舗装', 'しゅんせつ',
  '板金', 'ガラス', '塗装', '防水', '内装仕上', '機械器具設置', '熱絶縁', '電気通信',
  '造園', 'さく井', '建具', '水道施設', '消防施設', '清掃施設', '解体',
];

export const Z_TECHNICAL_ROLE_FIELDS = [
  { key: 'level1WithCertificate', label: '監理資格者証ありの1級', points: 6 },
  { key: 'level1', label: '1級資格者', points: 5 },
  { key: 'kanriAssistant', label: '監理技術者補佐', points: 4 },
  { key: 'coreSkill', label: '登録基幹技能者・レベル4', points: 3 },
  { key: 'level2', label: '2級資格者・1級技能士・レベル3', points: 2 },
  { key: 'other', label: '実務経験者などその他', points: 1 },
];

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
  kanseikoujidaka: {
    label: '完成工事高',
    min: 0, max: 500000, step: 100, unit: '万円/年',
  },
  uriage: {
    label: '売上高',
    min: 0, max: 500000, step: 100, unit: '万円/年',
  },
  motoukeKoujidaka: {
    label: '元請完成工事高',
    min: 0, max: 500000, step: 100, unit: '万円/年',
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

export const W_WORK_LIFE_BALANCE_OPTIONS = [
  { value: 'none', label: '認定なし', points: 0 },
  { value: 'eruboshi1', label: 'えるぼし（第1段階）', points: 2 },
  { value: 'eruboshi2', label: 'えるぼし（第2段階）', points: 3 },
  { value: 'eruboshi3', label: 'えるぼし（第3段階）', points: 4 },
  { value: 'platinumEruboshi', label: 'プラチナえるぼし', points: 5 },
  { value: 'tryKurumin', label: 'トライくるみん', points: 3 },
  { value: 'kurumin', label: 'くるみん', points: 3 },
  { value: 'platinumKurumin', label: 'プラチナくるみん', points: 5 },
  { value: 'yell', label: 'ユースエール', points: 4 },
];

export const W_CAREER_HISTORY_OPTIONS = [
  { value: 'none', label: '就業履歴の蓄積は未実施', points: 0 },
  { value: 'publicWorks', label: '直近1年の元請公共工事で実施', points: 5 },
  { value: 'allConstruction', label: '直近1年の元請工事すべてで実施', points: 10 },
];

export const W_REHABILITATION_OPTIONS = [
  { value: 'none', label: '再生・更生手続の適用なし', points: 0 },
  { value: 'ongoing', label: '再生・更生手続中', points: -60 },
];

export const W_LEGAL_ACTION_OPTIONS = [
  { value: 'none', label: '処分なし', points: 0 },
  { value: 'instruction', label: '指示処分あり', points: -15 },
  { value: 'suspension', label: '営業停止処分あり', points: -30 },
];

export const W_AUDIT_OPTIONS = [
  { value: 'none', label: '監査なし', points: 0 },
  { value: 'selfCheck', label: '経理処理の適正確認書類を提出', points: 2 },
  { value: 'accountingAdvisor', label: '会計参与を設置', points: 10 },
  { value: 'auditor', label: '会計監査人を設置', points: 20 },
];

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
export function calcAvgRevenue(revenues, method = '2year') {
  if (!revenues || revenues.length === 0) return 0;
  if (revenues.length === 1) return revenues[0];
  const n = revenues.length;
  const avg2 = (revenues[n - 2] + revenues[n - 1]) / 2;
  if (method === '2year' || n < 3) return avg2;
  const avg3 = (revenues[n - 3] + revenues[n - 2] + revenues[n - 1]) / 3;
  return avg3;
}

// X1点：完成工事高 → 評点（国交省告示の42区分テーブル）
// 各区分: { min: 下限(千円), a, b, c } → X1 = floor(a × K / b + c)
const X1_TABLE = [
  { min: 100000000, a: 0,   b: 1,         c: 2309 }, // 1,000億円以上
  { min:  80000000, a: 114, b: 20000000,   c: 1739 }, // 800億〜1,000億
  { min:  60000000, a: 101, b: 20000000,   c: 1791 }, // 600億〜800億
  { min:  50000000, a: 88,  b: 10000000,   c: 1566 }, // 500億〜600億
  { min:  40000000, a: 89,  b: 10000000,   c: 1561 }, // 400億〜500億
  { min:  30000000, a: 89,  b: 10000000,   c: 1561 }, // 300億〜400億
  { min:  25000000, a: 75,  b: 5000000,    c: 1378 }, // 250億〜300億
  { min:  20000000, a: 76,  b: 5000000,    c: 1373 }, // 200億〜250億
  { min:  15000000, a: 76,  b: 5000000,    c: 1373 }, // 150億〜200億
  { min:  12000000, a: 64,  b: 3000000,    c: 1281 }, // 120億〜150億
  { min:  10000000, a: 62,  b: 2000000,    c: 1165 }, // 100億〜120億
  { min:   8000000, a: 64,  b: 2000000,    c: 1155 }, // 80億〜100億
  { min:   6000000, a: 50,  b: 2000000,    c: 1211 }, // 60億〜80億
  { min:   5000000, a: 51,  b: 1000000,    c: 1055 }, // 50億〜60億
  { min:   4000000, a: 51,  b: 1000000,    c: 1055 }, // 40億〜50億
  { min:   3000000, a: 50,  b: 1000000,    c: 1059 }, // 30億〜40億
  { min:   2500000, a: 51,  b: 500000,     c: 903  }, // 25億〜30億
  { min:   2000000, a: 39,  b: 500000,     c: 963  }, // 20億〜25億
  { min:   1500000, a: 36,  b: 500000,     c: 975  }, // 15億〜20億
  { min:   1200000, a: 38,  b: 300000,     c: 893  }, // 12億〜15億
  { min:   1000000, a: 39,  b: 200000,     c: 811  }, // 10億〜12億
  { min:    800000, a: 38,  b: 200000,     c: 816  }, // 8億〜10億
  { min:    600000, a: 25,  b: 200000,     c: 868  }, // 6億〜8億
  { min:    500000, a: 25,  b: 100000,     c: 793  }, // 5億〜6億
  { min:    400000, a: 34,  b: 100000,     c: 748  }, // 4億〜5億
  { min:    300000, a: 42,  b: 100000,     c: 716  }, // 3億〜4億
  { min:    250000, a: 24,  b: 50000,      c: 698  }, // 2.5億〜3億
  { min:    200000, a: 28,  b: 50000,      c: 678  }, // 2億〜2.5億
  { min:    150000, a: 34,  b: 50000,      c: 654  }, // 1.5億〜2億
  { min:    120000, a: 26,  b: 30000,      c: 626  }, // 1.2億〜1.5億
  { min:    100000, a: 19,  b: 20000,      c: 616  }, // 1億〜1.2億
  { min:     80000, a: 22,  b: 20000,      c: 601  }, // 0.8億〜1億
  { min:     60000, a: 28,  b: 20000,      c: 577  }, // 0.6億〜0.8億
  { min:     50000, a: 16,  b: 10000,      c: 565  }, // 0.5億〜0.6億
  { min:     40000, a: 19,  b: 10000,      c: 550  }, // 0.4億〜0.5億
  { min:     30000, a: 24,  b: 10000,      c: 530  }, // 0.3億〜0.4億
  { min:     25000, a: 13,  b: 5000,       c: 524  }, // 0.25億〜0.3億
  { min:     20000, a: 16,  b: 5000,       c: 509  }, // 0.2億〜0.25億
  { min:     15000, a: 20,  b: 5000,       c: 493  }, // 0.15億〜0.2億
  { min:     12000, a: 14,  b: 3000,       c: 483  }, // 0.12億〜0.15億
  { min:     10000, a: 11,  b: 2000,       c: 473  }, // 0.1億〜0.12億
  { min:         0, a: 131, b: 10000,      c: 397  }, // 0.1億未満
];

export function calcX1(avgRevenueMan) {
  if (avgRevenueMan <= 0) return 397;
  const K = avgRevenueMan * 10; // 万円 → 千円
  const row = X1_TABLE.find(r => K >= r.min);
  return Math.floor(row.a * K / row.b + row.c);
}

// X2点：自己資本額・平均利益額 → 評点（国交省告示テーブル）
// X2 = floor((X21 + X22) / 2)

// X21テーブル：自己資本額（47区分）
// { min: 下限(千円), a, b, c } → X21 = floor(a × K / b + c)
const X21_TABLE = [
  { min: 300000000, a: 0,   b: 1,         c: 2114 }, // 3,000億円以上
  { min: 250000000, a: 63,  b: 50000000,  c: 1736 }, // 2,500億〜3,000億
  { min: 200000000, a: 73,  b: 50000000,  c: 1686 }, // 2,000億〜2,500億
  { min: 150000000, a: 91,  b: 50000000,  c: 1614 }, // 1,500億〜2,000億
  { min: 120000000, a: 66,  b: 30000000,  c: 1557 }, // 1,200億〜1,500億
  { min: 100000000, a: 53,  b: 20000000,  c: 1503 }, // 1,000億〜1,200億
  { min:  80000000, a: 61,  b: 20000000,  c: 1463 }, // 800億〜1,000億
  { min:  60000000, a: 75,  b: 20000000,  c: 1407 }, // 600億〜800億
  { min:  50000000, a: 46,  b: 10000000,  c: 1356 }, // 500億〜600億
  { min:  40000000, a: 53,  b: 10000000,  c: 1321 }, // 400億〜500億
  { min:  30000000, a: 66,  b: 10000000,  c: 1269 }, // 300億〜400億
  { min:  25000000, a: 39,  b: 5000000,   c: 1233 }, // 250億〜300億
  { min:  20000000, a: 47,  b: 5000000,   c: 1193 }, // 200億〜250億
  { min:  15000000, a: 57,  b: 5000000,   c: 1153 }, // 150億〜200億
  { min:  12000000, a: 42,  b: 3000000,   c: 1114 }, // 120億〜150億
  { min:  10000000, a: 33,  b: 2000000,   c: 1084 }, // 100億〜120億
  { min:   8000000, a: 39,  b: 2000000,   c: 1054 }, // 80億〜100億
  { min:   6000000, a: 47,  b: 2000000,   c: 1022 }, // 60億〜80億
  { min:   5000000, a: 29,  b: 1000000,   c: 989  }, // 50億〜60億
  { min:   4000000, a: 34,  b: 1000000,   c: 964  }, // 40億〜50億
  { min:   3000000, a: 41,  b: 1000000,   c: 936  }, // 30億〜40億
  { min:   2500000, a: 25,  b: 500000,    c: 909  }, // 25億〜30億
  { min:   2000000, a: 29,  b: 500000,    c: 889  }, // 20億〜25億
  { min:   1500000, a: 36,  b: 500000,    c: 861  }, // 15億〜20億
  { min:   1200000, a: 27,  b: 300000,    c: 834  }, // 12億〜15億
  { min:   1000000, a: 21,  b: 200000,    c: 816  }, // 10億〜12億
  { min:    800000, a: 24,  b: 200000,    c: 801  }, // 8億〜10億
  { min:    600000, a: 30,  b: 200000,    c: 777  }, // 6億〜8億
  { min:    500000, a: 18,  b: 100000,    c: 759  }, // 5億〜6億
  { min:    400000, a: 21,  b: 100000,    c: 744  }, // 4億〜5億
  { min:    300000, a: 27,  b: 100000,    c: 720  }, // 3億〜4億
  { min:    250000, a: 15,  b: 50000,     c: 711  }, // 2,500万〜3億
  { min:    200000, a: 19,  b: 50000,     c: 691  }, // 2,000万〜2,500万
  { min:    150000, a: 23,  b: 50000,     c: 675  }, // 1,500万〜2,000万
  { min:    120000, a: 16,  b: 30000,     c: 664  }, // 1,200万〜1,500万
  { min:    100000, a: 13,  b: 20000,     c: 650  }, // 1,000万〜1,200万
  { min:     80000, a: 16,  b: 20000,     c: 635  }, // 800万〜1,000万
  { min:     60000, a: 19,  b: 20000,     c: 623  }, // 600万〜800万
  { min:     50000, a: 11,  b: 10000,     c: 614  }, // 500万〜600万
  { min:     40000, a: 14,  b: 10000,     c: 599  }, // 400万〜500万
  { min:     30000, a: 16,  b: 10000,     c: 591  }, // 300万〜400万
  { min:     25000, a: 10,  b: 5000,      c: 579  }, // 250万〜300万
  { min:     20000, a: 12,  b: 5000,      c: 569  }, // 200万〜250万
  { min:     15000, a: 14,  b: 5000,      c: 561  }, // 150万〜200万
  { min:     12000, a: 11,  b: 3000,      c: 548  }, // 120万〜150万
  { min:     10000, a: 8,   b: 2000,      c: 544  }, // 100万〜120万
  { min:         0, a: 223, b: 10000,     c: 361  }, // 100万円未満（負含む）
];

// X22テーブル：平均利益額（37区分）
const X22_TABLE = [
  { min: 30000000, a: 0,   b: 1,        c: 2447 }, // 300億円以上
  { min: 25000000, a: 134, b: 5000000,  c: 1643 }, // 250億〜300億
  { min: 20000000, a: 151, b: 5000000,  c: 1558 }, // 200億〜250億
  { min: 15000000, a: 175, b: 5000000,  c: 1462 }, // 150億〜200億
  { min: 12000000, a: 123, b: 3000000,  c: 1372 }, // 120億〜150億
  { min: 10000000, a: 93,  b: 2000000,  c: 1306 }, // 100億〜120億
  { min:  8000000, a: 104, b: 2000000,  c: 1251 }, // 80億〜100億
  { min:  6000000, a: 122, b: 2000000,  c: 1179 }, // 60億〜80億
  { min:  5000000, a: 70,  b: 1000000,  c: 1125 }, // 50億〜60億
  { min:  4000000, a: 79,  b: 1000000,  c: 1080 }, // 40億〜50億
  { min:  3000000, a: 92,  b: 1000000,  c: 1028 }, // 30億〜40億
  { min:  2500000, a: 54,  b: 500000,   c: 980  }, // 25億〜30億
  { min:  2000000, a: 60,  b: 500000,   c: 950  }, // 20億〜25億
  { min:  1500000, a: 70,  b: 500000,   c: 910  }, // 15億〜20億
  { min:  1200000, a: 48,  b: 300000,   c: 880  }, // 12億〜15億
  { min:  1000000, a: 37,  b: 200000,   c: 850  }, // 10億〜12億
  { min:   800000, a: 42,  b: 200000,   c: 825  }, // 8億〜10億
  { min:   600000, a: 48,  b: 200000,   c: 801  }, // 6億〜8億
  { min:   500000, a: 28,  b: 100000,   c: 777  }, // 5億〜6億
  { min:   400000, a: 32,  b: 100000,   c: 757  }, // 4億〜5億
  { min:   300000, a: 37,  b: 100000,   c: 737  }, // 3億〜4億
  { min:   250000, a: 21,  b: 50000,    c: 722  }, // 2,500万〜3億
  { min:   200000, a: 24,  b: 50000,    c: 707  }, // 2,000万〜2,500万
  { min:   150000, a: 27,  b: 50000,    c: 695  }, // 1,500万〜2,000万
  { min:   120000, a: 20,  b: 30000,    c: 676  }, // 1,200万〜1,500万
  { min:   100000, a: 15,  b: 20000,    c: 666  }, // 1,000万〜1,200万
  { min:    80000, a: 16,  b: 20000,    c: 661  }, // 800万〜1,000万
  { min:    60000, a: 19,  b: 20000,    c: 649  }, // 600万〜800万
  { min:    50000, a: 12,  b: 10000,    c: 634  }, // 500万〜600万
  { min:    40000, a: 12,  b: 10000,    c: 634  }, // 400万〜500万
  { min:    30000, a: 15,  b: 10000,    c: 622  }, // 300万〜400万
  { min:    25000, a: 8,   b: 5000,     c: 619  }, // 250万〜300万
  { min:    20000, a: 10,  b: 5000,     c: 609  }, // 200万〜250万
  { min:    15000, a: 11,  b: 5000,     c: 605  }, // 150万〜200万
  { min:    12000, a: 7,   b: 3000,     c: 603  }, // 120万〜150万
  { min:    10000, a: 6,   b: 2000,     c: 595  }, // 100万〜120万
  { min:        0, a: 78,  b: 10000,    c: 547  }, // 100万円未満（負含む）
];

function lookupTable(table, K) {
  // 負値は最小区分（テーブル末尾）を適用
  const row = table.find(r => K >= r.min) || table[table.length - 1];
  return Math.floor(row.a * K / row.b + row.c);
}

export function calcX2(equityMan, avgProfitMan) {
  const K1 = equityMan * 10;    // 万円 → 千円
  const K2 = avgProfitMan * 10; // 万円 → 千円
  const x21 = lookupTable(X21_TABLE, K1);
  const x22 = lookupTable(X22_TABLE, K2);
  return Math.floor((x21 + x22) / 2);
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

// Y点：経営状況分析（詳細版・実経審8指標）
// 国交省告示の公式: Y = 167.3 × A + 583
// A = -0.4650×x1 - 0.0508×x2 + 0.0264×x3 + 0.0277×x4
//   + 0.0011×x5 + 0.0089×x6 + 0.0818×x7 + 0.0172×x8 + 0.1906
// 各指標は上限・下限でクランプ
const Y_INDICATORS = [
  // { coeff, upper, lower }  ※ x1,x2は低いほど良い（係数が負）
  { coeff: -0.4650, upper: -0.3,   lower: 5.1   }, // x1: 純支払利息比率(%)
  { coeff: -0.0508, upper:  0.9,   lower: 18.0  }, // x2: 負債回転期間(月)
  { coeff:  0.0264, upper: 63.6,   lower: 6.5   }, // x3: 総資本売上総利益率(%)
  { coeff:  0.0277, upper:  5.1,   lower: -8.5  }, // x4: 売上高経常利益率(%)
  { coeff:  0.0011, upper: 350.0,  lower: -76.5 }, // x5: 自己資本対固定資産比率(%)
  { coeff:  0.0089, upper: 68.5,   lower: -68.6 }, // x6: 自己資本比率(%)
  { coeff:  0.0818, upper: 15.0,   lower: -10.0 }, // x7: 営業CF(億円)
  { coeff:  0.0172, upper: 100.0,  lower: -3.0  }, // x8: 利益剰余金(億円)
];

export function calcYFull({
  revenue, profitRate, equity, debt, interest,
  grossProfitRate, fixedAssets, operatingCF, retainedEarnings,
}) {
  if (revenue <= 0) return 583;
  const totalCap = equity + debt;
  const grossProfit = revenue * grossProfitRate;

  // 8指標の算定値
  const values = [
    (interest / revenue) * 100,                                    // x1: 純支払利息比率(%)
    debt / (revenue / 12),                                         // x2: 負債回転期間(月)
    totalCap > 0 ? (grossProfit / totalCap) * 100 : 0,             // x3: 総資本売上総利益率(%)
    profitRate * 100,                                              // x4: 売上高経常利益率(%)
    fixedAssets > 0 ? (equity / fixedAssets) * 100 : 350,          // x5: 自己資本対固定資産比率(%)
    totalCap > 0 ? (equity / totalCap) * 100 : 0,                 // x6: 自己資本比率(%)
    operatingCF / 10000,                                           // x7: 営業CF(億円)
    retainedEarnings / 10000,                                      // x8: 利益剰余金(億円)
  ];

  // A = Σ(coeff × clamp(value, lower, upper)) + 0.1906
  let A = 0.1906;
  for (let i = 0; i < 8; i++) {
    const { coeff, upper, lower } = Y_INDICATORS[i];
    const lo = Math.min(upper, lower);
    const hi = Math.max(upper, lower);
    const clamped = Math.max(lo, Math.min(hi, values[i]));
    A += coeff * clamped;
  }

  const y = 167.3 * A + 583;
  return Math.round(Math.max(0, Math.min(1595, y)));
}

// Z点：技術力 → 評点（簡易計算）
const Z1_TABLE = [
  { min: 15500, a: 0, b: 1, c: 2335 },
  { min: 11930, a: 62, b: 3570, c: 2065 },
  { min: 9180, a: 63, b: 2750, c: 1998 },
  { min: 7060, a: 62, b: 2120, c: 1939 },
  { min: 5430, a: 62, b: 1630, c: 1876 },
  { min: 4180, a: 63, b: 1250, c: 1808 },
  { min: 3210, a: 63, b: 970, c: 1747 },
  { min: 2470, a: 62, b: 740, c: 1686 },
  { min: 1900, a: 62, b: 570, c: 1624 },
  { min: 1460, a: 63, b: 440, c: 1558 },
  { min: 1130, a: 63, b: 330, c: 1488 },
  { min: 870, a: 62, b: 260, c: 1434 },
  { min: 670, a: 63, b: 200, c: 1367 },
  { min: 510, a: 62, b: 160, c: 1318 },
  { min: 390, a: 63, b: 120, c: 1247 },
  { min: 300, a: 62, b: 90, c: 1183 },
  { min: 230, a: 63, b: 70, c: 1119 },
  { min: 180, a: 62, b: 50, c: 1040 },
  { min: 140, a: 62, b: 40, c: 984 },
  { min: 110, a: 63, b: 30, c: 907 },
  { min: 85, a: 63, b: 25, c: 860 },
  { min: 65, a: 62, b: 20, c: 810 },
  { min: 50, a: 62, b: 15, c: 742 },
  { min: 40, a: 63, b: 10, c: 633 },
  { min: 30, a: 63, b: 10, c: 633 },
  { min: 20, a: 62, b: 10, c: 636 },
  { min: 15, a: 63, b: 5, c: 508 },
  { min: 10, a: 62, b: 5, c: 511 },
  { min: 5, a: 63, b: 5, c: 509 },
  { min: 0, a: 62, b: 5, c: 510 },
];

const Z2_TABLE = [
  { min: 100000000, a: 0, b: 1, c: 2865 },
  { min: 80000000, a: 119, b: 20000000, c: 2270 },
  { min: 60000000, a: 145, b: 20000000, c: 2166 },
  { min: 50000000, a: 87, b: 10000000, c: 2079 },
  { min: 40000000, a: 104, b: 10000000, c: 1994 },
  { min: 30000000, a: 126, b: 10000000, c: 1906 },
  { min: 25000000, a: 76, b: 5000000, c: 1828 },
  { min: 20000000, a: 90, b: 5000000, c: 1758 },
  { min: 15000000, a: 110, b: 5000000, c: 1678 },
  { min: 12000000, a: 81, b: 3000000, c: 1603 },
  { min: 10000000, a: 63, b: 2000000, c: 1549 },
  { min: 8000000, a: 75, b: 2000000, c: 1489 },
  { min: 6000000, a: 92, b: 2000000, c: 1421 },
  { min: 5000000, a: 55, b: 1000000, c: 1367 },
  { min: 4000000, a: 66, b: 1000000, c: 1312 },
  { min: 3000000, a: 79, b: 1000000, c: 1260 },
  { min: 2500000, a: 48, b: 500000, c: 1209 },
  { min: 2000000, a: 57, b: 500000, c: 1164 },
  { min: 1500000, a: 70, b: 500000, c: 1112 },
  { min: 1200000, a: 50, b: 300000, c: 1072 },
  { min: 1000000, a: 41, b: 200000, c: 1026 },
  { min: 800000, a: 47, b: 200000, c: 996 },
  { min: 600000, a: 57, b: 200000, c: 956 },
  { min: 500000, a: 36, b: 100000, c: 911 },
  { min: 400000, a: 40, b: 100000, c: 891 },
  { min: 300000, a: 51, b: 100000, c: 847 },
  { min: 250000, a: 30, b: 50000, c: 820 },
  { min: 200000, a: 35, b: 50000, c: 795 },
  { min: 150000, a: 45, b: 50000, c: 755 },
  { min: 120000, a: 32, b: 30000, c: 730 },
  { min: 100000, a: 26, b: 20000, c: 702 },
  { min: 80000, a: 29, b: 20000, c: 687 },
  { min: 60000, a: 36, b: 20000, c: 659 },
  { min: 50000, a: 22, b: 10000, c: 635 },
  { min: 40000, a: 27, b: 10000, c: 610 },
  { min: 30000, a: 31, b: 10000, c: 594 },
  { min: 25000, a: 19, b: 5000, c: 573 },
  { min: 20000, a: 23, b: 5000, c: 553 },
  { min: 15000, a: 28, b: 5000, c: 533 },
  { min: 12000, a: 19, b: 3000, c: 522 },
  { min: 10000, a: 16, b: 2000, c: 502 },
  { min: 0, a: 341, b: 10000, c: 241 },
];

function cloneZInput(source = DEFAULT_YEAR_DATA.zInput) {
  const base = DEFAULT_YEAR_DATA.zInput;
  return {
    level1WithCertificate: source?.level1WithCertificate ?? base.level1WithCertificate,
    level1: source?.level1 ?? base.level1,
    kanriAssistant: source?.kanriAssistant ?? base.kanriAssistant,
    coreSkill: source?.coreSkill ?? base.coreSkill,
    level2: source?.level2 ?? base.level2,
    other: source?.other ?? base.other,
  };
}

function legacyZInput(level1 = 0, level2 = 0) {
  return cloneZInput({
    level1,
    level2,
  });
}

function calcTableScore(value, table) {
  const normalizedValue = Math.max(0, Number(value) || 0);
  for (const row of table) {
    if (normalizedValue >= row.min) {
      return Math.floor((row.a * normalizedValue) / row.b + row.c);
    }
  }
  return 0;
}

function calcTechnicalValue(zInput) {
  const normalized = cloneZInput(zInput);
  return (
    Math.max(0, Number(normalized.level1WithCertificate) || 0) * 6 +
    Math.max(0, Number(normalized.level1) || 0) * 5 +
    Math.max(0, Number(normalized.kanriAssistant) || 0) * 4 +
    Math.max(0, Number(normalized.coreSkill) || 0) * 3 +
    Math.max(0, Number(normalized.level2) || 0) * 2 +
    Math.max(0, Number(normalized.other) || 0)
  );
}

function calcZ1(technicalValue) {
  return calcTableScore(technicalValue, Z1_TABLE);
}

function calcZ2(avgPrincipalRevenue) {
  const revenueInThousands = Math.max(0, Number(avgPrincipalRevenue) || 0) * 10;
  return calcTableScore(revenueInThousands, Z2_TABLE);
}

export function calcZ(inputOrLevel1, arg2 = 0, arg3 = 0) {
  const zInput = typeof inputOrLevel1 === 'number'
    ? legacyZInput(inputOrLevel1, arg2)
    : cloneZInput(inputOrLevel1);
  const avgPrincipalRevenue = typeof inputOrLevel1 === 'number'
    ? arg3
    : arg2;

  const technicalValue = calcTechnicalValue(zInput);
  const z1 = calcZ1(technicalValue);
  const z2 = calcZ2(avgPrincipalRevenue);
  const z = Math.floor(z1 * 0.8 + z2 * 0.2);

  return { z, z1, z2, technicalValue };
}

// W点：社会性等
const W_MULTIPLIER = 10 * 175 / 200;
const W7_MACHINE_POINTS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const W6_RESEARCH_THRESHOLDS = [
  { min: 1000000, points: 25 },
  { min: 750000, points: 24 },
  { min: 500000, points: 23 },
  { min: 300000, points: 22 },
  { min: 200000, points: 21 },
  { min: 190000, points: 20 },
  { min: 180000, points: 19 },
  { min: 170000, points: 18 },
  { min: 160000, points: 17 },
  { min: 150000, points: 16 },
  { min: 140000, points: 15 },
  { min: 130000, points: 14 },
  { min: 120000, points: 13 },
  { min: 110000, points: 12 },
  { min: 100000, points: 11 },
  { min: 90000, points: 10 },
  { min: 80000, points: 9 },
  { min: 70000, points: 8 },
  { min: 60000, points: 7 },
  { min: 50000, points: 6 },
  { min: 40000, points: 5 },
  { min: 30000, points: 4 },
  { min: 20000, points: 3 },
  { min: 10000, points: 2 },
  { min: 5000, points: 1 },
];

function clampFloor(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function getOptionPoints(options, value) {
  const match = options.find(option => option.value === value);
  return match ? match.points : 0;
}

function cloneWInput(source = DEFAULT_YEAR_DATA.wInput) {
  const base = DEFAULT_YEAR_DATA.wInput;
  return {
    welfare: { ...base.welfare, ...(source?.welfare || {}) },
    continuity: { ...base.continuity, ...(source?.continuity || {}) },
    accounting: { ...base.accounting, ...(source?.accounting || {}) },
    research: { ...base.research, ...(source?.research || {}) },
    machinery: { ...base.machinery, ...(source?.machinery || {}) },
    certification: { ...base.certification, ...(source?.certification || {}) },
  };
}

function legacyWItemsToWInput(wItems = {}) {
  const base = cloneWInput();
  const hasKey = key => Object.prototype.hasOwnProperty.call(wItems, key);
  return {
    ...base,
    welfare: {
      ...base.welfare,
      kentaikyo: hasKey('kenkyukyo') ? Boolean(wItems.kenkyukyo) : base.welfare.kentaikyo,
      retirementOrPension: hasKey('retirementPlan') ? Boolean(wItems.retirementPlan) : base.welfare.retirementOrPension,
      extraAccident: hasKey('legalAccident') ? Boolean(wItems.legalAccident) : base.welfare.extraAccident,
      youngEngineerRatio: hasKey('youngWorkers') ? Boolean(wItems.youngWorkers) : base.welfare.youngEngineerRatio,
    },
    certification: {
      ...base.certification,
      iso9001: hasKey('iso9001') ? Boolean(wItems.iso9001) : base.certification.iso9001,
      iso14001: hasKey('iso14001') ? Boolean(wItems.iso14001) : base.certification.iso14001,
    },
  };
}

function calcBusinessYearsScore(years) {
  const fullYears = clampFloor(years);
  if (fullYears < 6) return 0;
  return Math.min(60, (fullYears - 5) * 2);
}

function calcAccountingProfessionalsScore(avgRevenue, cpaCount, level2AccountingCount) {
  const accountantValue = Math.max(0, Number(cpaCount) || 0) + (Math.max(0, Number(level2AccountingCount) || 0) * 0.4);
  const annualAvgRevenue = Math.max(0, Number(avgRevenue) || 0);

  let table;
  if (annualAvgRevenue >= 6000000) {
    table = [
      { min: 13.6, points: 10 },
      { min: 10.8, points: 8 },
      { min: 7.2, points: 6 },
      { min: 5.2, points: 4 },
      { min: 2.8, points: 2 },
    ];
  } else if (annualAvgRevenue >= 1500000) {
    table = [
      { min: 8.8, points: 10 },
      { min: 6.8, points: 8 },
      { min: 4.8, points: 6 },
      { min: 2.8, points: 4 },
      { min: 1.6, points: 2 },
    ];
  } else if (annualAvgRevenue >= 400000) {
    table = [
      { min: 4.4, points: 10 },
      { min: 3.2, points: 8 },
      { min: 2.4, points: 6 },
      { min: 1.2, points: 4 },
      { min: 0.8, points: 2 },
    ];
  } else if (annualAvgRevenue >= 100000) {
    table = [
      { min: 2.4, points: 10 },
      { min: 1.6, points: 8 },
      { min: 1.2, points: 6 },
      { min: 0.8, points: 4 },
      { min: 0.4, points: 2 },
    ];
  } else if (annualAvgRevenue >= 10000) {
    table = [
      { min: 1.2, points: 10 },
      { min: 0.8, points: 8 },
      { min: 0.4, points: 6 },
    ];
  } else {
    table = [{ min: 0.4, points: 10 }];
  }

  for (const row of table) {
    if (accountantValue >= row.min) return row.points;
  }
  return 0;
}

function calcResearchScore(auditStatus, amount) {
  if (auditStatus !== 'auditor') return 0;
  const researchAmount = Math.max(0, Number(amount) || 0);
  for (const row of W6_RESEARCH_THRESHOLDS) {
    if (researchAmount >= row.min) return row.points;
  }
  return 0;
}

function calcMachineryScore(eligibleCount) {
  const count = clampFloor(eligibleCount, 0, 15);
  return W7_MACHINE_POINTS[count];
}

function calcCertificationScore(certification) {
  const has9001 = Boolean(certification?.iso9001);
  const has14001 = Boolean(certification?.iso14001);
  const hasEcoAction21 = Boolean(certification?.ecoAction21);

  if (has9001 && has14001) return 10;
  if (has9001 && hasEcoAction21) return 8;
  if (has9001) return 5;
  if (has14001) return 5;
  if (hasEcoAction21) return 3;
  return 0;
}

export function calcW2026(input, avgRevenue = 0) {
  const wInput = cloneWInput(input);
  const { welfare, continuity, accounting, research, machinery, certification } = wInput;

  const w1 =
    (welfare.kentaikyo ? 15 : 0) +
    (welfare.retirementOrPension ? 15 : 0) +
    (welfare.extraAccident ? 15 : 0) +
    (welfare.youngEngineerRatio ? 1 : 0) +
    (welfare.newYoungEngineerRatio ? 1 : 0) +
    clampFloor(welfare.skillUpScore, 0, 10) +
    getOptionPoints(W_WORK_LIFE_BALANCE_OPTIONS, welfare.workLifeBalance) +
    getOptionPoints(W_CAREER_HISTORY_OPTIONS, welfare.careerHistory) +
    (welfare.declaration ? 5 : 0);

  const w2 =
    calcBusinessYearsScore(continuity.businessYears) +
    getOptionPoints(W_REHABILITATION_OPTIONS, continuity.rehabilitation);

  const w3 = continuity.disasterSupport ? 20 : 0;
  const w4 = getOptionPoints(W_LEGAL_ACTION_OPTIONS, continuity.legalAction);
  const w5 =
    getOptionPoints(W_AUDIT_OPTIONS, accounting.auditStatus) +
    calcAccountingProfessionalsScore(avgRevenue, accounting.cpaCount, accounting.level2AccountingCount);
  const w6 = calcResearchScore(accounting.auditStatus, research.amount);
  const w7 = calcMachineryScore(machinery.eligibleCount);
  const w8 = calcCertificationScore(certification);
  const rawTotal = w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8;

  return {
    w: Math.floor(rawTotal * W_MULTIPLIER),
    rawTotal,
    sections: { w1, w2, w3, w4, w5, w6, w7, w8 },
  };
}

export function calcW(input, avgRevenue = 0) {
  return calcW2026(input, avgRevenue).w;
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
// inputMode: 'auto' = 入札活動から推計, 'manual' = 完成工事高/売上を直接入力
export function calcAllScores(years, yModel = 'simple', inputMode = 'auto') {
  const scores = [];
  const revenueHistory = [];
  const principalRevenueHistory = [];
  const yFunc = yModel === 'full' ? calcYFull : calcY;

  for (const yd of years) {
    const monthlyBids = getMonthlyBids(yd.staff, yd.bidsPerStaff);
    const avgMethod = yd.avgMethod || '2year';
    const constructionBidRatio = Math.max(0, Math.min(1, Number(yd.constructionBidRatio ?? 1)));
    const otherWinRate = Math.max(0, Math.min(1, Number(yd.otherWinRate ?? yd.winRate ?? 0)));
    const constructionAvgContractAmount = Math.max(0, Number(yd.constructionAvgContractAmount ?? yd.avgContractAmount ?? 0));
    const otherAvgContractAmount = Math.max(0, Number(yd.otherAvgContractAmount ?? yd.avgContractAmount ?? 0));

    let rawRevenue;   // 完成工事高（X1用）
    let revenueForY;  // 売上（Y点用：財務指標の分母）
    if (inputMode === 'manual') {
      rawRevenue  = yd.kanseikoujidaka;
      revenueForY = yd.uriage;
    } else {
      const constructionMonthlyBids = monthlyBids * constructionBidRatio;
      const otherMonthlyBids = monthlyBids - constructionMonthlyBids;
      const estimatedConstructionRevenue = constructionMonthlyBids * yd.winRate * constructionAvgContractAmount * 12;
      const estimatedOtherSales = otherMonthlyBids * otherWinRate * otherAvgContractAmount * 12;
      rawRevenue  = estimatedConstructionRevenue;
      revenueForY = estimatedConstructionRevenue + estimatedOtherSales;
    }

    const principalRevenue = inputMode === 'manual'
      ? Math.max(0, Number(yd.motoukeKoujidaka) || 0)
      : (
          yd.motoukeSameAsKansei === false
            ? Math.max(0, Number(yd.motoukeKoujidaka) || 0)
            : rawRevenue
        );

    const all = [...revenueHistory, rawRevenue];
    const principalAll = [...principalRevenueHistory, principalRevenue];
    const avgRevenue = calcAvgRevenue(all.slice(-3), avgMethod);
    const avgPrincipalRevenue = calcAvgRevenue(principalAll.slice(-3), avgMethod);

    const x1 = calcX1(avgRevenue);
    const x2 = calcX2(yd.equity, yd.avgProfit);
    const y = yFunc({
      revenue: revenueForY,
      profitRate: yd.profitRate,
      equity: yd.equity,
      debt: yd.debt,
      interest: yd.interest,
      grossProfitRate: yd.grossProfitRate,
      fixedAssets: yd.fixedAssets,
      operatingCF: yd.operatingCF,
      retainedEarnings: yd.retainedEarnings,
    });
    const zInput = yd.zInput ? cloneZInput(yd.zInput) : legacyZInput(yd.level1, yd.level2);
    const zDetail = calcZ(zInput, avgPrincipalRevenue);
    const z = zDetail.z;
    const wInput = yd.wInput ? cloneWInput(yd.wInput) : legacyWItemsToWInput(yd.wItems);
    const wDetail = calcW2026(wInput, avgRevenue);
    const w = wDetail.w;
    const p = calcP(x1, x2, y, z, w);

    scores.push({
      rawRevenue,
      avgRevenue,
      principalRevenue,
      avgPrincipalRevenue,
      revenueForY,
      x1, x2, y, z, w, p,
      zDetail,
      wDetail,
      rank: getRank(p),
      monthlyBids,
    });
    revenueHistory.push(rawRevenue);
    principalRevenueHistory.push(principalRevenue);
  }
  return scores;
}

// N年分のデフォルトyears配列を生成
export function createDefaultYears(n) {
  return Array.from({ length: n + 1 }, () => ({
    ...DEFAULT_YEAR_DATA,
    zInput: cloneZInput(),
    wItems: { ...DEFAULT_YEAR_DATA.wItems },
    wInput: cloneWInput(),
  }));
}
