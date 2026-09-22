import { useEffect, useRef, useState } from 'react';
import { INDUSTRY_OPTIONS } from '../utils/calculations';
import { FINANCIAL_FIELDS } from '../utils/financialCalculations.js';

function setPath(target, path, value) { const keys=path.split('.'); let node=target; for(const key of keys.slice(0,-1)) node=node[key] ||= {}; node[keys.at(-1)]=value; }

export default function KeishinPdfImport({ activeYear, currentYear, importState, onFileSelect, onApply, onDismiss }) {
  const input=useRef(null);
  const [industry,setIndustry]=useState(currentYear.industry);
  const [fields,setFields]=useState([]), [context,setContext]=useState({}), [confirmed,setConfirmed]=useState(false);
  const result=importState.result, status=importState.status;
  useEffect(()=>setIndustry(currentYear.industry),[activeYear,currentYear.industry]);
  useEffect(()=>{
    if(!result) return;
    const extra=[];
    for(const [period,values] of Object.entries(result.financialInputs?.periods||{})) for(const [key,value] of Object.entries(values)) extra.push({path:`financial.${period}.${key}`,label:`${period==='current'?'当期':'前期'} ${FINANCIAL_FIELDS[key]}`,value,kind:'amount',unit:'千円'});
    for(const [key,value] of Object.entries(result.referenceScores||{})) extra.push({path:`reference.${key}`,label:`通知書 ${key.toUpperCase()}`,value,kind:'score',unit:'点'});
    setFields([...(result.detectedFields||[]).filter(f=>!f.path.startsWith('scoreOverrides')), ...extra].map(f=>({...f,value:f.kind==='ratio'?f.value*100:f.value,enabled:true,valueType:typeof f.value})));
    setContext({companyId:'',periodEnd:'',applicationDate:'',...result.documentContext}); setConfirmed(false);
  },[result]);
  function apply() {
    const patch={},financialInputs={periods:{}},referenceScores={};
    for(const field of fields.filter(f=>f.enabled && f.value != null && f.value !== '')) {
      if(field.path.startsWith('financial.')) setPath(financialInputs.periods,field.path.slice(10),field.value);
      else if(field.path.startsWith('reference.')) referenceScores[field.path.slice(10)]=field.value;
      else setPath(patch,field.path,field.kind==='ratio'?field.value/100:field.value);
    }
    patch.industry=industry;
    const ruleSetId=!context.applicationDate?'unknown':context.applicationDate>='2026-07-01'?'2026-07':'previous';
    onApply({...result,patch,financialInputs,referenceScores},{...context,ruleSetId});
  }
  return <section style={{padding:14,borderBottom:'1px solid #ddd'}} aria-label="PDF取込">
    <input ref={input} type="file" accept=".pdf,application/pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)onFileSelect(f,{forcedIndustry:industry});}}/>
    <label>建設工事の種別 <select aria-label="PDFの業種" value={industry} onChange={e=>setIndustry(e.target.value)}>{INDUSTRY_OPTIONS.map(i=><option key={i}>{i}</option>)}</select></label>{' '}
    <button disabled={status==='reading'} onClick={()=>input.current.click()}>経審PDF取込</button> <span>{status==='reading'?'PDFを読み取っています…':status==='applied'?'確認済みの内容を反映しました':`反映先：${activeYear===0?'現在':activeYear+'年後'}`}</span>
    {status==='error'&&<p role="alert">{importState.error}</p>}
    {result&&status!=='reading'&&<div>
      <h4>取込内容の確認：{result.fileName}</h4>
      <p>原本と照合し、修正・除外してから反映してください。通知書の評点は参照値として保存します。</p>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{[['companyId','資料の会社名','text'],['periodEnd','資料の決算期末日','date'],['applicationDate','資料の申請日（記載がある場合）','date']].map(([key,label,type])=><label key={key}>{label}<br/><input aria-label={label} type={type} value={context[key]||''} onChange={e=>{setContext({...context,[key]:e.target.value});setConfirmed(false);}}/></label>)}</div>
      <div style={{maxHeight:450,overflow:'auto',marginTop:12}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr><th>反映</th><th>項目</th><th>読取値（修正可能）</th><th>単位・出所</th></tr></thead><tbody>{fields.map((f,i)=><tr key={f.path}>
        <td><input aria-label={`${f.label}を反映`} type="checkbox" checked={f.enabled} onChange={e=>{setFields(v=>v.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x));setConfirmed(false);}}/></td><td>{f.label}</td>
        <td>{typeof f.value==='boolean'?<select value={String(f.value)} onChange={e=>{setFields(v=>v.map((x,j)=>j===i?{...x,value:e.target.value==='true'}:x));setConfirmed(false);}}><option value="true">有</option><option value="false">無</option></select>:<input aria-label={`読取 ${f.label}`} type={f.valueType==='number'?'number':'text'} step="any" value={f.value??''} onChange={e=>{const val=e.target.value;setFields(v=>v.map((x,j)=>j===i?{...x,value:x.valueType==='number'?(val===''?null:Number(val)):val}:x));setConfirmed(false);}}/>}</td><td>{f.unit||''} <small>{f.source|| (result.usedOcr?'OCR':'PDF')}</small></td>
      </tr>)}</tbody></table></div>
      {result.warnings?.map((w,i)=><p key={i} style={{color:'#955100',fontSize:12}}>{w}</p>)}
      <label><input aria-label="PDF原本と照合済み" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>会社・期・業種・単位・読取値を原本と照合した</label>{' '}
      <button disabled={!confirmed||!context.companyId||!context.periodEnd||!fields.some(f=>f.enabled)||status==='applied'} onClick={apply}>確認して反映・実績保存</button>{' '}<button onClick={onDismiss}>閉じる</button>
    </div>}
  </section>;
}
