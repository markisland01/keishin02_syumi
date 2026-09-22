import { useState } from 'react';
import { createFinancialData, FINANCIAL_FIELDS, CF_BALANCES, present, D } from '../utils/financialCalculations.js';
import { upgradeYear, compareAssessment, summarizeCases, SCORE_KEYS } from '../utils/accuracyState.js';

const cell = { padding: '5px 8px', borderBottom: '1px solid #dde3ec', textAlign: 'right' };
const inputStyle = { width: 125, padding: 5, border: '1px solid #bac7d7', borderRadius: 4 };
const show = value => value == null ? '—' : Number.isFinite(value) ? value.toLocaleString('ja-JP', { maximumFractionDigits: 6 }) : String(value);
const statusText = { complete: '詳細計算', estimate: '参考推計', missing: '入力不足', invalid: '入力エラー', unsupported: '対象外' };

export default function AccuracyPanel({ year, score, onChange, onDetailed }) {
  const [unit, setUnit] = useState('sen');
  const [manualScores, setManualScores] = useState({});
  const data = year.accuracy || createFinancialData();
  const detail = score.yDetail || {};
  const reference = year.referenceAssessments?.find(r => r.id === year.activeReferenceId);
  const rows = compareAssessment(score, reference, year);
  const update = (fn, confirmed = false) => { const next = structuredClone(data); fn(next); next.confirmed = confirmed; onChange({ ...year, accuracy: next }); };
  const table = (children) => <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>{children}</table></div>;
  if (year.calculationVersion !== 'accuracy-v2') return <div style={{ padding: 14, background: '#fff5db' }}>
    <strong>旧計算方式を保持しています。</strong> 詳細計算へ切り替えると不足項目と新しい計算結果を表示します。
    <button onClick={() => { onChange(upgradeYear(year)); onDetailed(); }}>新しい詳細計算へ切替</button>
  </div>;
  function saveCase() {
    const snapshot = structuredClone(year); delete snapshot.verificationCases;
    onChange({ ...year, verificationCases: [...(year.verificationCases || []), { id: Date.now(), savedAt: new Date().toISOString(), calculationVersion: 'accuracy-v2', referenceId: reference.id, snapshot, rows }] });
  }
  const fields = Object.keys(FINANCIAL_FIELDS);
  return <section id="accuracy-panel" aria-label="精度改善・実績照合" style={{ background: 'white', padding: 16, border: '1px solid #bccbdd', marginBottom: 12, borderRadius: 8 }}>
    <h3 style={{ marginTop: 0 }}>財務の詳細計算と実績照合</h3>
    <p>Y：<strong>{show(score.y)}</strong> ／ {statusText[detail.status] || '参考推計（簡易モデル）'}　X2：{show(score.x2)}　独立計算P：{show(score.computedP)}　採用P：{show(score.p)}</p>
    <button onClick={onDetailed}>詳細計算を使用</button>{' '}
    <span>{data.confirmed ? '入力確認済み' : '入力内容を確認してください'}{data.estimate ? '・推計データ' : ''}</span>
    <details open={!data.context.companyId} style={{ marginTop: 12 }}><summary>会社・期間・計算条件</summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 0' }}>
        {[['companyId', '会社名／会社ID', 'text'], ['periodEnd', '決算期末日', 'date'], ['applicationDate', '申請日', 'date'], ['months', '当期月数', 'number'], ['priorMonths', '前期月数', 'number']].map(([key, label, type]) => <label key={key}>{label}<br/><input aria-label={label} type={type} style={inputStyle} value={data.context[key] ?? ''} onChange={e => update(d => { d.context[key] = e.target.value; if(key === 'applicationDate') d.context.ruleSetId = !e.target.value ? 'unknown' : e.target.value >= '2026-07-01' ? '2026-07' : 'previous'; })}/></label>)}
        <label>決算区分<br/><select value={data.context.entityType} onChange={e => update(d => { d.context.entityType = e.target.value; })}><option value="corporation">法人単独</option><option value="individual">個人（対象外）</option></select></label>
        <label><input type="checkbox" checked={data.context.consolidated} onChange={e => update(d => { d.context.consolidated = e.target.checked; })}/>連結（対象外）</label>
        <label><input type="checkbox" checked={data.estimate} onChange={e => update(d => { d.estimate = e.target.checked; })}/>推計値を含む</label>
      </div>
      <p>制度：{data.context.ruleSetId === '2026-07' ? '2026年7月以降' : data.context.ruleSetId === 'previous' ? '旧制度（W・Pの正式照合は対象外）' : '申請日未確認（W・Pの正式照合は保留）'}</p>
    </details>
    <details><summary>財務入力（当期・前期・前々期）</summary>
      <label>表示単位 <select aria-label="詳細財務の表示単位" value={unit} onChange={e => setUnit(e.target.value)}><option value="sen">千円</option><option value="man">万円</option></select></label>
      <p>空欄は未入力です。金額0の場合も明示入力してください。総資本は純資産＋負債からも算出できます。</p>
      {table(<><thead><tr><th>項目</th><th>当期</th><th>前期</th><th>前々期（CF残高）</th></tr></thead><tbody>{fields.map(key => <tr key={key}><th style={{...cell,textAlign:'left'}}>{FINANCIAL_FIELDS[key]}</th>{['current','prior','prior2'].map((period,i) => <td style={cell} key={period}>{period === 'prior2' && !CF_BALANCES.includes(key) ? '—' : <>
        <input aria-label={`${['当期','前期','前々期'][i]} ${FINANCIAL_FIELDS[key]}`} style={inputStyle} type="number" step="any" value={present(data.periods[period][key]) ? D(data.periods[period][key]).div(unit === 'man' ? 10 : 1).number() : ''} onChange={e => { const value=e.target.value; update(d => { d.periods[period][key] = value === '' ? '' : String(D(value).mul(unit === 'man' ? 10 : 1).number()); d.sources[`${period}.${key}`] = { sourceType:'manual', verification:'unconfirmed',originalValue:value,originalUnit:unit,updatedAt:new Date().toISOString() }; }); }}/>
        <small style={{display:'block',color:'#657080'}}>{data.sources[`${period}.${key}`]?.sourceType || (present(data.periods[period][key]) ? '入力値' : '未入力')}</small></>}</td>)}</tr>)}</tbody></>)}
      <div style={{display:'flex',gap:15,flexWrap:'wrap',margin:'12px 0'}}>
        <label>X2自己資本 <select aria-label="X2自己資本" value={data.options.equityMode} onChange={e => update(d=>{d.options.equityMode=e.target.value;})}><option value="current">当期</option><option value="average">2期平均</option><option value="direct">直接入力</option></select></label>
        <label>X2平均利益 <select value={data.options.profitMode} onChange={e=>update(d=>{d.options.profitMode=e.target.value;})}><option value="average">営業利益＋償却の2期平均</option><option value="direct">算定済み値</option></select></label>
        <label>営業CF <select aria-label="営業CFの計算方法" value={data.options.cfMode} onChange={e=>update(d=>{d.options.cfMode=e.target.value;})}><option value="periods">各期の経審用CF</option><option value="average">経審用2期平均を入力</option><option value="detail">内訳から計算</option><option value="simple">簡易推計</option></select></label>
      </div>
      {[['equityDirect','X2自己資本の直接値',data.options.equityMode==='direct'],['averageProfit','X2平均利益の直接値',data.options.profitMode==='direct'],['averageCF','経審用2期平均CF',data.options.cfMode==='average']].filter(x=>x[2]).map(([key,label])=><label key={key} style={{marginRight:12}}>{label}（千円） <input aria-label={label} style={inputStyle} type="number" step="any" value={data.options[key]} onChange={e=>update(d=>{d.options[key]=e.target.value;})}/></label>)}
    </details>
    <button style={{marginTop:12}} onClick={()=>update(d=>{for(const s of Object.values(d.sources)) s.verification='confirmed';},true)}>入力内容を確認済みにする</button>
    {detail.missingFields?.length > 0 && <p role="status" style={{color:'#a45400'}}>不足：{detail.missingFields.join('、')}</p>}
    {detail.validationErrors?.map(e=><p role="alert" key={e} style={{color:'#b00'}}>{e}</p>)}
    {(detail.validationErrors?.some(e=>e.includes('総資本と純資産')) || data.options.capitalReconciliation) && <label style={{display:'block',margin:'10px 0'}}><input aria-label="原本の総資本記載値を採用" type="checkbox" checked={Boolean(data.options.capitalReconciliation)} onChange={e=>update(d=>{d.options.capitalReconciliation=e.target.checked;})}/>原本を確認し、1千円以内の表示差について総資本の記載値を採用する（確認内容を保存）</label>}
    {detail.warnings?.map(w=><p key={w} style={{color:'#955100'}}>{w}</p>)}
    {detail.status==='unsupported' && <p>この決算区分・期間は詳細計算の対象外です。</p>}
    <details><summary>Y点の8指標・丸め・計算過程</summary>
      {table(<><thead><tr>{['指標','算定値','丸め後','範囲適用後','Aへの寄与'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{detail.indicators?.map(r=><tr key={r.key}><th style={cell}>{r.key} {r.label}</th>{['raw','rounded','bounded','contribution'].map(k=><td style={cell} key={k}>{show(r[k])}</td>)}</tr>)}</tbody></>)}
      <p>A（丸め前）{show(detail.aRaw)} → A {show(detail.aRounded)} → Y（丸め前）{show(detail.yRaw)} → Y {show(detail.y)}</p>
      <p>総資本2期平均（最低額適用後）：{show(detail.inputs?.averageCapital)}千円 ／ 営業CF2期平均：{show(detail.inputs?.averageCF)}千円</p>
      {detail.cfTrace?.map(r=><p key={r.period}>{r.period==='current'?'当期':'前期'}CF：利益＋償却−税 {show(r.base)}、増減内訳 {JSON.stringify(r.changes)} → {show(r.value)}千円</p>)}
    </details>
    <details open={Boolean(reference)}><summary>通知書実績との照合・保存履歴</summary>
      <p>差は独立計算値−通知書です。採用値に上書きがあっても一致判定に利用しません。</p>
      <label>参照資料 <select aria-label="参照資料" value={year.activeReferenceId || ''} onChange={e=>onChange({...year,activeReferenceId:e.target.value})}><option value="">未選択</option>{year.referenceAssessments?.map(r=><option key={r.id} value={r.id}>{r.fileName} / {r.context.industry} / {r.context.periodEnd}</option>)}</select></label>
      {table(<><thead><tr>{['評点','通知書','独立計算','差','P差への寄与','採用値','判定'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><th style={cell}>{r.key.toUpperCase()}</th><td style={cell}>{show(r.expected)}</td><td style={cell}>{show(r.actual)}</td><td style={cell}>{show(r.delta)}</td><td style={cell}>{show(r.pContribution)}</td><td style={cell}>{show(r.effective)}</td><td style={cell}>{r.status}</td></tr>)}</tbody></>)}
      <p style={{fontSize:12}}>P差への寄与は各評点差×係数（丸め前）です。条件不一致の項目も参考表示します。</p>
      <button disabled={!reference || detail.appliedModel!=='full'} onClick={saveCase}>現在の入力で検証履歴を保存</button>
      {reference && <button onClick={()=>{ const context={...data.context,industry:year.industry}; onChange({...year,referenceAssessments:year.referenceAssessments.map(r=>r.id===reference.id?{...r,context,confirmed:true}:r)}); }}>資料の会社・期間・制度を現在の設定で確認</button>}
      <details><summary>実績評点を手入力</summary>{SCORE_KEYS.map(k=><label key={k} style={{marginRight:8}}>{k.toUpperCase()} <input type="number" style={{width:65}} value={manualScores[k]??''} onChange={e=>setManualScores({...manualScores,[k]:e.target.value})}/></label>)}
        <button disabled={!data.context.companyId || !data.context.periodEnd || !Object.values(manualScores).some(present)} onClick={()=>{const id=`manual-${Date.now()}`;onChange({...year,activeReferenceId:id,referenceAssessments:[...(year.referenceAssessments||[]),{id,fileName:'手入力実績',confirmed:true,context:{...data.context,industry:year.industry},scores:Object.fromEntries(SCORE_KEYS.map(k=>[k,present(manualScores[k])?Number(manualScores[k]):null]))}]});}}>実績を追加</button>
      </details>
      <p>保存済み検証 {year.verificationCases?.length || 0}件（保存時の入力を保持。同一資料は最新の検証のみ集計）</p>
      {table(<><thead><tr>{['評点','対象','除外','一致','一致率','平均絶対誤差','最大差'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{summarizeCases(year.verificationCases).map(r=><tr key={r.key}><th style={cell}>{r.key.toUpperCase()}</th>{[r.count,r.excluded,r.matches,r.rate==null?'未検証':`${(r.rate*100).toFixed(1)}%`,r.mae,r.max].map((v,i)=><td style={cell} key={i}>{show(v)}</td>)}</tr>)}</tbody></>)}
      {year.verificationCases?.map(c=><details key={c.id}><summary>{c.savedAt} / {c.calculationVersion}</summary><pre style={{overflowX:'auto',maxHeight:240}}>{JSON.stringify({rows:c.rows,inputs:c.snapshot.accuracy},null,2)}</pre></details>)}
    </details>
  </section>;
}
