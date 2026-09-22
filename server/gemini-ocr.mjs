import { INDUSTRY_OPTIONS } from '../src/utils/calculations.js';

const GEMINI_OCR_MODELS = ['gemini-3.1-pro-preview'];
const GEMINI_RETRY_DELAYS_MS = [1500, 3000, 5000];
const GEMINI_TRANSIENT_STATUS_CODES = new Set([429, 500, 503, 504]);

export async function runGeminiOcr(images, apiKey, options = {}) {
  if (!images.length) {
    throw new Error('OCR対象のページ画像がありません。');
  }

  const failures = [];

  for (const model of GEMINI_OCR_MODELS) {
    for (let retryIndex = 0; retryIndex <= GEMINI_RETRY_DELAYS_MS.length; retryIndex += 1) {
      const response = await requestGeminiOcr(model, images, apiKey, options);
      if (response.ok) {
        return {
          text: response.text,
          data: response.data,
          model,
        };
      }

      failures.push(`${model}: ${response.message}`);

      if (!response.retryable) {
        throw new Error(response.message);
      }

      if (retryIndex < GEMINI_RETRY_DELAYS_MS.length) {
        await wait(GEMINI_RETRY_DELAYS_MS[retryIndex] + Math.round(Math.random() * 400));
      }
    }
  }

  throw new Error(
    failures.length > 0
      ? `Gemini OCRが過負荷です。${failures[failures.length - 1]}`
      : 'Gemini OCRに失敗しました。'
  );
}

async function requestGeminiOcr(model, images, apiKey, options = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(120_000),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: structuredGeminiOcrPrompt(options) },
          ...images.map(image => ({
            inline_data: {
              mime_type: image.mimeType,
              data: image.data,
            },
          })),
        ],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      retryable: GEMINI_TRANSIENT_STATUS_CODES.has(response.status),
      message: `Gemini API HTTP ${response.status}`,
    };
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();
  if (!text) {
    return {
      ok: false,
      retryable: false,
      message: 'Gemini OCRから文字列が返りませんでした。',
    };
  }

  try {
    const data = parseGeminiOcrPayload(text);
    return { ok: true, text, data };
  } catch (error) {
    return {
      ok: false,
      retryable: false,
      message: error instanceof Error ? error.message : 'Gemini OCR の JSON 解釈に失敗しました。',
    };
  }
}

