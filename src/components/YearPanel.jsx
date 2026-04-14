import { getMonthlyBids, SLIDER_CONFIGS, W_ITEMS_CONFIG } from '../utils/calculations';

function SliderRow({ configKey, value, onChange }) {
  const cfg = SLIDER_CONFIGS[configKey];
  const display = cfg.display ? cfg.display(value) : value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <label style={{ fontSize: 12, width: 128, flexShrink: 0, color: '#444' }}>
        {cfg.label}
      </label>
      <input
        type="range"
        min={cfg.min} max={cfg.max} step={cfg.step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#1a237e' }}
      />
      <span style={{ fontSize: 13, fontWeight: 'bold', color: '#1a237e', width: 76, textAlign: 'right' }}>
        {display}{cfg.unit}
      </span>
    </div>
  );
}

function SectionCard({ title, children, accentColor = '#1a237e' }) {
  return (
    <div style={{
      background: 'white', borderRadius: 8, padding: '14px 16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <h3 style={{
        fontSize: 13, fontWeight: 'bold', color: accentColor,
        borderLeft: `3px solid ${accentColor}`, paddingLeft: 8,
        marginBottom: 12,
      }}>{title}</h3>
      {children}
    </div>
  );
}

export default function YearPanel({ yearData, score, yModel = 'simple', onSliderChange, onWItemChange }) {
  const monthlyBids = getMonthlyBids(yearData.staff, yearData.bidsPerStaff);
  const annualRevenue = monthlyBids * yearData.winRate * yearData.avgContractAmount * 12;

  return (
    <div>
      {/* サマリーバー */}
      <div style={{
        background: '#f8f9ff', borderRadius: '0 0 0 0', padding: '12px 16px',
        display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
        borderTop: '1px solid #e8eaf6',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#666' }}>完成工事高（推定）</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1a237e' }}>
            {(annualRevenue / 10000).toFixed(2)}億円
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666' }}>月間入札件数</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1a237e' }}>
            {monthlyBids}件
          </div>
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

      {/* スライダーグリッド */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 12, padding: 12,
        background: '#f5f6fa',
      }}>
        {/* 入札活動 */}
        <SectionCard title="入札活動（X1点に連動）" accentColor="#1565C0">
          {/* ① 在宅スタッフ数 */}
          <SliderRow configKey="staff" value={yearData.staff}
            onChange={v => onSliderChange('staff', v)} />

          {/* ② 1名あたり月間入札数 */}
          <SliderRow configKey="bidsPerStaff" value={yearData.bidsPerStaff}
            onChange={v => onSliderChange('bidsPerStaff', v)} />

          {/* 結果ボックス：在宅 × 1名あたり = 合計 */}
          <div style={{
            margin: '4px 0 12px 0',
            background: '#e3f2fd', borderRadius: 8,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.8 }}>
              <div>在宅 <strong>{yearData.staff}</strong>名</div>
              <div>1名あたり <strong style={{ color: '#1565C0' }}>{yearData.bidsPerStaff.toFixed(1)}</strong> 件/名</div>
            </div>
            <div style={{ fontSize: 11, color: '#aaa' }}>＝</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888' }}>月間入札件数</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1565C0', lineHeight: 1.2 }}>
                {monthlyBids}
              </div>
              <div style={{ fontSize: 10, color: '#1565C0' }}>件/月</div>
            </div>
            {/* バー */}
            <div style={{ flex: 1 }}>
              <div style={{ background: '#BBDEFB', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (monthlyBids / Math.max(30, Math.ceil(monthlyBids * 1.5 / 10) * 10)) * 100)}%`,
                  background: 'linear-gradient(90deg, #1565C0, #42A5F5)',
                  height: '100%', borderRadius: 4, transition: 'width 0.2s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#90A4AE', marginTop: 2 }}>
                <span>0</span>
                <span style={{ color: '#1565C0', fontWeight: 'bold' }}>{monthlyBids}件▲</span>
                <span>{Math.max(30, Math.ceil(monthlyBids * 1.5 / 10) * 10)}件</span>
              </div>
            </div>
          </div>

          <SliderRow configKey="winRate" value={yearData.winRate}
            onChange={v => onSliderChange('winRate', v)} />
          <SliderRow configKey="avgContractAmount" value={yearData.avgContractAmount}
            onChange={v => onSliderChange('avgContractAmount', v)} />
        </SectionCard>

        {/* 技術者 */}
        <SectionCard title="技術者（Z点）" accentColor="#6A1B9A">
          <SliderRow configKey="level1" value={yearData.level1}
            onChange={v => onSliderChange('level1', v)} />
          <SliderRow configKey="level2" value={yearData.level2}
            onChange={v => onSliderChange('level2', v)} />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            Z点 = {score.z}点（1級×{yearData.level1} + 2級×{yearData.level2}）
          </div>
        </SectionCard>

        {/* 財務 */}
        <SectionCard title="財務（Y点・X2点に連動）" accentColor="#2E7D32">
          <SliderRow configKey="profitRate" value={yearData.profitRate}
            onChange={v => onSliderChange('profitRate', v)} />
          <SliderRow configKey="equity" value={yearData.equity}
            onChange={v => onSliderChange('equity', v)} />
          <SliderRow configKey="debt" value={yearData.debt}
            onChange={v => onSliderChange('debt', v)} />
          <SliderRow configKey="interest" value={yearData.interest}
            onChange={v => onSliderChange('interest', v)} />
        </SectionCard>

        {/* W点 */}
        <SectionCard title={`社会性（W点） → ${score.w}点 → P点 +${(score.w * 0.15).toFixed(1)}点`} accentColor="#E65100">
          {/* W点バー */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ background: '#fbe9e7', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${score.w}%`,
                background: 'linear-gradient(90deg, #E65100, #FF8A65)',
                height: '100%', borderRadius: 4, transition: 'width 0.2s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999', marginTop: 2 }}>
              <span>0点</span><span>50点</span><span>100点（上限）</span>
            </div>
          </div>
          {W_ITEMS_CONFIG.map(item => {
            const pImpact = (item.points * 0.15).toFixed(1);
            const isChecked = yearData.wItems[item.key] || false;
            return (
              <label key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, cursor: 'pointer', marginBottom: 7,
                opacity: isChecked ? 1 : 0.75,
              }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => onWItemChange(item.key, e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ color: '#BF360C', fontSize: 11 }}>W+{item.points}pt</span>
                <span style={{ color: '#388E3C', fontWeight: 'bold', fontSize: 11, width: 52, textAlign: 'right' }}>P+{pImpact}pt</span>
              </label>
            );
          })}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #ffccbc', fontSize: 11, color: '#888' }}>
            ※ W点は重み0.15のため、P点への影響は小さい。主な改善はX1・Z点で狙う。
          </div>
        </SectionCard>

        {/* 詳細版(8指標)専用の追加入力 — グリッド全幅 */}
        {yModel === 'full' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <SectionCard title="Y点 詳細入力（実経審8指標の追加4項目）" accentColor="#00796B">
              <div style={{
                fontSize: 11, color: '#555', marginBottom: 10, lineHeight: 1.6,
              }}>
                簡易版の4項目（利益率・自己資本・借入金・支払利息）に加え、以下を直接入力することで実経審Y点の8指標を再現します。
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <SliderRow configKey="grossProfitRate" value={yearData.grossProfitRate}
                  onChange={v => onSliderChange('grossProfitRate', v)} />
                <SliderRow configKey="fixedAssets" value={yearData.fixedAssets}
                  onChange={v => onSliderChange('fixedAssets', v)} />
                <SliderRow configKey="operatingCF" value={yearData.operatingCF}
                  onChange={v => onSliderChange('operatingCF', v)} />
                <SliderRow configKey="retainedEarnings" value={yearData.retainedEarnings}
                  onChange={v => onSliderChange('retainedEarnings', v)} />
              </div>
              <div style={{
                marginTop: 10, paddingTop: 8,
                borderTop: '1px dashed #b2dfdb', fontSize: 11, color: '#00695C',
              }}>
                Y点 = <strong>{score.y}</strong>点　|　使用指標：
                純支払利息比率・負債回転期間・総資本売上総利益率・売上高経常利益率・
                自己資本対固定資産比率・自己資本比率・営業CF・利益剰余金
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
