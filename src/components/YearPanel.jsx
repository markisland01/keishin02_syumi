import { useState } from 'react';
import {
  AVERAGE_METHOD_OPTIONS,
  getMonthlyBids,
  INDUSTRY_OPTIONS,
  SLIDER_CONFIGS,
  W_AUDIT_OPTIONS,
  W_CAREER_HISTORY_OPTIONS,
  W_LEGAL_ACTION_OPTIONS,
  W_REHABILITATION_OPTIONS,
  W_WORK_LIFE_BALANCE_OPTIONS,
  Z_TECHNICAL_ROLE_FIELDS,
} from '../utils/calculations';

const SLIDER_UI = {
  staff: { label: '在宅スタッフ数', unit: '名' },
  bidsPerStaff: { label: '1名あたり月間入札件数', unit: '件/名' },
  winRate: { label: '落札率', unit: '%' },
  avgContractAmount: { label: '平均落札金額', unit: '万円' },
  profitRate: { label: '利益率', unit: '%' },
  equity: { label: '自己資本', unit: '万円' },
  debt: { label: '負債総額（流動＋固定）', unit: '万円' },
  interest: { label: '支払利息', unit: '万円/年' },
  grossProfitRate: { label: '売上総利益率', unit: '%' },
  fixedAssets: { label: '固定資産', unit: '万円' },
  operatingCF: { label: '営業キャッシュフロー', unit: '万円/年' },
  retainedEarnings: { label: '利益剰余金', unit: '万円' },
  kanseikoujidaka: { label: '完成工事高', unit: '万円/年' },
  uriage: { label: '売上高', unit: '万円/年' },
  motoukeKoujidaka: { label: '元請完成工事高', unit: '万円/年' },
};

const INDUSTRY_LABELS = [
  '土木一式',
  '建築一式',
  '大工',
  '左官',
  'とび・土工・コンクリート',
  '石',
  '屋根',
  '電気',
  '管',
  'タイル・れんが・ブロック',
  '鋼構造物',
  '鉄筋',
  '舗装',
  'しゅんせつ',
  '板金',
  'ガラス',
  '塗装',
  '防水',
  '内装仕上',
  '機械器具設置',
  '熱絶縁',
  '電気通信',
  '造園',
  'さく井',
  '建具',
  '水道施設',
  '消防施設',
  '清掃施設',
  '解体',
];

const AVERAGE_METHOD_LABELS = {
  '2year': '2年平均',
  '3year': '3年平均',
};

const Z_FIELD_LABELS = {
  level1WithCertificate: '監理技術者資格者証のある1級技術者',
  level1: '1級技術者',
  kanriAssistant: '監理技術者補佐',
  coreSkill: '登録基幹技能者等',
  level2: '2級技術者',
  other: 'その他技術者',
};

const W_AUDIT_LABELS = {
  none: '未設定',
  selfCheck: '自主点検',
  accountingAdvisor: '公認会計士等による確認',
  auditor: '会計監査人設置',
};

const W_WORK_LIFE_BALANCE_LABELS = {
  none: '未設定',
  eruboshi1: 'えるぼし 1段階',
  eruboshi2: 'えるぼし 2段階',
  eruboshi3: 'えるぼし 3段階',
  platinumEruboshi: 'プラチナえるぼし',
  tryKurumin: 'トライくるみん',
  kurumin: 'くるみん',
  platinumKurumin: 'プラチナくるみん',
  yell: 'ユースエール',
};

const W_CAREER_HISTORY_LABELS = {
  none: '未設定',
  publicWorks: '公共工事のみ蓄積',
  allConstruction: '全建設工事で蓄積',
};

const W_REHABILITATION_LABELS = {
  none: '該当なし',
  ongoing: '再生・更生手続中',
};

const W_LEGAL_ACTION_LABELS = {
  none: 'なし',
  instruction: '指示処分',
  suspension: '営業停止処分',
};

const industryOptions = INDUSTRY_OPTIONS.map((value, index) => ({
  value,
  label: INDUSTRY_LABELS[index] || value,
}));

const averageMethodOptions = AVERAGE_METHOD_OPTIONS.map(option => ({
  value: option.value,
  label: AVERAGE_METHOD_LABELS[option.value] || option.label,
}));

const zTechnicalFields = Z_TECHNICAL_ROLE_FIELDS.map(field => ({
  ...field,
  label: Z_FIELD_LABELS[field.key] || field.label,
}));

const auditOptions = W_AUDIT_OPTIONS.map(option => ({
  ...option,
  label: W_AUDIT_LABELS[option.value] || option.label,
}));

const workLifeOptions = W_WORK_LIFE_BALANCE_OPTIONS.map(option => ({
  ...option,
  label: W_WORK_LIFE_BALANCE_LABELS[option.value] || option.label,
}));

const careerHistoryOptions = W_CAREER_HISTORY_OPTIONS.map(option => ({
  ...option,
  label: W_CAREER_HISTORY_LABELS[option.value] || option.label,
}));

const rehabilitationOptions = W_REHABILITATION_OPTIONS.map(option => ({
  ...option,
  label: W_REHABILITATION_LABELS[option.value] || option.label,
}));

const legalActionOptions = W_LEGAL_ACTION_OPTIONS.map(option => ({
  ...option,
  label: W_LEGAL_ACTION_LABELS[option.value] || option.label,
}));

function SliderRow({ configKey, value, onChange, label }) {
  const cfg = SLIDER_CONFIGS[configKey];
  const ui = SLIDER_UI[configKey] || {};
  const display = cfg.display ? cfg.display(value) : value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <label style={{ fontSize: 12, width: 144, flexShrink: 0, color: '#444' }}>
        {label || ui.label || cfg.label}
      </label>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#1a237e' }}
      />
      <span style={{ fontSize: 13, fontWeight: 'bold', color: '#1a237e', width: 90, textAlign: 'right' }}>
        {display}
        {ui.unit || cfg.unit}
      </span>
    </div>
  );
}

function RatioRow({ value, onChange }) {
  const constructionPercent = Math.round(value * 100);
  const nonConstructionPercent = 100 - constructionPercent;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, width: 144, flexShrink: 0, color: '#444' }}>
          工事入札割合
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: '#1a237e' }}
        />
        <span style={{ fontSize: 13, fontWeight: 'bold', color: '#1a237e', width: 90, textAlign: 'right' }}>
          {constructionPercent}%
        </span>
      </div>
      <div style={{ marginLeft: 152, fontSize: 10, color: '#666' }}>
        工事 {constructionPercent}% / 役務・物販 {nonConstructionPercent}%
      </div>
    </div>
  );
}

function AmountSliderRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <label style={{ fontSize: 12, width: 144, flexShrink: 0, color: '#444' }}>
        {label}
      </label>
      <input
        type="range"
        min={50}
        max={5000}
        step={50}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#1a237e' }}
      />
      <span style={{ fontSize: 13, fontWeight: 'bold', color: '#1a237e', width: 90, textAlign: 'right' }}>
        {value}万円
      </span>
    </div>
  );
}

function ModeToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {[
        { key: 'simple', label: 'シンプル' },
        { key: 'detail', label: '詳細' },
      ].map(option => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          style={{
            border: '1px solid #c5cae9',
            background: value === option.key ? '#3949ab' : 'white',
            color: value === option.key ? 'white' : '#3949ab',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const UNIT_OPTIONS = [
  { value: 'man', label: '万円' },
  { value: 'sen', label: '千円' },
  { value: 'en', label: '円' },
];

function unitFactorToMan(unit) {
  if (unit === 'en') return 1 / 10000;
  if (unit === 'sen') return 1 / 10;
  return 1;
}

function parseNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function DocInput({ label, value, onChange, hint, dim, disabled, displayValue }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 6, padding: '4px 0', borderTop: '1px dashed #e0e0e0' }}>
      <span style={{ fontSize: 11, color: dim || disabled ? '#999' : '#444' }}>
        {label}
        {hint && <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>{hint}</span>}
      </span>
      <input
        type="number"
        value={disabled ? (displayValue ?? '') : (value ?? '')}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder="—"
        style={{
          width: 110,
          padding: '4px 6px',
          fontSize: 12,
          textAlign: 'right',
          border: '1px solid #c8e6c9',
          borderRadius: 4,
          background: disabled ? '#f0f0f0' : 'white',
          color: disabled ? '#666' : 'inherit',
        }}
      />
    </label>
  );
}

function TwoPeriodCard({
  title,
  accent = '#00695C',
  currentMan,
  useDirect,
  onUseDirectChange,
  priorRaw,
  onPriorChange,
  directRaw,
  onDirectChange,
  resultMan,
  resultSource,
  priorPlaceholder,
  customPriorInputs,
}) {
  const fmt = v => (v === null || v === undefined ? '—' : Math.round(v).toLocaleString() + ' 万円');
  return (
    <div style={{ background: 'white', borderRadius: 6, padding: '8px 12px', borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, fontWeight: 'bold', color: accent, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>
        当期: <strong>{fmt(currentMan)}</strong>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 0', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={useDirect}
          onChange={e => onUseDirectChange?.(e.target.checked)}
        />
        <span style={{ color: useDirect ? accent : '#444', fontWeight: useDirect ? 'bold' : 'normal' }}>
          2期平均値を直接入力
        </span>
      </label>
      {useDirect ? (
        <DocInput
          label="2期平均値"
          value={directRaw}
          onChange={onDirectChange}
        />
      ) : (
        customPriorInputs || (
          <DocInput
            label={priorPlaceholder || '前期'}
            value={priorRaw}
            onChange={onPriorChange}
            hint="空欄なら当期のみ使用"
          />
        )
      )}
      <div
        style={{
          marginTop: 6,
          padding: '4px 8px',
          background: '#fafafa',
          borderRadius: 4,
          fontSize: 11,
          color: resultSource ? accent : '#999',
          fontWeight: 'bold',
        }}
      >
        → 採用値: {fmt(resultMan)}{resultSource ? `（${resultSource}）` : ''}
      </div>
    </div>
  );
}

function FinancialDocPanel({ doc = {}, onDocChange, onApply, yModel = 'simple' }) {
  const unit = doc.unit || 'man';
  const factor = unitFactorToMan(unit);
  const toMan = key => {
    const n = parseNum(doc[key]);
    return n === null ? null : n * factor;
  };

  const sales = toMan('sales');
  const ordinaryProfit = toMan('ordinaryProfit');
  const grossProfit = toMan('grossProfit');
  const operatingProfit = toMan('operatingProfit');
  const depreciation = toMan('depreciation');
  const interest = toMan('interest');
  const corporateTax = toMan('corporateTax');
  const netAssets = toMan('netAssets');
  const totalDebt = toMan('totalDebt');
  const fixedAssets = toMan('fixedAssets');
  const retainedEarnings = toMan('retainedEarnings');

  const cfAuto = Boolean(doc.cfAuto);
  const operatingCFManual = toMan('operatingCF');
  const operatingCFAuto = ordinaryProfit !== null
    ? ordinaryProfit + (depreciation || 0) - (corporateTax || 0)
    : null;
  const operatingCF = cfAuto ? operatingCFAuto : operatingCFManual;

  // 2期平均オプション ──────────────────────────
  const currentAvgProfit = operatingProfit !== null
    ? operatingProfit + (depreciation || 0)
    : null;

  // 自己資本
  const netAssetsPrior = toMan('netAssetsPrior');
  const useEquityDirect = Boolean(doc.netAssetsUseDirect);
  const equityDirect = toMan('netAssetsAvgDirect');
  let equityResult, equitySource;
  if (useEquityDirect) {
    equityResult = equityDirect;
    equitySource = '平均値を直接入力';
  } else if (netAssetsPrior !== null && netAssets !== null) {
    equityResult = (netAssets + netAssetsPrior) / 2;
    equitySource = '2期平均';
  } else {
    equityResult = netAssets;
    equitySource = netAssets !== null ? '当期のみ' : null;
  }

  // 平均利益額
  const operatingProfitPrior = toMan('operatingProfitPrior');
  const depreciationPrior = toMan('depreciationPrior');
  const priorAvgProfit = (operatingProfitPrior !== null || depreciationPrior !== null)
    ? (operatingProfitPrior || 0) + (depreciationPrior || 0)
    : null;
  const useAvgProfitDirect = Boolean(doc.avgProfitUseDirect);
  const avgProfitDirect = toMan('avgProfitDirect');
  let avgProfitResult, avgProfitSource;
  if (useAvgProfitDirect) {
    avgProfitResult = avgProfitDirect;
    avgProfitSource = '平均値を直接入力';
  } else if (priorAvgProfit !== null && currentAvgProfit !== null) {
    avgProfitResult = (currentAvgProfit + priorAvgProfit) / 2;
    avgProfitSource = '2期平均';
  } else {
    avgProfitResult = currentAvgProfit;
    avgProfitSource = currentAvgProfit !== null ? '当期のみ' : null;
  }

  // 営業CF
  const operatingCFPrior = toMan('operatingCFPrior');
  const useCFDirect = Boolean(doc.operatingCFUseDirect);
  const cfDirect = toMan('operatingCFAvgDirect');
  let cfResult, cfSource;
  if (useCFDirect) {
    cfResult = cfDirect;
    cfSource = '平均値を直接入力';
  } else if (operatingCFPrior !== null && operatingCF !== null) {
    cfResult = (operatingCF + operatingCFPrior) / 2;
    cfSource = '2期平均';
  } else {
    cfResult = operatingCF;
    cfSource = operatingCF !== null ? '当期のみ' : null;
  }

  const profitRate = sales && sales > 0 && ordinaryProfit !== null ? ordinaryProfit / sales : null;
  const grossProfitRate = sales && sales > 0 && grossProfit !== null ? grossProfit / sales : null;
  const avgProfit = operatingProfit !== null
    ? operatingProfit + (depreciation || 0)
    : null;

  const updates = {};
  if (profitRate !== null) updates.profitRate = Math.round(profitRate * 10000) / 10000;
  if (grossProfitRate !== null) updates.grossProfitRate = Math.round(grossProfitRate * 10000) / 10000;
  if (equityResult !== null) updates.equity = Math.round(equityResult);
  if (totalDebt !== null) updates.debt = Math.round(totalDebt);
  if (fixedAssets !== null) updates.fixedAssets = Math.round(fixedAssets);
  if (retainedEarnings !== null) updates.retainedEarnings = Math.round(retainedEarnings);
  if (interest !== null) updates.interest = Math.round(interest);
  if (cfResult !== null) updates.operatingCF = Math.round(cfResult);
  if (avgProfitResult !== null) updates.avgProfit = Math.round(avgProfitResult);

  const hasUpdates = Object.keys(updates).length > 0;

  const fmt = v => (v === null || v === undefined ? '—' : Math.round(v).toLocaleString() + ' 万円');
  const fmtPct = v => (v === null || v === undefined ? '—' : (v * 100).toFixed(2) + ' %');

  function handleClear() {
    onDocChange?.({
      sales: '', grossProfit: '', ordinaryProfit: '', operatingProfit: '',
      depreciation: '', interest: '', corporateTax: '', netAssets: '', totalDebt: '',
      fixedAssets: '', retainedEarnings: '', operatingCF: '',
      netAssetsPrior: '', netAssetsAvgDirect: '',
      operatingProfitPrior: '', depreciationPrior: '', avgProfitDirect: '',
      operatingCFPrior: '', operatingCFAvgDirect: '',
    });
  }

  return (
    <details style={{ marginBottom: 12, border: '1px solid #c8e6c9', borderRadius: 8, background: '#f1f8e9' }}>
      <summary style={{ cursor: 'pointer', padding: '10px 12px', fontSize: 12, fontWeight: 'bold', color: '#2E7D32', listStyle: 'none' }}>
        ▸ 決算書から入力（円・千円・万円対応）
      </summary>
      <div style={{ padding: '4px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 'bold' }}>入力単位</span>
          {UNIT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                fontSize: 12,
                cursor: 'pointer',
                padding: '3px 10px',
                borderRadius: 5,
                background: unit === opt.value ? '#2E7D32' : 'white',
                color: unit === opt.value ? 'white' : '#555',
                border: '1px solid #c8e6c9',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <input
                type="radio"
                name="financialDocUnit"
                value={opt.value}
                checked={unit === opt.value}
                onChange={() => onDocChange?.({ unit: opt.value })}
                style={{ margin: 0 }}
              />
              {opt.label}
            </label>
          ))}
          <span style={{ fontSize: 10, color: '#888', marginLeft: 'auto' }}>
            内部は万円単位で扱います。
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div style={{ background: 'white', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1565C0', marginBottom: 4 }}>損益計算書 (PL)</div>
            <DocInput label="売上高" value={doc.sales} onChange={v => onDocChange?.({ sales: v })} />
            <DocInput label="売上総利益" value={doc.grossProfit} onChange={v => onDocChange?.({ grossProfit: v })} hint={yModel === 'simple' ? '※詳細モデルで使用' : ''} dim={yModel === 'simple'} />
            <DocInput label="経常利益" value={doc.ordinaryProfit} onChange={v => onDocChange?.({ ordinaryProfit: v })} />
            <DocInput label="営業利益" value={doc.operatingProfit} onChange={v => onDocChange?.({ operatingProfit: v })} hint="平均利益額に使用" />
            <DocInput label="減価償却実施額" value={doc.depreciation} onChange={v => onDocChange?.({ depreciation: v })} hint="平均利益額に使用" />
            <DocInput label="支払利息" value={doc.interest} onChange={v => onDocChange?.({ interest: v })} />
            <DocInput label="法人税等" value={doc.corporateTax} onChange={v => onDocChange?.({ corporateTax: v })} hint="CF自動計算に使用" />
          </div>

          <div style={{ background: 'white', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 4 }}>貸借対照表 (BS)</div>
            <DocInput label="純資産合計" value={doc.netAssets} onChange={v => onDocChange?.({ netAssets: v })} hint="→ 自己資本" />
            <DocInput label="負債合計" value={doc.totalDebt} onChange={v => onDocChange?.({ totalDebt: v })} hint="→ 負債総額" />
            <DocInput label="固定資産合計" value={doc.fixedAssets} onChange={v => onDocChange?.({ fixedAssets: v })} hint={yModel === 'simple' ? '※詳細モデルで使用' : ''} dim={yModel === 'simple'} />
            <DocInput label="利益剰余金" value={doc.retainedEarnings} onChange={v => onDocChange?.({ retainedEarnings: v })} hint={yModel === 'simple' ? '※詳細モデルで使用' : ''} dim={yModel === 'simple'} />
          </div>

          <div style={{ background: 'white', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#E65100', marginBottom: 4 }}>キャッシュフロー (CF)</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cfAuto}
                onChange={e => onDocChange?.({ cfAuto: e.target.checked })}
              />
              <span style={{ color: cfAuto ? '#E65100' : '#444', fontWeight: cfAuto ? 'bold' : 'normal' }}>
                CF計算書がない（PLから自動計算）
              </span>
            </label>
            <DocInput
              label="営業キャッシュフロー"
              value={doc.operatingCF}
              onChange={v => onDocChange?.({ operatingCF: v })}
              hint={yModel === 'simple' ? '※詳細モデルで使用' : ''}
              dim={yModel === 'simple'}
              disabled={cfAuto}
              displayValue={cfAuto && operatingCFAuto !== null ? Math.round(operatingCFAuto / factor) : ''}
            />
            <div style={{ fontSize: 10, color: '#888', marginTop: 6, lineHeight: 1.5 }}>
              {cfAuto
                ? '営業CF ≒ 経常利益 ＋ 減価償却実施額 − 法人税等（簡易式）'
                : 'CF計算書がない場合は、上のチェックを入れるとPLから自動計算します。'}
            </div>
          </div>
        </div>

        <details style={{ marginTop: 12, border: '1px dashed #80cbc4', borderRadius: 6, background: '#e0f2f1' }}>
          <summary style={{ cursor: 'pointer', padding: '8px 12px', fontSize: 11, fontWeight: 'bold', color: '#00695C', listStyle: 'none' }}>
            ▸ 2期平均オプション（任意・精度向上）
          </summary>
          <div style={{ padding: '4px 12px 12px' }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 8, lineHeight: 1.6 }}>
              経審のY点・X2点は本来「2期平均」で評価されます。前期データがあれば下に入力してください。
              入力単位は上で選択した単位（{UNIT_OPTIONS.find(o => o.value === unit)?.label}）と同じです。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>

              <TwoPeriodCard
                title="自己資本（純資産）"
                accent="#6A1B9A"
                currentMan={netAssets}
                useDirect={useEquityDirect}
                onUseDirectChange={v => onDocChange?.({ netAssetsUseDirect: v })}
                priorRaw={doc.netAssetsPrior}
                onPriorChange={v => onDocChange?.({ netAssetsPrior: v })}
                directRaw={doc.netAssetsAvgDirect}
                onDirectChange={v => onDocChange?.({ netAssetsAvgDirect: v })}
                resultMan={equityResult}
                resultSource={equitySource}
                priorPlaceholder="前期 純資産合計"
              />

              <TwoPeriodCard
                title="平均利益額（営業利益＋減価償却）"
                accent="#1565C0"
                currentMan={currentAvgProfit}
                useDirect={useAvgProfitDirect}
                onUseDirectChange={v => onDocChange?.({ avgProfitUseDirect: v })}
                directRaw={doc.avgProfitDirect}
                onDirectChange={v => onDocChange?.({ avgProfitDirect: v })}
                resultMan={avgProfitResult}
                resultSource={avgProfitSource}
                customPriorInputs={(
                  <>
                    <DocInput
                      label="前期 営業利益"
                      value={doc.operatingProfitPrior}
                      onChange={v => onDocChange?.({ operatingProfitPrior: v })}
                    />
                    <DocInput
                      label="前期 減価償却実施額"
                      value={doc.depreciationPrior}
                      onChange={v => onDocChange?.({ depreciationPrior: v })}
                    />
                  </>
                )}
              />

              <TwoPeriodCard
                title="営業キャッシュフロー"
                accent="#E65100"
                currentMan={operatingCF}
                useDirect={useCFDirect}
                onUseDirectChange={v => onDocChange?.({ operatingCFUseDirect: v })}
                priorRaw={doc.operatingCFPrior}
                onPriorChange={v => onDocChange?.({ operatingCFPrior: v })}
                directRaw={doc.operatingCFAvgDirect}
                onDirectChange={v => onDocChange?.({ operatingCFAvgDirect: v })}
                resultMan={cfResult}
                resultSource={cfSource}
                priorPlaceholder="前期 営業CF"
              />
            </div>
          </div>
        </details>

        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: '#fffde7',
            border: '1px dashed #fbc02d',
            borderRadius: 6,
            fontSize: 11,
            lineHeight: 1.7,
            color: '#5d4037',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>変換結果プレビュー</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 4 }}>
            <span>経常利益率: {fmtPct(profitRate)}</span>
            <span>売上総利益率: {fmtPct(grossProfitRate)}</span>
            <span>自己資本: {fmt(equityResult)}{equitySource ? `（${equitySource}）` : ''}</span>
            <span>負債総額: {fmt(totalDebt)}</span>
            <span>固定資産: {fmt(fixedAssets)}</span>
            <span>利益剰余金: {fmt(retainedEarnings)}</span>
            <span>支払利息: {fmt(interest)}</span>
            <span>営業CF: {fmt(cfResult)}{cfSource ? `（${cfSource}）` : ''}</span>
            <span>平均利益額: {fmt(avgProfitResult)}{avgProfitSource ? `（${avgProfitSource}）` : ''}</span>
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onApply?.(updates)}
            disabled={!hasUpdates}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 'bold',
              color: hasUpdates ? 'white' : '#999',
              background: hasUpdates ? '#2E7D32' : '#e0e0e0',
              border: 'none',
              borderRadius: 6,
              cursor: hasUpdates ? 'pointer' : 'not-allowed',
            }}
          >
            この内容で財務スライダーを更新
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              color: '#666',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            入力をクリア
          </button>
        </div>
      </div>
    </details>
  );
}

function SectionCard({ title, children, accentColor = '#1a237e' }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 'bold',
          color: accentColor,
          borderLeft: `3px solid ${accentColor}`,
          paddingLeft: 8,
          marginBottom: 12,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function InlineNumberInput({ value, onChange, min = 0, max = 500000, step = 100, unitText }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 152 }}>
      <span style={{ fontSize: 11, color: '#888' }}>直接入力</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const nextValue = Number(e.target.value);
          if (!Number.isNaN(nextValue) && nextValue >= min) onChange(nextValue);
        }}
        style={{
          width: 120,
          padding: '4px 8px',
          fontSize: 12,
          border: '1px solid #c5cae9',
          borderRadius: 4,
          textAlign: 'right',
        }}
      />
      {unitText && <span style={{ fontSize: 11, color: '#888' }}>{unitText}</span>}
    </div>
  );
}

