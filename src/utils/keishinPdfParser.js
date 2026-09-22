import { requestGeminiOcr } from './geminiOcrClient.mjs';
import { D } from './financialCalculations.js';
import { INDUSTRY_OPTIONS } from './calculations';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

let pdfjsModulePromise;

const MAX_OCR_PAGES = 3;

const NUMBER_RE = '[+-]?\\d+(?:\\.\\d+)?';
const INDUSTRY_OPTIONS_SORTED = [...INDUSTRY_OPTIONS].sort((a, b) => b.length - a.length);

const AMOUNT_FIELDS = [
  { path: ['interestIncome'], label: '受取利息配当金', patterns: ['受取利息配当金'] },
  { path: ['previousTotalCapital'], label: '前期総資本', patterns: ['総資本\\(前期\\)', '前期総資本'] },
  {
    path: ['kanseikoujidaka'],
    label: '完成工事高',
    patterns: ['当期完成工事高', '完成工事高\\(当期\\)', '完成工事高'],
    exclude: ['年間平均', '元請', 'X1'],
  },
  {
    path: ['_references', 'avgKanseikoujidaka'],
    label: '年間平均完成工事高',
    patterns: ['年間平均完成工事高'],
    exclude: ['元請', 'X1'],
  },
  {
    path: ['motoukeKoujidaka'],
    label: '元請完成工事高',
    patterns: ['元請完成工事高\\(当期\\)', '元請完成工事高'],
    exclude: ['年間平均'],
  },
  {
    path: ['_references', 'avgMotoukeKoujidaka'],
    label: '年間平均元請完成工事高',
    patterns: ['年間平均元請完成工事高', '元請年間平均完成工事高'],
  },
  {
    path: ['uriage'],
    label: '売上高',
    patterns: ['売上高'],
    exclude: ['総利益率', '経常利益率'],
  },
  {
    path: ['equity'],
    label: '自己資本額',
    patterns: ['自己資本額', '自己資本'],
    exclude: ['自己資本対固定資産比率'],
  },
  {
    path: ['debt'],
    label: '負債総額',
    patterns: ['負債総額', '負債合計'],
  },
  {
    path: ['interest'],
    label: '支払利息',
    patterns: ['支払利息'],
  },
  {
    path: ['avgProfit'],
    label: '平均利益額',
    patterns: ['平均利益額', '利益額'],
    exclude: ['利益剰余金', '売上総利益率'],
  },
  {
    path: ['fixedAssets'],
    label: '固定資産',
    patterns: ['固定資産額', '固定資産'],
    exclude: ['自己資本対固定資産比率'],
  },
  {
    path: ['operatingCF'],
    label: '営業キャッシュフロー',
    patterns: ['営業キャッシュフロー', '営業CF'],
  },
  {
    path: ['retainedEarnings'],
    label: '利益剰余金',
    patterns: ['利益剰余金額', '利益剰余金'],
  },
  {
    path: ['wInput', 'research', 'amount'],
    label: '研究開発費',
    patterns: ['研究開発費'],
  },
];

const MOTOUKE_AMOUNT_FIELD = AMOUNT_FIELDS.find(field => field.path.join('.') === 'motoukeKoujidaka');

const Y_DERIVED_RATIO_FIELDS = [
  {
    key: 'grossProfitToCapitalRate',
    label: '総資本売上総利益率',
    patterns: ['総資本売上総利益率'],
  },
  {
    key: 'equityToFixedAssetsRate',
    label: '自己資本対固定資産比率',
    patterns: ['自己資本対固定資産比率'],
  },
];

const COUNT_FIELDS = [
  {
    path: ['wInput', 'continuity', 'businessYears'],
    label: '営業年数',
    patterns: ['建設業の営業年数', '営業年数'],
    unit: '年',
  },
  {
    path: ['wInput', 'machinery', 'eligibleCount'],
    label: '建設機械',
    patterns: ['建設機械.*台数', '建設機械'],
    unit: '台',
  },
  {
    path: ['wInput', 'accounting', 'cpaCount'],
    label: '公認会計士等の数',
    patterns: ['公認会計士', '会計参与.*人数', '会計参与.*数'],
    unit: '名',
  },
  {
    path: ['wInput', 'accounting', 'level2AccountingCount'],
    label: '2級経理事務士等の数',
    patterns: ['2級経理', '二級経理', '登録経理試験'],
    unit: '名',
  },
];

const Z_FIELDS = [
  {
    path: ['zInput', 'level1WithCertificate'],
    label: '監理技術者資格者証のある1級技術者',
    patterns: ['監理技術者資格者証.*1級', '1級.*監理技術者資格者証', '講習受講'],
    unit: '名',
  },
  {
    path: ['zInput', 'kanriAssistant'],
    label: '監理技術者補佐',
    patterns: ['監理技術者補佐'],
    unit: '名',
  },
  {
    path: ['zInput', 'coreSkill'],
    label: '登録基幹技能者等',
    patterns: ['登録基幹技能者', 'レベル4'],
    unit: '名',
  },
  {
    path: ['zInput', 'level1'],
    label: '1級技術者',
    patterns: ['1級技術者', '一級技術者', '1級資格者'],
    exclude: ['監理技術者資格者証', '講習受講'],
    unit: '名',
  },
  {
    path: ['zInput', 'level2'],
    label: '2級技術者',
    patterns: ['2級技術者', '二級技術者', '2級資格者', 'レベル3'],
    unit: '名',
  },
  {
    path: ['zInput', 'other'],
    label: 'その他技術者',
    patterns: ['その他技術者', '実務経験者'],
    unit: '名',
  },
];

const BOOLEAN_FIELDS = [
  {
    path: ['wInput', 'welfare', 'kentaikyo'],
    label: '建退共',
    patterns: ['建退共'],
  },
  {
    path: ['wInput', 'welfare', 'retirementOrPension'],
    label: '退職金制度',
    patterns: ['退職金制度', '企業年金', '退職一時金'],
  },
  {
    path: ['wInput', 'welfare', 'extraAccident'],
    label: '法定外労災',
    patterns: ['法定外労災'],
  },
  {
    path: ['wInput', 'certification', 'iso9001'],
    label: 'ISO 9001',
    patterns: ['ISO9001'],
  },
  {
    path: ['wInput', 'certification', 'iso14001'],
    label: 'ISO 14001',
    patterns: ['ISO14001'],
  },
  {
    path: ['wInput', 'certification', 'ecoAction21'],
    label: 'エコアクション21',
    patterns: ['エコアクション21', 'EA21'],
  },
  {
    path: ['wInput', 'welfare', 'youngEngineerRatio'],
    label: '若年技術職員割合',
    patterns: ['若年技術職員', '若年技能者'],
  },
  {
    path: ['wInput', 'welfare', 'newYoungEngineerRatio'],
    label: '新規若年技術職員割合',
    patterns: ['新規若年技術職員', '新規若年技能者'],
  },
  {
    path: ['wInput', 'welfare', 'declaration'],
    label: '自主宣言',
    patterns: ['自主宣言'],
  },
  {
    path: ['wInput', 'continuity', 'disasterSupport'],
    label: '防災協定',
    patterns: ['防災協定'],
  },
];

const SCORE_FIELDS = [
  { key: 'p', label: 'P', patterns: ['総合評定値\\(?P\\)?', 'P点'] },
  { key: 'x1', label: 'X1', patterns: ['完成工事高評点\\(?X1\\)?', 'X1'] },
  { key: 'x2', label: 'X2', patterns: ['自己資本額.*利益額.*評点\\(?X2\\)?', 'X2'] },
  { key: 'y', label: 'Y', patterns: ['経営状況評点\\(?Y\\)?', 'Y点'] },
  { key: 'z', label: 'Z', patterns: ['技術職員数.*元請完成工事高.*評点\\(?Z\\)?', 'Z点'] },
  { key: 'w', label: 'W', patterns: ['社会性等評点\\(?W\\)?', 'W点'] },
];

const SELECT_LABELS = {
  auditor: '会計監査人を設置',
  accountingAdvisor: '会計参与を設置',
  selfCheck: '経理処理の適正確認書類を提出',
  suspension: '営業停止処分あり',
  instruction: '指示処分あり',
  ongoing: '再生・更生手続中',
  allConstruction: '全建設工事で蓄積',
  publicWorks: '公共工事のみ蓄積',
  platinumEruboshi: 'プラチナえるぼし',
  eruboshi3: 'えるぼし 3段階',
  eruboshi2: 'えるぼし 2段階',
  eruboshi1: 'えるぼし 1段階',
  platinumKurumin: 'プラチナくるみん',
  tryKurumin: 'トライくるみん',
  kurumin: 'くるみん',
  yell: 'ユースエール',
};