function structuredGeminiOcrPrompt(options = {}) {
  const forcedIndustry = String(options.forcedIndustry || '').trim();
  return [
    'This is a Japanese construction-industry keishin PDF image.',
    'Align each industry label with its own horizontal row. Blank rows are not populated rows; never shift values up across a blank row.',
    'Return exactly one JSON object only. No markdown. No explanation.',
    'Do not guess. Use null when a field cannot be read.',
    'Do not convert currency values. Return the printed number as number or numeric string.',
    'documentUnit must be one of "thousand_yen", "ten_thousand_yen", "yen", or null.',
    'amounts.kanseikoujidakaCurrent must be the explicitly printed current-period completed work amount. 売上高 is total sales, NEVER 完成工事高. Never copy sales, a ratio-derived estimate, an annual average, or an X1 score into this field.',
    'A column headed 完成工事高 / 3年平均 (or 2年平均) contains ONLY averages. Return null for current-period amounts when they are not separately printed.',
    'amountSources must transcribe the Japanese label, period header and number for each non-null current-period construction amount. Return null without explicit source evidence.',
    'amounts.avgProfit is the 利益額 in the 自己資本額及び利益額 table (X2), even when not labelled 平均利益額. Do not use 経常利益 or the score beside it.',
    'amounts.ordinaryProfit is the separate 経常利益 amount in the financial reference table. Always extract it when printed; it is used to calculate profitRatePercent from sales.',
    'Extract amounts.currentLiabilities from 流動負債 and amounts.fixedLiabilities from 固定負債 separately. debt is only the explicitly printed 負債総額 or 負債合計; leave it null if absent. The application will add the two liability amounts.',
    'Extract amounts.interestIncome from 受取利息配当金 and amounts.previousTotalCapital from 総資本（前期）. These are essential for Y. Preserve zero. Do not substitute 当期総資本 for 前期.',
    'Extract documentContext.companyId as the company name, periodEnd from 審査基準日 (ISO YYYY-MM-DD), and applicationDate only if explicitly printed. Never infer applicationDate from periodEnd. Extract amounts.currentTotalCapital from 総資本（当期）, currentNetAssets from 自己資本 in the bottom financial reference section (not the potentially averaged X2 field).',
    'averageYears must be 2 or 3 from the completed-construction column heading, never from 営業年数.',
    'Transcribe every industry row with a printed P score into industryRows. Include rows with zero construction revenue. Each row must keep its industry, P, X1, Z, averages and staff counts aligned. A zero construction amount is not a zero X1 score.',
    'Do not omit industries simply because their completed work is 0. For each row technicalStaffCells is exactly six printed numbers in this order: 一級, (講習受講), 監理補佐, 基幹, 二級, その他. Preserve all zeros and do not shift 二級 into その他. Read the entire row left to right.',
    'flagSources.kentaikyo must contain ONLY the complete 建設業退職金共済事業制度加入の有無 row and its last 有 or 無. Do not use the preceding 厚生年金保険 row. The word 有無 in the label is not the answer.',
    'amounts.grossProfit is 売上総利益. amounts.operatingCFCurrent and operatingCFPrevious are 営業キャッシュフロー（当期） and （前期）. Preserve negative signs. operatingCF is an explicitly printed average, otherwise null.',
    'grossProfitRatePercent means 売上総利益 / 売上高, NOT 総資本売上総利益率. If only amounts are printed, leave this ratio null. grossProfitToCapitalRatePercent means 総資本売上総利益率, NOT 自己資本対固定資産比率.',
    'Read each 有 / 無 / 非該当 from its own row. flags.retirementOrPension is 退職一時金制度若しくは企業年金制度導入. Never copy 有 from adjacent rows. Non-applicable CCUS is selects.careerHistory="none".',
    'amounts.interest must be the printed annual interest expense or payment interest. Never use interest-bearing debt for this field.',
    'If a currency unit is printed near an amount, include that unit either in documentUnit or together with that amount value.',
    `primaryIndustry must be the first construction industry listed in the PDF, using one of these exact values: ${INDUSTRY_OPTIONS.join(', ')}`,
    ...(forcedIndustry ? [
      `The user selected "${forcedIndustry}" before import.`,
      `Use "${forcedIndustry}" as primaryIndustry and read technicalStaff and industry-specific amounts for that industry.`,
    ] : []),
    'multipleIndustries must be true when multiple industries are listed, otherwise false.',
    'When multipleIndustries is true, amounts.motoukeKoujidakaPrimaryIndustry must be the principal completed construction amount for primaryIndustry.',
    'technicalStaff.level1WithCertificate must be the count shown as "(講習受講)" or manager-certificate-attached first-class engineers.',
    'technicalStaff.level1 must be the total printed first-class engineer count before subtracting technicalStaff.level1WithCertificate.',
    'Read scores.p, scores.x1, scores.z, averages and technicalStaff from primaryIndustry only; do not mix different industry rows.',
    'technicalStaff.level1WithCertificate is the printed count for (\u8b1b\u7fd2\u53d7\u8b1b), which is a subset of technicalStaff.level1.',
    'technicalStaff.coreSkill must be the exact printed count for \u767b\u9332\u57fa\u5e79\u6280\u80fd\u8005\u7b49. If the printed value is 0, return 0. Do not infer from \u30ec\u30d9\u30eb4.',
    'technicalStaff.sourceText must be a short raw transcription of the selected industry technical-staff row containing the industry name, labels and counts.',
    'Never convert a printed 0 in technicalStaff to 1.',
    'scores.w must be the W score printed in the PDF.',
    'selects.auditStatus must be "auditor" | "accountingAdvisor" | "selfCheck" | "none" | null.',
    'selects.legalAction must be "suspension" | "instruction" | "none" | null.',
    'selects.rehabilitation must be "ongoing" | "none" | null.',
    'selects.careerHistory must be "allConstruction" | "publicWorks" | "none" | null.',
    'selects.workLifeBalance must be "platinumEruboshi" | "eruboshi3" | "eruboshi2" | "eruboshi1" | "platinumKurumin" | "tryKurumin" | "kurumin" | "yell" | "none" | null.',
    'Use this exact JSON shape.',
    '{',
    '  "documentUnit": "thousand_yen",',
    '  "primaryIndustry": null,',
    '  "multipleIndustries": false,',
    '  "averageYears": null,',
    '  "flagSources": { "kentaikyo": null },',
    '  "industryRows": [{ "industry": null, "p": null, "x1": null, "z": null, "avgKanseikoujidaka": null, "avgMotoukeKoujidaka": null, "technicalStaffCells": [null, null, null, null, null, null], "technicalStaff": { "level1": null, "level1WithCertificate": null, "kanriAssistant": null, "coreSkill": null, "level2": null, "other": null } }],',
    '  "documentContext": { "companyId": null, "periodEnd": null, "applicationDate": null },',
    '  "amountSources": { "kanseikoujidakaCurrent": null, "motoukeKoujidakaCurrent": null, "motoukeKoujidakaPrimaryIndustry": null },',
    '  "scores": { "p": null, "x1": null, "x2": null, "y": null, "z": null, "w": null },',
    '  "amounts": {',
    '    "kanseikoujidakaCurrent": null, "avgKanseikoujidaka": null, "motoukeKoujidakaCurrent": null, "motoukeKoujidakaPrimaryIndustry": null, "avgMotoukeKoujidaka": null,',
    '    "uriage": null, "equity": null, "debt": null, "currentLiabilities": null, "fixedLiabilities": null, "interest": null, "interestIncome": null, "previousTotalCapital": null, "currentTotalCapital": null, "currentNetAssets": null, "avgProfit": null, "ordinaryProfit": null,',
    '    "fixedAssets": null, "grossProfit": null, "operatingCF": null, "operatingCFCurrent": null, "operatingCFPrevious": null, "retainedEarnings": null, "researchAmount": null',
    '  },',
    '  "ratios": {',
    '    "profitRatePercent": null, "grossProfitRatePercent": null, "grossProfitToCapitalRatePercent": null, "equityToFixedAssetsRatePercent": null',
    '  },',
    '  "counts": { "businessYears": null, "eligibleMachineCount": null, "cpaCount": null, "level2AccountingCount": null },',
    '  "technicalStaff": {',
    '    "level1WithCertificate": null, "level1": null, "kanriAssistant": null, "coreSkill": null, "level2": null, "other": null, "sourceText": null',
    '  },',
    '  "flags": {',
    '    "kentaikyo": null, "retirementOrPension": null, "extraAccident": null, "iso9001": null, "iso14001": null, "ecoAction21": null,',
    '    "youngEngineerRatio": null, "newYoungEngineerRatio": null, "declaration": null, "disasterSupport": null',
    '  },',
    '  "selects": {',
    '    "auditStatus": null, "legalAction": null, "rehabilitation": null, "careerHistory": null, "workLifeBalance": null',
    '  }',
    '}',
  ].join('\n');
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function parseGeminiOcrPayload(text) {
  const jsonText = extractJsonObjectText(text);
  if (!jsonText) {
    throw new Error('Gemini OCR の JSON 解釈に失敗しました。');
  }

  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini OCR の応答が JSON object ではありませんでした。');
  }

  return parsed;
}

function extractJsonObjectText(text) {
  const source = String(text || '').trim();
  if (!source) return null;

  const fencedMatch = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : source;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