function SimpleSelectRow({ label, value, onChange, options, note }) {
  return (
    <label style={{ display: 'grid', gap: 4, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: '#333' }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '6px 8px',
          fontSize: 12,
          border: '1px solid #c5cae9',
          borderRadius: 6,
          background: 'white',
        }}
      >
        {options.map(option => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
      {note && <span style={{ fontSize: 10, color: '#777', lineHeight: 1.5 }}>{note}</span>}
    </label>
  );
}

function InfoGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
      {items.map(item => (
        <div key={item.label} style={{ background: '#f7f8fc', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#666' }}>{item.label}</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1a237e', marginTop: 2 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function ZNumberRow({ label, value, onChange, points, note }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#333' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={e => {
            const nextValue = Number(e.target.value);
            if (!Number.isNaN(nextValue) && nextValue >= 0) onChange(nextValue);
          }}
          style={{
            width: 90,
            padding: '6px 8px',
            fontSize: 12,
            border: '1px solid #d1c4e9',
            borderRadius: 6,
            textAlign: 'right',
          }}
        />
        <span style={{ fontSize: 11, color: '#6A1B9A' }}>{points}点/人</span>
      </div>
      {note && <span style={{ fontSize: 10, color: '#777', lineHeight: 1.5 }}>{note}</span>}
    </label>
  );
}

function WGroup({ title, meta, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} style={{ border: '1px solid #ffe0b2', borderRadius: 6, background: '#fffaf7' }}>
      <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#BF360C' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#E65100' }}>{meta}</div>
        </div>
      </summary>
      <div style={{ display: 'grid', gap: 10, padding: '0 12px 12px' }}>{children}</div>
    </details>
  );
}

function WCheckRow({ label, checked, onChange, note }) {
  return (
    <div style={{ padding: '8px 0', borderTop: '1px solid #f6e5da' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#333' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ width: 14, height: 14 }}
        />
        <span style={{ flex: 1 }}>{label}</span>
        <span style={{ fontSize: 10, color: checked ? '#2E7D32' : '#999' }}>
          {checked ? '反映中' : '未設定'}
        </span>
      </label>
      {note && <div style={{ marginLeft: 22, marginTop: 2, fontSize: 10, color: '#777', lineHeight: 1.5 }}>{note}</div>}
    </div>
  );
}

function WNumberRow({ label, value, onChange, unit = '', min = 0, max, step = 1, note }) {
  return (
    <label style={{ display: 'grid', gap: 4, padding: '8px 0', borderTop: '1px solid #f6e5da' }}>
      <span style={{ fontSize: 12, color: '#333' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => {
            const nextValue = e.target.value === '' ? 0 : Number(e.target.value);
            if (!Number.isNaN(nextValue)) onChange(nextValue);
          }}
          style={{
            width: 120,
            padding: '6px 8px',
            fontSize: 12,
            border: '1px solid #ffccbc',
            borderRadius: 6,
            textAlign: 'right',
          }}
        />
        {unit && <span style={{ fontSize: 11, color: '#777' }}>{unit}</span>}
      </div>
      {note && <span style={{ fontSize: 10, color: '#777', lineHeight: 1.5 }}>{note}</span>}
    </label>
  );
}

function WSelectRow({ label, value, onChange, options, note }) {
  return (
    <label style={{ display: 'grid', gap: 4, padding: '8px 0', borderTop: '1px solid #f6e5da' }}>
      <span style={{ fontSize: 12, color: '#333' }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '6px 8px',
          fontSize: 12,
          border: '1px solid #ffccbc',
          borderRadius: 6,
          background: 'white',
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {note && <span style={{ fontSize: 10, color: '#777', lineHeight: 1.5 }}>{note}</span>}
    </label>
  );
}

export default function YearPanel({
  yearData,
  score,
  yModel = 'simple',
  inputMode = 'auto',
  onSliderChange,
  onZInputChange,
  onWInputChange,
  onWOverrideChange,
  onAvgRevenueOverrideChange,
  onFinancialDocChange,
  onMultiSliderChange,
}) {
  const [inputUiMode, setInputUiMode] = useState('simple');
  const monthlyBids = getMonthlyBids(yearData.staff, yearData.bidsPerStaff);
  const constructionBidRatio = Math.max(0, Math.min(1, Number(yearData.constructionBidRatio ?? 1)));
  const otherWinRate = Math.max(0, Math.min(1, Number(yearData.otherWinRate ?? yearData.winRate ?? 0)));
  const constructionAvgContractAmount = Math.max(0, Number(yearData.constructionAvgContractAmount ?? yearData.avgContractAmount ?? 0));
  const otherAvgContractAmount = Math.max(0, Number(yearData.otherAvgContractAmount ?? yearData.avgContractAmount ?? 0));
  const constructionMonthlyBids = monthlyBids * constructionBidRatio;
  const otherMonthlyBids = monthlyBids - constructionMonthlyBids;
  const estimatedConstructionRevenue = constructionMonthlyBids * yearData.winRate * constructionAvgContractAmount * 12;
  const estimatedOtherSales = otherMonthlyBids * otherWinRate * otherAvgContractAmount * 12;
  const estimatedTotalSales = estimatedConstructionRevenue + estimatedOtherSales;
  const principalRevenueValue = inputMode === 'manual'
    ? yearData.motoukeKoujidaka
    : (
        yearData.motoukeSameAsKansei === false
          ? yearData.motoukeKoujidaka
          : estimatedConstructionRevenue
      );
  const isDetailMode = inputUiMode === 'detail';

  function handleInputUiModeChange(mode) {
    setInputUiMode(mode);
    if (mode !== 'detail' || inputMode !== 'auto') return;

    if (yearData.otherWinRate == null) onSliderChange('otherWinRate', otherWinRate);
    if (yearData.constructionAvgContractAmount == null) {
      onSliderChange('constructionAvgContractAmount', constructionAvgContractAmount);
    }
    if (yearData.otherAvgContractAmount == null) onSliderChange('otherAvgContractAmount', otherAvgContractAmount);
  }

  const zInput = yearData.zInput || {};
  const zDetail = score.zDetail || { z1: 0, z2: 0, technicalValue: 0 };
  const wInput = yearData.wInput || {};
  const welfare = wInput.welfare || {};
  const continuity = wInput.continuity || {};
  const accounting = wInput.accounting || {};
  const research = wInput.research || {};
  const machinery = wInput.machinery || {};
  const certification = wInput.certification || {};
  const wOverride = yearData.wOverride || { enabled: false, value: 0 };
  const wOverrideEnabled = Boolean(wOverride.enabled);
  const avgRevenueOverride = yearData.avgRevenueOverride || { enabled: false, completionRevenue: 0, principalRevenue: 0 };
  const avgRevenueOverrideEnabled = Boolean(avgRevenueOverride.enabled);
  const wDetail = score.wDetail || { rawTotal: 0, sections: {} };
  const wSections = wDetail.sections || {};
  const wProgress = Math.max(0, Math.min(100, (Math.max(0, wDetail.rawTotal) / 237) * 100));

  const wQuickCount = [
    welfare.kentaikyo,
    welfare.retirementOrPension,
    welfare.extraAccident,
    certification.iso9001 || certification.iso14001 || certification.ecoAction21,
  ].filter(Boolean).length;

  const wCompanyCount = [
    (continuity.businessYears || 0) > 0,
    accounting.auditStatus && accounting.auditStatus !== 'none',
    (accounting.cpaCount || 0) > 0 || (accounting.level2AccountingCount || 0) > 0,
    (machinery.eligibleCount || 0) > 0,
  ].filter(Boolean).length;

  const wOptionalCount = [
    welfare.youngEngineerRatio,
    welfare.newYoungEngineerRatio,
    (welfare.skillUpScore || 0) > 0,
    welfare.workLifeBalance && welfare.workLifeBalance !== 'none',
    welfare.careerHistory && welfare.careerHistory !== 'none',
    welfare.declaration,
    continuity.rehabilitation && continuity.rehabilitation !== 'none',
    continuity.disasterSupport,
    continuity.legalAction && continuity.legalAction !== 'none',
    (research.amount || 0) > 0,
  ].filter(Boolean).length;

  const wReflectingCount = wQuickCount + wCompanyCount + wOptionalCount;

  const wSuggestions = [
    { label: '建退共', active: Boolean(welfare.kentaikyo) },
    { label: '法定外労災', active: Boolean(welfare.extraAccident) },
    { label: '退職金・企業年金', active: Boolean(welfare.retirementOrPension) },
    { label: '営業年数', active: (continuity.businessYears || 0) > 0 },
    { label: 'ISO等', active: Boolean(certification.iso9001 || certification.iso14001 || certification.ecoAction21) },
  ].filter(item => !item.active).slice(0, 3);

  const displayConstructionRevenue = score.rawRevenue ?? estimatedConstructionRevenue;
  const displayTotalSales = score.revenueForY ?? estimatedTotalSales;
  const displayPrincipalRevenue = score.principalRevenue ?? principalRevenueValue;
  const displayOtherSales = Math.max(0, displayTotalSales - displayConstructionRevenue);

  const summaryItems = inputMode === 'manual'
    ? [
        { label: '完成工事高', value: `${(displayConstructionRevenue / 10000).toFixed(2)}億` },
        { label: '元請完成工事高', value: `${(displayPrincipalRevenue / 10000).toFixed(2)}億` },
        { label: '売上高', value: `${(displayTotalSales / 10000).toFixed(2)}億` },
      ]
    : [
        { label: '推計完成工事高', value: `${(displayConstructionRevenue / 10000).toFixed(2)}億` },
        { label: '推計売上高', value: `${(displayTotalSales / 10000).toFixed(2)}億` },
        { label: '元請完成工事高', value: `${(displayPrincipalRevenue / 10000).toFixed(2)}億` },
      ];

  return (
    <div>
      <div
        style={{
          background: '#f8f9ff',
          padding: '12px 16px',
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          borderTop: '1px solid #e8eaf6',
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <InfoGrid items={summaryItems} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[['X1', score.x1], ['X2', score.x2], ['Y', score.y], ['Z', score.z], ['W', score.w]].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888' }}>{label}点</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: 12,
          background: '#f5f6fa',
        }}
      >
        {inputMode === 'manual' ? (
          <SectionCard title="完成工事高・元請完成工事高・売上高（手動入力）" accentColor="#1565C0">
            <div
              style={{
                background: avgRevenueOverrideEnabled ? '#e3f2fd' : '#f5f5f5',
                border: `1px solid ${avgRevenueOverrideEnabled ? '#64b5f6' : '#e0e0e0'}`,
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 12,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avgRevenueOverrideEnabled}
                  onChange={e => onAvgRevenueOverrideChange?.({ enabled: e.target.checked })}
                />
                <span style={{ fontWeight: 'bold', color: '#1565C0' }}>
                  経審準拠の3年平均値を直接入力する（X1点・Z2点で使用）
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 11, color: avgRevenueOverrideEnabled ? '#1565C0' : '#999' }}>
                  3年平均 完成工事高（万円）
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={avgRevenueOverride.completionRevenue || ''}
                    disabled={!avgRevenueOverrideEnabled}
                    onChange={e => onAvgRevenueOverrideChange?.({
                      completionRevenue: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })}
                    style={{
                      padding: '6px 8px',
                      fontSize: 13,
                      fontWeight: 'bold',
                      textAlign: 'right',
                      border: '1px solid #bbdefb',
                      borderRadius: 4,
                      background: avgRevenueOverrideEnabled ? 'white' : '#f5f5f5',
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 11, color: avgRevenueOverrideEnabled ? '#1565C0' : '#999' }}>
                  3年平均 元請完成工事高（万円）
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={avgRevenueOverride.principalRevenue || ''}
                    disabled={!avgRevenueOverrideEnabled}
                    onChange={e => onAvgRevenueOverrideChange?.({
                      principalRevenue: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })}
                    style={{
                      padding: '6px 8px',
                      fontSize: 13,
                      fontWeight: 'bold',
                      textAlign: 'right',
                      border: '1px solid #bbdefb',
                      borderRadius: 4,
                      background: avgRevenueOverrideEnabled ? 'white' : '#f5f5f5',
                    }}
                  />
                </label>
              </div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
                {avgRevenueOverrideEnabled
                  ? '※ 下の「完成工事高」「元請完成工事高」スライダーは Y点・売上構成の参考用となり、X1・Z2点には使われません。'
                  : '※ 経審通知書の「3年平均」値（千円→万円換算）を入れたい場合にONにします。'}
              </div>
            </div>

            <SimpleSelectRow
              label="対象業種"
              value={yearData.industry}
              onChange={value => onSliderChange('industry', value)}
              options={industryOptions}
            />

            <div style={{ marginBottom: 12 }}>
              <SliderRow
                configKey="kanseikoujidaka"
                value={yearData.kanseikoujidaka}
                onChange={value => onSliderChange('kanseikoujidaka', value)}
              />
              <InlineNumberInput
                value={yearData.kanseikoujidaka}
                onChange={value => onSliderChange('kanseikoujidaka', value)}
                unitText={`万円 = ${(yearData.kanseikoujidaka / 10000).toFixed(2)}億`}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <SliderRow
                configKey="motoukeKoujidaka"
                value={yearData.motoukeKoujidaka}
                onChange={value => onSliderChange('motoukeKoujidaka', value)}
              />
              <InlineNumberInput
                value={yearData.motoukeKoujidaka}
                onChange={value => onSliderChange('motoukeKoujidaka', value)}
                unitText={`万円 = ${(yearData.motoukeKoujidaka / 10000).toFixed(2)}億`}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <SliderRow
                configKey="uriage"
                value={yearData.uriage}
                onChange={value => onSliderChange('uriage', value)}
              />
              <InlineNumberInput
                value={yearData.uriage}
                onChange={value => onSliderChange('uriage', value)}
                unitText={`万円 = ${(yearData.uriage / 10000).toFixed(2)}億`}
              />
            </div>

            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px dashed #bbdefb',
                fontSize: 11,
                color: '#1565C0',
                lineHeight: 1.7,
              }}
            >
              完成工事高は X1、元請完成工事高は Z2、売上高は Y点にそれぞれ別で使います。
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="入札活動（X1点に連動）" accentColor="#1565C0">
            <ModeToggle value={inputUiMode} onChange={handleInputUiModeChange} />
            <SimpleSelectRow
              label="対象業種"
              value={yearData.industry}
              onChange={value => onSliderChange('industry', value)}
              options={industryOptions}
            />
            <SliderRow
              configKey="staff"
              value={yearData.staff}
              onChange={value => onSliderChange('staff', value)}
            />
            <SliderRow
              configKey="bidsPerStaff"
              value={yearData.bidsPerStaff}
              onChange={value => onSliderChange('bidsPerStaff', value)}
            />
            <RatioRow
              value={constructionBidRatio}
              onChange={value => onSliderChange('constructionBidRatio', value)}
            />
            <SliderRow
              configKey="winRate"
              value={yearData.winRate}
              label={isDetailMode ? '工事 落札率' : '落札率'}
              onChange={value => {
                onSliderChange('winRate', value);
                if (!isDetailMode) onSliderChange('otherWinRate', value);
              }}
            />
            {isDetailMode && (
              <SliderRow
                configKey="winRate"
                value={otherWinRate}
                label="役務・物販 落札率"
                onChange={value => onSliderChange('otherWinRate', value)}
              />
            )}
            <AmountSliderRow
              label="工事 平均落札金額"
              value={constructionAvgContractAmount}
              onChange={value => onSliderChange('constructionAvgContractAmount', value)}
            />
            <AmountSliderRow
              label="役務・物販 平均落札金額"
              value={otherAvgContractAmount}
              onChange={value => onSliderChange('otherAvgContractAmount', value)}
            />

            <div
              style={{
                marginTop: -2,
                marginBottom: 12,
                background: '#eef4ff',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 11,
                color: '#1565C0',
                lineHeight: 1.7,
              }}
            >
              月間入札本数 {monthlyBids.toFixed(1)}件
              {` （工事 ${constructionMonthlyBids.toFixed(1)}件 / 役務・物販 ${otherMonthlyBids.toFixed(1)}件）`}
              {isDetailMode && (
                <>
                  <br />
                  推計売上: 工事 {(displayConstructionRevenue / 10000).toFixed(2)}億 / 役務・物販 {(displayOtherSales / 10000).toFixed(2)}億
                </>
              )}
            </div>

            {!isDetailMode && yearData.motoukeSameAsKansei === false && (
              <div style={{ marginTop: -2, marginBottom: 12, fontSize: 11, color: '#5c6bc0' }}>
                元請完成工事高は個別設定中です。編集は詳細モードで行えます。
              </div>
            )}

            {isDetailMode && (
              <>
                <SimpleSelectRow
                  label="平均方法"
                  value={yearData.avgMethod}
                  onChange={value => onSliderChange('avgMethod', value)}
                  options={averageMethodOptions}
                  note="完成工事高(X1)と元請完成工事高(Z2)で同じ平均方法を使います。"
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={yearData.motoukeSameAsKansei !== false}
                    onChange={e => onSliderChange('motoukeSameAsKansei', e.target.checked)}
                  />
                  元請完成工事高は推計完成工事高と同じ
                </label>

                {yearData.motoukeSameAsKansei === false && (
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: 12, color: '#333' }}>元請完成工事高</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={yearData.motoukeKoujidaka}
                      onChange={e => {
                        const nextValue = Number(e.target.value);
                        if (!Number.isNaN(nextValue) && nextValue >= 0) onSliderChange('motoukeKoujidaka', nextValue);
                      }}
                      style={{
                        width: 140,
                        padding: '6px 8px',
                        fontSize: 12,
                        border: '1px solid #c5cae9',
                        borderRadius: 6,
                        textAlign: 'right',
                      }}
                    />
                  </label>
                )}

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px dashed #bbdefb',
                    fontSize: 11,
                    color: '#1565C0',
                    lineHeight: 1.7,
                  }}
                >
                  自動モードでは、工事分だけを完成工事高(X1)に反映し、売上高(Y点)は工事と役務・物販を合計して推計します。
                </div>
              </>
            )}
          </SectionCard>
        )}

        <SectionCard title={`技術力（Z点） → ${score.z}点 → P点 +${(score.z * 0.25).toFixed(1)}点`} accentColor="#6A1B9A">
          <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, marginBottom: 10 }}>
            対象業種ごとに、技術職員点(Z1)と元請完成工事高点(Z2)を合算します。
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {zTechnicalFields.map(field => (
              <ZNumberRow
                key={field.key}
                label={field.label}
                value={zInput[field.key] || 0}
                onChange={value => onZInputChange(field.key, value)}
                points={field.points}
              />
            ))}
          </div>

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #d1c4e9' }}>
            <InfoGrid
              items={[
                { label: '技術職員数値', value: `${zDetail.technicalValue || 0}` },
                { label: 'Z1', value: `${zDetail.z1 || 0}点` },
                { label: '年間平均元請完成工事高', value: `${Math.round(score.avgPrincipalRevenue || 0).toLocaleString()}万円` },
                { label: 'Z2', value: `${zDetail.z2 || 0}点` },
              ]}
            />
            <div style={{ fontSize: 11, color: '#6A1B9A', marginTop: 10, lineHeight: 1.7 }}>
              Z = Z1 × 0.8 + Z2 × 0.2。技術職員は1人につき2業種までの申請前提です。
            </div>
          </div>
        </SectionCard>

        <SectionCard title="財務（Y点・X2点に連動）" accentColor="#2E7D32">
          <FinancialDocPanel
            doc={yearData.financialDoc || {}}
            yModel={yModel}
            onDocChange={partial => onFinancialDocChange?.(partial)}
            onApply={updates => onMultiSliderChange?.(updates)}
          />
          <SliderRow
            configKey="profitRate"
            value={yearData.profitRate}
            onChange={value => onSliderChange('profitRate', value)}
          />
          <SliderRow
            configKey="equity"
            value={yearData.equity}
            onChange={value => onSliderChange('equity', value)}
          />
          <SliderRow
            configKey="debt"
            value={yearData.debt}
            onChange={value => onSliderChange('debt', value)}
          />
          <SliderRow
            configKey="interest"
            value={yearData.interest}
            onChange={value => onSliderChange('interest', value)}
          />
        </SectionCard>

        {yModel === 'full' && (
          <SectionCard title="Y点 詳細入力（追加4項目）" accentColor="#00796B">
            <div style={{ fontSize: 11, color: '#555', marginBottom: 10, lineHeight: 1.6 }}>
              詳細モデルでは、財務の基本4項目に加えて、残り4項目もここで入力します。
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <SliderRow
                configKey="grossProfitRate"
                value={yearData.grossProfitRate}
                onChange={value => onSliderChange('grossProfitRate', value)}
              />
              <SliderRow
                configKey="fixedAssets"
                value={yearData.fixedAssets}
                onChange={value => onSliderChange('fixedAssets', value)}
              />
              <SliderRow
                configKey="operatingCF"
                value={yearData.operatingCF}
                onChange={value => onSliderChange('operatingCF', value)}
              />
              <SliderRow
                configKey="retainedEarnings"
                value={yearData.retainedEarnings}
                onChange={value => onSliderChange('retainedEarnings', value)}
              />
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px dashed #b2dfdb',
                fontSize: 11,
                color: '#00695C',
              }}
            >
              Y点 = <strong>{score.y}</strong> 点
            </div>
          </SectionCard>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <SectionCard title={`社会性等（W点） → ${score.w}点 → P点 +${(score.w * 0.15).toFixed(1)}点`} accentColor="#E65100">
            <div
              style={{
                background: wOverrideEnabled ? '#fff3e0' : '#fafafa',
                border: `1px solid ${wOverrideEnabled ? '#ffb74d' : '#e0e0e0'}`,
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wOverrideEnabled}
                  onChange={e => onWOverrideChange?.({ enabled: e.target.checked })}
                />
                <span style={{ fontWeight: 'bold', color: '#E65100' }}>W点を手動で入力する</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step={1}
                  value={wOverride.value ?? 0}
                  disabled={!wOverrideEnabled}
                  onChange={e => onWOverrideChange?.({ value: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  style={{
                    width: 90,
                    padding: '6px 8px',
                    fontSize: 14,
                    fontWeight: 'bold',
                    textAlign: 'right',
                    border: '1px solid #ffccbc',
                    borderRadius: 6,
                    background: wOverrideEnabled ? 'white' : '#f5f5f5',
                    color: wOverrideEnabled ? '#E65100' : '#999',
                  }}
                />
                <span style={{ fontSize: 12, color: '#555' }}>点</span>
              </div>
              <span style={{ fontSize: 10, color: '#888', flex: '1 1 200px' }}>
                {wOverrideEnabled
                  ? '※ 下のチェック項目は反映されません。入力した値がそのままW点になります。'
                  : '※ チェックすると、下の項目を無視して任意のW点を直接入力できます。'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12, opacity: wOverrideEnabled ? 0.5 : 1 }}>
              <div style={{ background: '#fff6f0', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#666' }}>W評点</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#E65100', marginTop: 2 }}>{score.w}点</div>
              </div>
              <div style={{ background: '#fff6f0', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#666' }}>Pへの反映</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#E65100', marginTop: 2 }}>
                  +{(score.w * 0.15).toFixed(1)}点
                </div>
              </div>
              <div style={{ background: '#fff6f0', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#666' }}>反映中の項目</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#E65100', marginTop: 2 }}>{wReflectingCount}</div>
              </div>
              <div style={{ background: '#fff6f0', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#666' }}>現在の取組合計</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#E65100', marginTop: 2 }}>{wDetail.rawTotal}点</div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ background: '#fbe9e7', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${wProgress}%`,
                    background: 'linear-gradient(90deg, #E65100, #FF8A65)',
                    height: '100%',
                    borderRadius: 4,
                    transition: 'width 0.2s',
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#666', marginBottom: 12, lineHeight: 1.6 }}>
              2026年7月1日改定を基準に計算しています。取組合計 {wDetail.rawTotal} 点 × 8.75 = W評点 {score.w} 点
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>おすすめ</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {wSuggestions.length > 0 ? (
                  wSuggestions.map(item => (
                    <span
                      key={item.label}
                      style={{
                        fontSize: 11,
                        color: '#BF360C',
                        background: '#fff3e0',
                        border: '1px solid #ffcc80',
                        borderRadius: 999,
                        padding: '5px 10px',
                      }}
                    >
                      {item.label}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: '#2E7D32' }}>主要項目は入力済みです</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, opacity: wOverrideEnabled ? 0.4 : 1, pointerEvents: wOverrideEnabled ? 'none' : 'auto' }}>
              <WGroup title="まず入れる" meta={`入力 ${wQuickCount} / 4`} defaultOpen>
                <WCheckRow
                  label="建退共に加入している"
                  checked={Boolean(welfare.kentaikyo)}
                  onChange={value => onWInputChange(['welfare', 'kentaikyo'], value)}
                />
                <WCheckRow
                  label="退職一時金または企業年金制度がある"
                  checked={Boolean(welfare.retirementOrPension)}
                  onChange={value => onWInputChange(['welfare', 'retirementOrPension'], value)}
                />
                <WCheckRow
                  label="法定外労災に加入している"
                  checked={Boolean(welfare.extraAccident)}
                  onChange={value => onWInputChange(['welfare', 'extraAccident'], value)}
                />
                <WCheckRow
                  label="ISO 9001 を取得している"
                  checked={Boolean(certification.iso9001)}
                  onChange={value => onWInputChange(['certification', 'iso9001'], value)}
                />
                <WCheckRow
                  label="ISO 14001 を取得している"
                  checked={Boolean(certification.iso14001)}
                  onChange={value => onWInputChange(['certification', 'iso14001'], value)}
                />
                <WCheckRow
                  label="エコアクション21 を取得している"
                  checked={Boolean(certification.ecoAction21)}
                  onChange={value => onWInputChange(['certification', 'ecoAction21'], value)}
                  note="組み合わせは自動で計算します。"
                />
              </WGroup>

              <WGroup title="会社の基本情報" meta={`入力 ${wCompanyCount} / 4`}>
                <WNumberRow
                  label="建設業の営業年数"
                  value={continuity.businessYears || 0}
                  onChange={value => onWInputChange(['continuity', 'businessYears'], Math.max(0, value))}
                  unit="年"
                />
                <WSelectRow
                  label="監査の受審状況"
                  value={accounting.auditStatus || 'none'}
                  onChange={value => onWInputChange(['accounting', 'auditStatus'], value)}
                  options={auditOptions}
                />
                <WNumberRow
                  label="公認会計士等の人数"
                  value={accounting.cpaCount || 0}
                  onChange={value => onWInputChange(['accounting', 'cpaCount'], Math.max(0, value))}
                  unit="名"
                  note={`年間平均完成工事高 ${Math.round(score.avgRevenue || 0).toLocaleString()} 万円を使って自動換算します。`}
                />
                <WNumberRow
                  label="2級登録経理試験合格者数"
                  value={accounting.level2AccountingCount || 0}
                  onChange={value => onWInputChange(['accounting', 'level2AccountingCount'], Math.max(0, value))}
                  unit="名"
                />
                <WNumberRow
                  label="対象となる建設機械の台数"
                  value={machinery.eligibleCount || 0}
                  onChange={value => onWInputChange(['machinery', 'eligibleCount'], Math.max(0, Math.min(15, value)))}
                  unit="台"
                  max={15}
                />
              </WGroup>

              <WGroup title="該当するときだけ" meta={`入力 ${wOptionalCount} / 10`}>
                <WCheckRow
                  label="若手技術者・技能者が15%以上いる"
                  checked={Boolean(welfare.youngEngineerRatio)}
                  onChange={value => onWInputChange(['welfare', 'youngEngineerRatio'], value)}
                />
                <WCheckRow
                  label="新規の若手技術者・技能者が1%以上いる"
                  checked={Boolean(welfare.newYoungEngineerRatio)}
                  onChange={value => onWInputChange(['welfare', 'newYoungEngineerRatio'], value)}
                />
                <WNumberRow
                  label="技能向上の評価点"
                  value={welfare.skillUpScore || 0}
                  onChange={value => onWInputChange(['welfare', 'skillUpScore'], Math.max(0, Math.min(10, value)))}
                  max={10}
                  note="0〜10点で入力します。"
                />
                <WSelectRow
                  label="ワーク・ライフ・バランス認定"
                  value={welfare.workLifeBalance || 'none'}
                  onChange={value => onWInputChange(['welfare', 'workLifeBalance'], value)}
                  options={workLifeOptions}
                />
                <WSelectRow
                  label="就業履歴の蓄積状況"
                  value={welfare.careerHistory || 'none'}
                  onChange={value => onWInputChange(['welfare', 'careerHistory'], value)}
                  options={careerHistoryOptions}
                />
                <WCheckRow
                  label="自主宣言制度を宣言している"
                  checked={Boolean(welfare.declaration)}
                  onChange={value => onWInputChange(['welfare', 'declaration'], value)}
                />
                <WSelectRow
                  label="再生・更生手続の状況"
                  value={continuity.rehabilitation || 'none'}
                  onChange={value => onWInputChange(['continuity', 'rehabilitation'], value)}
                  options={rehabilitationOptions}
                />
                <WCheckRow
                  label="防災協定に基づく活動対象になっている"
                  checked={Boolean(continuity.disasterSupport)}
                  onChange={value => onWInputChange(['continuity', 'disasterSupport'], value)}
                />
                <WSelectRow
                  label="直近の処分状況"
                  value={continuity.legalAction || 'none'}
                  onChange={value => onWInputChange(['continuity', 'legalAction'], value)}
                  options={legalActionOptions}
                />
                <WNumberRow
                  label="研究開発費"
                  value={research.amount || 0}
                  onChange={value => onWInputChange(['research', 'amount'], Math.max(0, value))}
                  unit="万円"
                  note={accounting.auditStatus === 'auditor'
                    ? '会計監査人設置時のみ評点化されます。'
                    : '会計監査人を設置していない場合、この項目は加点されません。'}
                />
              </WGroup>
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, color: '#777' }}>詳細計算を見る</summary>
              <div style={{ fontSize: 11, color: '#666', marginTop: 8, lineHeight: 1.7 }}>
                福利厚生・人材育成 {wSections.w1 || 0}点 / 営業継続 {wSections.w2 || 0}点 / 防災協力 {wSections.w3 || 0}点 /
                法令遵守 {wSections.w4 || 0}点 / 経理体制 {wSections.w5 || 0}点 / 研究開発 {wSections.w6 || 0}点 /
                建設機械 {wSections.w7 || 0}点 / ISO等 {wSections.w8 || 0}点
              </div>
            </details>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