export async function extractKeishinPdf(file, options = {}) {
  const pdfjsLib = await loadPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = await extractTextPages(pdf);
  const rawText = pages.join('\n\n');
  const forcedIndustry = normalizeIndustryValue(options.forcedIndustry);
  const parsed = parseKeishinText(rawText, {
    fileName: file.name,
    pageCount: pdf.numPages,
    forcedIndustry,
  });
  const needsOcr = rawText.replace(/\s/g, '').length < 30 || parsed.detectedFields.length === 0;

  if (!needsOcr) return parsed;

  try {
    const rendered = await renderPdfPagesForOcr(pdf);
    const ocrResult = await requestGeminiOcr(rendered.images, { forcedIndustry });
    const ocrParsed = buildParsedResultFromGeminiOcr(ocrResult.data, {
      fileName: file.name,
      pageCount: pdf.numPages,
      forcedIndustry,
    });
    const merged = mergeParsedResults(parsed, ocrParsed);
    const warnings = [
      `PDFから文字を抽出できなかったため、Gemini OCR（${ocrResult.model}）の結果を使いました。`,
      ...(rendered.truncated ? [`${pdf.numPages}ページ中${MAX_OCR_PAGES}ページまでをOCRしました。`] : []),
      ...merged.warnings.filter(message => !message.includes('PDFから文字を抽出')),
    ];

    return {
      ...merged,
      financialInputs: ocrParsed.financialInputs,
      documentContext: ocrParsed.documentContext,
      rawText,
      ocrText: ocrResult.text,
      ocrModel: ocrResult.model,
      usedOcr: true,
      warnings,
    };
  } catch (error) {
    return {
      ...parsed,
      warnings: [
        ...parsed.warnings,
        `Gemini OCRに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      ],
    };
  }
}

async function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(module => {
      module.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return module;
    });
  }
  return pdfjsModulePromise;
}

async function extractTextPages(pdf) {
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(joinTextContent(content));
  }
  return pages;
}

function joinTextContent(content) {
  const chunks = [];
  let lastY = null;

  for (const item of content.items || []) {
    if (!item?.str) continue;
    const y = Array.isArray(item.transform) ? item.transform[5] : null;
    if (lastY != null && y != null && Math.abs(y - lastY) > 5) {
      chunks.push('\n');
    }
    chunks.push(item.str);
    chunks.push(item.hasEOL ? '\n' : ' ');
    if (y != null) lastY = y;
  }

  return chunks.join('');
}

async function renderPdfPagesForOcr(pdf) {
  if (typeof document === 'undefined') {
    throw new Error('OCRはブラウザ上でのみ実行できます。');
  }

  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const images = [];

  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(4, 3000 / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('PDFページを画像化できませんでした。');
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvasContext: context, viewport }).promise;
    images.push({
      pageNo,
      mimeType: 'image/jpeg',
      data: canvas.toDataURL('image/jpeg', 0.9).replace(/^data:image\/jpeg;base64,/, ''),
    });
  }

  return { images, truncated: pdf.numPages > pageCount };
}

function pickGeminiAmountValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] != null) return source[key];
  }
  return null;
}

function collectGeminiEntries(source, prefix = '') {
  if (Array.isArray(source)) {
    return source.flatMap((value, index) => collectGeminiEntries(value, `${prefix}[${index}]`));
  }

  if (!source || typeof source !== 'object') return [];

  const entries = [];
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    entries.push({
      key,
      path,
      value,
      lookupText: buildGeminiEntryLookupText(path, key, value),
    });
    if (value && typeof value === 'object') {
      entries.push(...collectGeminiEntries(value, path));
    }
  }
  return entries;
}

function buildGeminiEntryLookupText(path, key, value) {
  const parts = [path, key];

  if (value && typeof value === 'object') {
    parts.push(
      value.label,
      value.name,
      value.title,
      value.type,
      value.category,
      value.item,
      value.field,
      value.caption,
      value.description
    );
  }

  return normalizeLookupText(parts.filter(Boolean).join(' '));
}

function normalizeLookupText(value) {
  return compact(normalizeText(value)).toLowerCase();
}

function pickGeminiAmountValueByPatterns(sources, includePatterns = [], excludePatterns = []) {
  for (const source of sources) {
    const entries = collectGeminiEntries(source);
    for (const entry of entries) {
      const keyText = entry.lookupText || normalizeLookupText(`${entry.path} ${entry.key}`);
      if (!keyText) continue;
      if (excludePatterns.some(pattern => keyText.includes(pattern))) continue;
      if (!includePatterns.some(pattern => keyText.includes(pattern))) continue;
      if (entry.value != null) return entry.value;
    }
  }
  return null;
}

function normalizeGeminiAmounts(amounts = {}, rootData = {}) {
  const sources = [amounts, rootData];
  return {
    kanseikoujidakaCurrent: pickGeminiAmountValue(amounts, [
      'kanseikoujidakaCurrent',
      'kanseikoujidaka',
      'completedWorkAmountCurrent',
      'completedWorkAmount',
      'currentCompletedWorkAmount',
    ]) ?? pickGeminiAmountValueByPatterns(
      sources,
      ['kanseikoujidaka', 'completedworkamount', 'completedconstructionamount', '完成工事高', '当期完成工事高'],
      ['avg', 'average', '年間平均', '年平均', '平均', 'x1']
    ),
    avgKanseikoujidaka: pickGeminiAmountValue(amounts, [
      'avgKanseikoujidaka',
      'averageKanseikoujidaka',
      'avgCompletedWorkAmount',
      'averageCompletedWorkAmount',
    ]) ?? pickGeminiAmountValueByPatterns(
      sources,
      ['avgkanseikoujidaka', 'averagekanseikoujidaka', 'avgcompletedworkamount', 'averagecompletedworkamount', '年間平均完成工事高', '平均完成工事高'],
      ['元請']
    ),
    motoukeKoujidakaCurrent: pickGeminiAmountValue(amounts, [
      'motoukeKoujidakaCurrent',
      'motoukeKoujidaka',
      'principalCompletedWorkAmountCurrent',
      'principalCompletedWorkAmount',
      'currentPrincipalCompletedWorkAmount',
    ]) ?? pickGeminiAmountValueByPatterns(
      sources,
      ['motoukekoujidaka', 'principalcompletedworkamount', '元請完成工事高', '元請工事高'],
      ['avg', 'average', '年間平均', '年平均', '平均', 'primaryindustry']
    ),
    motoukeKoujidakaPrimaryIndustry: pickGeminiAmountValue(amounts, [
      'motoukeKoujidakaPrimaryIndustry',
      'principalCompletedWorkAmountPrimaryIndustry',
      'primaryIndustryPrincipalCompletedWorkAmount',
    ]) ?? pickGeminiAmountValueByPatterns(
      sources,
      ['motoukekoujidakaprimaryindustry', 'principalcompletedworkamountprimaryindustry', 'primaryindustryprincipalcompletedworkamount'],
      []
    ),
    avgMotoukeKoujidaka: pickGeminiAmountValue(amounts, [
      'avgMotoukeKoujidaka',
      'averageMotoukeKoujidaka',
      'avgPrincipalCompletedWorkAmount',
      'averagePrincipalCompletedWorkAmount',
    ]) ?? pickGeminiAmountValueByPatterns(
      sources,
      ['avgmotoukekoujidaka', 'averagemotoukekoujidaka', 'avgprincipalcompletedworkamount', 'averageprincipalcompletedworkamount', '年間平均元請完成工事高', '平均元請完成工事高'],
      []
    ),
    uriage: pickGeminiAmountValue(amounts, ['uriage', 'sales', 'salesAmount']),
    equity: pickGeminiAmountValue(amounts, ['equity', 'netAssets']),
    debt: pickGeminiAmountValue(amounts, ['debt', 'liabilities']),
    interest: pickGeminiAmountValue(amounts, ['interest']),
    avgProfit: pickGeminiAmountValue(amounts, ['avgProfit', 'averageProfit', 'profitAmount', '利益額']),
    fixedAssets: pickGeminiAmountValue(amounts, ['fixedAssets']),
    operatingCF: pickGeminiAmountValue(amounts, ['operatingCF', 'operatingCashFlow']),
    retainedEarnings: pickGeminiAmountValue(amounts, ['retainedEarnings']),
    researchAmount: pickGeminiAmountValue(amounts, ['researchAmount', 'rAndDAmount']),
  };
}

function extractGeminiUnit(rawValue) {
  if (rawValue == null) return null;

  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return normalizeGeminiUnit(
      rawValue.unit
      ?? rawValue.amountUnit
      ?? rawValue.currencyUnit
      ?? rawValue.unitName
      ?? rawValue.unitLabel
    );
  }

  return normalizeGeminiUnit(rawValue);
}

function inferGeminiDocumentUnit(amounts = {}) {
  for (const value of Object.values(amounts)) {
    const unit = extractGeminiUnit(value);
    if (unit) return unit;
  }
  return null;
}

function pickGeminiTechnicalStaffValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] != null) return source[key];
  }
  return null;
}

function readCountFromTechnicalText(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    return Math.max(0, Math.floor(value));
  }
  return null;
}

function parseTechnicalStaffSourceText(sourceText) {
  const text = compact(normalizeText(sourceText));
  if (!text) return {};

  return {
    level1WithCertificate: readCountFromTechnicalText(text, [
      /\(\u8b1b\u7fd2\u53d7\u8b1b\)[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
      /\u8b1b\u7fd2\u53d7\u8b1b[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
    ]),
    level1: readCountFromTechnicalText(text, [
      /(?:^|[^\d])(?:1|\uff11|\u4e00)\u7d1a(?:\u6280\u8853\u8005)?[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
    ]),
    kanriAssistant: readCountFromTechnicalText(text, [
      /\u76e3\u7406\u6280\u8853\u8005\u88dc\u4f50[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
    ]),
    coreSkill: readCountFromTechnicalText(text, [
      /\u767b\u9332\u57fa\u5e79\u6280\u80fd\u8005\u7b49(?:\([^)]*\))?[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
    ]),
    level2: readCountFromTechnicalText(text, [
      /(?:^|[^\d])(?:2|\uff12|\u4e8c)\u7d1a(?:\u6280\u8853\u8005)?[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
    ]),
    other: readCountFromTechnicalText(text, [
      /\u305d\u306e\u4ed6[^0-9-]{0,6}([+-]?\d+(?:\.\d+)?)/u,
    ]),
  };
}

function normalizeGeminiTechnicalStaff(technicalStaff = {}) {
  const sourceText =
    technicalStaff?.sourceText
    ?? technicalStaff?.technicalStaffSourceText
    ?? technicalStaff?.rowText
    ?? null;
  const parsedFromSource = parseTechnicalStaffSourceText(sourceText);

  return {
    level1WithCertificate:
      parsedFromSource.level1WithCertificate
      ?? pickGeminiTechnicalStaffValue(technicalStaff, ['level1WithCertificate', 'level1Lecture']),
    level1:
      parsedFromSource.level1
      ?? pickGeminiTechnicalStaffValue(technicalStaff, ['level1', 'level1Total']),
    kanriAssistant:
      parsedFromSource.kanriAssistant
      ?? pickGeminiTechnicalStaffValue(technicalStaff, ['kanriAssistant']),
    coreSkill:
      parsedFromSource.coreSkill
      ?? pickGeminiTechnicalStaffValue(technicalStaff, ['coreSkill']),
    level2:
      parsedFromSource.level2
      ?? pickGeminiTechnicalStaffValue(technicalStaff, ['level2']),
    other:
      parsedFromSource.other
      ?? pickGeminiTechnicalStaffValue(technicalStaff, ['other']),
    sourceText,
  };
}

function resolveGeminiPrimaryIndustry(data, technicalStaff, forcedIndustry = null) {
  const normalizedForcedIndustry = normalizeIndustryValue(forcedIndustry);
  const declaredIndustry = normalizeIndustryValue(data?.primaryIndustry);

  if (normalizedForcedIndustry) {
    return {
      industry: normalizedForcedIndustry,
      source: 'forced',
      declaredIndustry,
    };
  }

  const sourceCandidates = [
    technicalStaff?.sourceText,
    data?.primaryIndustrySourceText,
    data?.industrySourceText,
    data?.constructionTypeSourceText,
  ];

  for (const source of sourceCandidates) {
    const industries = extractIndustriesFromText(source);
    if (industries.length > 0) {
      return {
        industry: industries[0],
        source: 'sourceText',
        declaredIndustry,
      };
    }
  }

  return {
    industry: declaredIndustry,
    source: 'declared',
    declaredIndustry,
  };
}

export function buildParsedResultFromGeminiOcr(data, meta = {}) {
  const state = createParseState();
  const selectedIndustry = normalizeIndustryValue(meta.forcedIndustry || data?.primaryIndustry);
  const row = data?.industryRows?.find(item => normalizeIndustryValue(item.industry) === selectedIndustry);
  if (row) {
    const cells = row.technicalStaffCells;
    const staffKeys = ['level1', 'level1WithCertificate', 'kanriAssistant', 'coreSkill', 'level2', 'other'];
    const staff = Array.isArray(cells) && cells.length === 6 && cells.every(value => readGeminiNumber(value) != null)
      ? Object.fromEntries(staffKeys.map((key, index) => [key, readGeminiNumber(cells[index])]))
      : row.technicalStaff;
    data = {
      ...data,
      scores: { ...data.scores, p: row.p, x1: row.x1, z: row.z },
      amounts: { ...data.amounts, avgKanseikoujidaka: row.avgKanseikoujidaka, avgMotoukeKoujidaka: row.avgMotoukeKoujidaka },
      technicalStaff: staff,
    };
  }
  const scores = data?.scores || {};
  const amounts = data?.amounts || {};
  const ratios = data?.ratios || {};
  const counts = data?.counts || {};
  const technicalStaff = normalizeGeminiTechnicalStaff(data?.technicalStaff || {});
  const flags = { ...data?.flags };
  const flagEvidence = compact(normalizeText(data?.flagSources?.kentaikyo));
  const flagMatch = flagEvidence.match(/(?:建設業退職金共済|建退共).*?(?:有無|加入状況)[:：]?(有|無)$/);
  flags.kentaikyo = flagMatch ? flagMatch[1] === '有' : null;
  if (!flagMatch) state.warnings.push('建退共の有無を該当行から確認できないため、現在の設定を維持しています。');
  const selects = data?.selects || {};
  const normalizedAmounts = normalizeGeminiAmounts(amounts, data);
  const averageYears = Number(data?.averageYears);
  if (averageYears === 2 || averageYears === 3) {
    addDetectedField(state, ['avgMethod'], '工事高の平均期間', `${averageYears}year`, {
      kind: 'select', source: 'Gemini OCR', confidence: 'high',
    });
  }
  for (const key of ['kanseikoujidakaCurrent', 'motoukeKoujidakaCurrent', 'motoukeKoujidakaPrimaryIndustry']) {
    if (normalizedAmounts[key] == null) continue;
    const evidence = compact(normalizeText(data?.amountSources?.[key]));
    const label = key === 'kanseikoujidakaCurrent' ? '完成工事高' : '元請完成工事高';
    if (!evidence.includes(label) || /平均|売上高|[23]年/.test(evidence) || !/[0-9]/.test(evidence)) {
      normalizedAmounts[key] = null;
      state.warnings.push(`${label}の当期値を示す記載を確認できないため、その値は反映していません。`);
    }
  }
  const explicitAmountUnit =
    normalizeGeminiUnit(data?.documentUnit) || inferGeminiDocumentUnit(normalizedAmounts);
  const defaultAmountUnit = explicitAmountUnit || '\u5343\u5186';
  const resolvedPrimaryIndustry = resolveGeminiPrimaryIndustry(data, technicalStaff, meta.forcedIndustry);
  const primaryIndustry = resolvedPrimaryIndustry.industry;
  const hasMultipleIndustries = readGeminiBoolean(data?.multipleIndustries) === true;
  const primaryIndustryMotoukeRaw = readGeminiNumber(normalizedAmounts.motoukeKoujidakaPrimaryIndustry);
  const genericMotoukeRaw = readGeminiNumber(normalizedAmounts.motoukeKoujidakaCurrent);
  const motoukeAmountKey = primaryIndustryMotoukeRaw != null
    ? 'motoukeKoujidakaPrimaryIndustry'
    : 'motoukeKoujidakaCurrent';
  const motoukeAmountLabel = primaryIndustryMotoukeRaw != null && primaryIndustry
    ? `元請完成工事高（${primaryIndustry}）`
    : '元請完成工事高';

  for (const field of SCORE_FIELDS) {
    const score = readGeminiNumber(scores[field.key]);
    if (score == null) continue;
    applyReferenceScore(state, field.key, Math.round(score), {
      source: 'Gemini OCR',
      confidence: 'high',
    });
  }

  const amountMappings = [
    ['kanseikoujidakaCurrent', ['kanseikoujidaka'], '完成工事高'],
    ['avgKanseikoujidaka', ['_references', 'avgKanseikoujidaka'], '年間平均完成工事高'],
    [motoukeAmountKey, ['motoukeKoujidaka'], motoukeAmountLabel],
    ['avgMotoukeKoujidaka', ['_references', 'avgMotoukeKoujidaka'], '年間平均元請完成工事高'],
    ['uriage', ['uriage'], '売上高'],
    ['equity', ['equity'], '自己資本額'],
    ['debt', ['debt'], '負債総額'],
    ['interest', ['interest'], '支払利息'],
    ['avgProfit', ['avgProfit'], '平均利益額'],
    ['fixedAssets', ['fixedAssets'], '固定資産'],
    ['retainedEarnings', ['retainedEarnings'], '利益剰余金'],
    ['researchAmount', ['wInput', 'research', 'amount'], '研究開発費'],
  ];

  for (const [key, path, label] of amountMappings) {
    if (path[0] === 'motoukeKoujidaka' && hasMultipleIndustries && primaryIndustryMotoukeRaw == null) continue;
    addOcrAmountField(state, path, label, normalizedAmounts[key], defaultAmountUnit);
  }
  addOcrAmountField(state, ['interestIncome'], '受取利息配当金', amounts.interestIncome, defaultAmountUnit);
  addOcrAmountField(state, ['previousTotalCapital'], '前期総資本', amounts.previousTotalCapital, defaultAmountUnit);

  const currentLiabilities = readGeminiAmount(amounts.currentLiabilities, defaultAmountUnit)?.amount;
  const fixedLiabilities = readGeminiAmount(amounts.fixedLiabilities, defaultAmountUnit)?.amount;
  if (getDeep(state.patch, ['debt']) == null && currentLiabilities != null && fixedLiabilities != null) {
    addDetectedField(state, ['debt'], '負債総額（流動負債＋固定負債）', D(currentLiabilities).add(fixedLiabilities).number(), {
      kind: 'amount', unit: '万円', source: 'Gemini OCR', confidence: 'high',
    });
  }

  const grossProfit = readGeminiAmount(amounts.grossProfit, defaultAmountUnit)?.amount;
  const sales = getDeep(state.patch, ['uriage']);
  const ordinaryProfit = readGeminiAmount(amounts.ordinaryProfit, defaultAmountUnit)?.amount;
  if (ordinaryProfit != null && sales > 0) {
    addDetectedField(state, ['profitRate'], '売上高経常利益率（経常利益÷売上高）', ordinaryProfit / sales, {
      kind: 'ratio', unit: '%', source: 'Gemini OCR', confidence: 'high',
    });
  } else {
    addOcrRatioField(state, ['profitRate'], '売上高経常利益率', ratios.profitRatePercent);
  }
  if (grossProfit != null && sales > 0) {
    addDetectedField(state, ['grossProfitRate'], '売上総利益率（売上総利益÷売上高）', grossProfit / sales, {
      kind: 'ratio', unit: '%', source: 'Gemini OCR', confidence: 'high',
    });
  } else {
    addOcrRatioField(state, ['grossProfitRate'], '売上総利益率', ratios.grossProfitRatePercent);
  }
  const currentCF = readGeminiAmount(amounts.operatingCFCurrent, defaultAmountUnit)?.amount;
  const previousCF = readGeminiAmount(amounts.operatingCFPrevious, defaultAmountUnit)?.amount;
  if (currentCF != null && previousCF != null) {
    addDetectedField(state, ['operatingCF'], '営業キャッシュフロー（当期・前期平均）', D(currentCF).add(previousCF).div(2).number(), {
      kind: 'amount', unit: '万円', source: 'Gemini OCR', confidence: 'high',
    });
  } else {
    addOcrAmountField(state, ['operatingCF'], '営業キャッシュフロー', normalizedAmounts.operatingCF, defaultAmountUnit);
  }
  addOcrCountField(state, ['wInput', 'continuity', 'businessYears'], '営業年数', counts.businessYears, '年');
  addOcrCountField(state, ['wInput', 'machinery', 'eligibleCount'], '建設機械', counts.eligibleMachineCount, '台');
  addOcrCountField(state, ['wInput', 'accounting', 'cpaCount'], '公認会計士等の数', counts.cpaCount, '名');
  addOcrCountField(state, ['wInput', 'accounting', 'level2AccountingCount'], '2級経理事務士等の数', counts.level2AccountingCount, '名');

  if (primaryIndustry) {
    addDetectedField(state, ['industry'], '建設工事の種類', primaryIndustry, {
      kind: 'text',
      source: 'Gemini OCR',
      confidence: 'high',
    });
  }

  if (resolvedPrimaryIndustry.source === 'forced') {
    state.warnings.push('\u53d6\u8fbc\u6642\u306b\u6307\u5b9a\u3057\u305f\u5efa\u8a2d\u5de5\u4e8b\u306e\u7a2e\u5225\u3092OCR\u89e3\u6790\u306b\u4f7f\u7528\u3057\u307e\u3057\u305f\u3002');
  }

  if (
    resolvedPrimaryIndustry.source === 'sourceText' &&
    resolvedPrimaryIndustry.declaredIndustry &&
    resolvedPrimaryIndustry.declaredIndustry !== primaryIndustry
  ) {
    state.warnings.push('\u696d\u7a2e\u306fOCR\u306e\u76f4\u63a5\u56de\u7b54\u3088\u308a\u3001\u6280\u8853\u8077\u54e1\u6b04\u306b\u542b\u307e\u308c\u308b\u5148\u982d\u696d\u7a2e\u3092\u512a\u5148\u3057\u307e\u3057\u305f\u3002');
  }

  if (hasMultipleIndustries && primaryIndustry) {
    state.warnings.push(`複数業種のうち「${primaryIndustry}」の値を使用しました。`);
  }

  if (
    hasMultipleIndustries &&
    primaryIndustry &&
    primaryIndustryMotoukeRaw != null &&
    genericMotoukeRaw != null &&
    primaryIndustryMotoukeRaw !== genericMotoukeRaw
  ) {
    state.warnings.push(`元請完成工事高は先頭業種「${primaryIndustry}」の値を使用しました。`);
  }

  if (
    hasMultipleIndustries &&
    primaryIndustry &&
    primaryIndustryMotoukeRaw == null &&
    genericMotoukeRaw != null
  ) {
    state.warnings.push(`元請完成工事高は「${primaryIndustry}」の個別値を特定できないため未入力です。原本から補完してください。`);
  }

  const technicalMappings = [
    ['level1WithCertificate', ['zInput', 'level1WithCertificate'], '監理技術者資格者証のある1級技術者'],
    ['level1', ['zInput', 'level1'], '1級技術者'],
    ['kanriAssistant', ['zInput', 'kanriAssistant'], '監理技術者補佐'],
    ['coreSkill', ['zInput', 'coreSkill'], '登録基幹技能者等'],
    ['level2', ['zInput', 'level2'], '2級技術者'],
    ['other', ['zInput', 'other'], 'その他技術者'],
  ];

  for (const [key, path, label] of technicalMappings) {
    addOcrCountField(
      state,
      path,
      primaryIndustry ? `${label}（${primaryIndustry}）` : label,
      technicalStaff[key],
      '名'
    );
  }

  normalizeImportedLevel1Counts(state, {
    forceTotalLevel1: true,
    industry: primaryIndustry,
  });

  const booleanMappings = [
    ['kentaikyo', ['wInput', 'welfare', 'kentaikyo'], '建退共'],
    ['retirementOrPension', ['wInput', 'welfare', 'retirementOrPension'], '退職金制度'],
    ['extraAccident', ['wInput', 'welfare', 'extraAccident'], '法定外労災'],
    ['iso9001', ['wInput', 'certification', 'iso9001'], 'ISO 9001'],
    ['iso14001', ['wInput', 'certification', 'iso14001'], 'ISO 14001'],
    ['ecoAction21', ['wInput', 'certification', 'ecoAction21'], 'エコアクション21'],
    ['youngEngineerRatio', ['wInput', 'welfare', 'youngEngineerRatio'], '若年技術職員割合'],
    ['newYoungEngineerRatio', ['wInput', 'welfare', 'newYoungEngineerRatio'], '新規若年技術職員割合'],
    ['declaration', ['wInput', 'welfare', 'declaration'], '自主宣言'],
    ['disasterSupport', ['wInput', 'continuity', 'disasterSupport'], '防災協定'],
  ];

  for (const [key, path, label] of booleanMappings) {
    addOcrBooleanField(state, path, label, flags[key]);
  }

  addOcrSelectField(state, ['wInput', 'accounting', 'auditStatus'], '監査状況', selects.auditStatus, [
    'auditor', 'accountingAdvisor', 'selfCheck', 'none',
  ]);
  addOcrSelectField(state, ['wInput', 'continuity', 'legalAction'], '法令遵守状況', selects.legalAction, [
    'suspension', 'instruction', 'none',
  ]);
  addOcrSelectField(state, ['wInput', 'continuity', 'rehabilitation'], '再生手続', selects.rehabilitation, [
    'ongoing', 'none',
  ]);
  addOcrSelectField(state, ['wInput', 'welfare', 'careerHistory'], 'CCUS就業履歴', selects.careerHistory, [
    'allConstruction', 'publicWorks', 'none',
  ]);
  addOcrSelectField(state, ['wInput', 'welfare', 'workLifeBalance'], 'ワーク・ライフ・バランス', selects.workLifeBalance, [
    'platinumEruboshi', 'eruboshi3', 'eruboshi2', 'eruboshi1', 'platinumKurumin', 'tryKurumin', 'kurumin', 'yell', 'none',
  ]);

  applyDerivedYFieldsFromRatios(state, ratios);

  const missingFinancial = [
    ['uriage', '売上高'], ['equity', '自己資本'], ['debt', '負債総額'],
    ['interest', '支払利息'], ['avgProfit', '利益額'], ['profitRate', '経常利益率'],
  ].filter(([key]) => state.patch[key] == null).map(([, label]) => label);
  if (missingFinancial.length) {
    state.warnings.push(`未取得の項目は現在の入力値を維持しています。確認・補完してください: ${missingFinancial.join('、')}`);
  }

  if (!explicitAmountUnit && amountMappings.some(([key]) => readGeminiNumber(normalizedAmounts[key]) != null)) {
    state.warnings.push('OCRで金額単位を確定できなかったため、金額項目の一部は反映していません。');
  }

  if (getDeep(state.patch, ['kanseikoujidaka']) == null && getDeep(state.patch, ['_references', 'avgKanseikoujidaka']) != null) {
    state.warnings.push('当期の完成工事高を特定できず、年間平均完成工事高のみ検出しました。完成工事高は自動反映していません。');
  }

  if (getDeep(state.patch, ['motoukeKoujidaka']) == null && getDeep(state.patch, ['_references', 'avgMotoukeKoujidaka']) != null) {
    state.warnings.push('当期の元請完成工事高を特定できず、年間平均元請完成工事高のみ検出しました。元請完成工事高は自動反映していません。');
  }

  if (state.detectedFields.length === 0) {
    state.warnings.push('OCRから反映できる項目を検出できませんでした。');
  }

  return {
    fileName: meta.fileName || '',
    pageCount: meta.pageCount || 0,
    rawText: JSON.stringify(data, null, 2),
    normalizedText: JSON.stringify(data),
    financialInputs: { periods: { current: Object.fromEntries(Object.entries({ grossProfit: amounts.grossProfit, ordinaryProfit: amounts.ordinaryProfit, totalAssets: amounts.currentTotalCapital, netAssets: amounts.currentNetAssets, keishinOperatingCF: amounts.operatingCFCurrent }).map(([key, value]) => [key, readGeminiAmount(value, defaultAmountUnit)?.amount]).filter(([, value]) => value != null).map(([key, value]) => [key, D(value).mul(10).number()])), prior: Object.fromEntries(Object.entries({ keishinOperatingCF: amounts.operatingCFPrevious }).map(([key, value]) => [key, readGeminiAmount(value, defaultAmountUnit)?.amount]).filter(([, value]) => value != null).map(([key, value]) => [key, D(value).mul(10).number()])) } },
    documentContext: { companyId: String(data.documentContext?.companyId || ''), periodEnd: String(data.documentContext?.periodEnd || ''), applicationDate: String(data.documentContext?.applicationDate || '') },
    patch: state.patch,
    detectedFields: state.detectedFields,
    referenceScores: state.referenceScores,
    warnings: state.warnings,
  };
}

function addOcrAmountField(state, path, label, rawValue, defaultAmountUnit) {
  const amountInfo = readGeminiAmount(rawValue, defaultAmountUnit);
  if (!amountInfo) return;

  addDetectedField(state, path, label, amountInfo.amount, {
    kind: 'amount',
    unit: '万円',
    source: 'Gemini OCR',
    confidence: 'high',
  });
}

function readGeminiAmount(rawValue, defaultAmountUnit) {
  let value = rawValue;
  let unit = extractGeminiUnit(rawValue);

  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    value =
      rawValue.value
      ?? rawValue.amount
      ?? rawValue.number
      ?? rawValue.current
      ?? rawValue.raw
      ?? rawValue.text
      ?? null;
  }

  const number = readGeminiNumber(value);
  if (number == null) return null;

  if (!unit) unit = extractGeminiUnit(value);
  if (!unit) unit = defaultAmountUnit;

  const amount = normalizeAmount(number, unit, unit || defaultAmountUnit);
  if (amount == null) return null;

  return { amount, unit };
}

function addOcrRatioField(state, path, label, rawPercent) {
  const number = readGeminiNumber(rawPercent);
  if (number == null) return;

  addDetectedField(state, path, label, number / 100, {
    kind: 'ratio',
    unit: '%',
    source: 'Gemini OCR',
    confidence: 'high',
  });
}

function addOcrCountField(state, path, label, rawValue, unit = '') {
  const number = readGeminiNumber(rawValue);
  if (number == null) return;

  addDetectedField(state, path, label, Math.max(0, Math.floor(number)), {
    kind: 'count',
    unit,
    source: 'Gemini OCR',
    confidence: 'high',
  });
}

function addOcrBooleanField(state, path, label, rawValue) {
  const value = readGeminiBoolean(rawValue);
  if (value == null) return;

  addDetectedField(state, path, label, value, {
    kind: 'boolean',
    source: 'Gemini OCR',
    confidence: 'high',
  });
}

function addOcrSelectField(state, path, label, rawValue, allowedValues) {
  const value = readGeminiSelect(rawValue, allowedValues);
  if (value == null) return;

  addDetectedField(state, path, label, value, {
    kind: 'select',
    source: 'Gemini OCR',
    confidence: 'high',
  });
}

function normalizeGeminiUnit(value) {
  const text = compact(normalizeText(value));
  if (!text) return null;
  if (text.includes('thousand_yen') || text.includes('千円')) return '千円';
  if (text.includes('ten_thousand_yen') || text.includes('万円')) return '万円';
  if (text === 'yen' || text.endsWith('yen') || text === '円' || text.endsWith('円')) return '円';
  return null;
}

function normalizeIndustryValue(value) {
  const text = compact(normalizeText(value));
  if (!text) return null;

  const exact = INDUSTRY_OPTIONS.find(option => compact(option) === text);
  if (exact) return exact;

  const partial = INDUSTRY_OPTIONS_SORTED.find(option => (
    text.includes(compact(option)) || compact(option).includes(text)
  ));

  return partial || null;
}

function readGeminiNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(normalizeText(value) || '').match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function readGeminiBoolean(value) {
  if (typeof value === 'boolean') return value;
  const text = compact(normalizeText(value)).toLowerCase();
  if (!text || text === 'null') return null;
  if (['true', 'yes', '1', 'on', 'present', '有', 'あり', '加入', '該当'].includes(text)) return true;
  if (['false', 'no', '0', 'off', 'absent', '無', 'なし', '未加入', '非該当'].includes(text)) return false;
  return null;
}

function readGeminiSelect(value, allowedValues) {
  if (value == null) return null;
  const text = compact(normalizeText(value)).toLowerCase();
  if (!text || text === 'null') return null;
  return allowedValues.find(option => compact(String(option)).toLowerCase() === text) || null;
}

function applyDerivedYFieldsFromRatios(state, ratios) {
  const grossProfitToCapitalRate = readGeminiNumber(ratios?.grossProfitToCapitalRatePercent);
  const equityToFixedAssetsRate = readGeminiNumber(ratios?.equityToFixedAssetsRatePercent);
  const revenue = Number(getDeep(state.patch, ['uriage']) ?? 0);
  const equity = Number(getDeep(state.patch, ['equity']) ?? 0);
  const debt = Number(getDeep(state.patch, ['debt']) ?? 0);
  const totalCapital = equity + debt;

  if (getDeep(state.patch, ['grossProfitRate']) == null && grossProfitToCapitalRate != null && revenue > 0 && totalCapital > 0) {
    const value = ((grossProfitToCapitalRate / 100) * totalCapital) / revenue;
    if (Number.isFinite(value) && value >= 0 && value <= 2) {
      addDetectedField(state, ['grossProfitRate'], '売上総利益率（総資本売上総利益率から推定）', value, {
        kind: 'ratio',
        unit: '%',
        source: 'Gemini OCR',
        confidence: 'medium',
      });
    }
  }

  if (getDeep(state.patch, ['fixedAssets']) == null && equityToFixedAssetsRate != null && equity > 0 && equityToFixedAssetsRate > 0) {
    const value = equity / (equityToFixedAssetsRate / 100);
    if (Number.isFinite(value) && value >= 0) {
      addDetectedField(state, ['fixedAssets'], '固定資産（自己資本対固定資産比率から推定）', Math.round(value), {
        kind: 'amount',
        unit: '万円',
        source: 'Gemini OCR',
        confidence: 'medium',
      });
    }
  }
}

function createParseState() {
  return {
    patch: {},
    detectedFields: [],
    referenceScores: {},
    warnings: [],
    usedFallbackAmountUnit: false,
  };
}

function mergeParsedResults(base, extra) {
  const patch = mergeNestedObjects(base?.patch, extra?.patch);
  const detectedFields = mergeDetectedFields(base?.detectedFields, extra?.detectedFields);
  const warnings = uniqueMessages([...(base?.warnings || []), ...(extra?.warnings || [])]);

  if (
    base?.patch?.industry &&
    extra?.patch?.industry &&
    base.patch.industry !== extra.patch.industry
  ) {
    patch.industry = base.patch.industry;
    const baseIndustryField = (base?.detectedFields || []).find(field => field.path === 'industry');
    if (baseIndustryField) {
      const filtered = detectedFields.filter(field => field.path !== 'industry');
      filtered.push(baseIndustryField);
      warnings.push('\u696d\u7a2e\u306fPDF\u30c6\u30ad\u30b9\u30c8\u62bd\u51fa\u3068OCR\u3067\u4e0d\u4e00\u81f4\u3060\u3063\u305f\u305f\u3081\u3001PDF\u30c6\u30ad\u30b9\u30c8\u5074\u306e\u696d\u7a2e\u3092\u512a\u5148\u3057\u307e\u3057\u305f\u3002');
      return {
        fileName: extra?.fileName || base?.fileName || '',
        pageCount: extra?.pageCount || base?.pageCount || 0,
        rawText: base?.rawText || '',
        normalizedText: extra?.normalizedText || base?.normalizedText || '',
        patch,
        detectedFields: filtered,
        referenceScores: { ...(base?.referenceScores || {}), ...(extra?.referenceScores || {}) },
        warnings: uniqueMessages(warnings),
      };
    }
  }

  return {
    fileName: extra?.fileName || base?.fileName || '',
    pageCount: extra?.pageCount || base?.pageCount || 0,
    rawText: base?.rawText || '',
    normalizedText: extra?.normalizedText || base?.normalizedText || '',
    patch,
    detectedFields,
    referenceScores: { ...(base?.referenceScores || {}), ...(extra?.referenceScores || {}) },
    warnings,
  };
}

function mergeNestedObjects(base, extra) {
  const next = { ...(base || {}) };
  for (const [key, value] of Object.entries(extra || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base?.[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      next[key] = mergeNestedObjects(base[key], value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function mergeDetectedFields(base = [], extra = []) {
  const map = new Map();
  for (const field of base) map.set(field.path, field);
  for (const field of extra) map.set(field.path, field);
  return [...map.values()];
}

function uniqueMessages(messages = []) {
  return [...new Set(messages.filter(Boolean))];
}

export function parseKeishinText(rawText, meta = {}) {
  const text = normalizeText(rawText);
  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  const state = createParseState();
  const defaultAmountUnit = detectDefaultAmountUnit(text);
  const averageHeading = compact(text).match(/完成工事高(?:及び技術職員数)?([23])年平均/);
  if (averageHeading) addDetectedField(state, ['avgMethod'], '工事高の平均期間', `${averageHeading[1]}year`, { kind: 'select', source: 'PDF', confidence: 'high' });

  if (text.replace(/\s/g, '').length < 30) {
    state.warnings.push('PDFから文字を抽出できませんでした。スキャン画像PDFの場合はOCRが必要です。');
  }

  parseIndustryAndTechnicalCounts(lines, state, defaultAmountUnit, meta.forcedIndustry);

  for (const field of AMOUNT_FIELDS) {
    const candidate = findNumberNearLabels(lines, field);
    if (!candidate) continue;
    const amount = normalizeAmount(candidate.number, candidate.source, defaultAmountUnit);
    if (amount == null) continue;
    if (candidate.usedFallbackUnit) state.usedFallbackAmountUnit = true;
    addDetectedField(state, field.path, field.label, amount, {
      kind: 'amount',
      unit: '万円',
      source: candidate.source,
      confidence: candidate.confidence,
    });
  }

  parseRatios(lines, state);
  parseDetailedYInputs(lines, state);
  const financialInputs = { periods: { current: {}, prior: {} } };
  const rawFields = [
    ['current','grossProfit',['売上総利益'],['率']],
    ['current','ordinaryProfit',['経常利益'],['率']],
    ['current','netAssets',['当期純資産','当期自己資本','自己資本\\(当期\\)'],['率']],
    ['current','totalAssets',['総資本\\(当期\\)','当期総資本'],['率']],
    ['prior','totalAssets',['総資本\\(前期\\)','前期総資本'],['率']],
    ['current','keishinOperatingCF',['営業キャッシュフロー\\(当期\\)','当期営業キャッシュフロー'],[]],
    ['prior','keishinOperatingCF',['営業キャッシュフロー\\(前期\\)','前期営業キャッシュフロー'],[]],
  ];
  for (const [period,key,patterns,exclude] of rawFields) {
    const candidate = findNumberNearLabels(lines, {patterns,exclude});
    if (!candidate) continue;
    const amount = normalizeAmount(candidate.number, candidate.source, defaultAmountUnit);
    if (amount != null) financialInputs.periods[period][key] = D(amount).mul(10).number();
  }

  for (const field of [...COUNT_FIELDS, ...Z_FIELDS]) {
    const candidate = findNumberNearLabels(lines, field);
    if (!candidate) continue;
    if (
      field.path?.join?.('.') === 'zInput.coreSkill' &&
      !/登録基幹技能者等/u.test(normalizeText(candidate.source))
    ) {
      continue;
    }
    const value = Math.max(0, Math.floor(Number(candidate.number)));
    addDetectedField(state, field.path, field.label, value, {
      kind: 'count',
      unit: field.unit,
      source: candidate.source,
      confidence: candidate.confidence,
    });
  }

  normalizeImportedLevel1Counts(state);

  for (const field of BOOLEAN_FIELDS) {
    const candidate = findBooleanNearLabels(lines, field);
    if (!candidate) continue;
    addDetectedField(state, field.path, field.label, candidate.value, {
      kind: 'boolean',
      source: candidate.source,
      confidence: candidate.confidence,
    });
  }

  parseSelectFields(lines, state);
  parseReferenceScores(lines, state);

  if (getDeep(state.patch, ['kanseikoujidaka']) == null && getDeep(state.patch, ['_references', 'avgKanseikoujidaka']) != null) {
    state.warnings.push('当期の完成工事高を特定できず、年間平均完成工事高のみ検出しました。完成工事高は自動反映していません。');
  }

  if (getDeep(state.patch, ['motoukeKoujidaka']) == null && getDeep(state.patch, ['_references', 'avgMotoukeKoujidaka']) != null) {
    state.warnings.push('当期の元請完成工事高を特定できず、年間平均元請完成工事高のみ検出しました。元請完成工事高は自動反映していません。');
  }

  if (state.usedFallbackAmountUnit) {
    state.warnings.push('単位が明確でない金額は、経審PDFで一般的な千円表記として万円に換算しました。');
  }

  if (state.detectedFields.length === 0) {
    state.warnings.push('反映できる項目を検出できませんでした。PDFの様式やスキャン状態を確認してください。');
  }

  return {
    fileName: meta.fileName || '',
    pageCount: meta.pageCount || 0,
    rawText,
    normalizedText: text,
    financialInputs,
    patch: state.patch,
    detectedFields: state.detectedFields,
    referenceScores: state.referenceScores,
    warnings: state.warnings,
  };
}

function normalizeText(text) {
  return String(text || '')
    .replace(/[！-～]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/[，,]/g, '')
    .replace(/[：]/g, ':')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[−－―]/g, '-')
    .replace(/△\s*(\d)/g, '-$1')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '\n');
}

function compact(value) {
  return String(value || '').replace(/\s+/g, '');
}

function detectDefaultAmountUnit(text) {
  const source = compact(text);
  if (/単位[:：]?千円|金額\(千円\)|金額千円/.test(source)) return '千円';
  if (/単位[:：]?万円|金額\(万円\)|金額万円/.test(source)) return '万円';
  return null;
}

function normalizeAmount(value, source, defaultUnit) {
  if (!Number.isFinite(value)) return null;
  const text = compact(source);
  if (/億円/.test(text)) return value * 10000;
  if (/百万円/.test(text)) return value * 100;
  if (/千円/.test(text)) return value / 10;
  if (/万円/.test(text)) return value;
  if (/円/.test(text)) return value / 10000;
  if (defaultUnit === '千円') return value / 10;
  if (defaultUnit === '万円') return value;
  return null;
}

function findNumberNearLabels(lines, field) {
  for (let index = 0; index < lines.length; index += 1) {
    const ownLine = compact(lines[index]);
    if (!matchesAny(ownLine, field.patterns)) continue;
    if (field.exclude && matchesAny(ownLine, field.exclude)) continue;
    // An adjacent 元請 row must not exclude an already complete 完成工事高 row.
    const ownCandidate = readNumberAfterAnyLabel(ownLine, field.patterns);
    const source = ownCandidate ? lines[index] : [lines[index], lines[index + 1], lines[index + 2]].filter(Boolean).join(' ');
    const compactSource = compact(source);
    if (!ownCandidate && field.exclude && matchesAny(compactSource, field.exclude)) continue;

    const candidate = readNumberAfterAnyLabel(compactSource, field.patterns);
    if (!candidate) continue;

    return {
      number: candidate.number,
      unit: candidate.unit,
      usedFallbackUnit: candidate.usedFallbackUnit,
      source: source.slice(0, 160),
      confidence: 'medium',
    };
  }

  return null;
}

function readNumberAfterAnyLabel(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(new RegExp(pattern));
    if (!match) continue;

    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 40);
    const valueMatch = after.match(new RegExp(`^[^0-9-]{0,20}(${NUMBER_RE})(億円|百万円|千円|万円|円)?`));
    if (!valueMatch) continue;

    return {
      number: Number(valueMatch[1]),
      unit: valueMatch[2] || null,
      usedFallbackUnit: !valueMatch[2],
    };
  }

  return null;
}

function parseRatios(lines, state) {
  const profitRate = findPercentNearLabels(lines, {
    patterns: ['売上高経常利益率', '経常利益率'],
    exclude: ['総資本'],
  });

  if (profitRate) {
    addDetectedField(state, ['profitRate'], '経常利益率', profitRate.value / 100, {
      kind: 'ratio',
      unit: '%',
      source: profitRate.source,
      confidence: profitRate.confidence,
    });
  }

  const grossProfitRate = findPercentNearLabels(lines, {
    patterns: ['売上総利益率'],
    exclude: ['総資本'],
  });

  if (grossProfitRate) {
    addDetectedField(state, ['grossProfitRate'], '売上総利益率', grossProfitRate.value / 100, {
      kind: 'ratio',
      unit: '%',
      source: grossProfitRate.source,
      confidence: grossProfitRate.confidence,
    });
  }
}

function parseDetailedYInputs(lines, state) {
  const derivedRatios = {};

  for (const field of Y_DERIVED_RATIO_FIELDS) {
    const candidate = findPercentNearLabels(lines, { patterns: field.patterns });
    if (candidate) derivedRatios[field.key] = candidate;
  }

  const revenue = Number(getDeep(state.patch, ['uriage']) ?? 0);
  const equity = Number(getDeep(state.patch, ['equity']) ?? 0);
  const debt = Number(getDeep(state.patch, ['debt']) ?? 0);
  const totalCapital = equity + debt;

  if (
    getDeep(state.patch, ['grossProfitRate']) == null &&
    derivedRatios.grossProfitToCapitalRate &&
    revenue > 0 &&
    totalCapital > 0
  ) {
    const value = ((derivedRatios.grossProfitToCapitalRate.value / 100) * totalCapital) / revenue;
    if (Number.isFinite(value) && value >= 0 && value <= 2) {
      addDetectedField(state, ['grossProfitRate'], '売上総利益率（総資本売上総利益率から逆算）', value, {
        kind: 'ratio',
        unit: '%',
        source: derivedRatios.grossProfitToCapitalRate.source,
        confidence: 'medium',
      });
    }
  }

  if (
    getDeep(state.patch, ['fixedAssets']) == null &&
    derivedRatios.equityToFixedAssetsRate &&
    equity > 0 &&
    derivedRatios.equityToFixedAssetsRate.value > 0
  ) {
    const value = equity / (derivedRatios.equityToFixedAssetsRate.value / 100);
    if (Number.isFinite(value) && value >= 0) {
      addDetectedField(state, ['fixedAssets'], '固定資産（自己資本対固定資産比率から逆算）', Math.round(value), {
        kind: 'amount',
        unit: '万円',
        source: derivedRatios.equityToFixedAssetsRate.source,
        confidence: 'medium',
      });
    }
  }
}

function parseIndustryAndTechnicalCounts(lines, state, defaultAmountUnit, forcedIndustry = null) {
  const industryInfo = resolveTextPrimaryIndustry(lines, forcedIndustry);
  if (!industryInfo) return;

  addDetectedField(state, ['industry'], '建設工事の種類', industryInfo.industry, {
    kind: 'text',
    source: industryInfo.source,
    confidence: industryInfo.confidence,
  });

  if (industryInfo.multiple) {
    state.warnings.push(`建設工事の種類が複数検出されたため、先頭の「${industryInfo.industry}」を使用しました。`);
  }

  if (industryInfo.forced) {
    state.warnings.push('\u53d6\u8fbc\u6642\u306b\u6307\u5b9a\u3057\u305f\u5efa\u8a2d\u5de5\u4e8b\u306e\u7a2e\u5225\u3092\u4f7f\u7528\u3057\u307e\u3057\u305f\u3002');
  }

  const techCounts = findIndustrySpecificTechCounts(lines, industryInfo.industry);
  for (const field of Z_FIELDS) {
    const value = techCounts[field.path.join('.')];
    if (value == null) continue;
    addDetectedField(state, field.path, `${field.label}（${industryInfo.industry}）`, value.value, {
      kind: 'count',
      unit: field.unit,
      source: value.source,
      confidence: value.confidence,
    });
  }

  const principalRevenueCandidate = findIndustrySpecificAmount(lines, industryInfo.industry, MOTOUKE_AMOUNT_FIELD);
  if (principalRevenueCandidate) {
    const amount = normalizeAmount(principalRevenueCandidate.number, principalRevenueCandidate.source, defaultAmountUnit);
    if (amount != null) {
      if (principalRevenueCandidate.usedFallbackUnit) state.usedFallbackAmountUnit = true;
      addDetectedField(state, ['motoukeKoujidaka'], `元請完成工事高（${industryInfo.industry}）`, amount, {
        kind: 'amount',
        unit: '万円',
        source: principalRevenueCandidate.source,
        confidence: principalRevenueCandidate.confidence,
      });
    }
  }
}

function resolveTextPrimaryIndustry(lines, forcedIndustry = null) {
  const normalizedForcedIndustry = normalizeIndustryValue(forcedIndustry);
  if (normalizedForcedIndustry) {
    return {
      industry: normalizedForcedIndustry,
      multiple: false,
      source: '\u30e6\u30fc\u30b6\u30fc\u6307\u5b9a',
      confidence: 'high',
      forced: true,
    };
  }

  const detectedIndustry = findPrimaryIndustry(lines);
  if (!detectedIndustry) return null;
  return {
    ...detectedIndustry,
    forced: false,
  };
}

function findPercentNearLabels(lines, field) {
  for (let index = 0; index < lines.length; index += 1) {
    const source = [lines[index], lines[index + 1]].filter(Boolean).join(' ');
    const compactSource = compact(source);
    if (!matchesAny(compactSource, field.patterns)) continue;
    if (field.exclude && matchesAny(compactSource, field.exclude)) continue;

    const candidate = readNumberAfterAnyLabel(compactSource, field.patterns);
    if (!candidate) continue;

    return {
      value: Number(candidate.number),
      source: source.slice(0, 160),
      confidence: 'medium',
    };
  }

  return null;
}

function findPrimaryIndustry(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    const source = [lines[index], lines[index + 1], lines[index + 2]].filter(Boolean).join(' ');
    const compactSource = compact(source);
    let industries = [];

    if (/先頭業種/.test(compactSource)) {
      industries = extractIndustriesFromText(source);
    } else if (/建設工事の種類|工事の種類|申請業種|業種/.test(compactSource)) {
      industries = extractIndustriesFromText(source);
    }

    if (industries.length > 0) {
      return {
        industry: industries[0],
        multiple: industries.length > 1,
        source: source.slice(0, 160),
        confidence: /先頭業種/.test(compactSource) ? 'high' : 'medium',
      };
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const source = [lines[index], lines[index + 1]].filter(Boolean).join(' ');
    const industries = extractIndustriesFromText(source);
    if (industries.length > 0) {
      return {
        industry: industries[0],
        multiple: industries.length > 1,
        source: source.slice(0, 160),
        confidence: 'low',
      };
    }
  }

  return null;
}

function extractIndustriesFromText(text) {
  const compactText = compact(text);
  const matches = [];

  for (const industry of INDUSTRY_OPTIONS_SORTED) {
    const index = compactText.indexOf(compact(industry));
    if (index === -1) continue;
    matches.push({ industry, index });
  }

  return matches
    .sort((a, b) => a.index - b.index)
    .filter((item, index, array) => index === 0 || item.industry !== array[index - 1].industry)
    .map(item => item.industry);
}

function findIndustrySpecificTechCounts(lines, industry) {
  const block = findExplicitIndustryTechBlock(lines, industry) || findIndustryBlock(lines, industry);
  if (!block) return {};

  const values = {};

  for (const field of Z_FIELDS) {
    const candidate = findNumberNearLabels(block, field);
    if (!candidate) continue;
    if (
      field.path?.join?.('.') === 'zInput.coreSkill' &&
      !/登録基幹技能者等/u.test(normalizeText(candidate.source))
    ) {
      continue;
    }
    values[field.path.join('.')] = {
      value: Math.max(0, Math.floor(Number(candidate.number))),
      source: candidate.source,
      confidence: candidate.confidence,
    };
  }

  const parsedSourceCounts = parseTechnicalStaffSourceText(block.join(' '));
  for (const [path, value] of [
    ['zInput.level1WithCertificate', parsedSourceCounts.level1WithCertificate],
    ['zInput.level1', parsedSourceCounts.level1],
    ['zInput.kanriAssistant', parsedSourceCounts.kanriAssistant],
    ['zInput.coreSkill', parsedSourceCounts.coreSkill],
    ['zInput.level2', parsedSourceCounts.level2],
    ['zInput.other', parsedSourceCounts.other],
  ]) {
    if (value == null) continue;
    values[path] = {
      value,
      source: block.join(' ').slice(0, 160),
      confidence: 'high',
    };
  }

  if (values['zInput.level1WithCertificate'] == null) {
    const lectureCandidate = findNumberNearLabels(block, {
      patterns: ['講習受講'],
      exclude: [],
    });
    if (lectureCandidate) {
      values['zInput.level1WithCertificate'] = {
        value: Math.max(0, Math.floor(Number(lectureCandidate.number))),
        source: lectureCandidate.source,
        confidence: lectureCandidate.confidence,
      };
    }
  }

  return values;
}

function findExplicitIndustryTechBlock(lines, industry) {
  const escapedIndustry = escapeRegExp(compact(industry));

  for (let index = 0; index < lines.length; index += 1) {
    const source = [lines[index], lines[index + 1], lines[index + 2]].filter(Boolean).join(' ');
    const compactSource = compact(source);
    if (!new RegExp(`技術職員.*${escapedIndustry}|${escapedIndustry}.*技術職員`).test(compactSource)) continue;
    return [source];
  }

  return null;
}

function findIndustryBlock(lines, industry) {
  const normalizedIndustry = compact(industry);
  const startIndex = lines.findIndex(line => compact(line).includes(normalizedIndustry));
  if (startIndex === -1) return null;

  const block = [];
  for (let index = startIndex; index < Math.min(lines.length, startIndex + 8); index += 1) {
    const line = lines[index];
    if (index > startIndex && containsOtherIndustry(line, industry)) break;
    block.push(line);
  }

  return block.length > 0 ? block : null;
}

function containsOtherIndustry(line, selectedIndustry) {
  const compactLine = compact(line);
  return INDUSTRY_OPTIONS_SORTED.some(industry => industry !== selectedIndustry && compactLine.includes(compact(industry)));
}

function findIndustrySpecificAmount(lines, industry, field) {
  if (!field) return null;
  const block = findIndustryBlock(lines, industry);
  if (!block) return null;
  return findNumberNearLabels(block, field);
}

function normalizeImportedLevel1Counts(state, options = {}) {
  const level1Path = ['zInput', 'level1'];
  const certificatePath = ['zInput', 'level1WithCertificate'];
  const level1Value = Number(getDeep(state.patch, level1Path));

  if (!Number.isFinite(level1Value) || level1Value < 0) return;

  let certificateValue = Number(getDeep(state.patch, certificatePath));
  const level1Field = getDetectedField(state, level1Path);
  const certificateField = getDetectedField(state, certificatePath);
  const lectureSource = options.lectureSource || `${level1Field?.source || ''} ${certificateField?.source || ''}`;

  if (!Number.isFinite(certificateValue) || certificateValue < 0) {
    const match = compact(normalizeText(lectureSource)).match(/(?:\()?(?:講習受講)(?:\))?[^0-9]{0,10}([+-]?\d+(?:\.\d+)?)/);
    if (match) {
      certificateValue = Math.max(0, Math.floor(Number(match[1])));
      addDetectedField(
        state,
        certificatePath,
        options.industry
          ? `監理技術者資格者証のある1級技術者（${options.industry}）`
          : '監理技術者資格者証のある1級技術者',
        certificateValue,
        {
          kind: 'count',
          unit: '名',
          source: lectureSource.slice(0, 160),
          confidence: 'medium',
        }
      );
    }
  }

  if (!Number.isFinite(certificateValue) || certificateValue < 0) return;

  const shouldAdjust = options.forceTotalLevel1 === true || /講習受講/.test(compact(lectureSource));
  if (!shouldAdjust) return;

  const adjusted = Math.max(0, Math.floor(level1Value) - Math.floor(certificateValue));
  if (adjusted === Math.floor(level1Value)) return;

  updateDetectedField(state, level1Path, adjusted);

  if (certificateValue > level1Value) {
    state.warnings.push('技術職員数の1級技術者と講習受講者数の関係を確認できなかったため、1級技術者は0名で反映しました。');
    return;
  }

  state.warnings.push('技術職員数の1級技術者は、PDFの1級総数から講習受講者数を差し引いて反映しました。');
}

function findBooleanNearLabels(lines, field) {
  const positive = /(有|あり|加入|取得|認証|適用|設置|提出|対象|該当|○|〇)/;
  const negative = /(無|なし|未加入|未取得|未認証|非該当|不適用|未設置|未提出|×)/;

  for (let index = 0; index < lines.length; index += 1) {
    const source = [lines[index], lines[index + 1]].filter(Boolean).join(' ');
    const compactSource = compact(source);
    if (!matchesAny(compactSource, field.patterns)) continue;

    if (negative.test(compactSource)) {
      return { value: false, source: source.slice(0, 160), confidence: 'medium' };
    }

    if (positive.test(compactSource)) {
      return { value: true, source: source.slice(0, 160), confidence: 'medium' };
    }
  }

  return null;
}

function parseSelectFields(lines, state) {
  const text = compact(lines.join('\n'));

  if (/会計監査人/.test(text)) {
    addDetectedField(state, ['wInput', 'accounting', 'auditStatus'], '監査の受審状況', 'auditor', {
      kind: 'select',
      source: '会計監査人',
      confidence: 'medium',
    });
  } else if (/会計参与/.test(text)) {
    addDetectedField(state, ['wInput', 'accounting', 'auditStatus'], '監査の受審状況', 'accountingAdvisor', {
      kind: 'select',
      source: '会計参与',
      confidence: 'medium',
    });
  } else if (/経理処理の適正確認|自主点検/.test(text)) {
    addDetectedField(state, ['wInput', 'accounting', 'auditStatus'], '監査の受審状況', 'selfCheck', {
      kind: 'select',
      source: '経理処理の適正確認',
      confidence: 'medium',
    });
  }

  if (/営業停止/.test(text)) {
    addDetectedField(state, ['wInput', 'continuity', 'legalAction'], '直近の処分状況', 'suspension', {
      kind: 'select',
      source: '営業停止',
      confidence: 'medium',
    });
  } else if (/指示処分/.test(text)) {
    addDetectedField(state, ['wInput', 'continuity', 'legalAction'], '直近の処分状況', 'instruction', {
      kind: 'select',
      source: '指示処分',
      confidence: 'medium',
    });
  }

  if (/再生手続中|更生手続中/.test(text)) {
    addDetectedField(state, ['wInput', 'continuity', 'rehabilitation'], '再生・更生手続の状況', 'ongoing', {
      kind: 'select',
      source: '再生・更生手続中',
      confidence: 'medium',
    });
  }

  if (/就業履歴/.test(text) && /すべて|全て|全建設工事/.test(text)) {
    addDetectedField(state, ['wInput', 'welfare', 'careerHistory'], '就業履歴の蓄積状況', 'allConstruction', {
      kind: 'select',
      source: '就業履歴 全建設工事',
      confidence: 'medium',
    });
  } else if (/就業履歴/.test(text) && /公共工事/.test(text)) {
    addDetectedField(state, ['wInput', 'welfare', 'careerHistory'], '就業履歴の蓄積状況', 'publicWorks', {
      kind: 'select',
      source: '就業履歴 公共工事',
      confidence: 'medium',
    });
  }

  const workLifeMap = [
    ['platinumEruboshi', /プラチナえるぼし/],
    ['eruboshi3', /えるぼし.*3|3.*えるぼし/],
    ['eruboshi2', /えるぼし.*2|2.*えるぼし/],
    ['eruboshi1', /えるぼし.*1|1.*えるぼし/],
    ['platinumKurumin', /プラチナくるみん/],
    ['tryKurumin', /トライくるみん/],
    ['kurumin', /くるみん/],
    ['yell', /ユースエール/],
  ];

  const workLifeMatch = workLifeMap.find(([, pattern]) => pattern.test(text));
  if (workLifeMatch) {
    addDetectedField(state, ['wInput', 'welfare', 'workLifeBalance'], 'ワーク・ライフ・バランス認定', workLifeMatch[0], {
      kind: 'select',
      source: workLifeMatch[1].source,
      confidence: 'medium',
    });
  }
}

function parseReferenceScores(lines, state) {
  const text = compact(lines.join('\n'));

  for (const field of SCORE_FIELDS) {
    const score = findScore(text, field.patterns);
    if (score == null) continue;
    applyReferenceScore(state, field.key, score, {
      source: field.label,
      confidence: 'high',
    });
  }
}

function applyReferenceScore(state, key, score, meta = {}) {
  state.referenceScores[key] = score;


}

function findScore(text, patterns) {
  for (const pattern of patterns) {
    const labelMatch = text.match(new RegExp(pattern));
    if (!labelMatch) continue;
    const after = text.slice(labelMatch.index + labelMatch[0].length, labelMatch.index + labelMatch[0].length + 40);
    const valueMatch = after.match(new RegExp(`^[^0-9]{0,20}(${NUMBER_RE})点?`));
    if (!valueMatch) continue;
    const value = Number(valueMatch[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 2500) {
      return Math.round(value);
    }
  }

  return null;
}

function matchesAny(text, patterns) {
  return patterns.some(pattern => new RegExp(pattern).test(text));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addDetectedField(state, path, label, value, meta) {
  const key = path.join('.');
  if (state.detectedFields.some(field => field.path === key)) return;

  setDeep(state.patch, path, value);
  state.detectedFields.push({
    path: key,
    label,
    value,
    kind: meta.kind,
    unit: meta.unit || '',
    source: meta.source || '',
    confidence: meta.confidence || 'medium',
  });
}

function getDetectedField(state, path) {
  const key = path.join('.');
  return state.detectedFields.find(field => field.path === key) || null;
}

function updateDetectedField(state, path, value) {
  setDeep(state.patch, path, value);
  const field = getDetectedField(state, path);
  if (field) field.value = value;
}

function setDeep(target, path, value) {
  let current = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    current[key] = current[key] || {};
    current = current[key];
  }
  current[path[path.length - 1]] = value;
}

function getDeep(target, path) {
  return path.reduce((current, key) => (current == null ? undefined : current[key]), target);
}
