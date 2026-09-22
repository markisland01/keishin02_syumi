import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDetailedY, createFinancialData, financialX2, roundDecimal, changeDocumentUnit, CF_BALANCES } from '../src/utils/financialCalculations.js';
import { applyFinancialImport, cloneForecastAccuracy, compareAssessment, summarizeCases, upgradeYear } from '../src/utils/accuracyState.js';
import { calcAllScores, createDefaultYears, migrateSavedYears } from '../src/utils/calculations.js';

function sample() {
  const d=createFinancialData();
  d.context={...d.context,companyId:'example',periodEnd:'2026-06-30',ruleSetId:'2026-07'};
  d.periods.current={sales:'100000',grossProfit:'15000',ordinaryProfit:'6000',interestPaid:'800',interestDividendReceived:'200',netAssets:'30000',totalDebt:'40000',totalAssets:'70000',fixedAssets:'28000',keishinOperatingCF:'3900',retainedEarnings:'18000'};
  d.periods.prior={netAssets:'20000',totalDebt:'30000',totalAssets:'50000',keishinOperatingCF:'3100'};
  d.options.profitMode='direct'; d.options.averageProfit='3000';d.confirmed=true;
  return d;
}
function year(data=sample()) { return {...createDefaultYears(0)[0],accuracy:data}; }
test('T01: independent specification fixture matches every indicator, A and Y',()=>{
  const d=calculateDetailedY(sample());
  assert.deepEqual(d.indicators.map(r=>r.bounded),[.6,4.8,25,5.1,107.143,42.857,.035,.18]);
  assert.equal(d.aRaw,.9742736);assert.equal(d.aRounded,.97);assert.equal(d.yRaw,745.281);assert.equal(d.y,745);
});
test('T02: X2 averaging never changes Y or its capital',()=>{
  const d=sample();const before=calcAllScores([year(d)],'full','manual')[0];
  d.options.equityMode='average';const after=calcAllScores([year(d)],'full','manual')[0];
  assert.equal(after.y,745);assert.notEqual(before.x2,after.x2);assert.equal(financialX2(d).equity,25000);
});
test('T03: minimum average capital before, at and after 30000 thousand yen',()=>{
  for(const amount of [29999,30000,30001]){const d=sample();d.periods.current={...d.periods.current,totalAssets:amount,netAssets:amount-10000,totalDebt:10000};d.periods.prior={totalAssets:amount,keishinOperatingCF:3100};const r=calculateDetailedY(d);assert.equal(r.inputs.averageCapital,Math.max(30000,amount));}
});
test('T04: net interest can be negative and is capped at -0.3',()=>{
  const d=sample(); d.periods.current.interestDividendReceived=1300;
  assert.equal(calculateDetailedY(d).indicators[0].bounded,-.3);
});
test('T05: all indicator bounds apply after rounding',()=>{
  const d=sample();Object.assign(d.periods.current,{interestPaid:10000000,grossProfit:10000000,ordinaryProfit:-10000000,fixedAssets:1,retainedEarnings:100000000});d.options.cfMode='average';d.options.averageCF=-100000000;
  const r=calculateDetailedY(d).indicators;
  assert.equal(r[0].bounded,5.1);assert.equal(r[2].bounded,63.6);assert.equal(r[3].bounded,-8.5);assert.equal(r[4].bounded,350);assert.equal(r[6].bounded,-10);assert.equal(r[7].bounded,100);
});
test('T06: exact HALF_UP avoids binary floating point at positive and negative ties',()=>{
  assert.equal(roundDecimal('1.005',2),1.01);assert.equal(roundDecimal('-1.005',2),-1.01);assert.equal(roundDecimal('-1.2345',3),-1.235);
  assert.equal(roundDecimal('1.2344999',3),1.234);assert.equal(roundDecimal('1.2345001',3),1.235);
});
test('T07: zero sales, zero assets and negative equity use per-indicator rules',()=>{
  let d=sample(); d.periods.current.sales=0;d.periods.current.grossProfit=0;assert.equal(calculateDetailedY(d).y,140);
  d=sample();Object.assign(d.periods.current,{netAssets:-1000,totalAssets:39000,fixedAssets:0});assert.equal(calculateDetailedY(d).y,683);
  d=sample();Object.assign(d.periods.current,{netAssets:0,totalDebt:0,totalAssets:0});assert.equal(calculateDetailedY(d).y,703);
});
test('T08: losses and negative CF/retained earnings remain valid',()=>{
  const d=sample();Object.assign(d.periods.current,{ordinaryProfit:-5000,retainedEarnings:-2000,keishinOperatingCF:-3000});assert.equal(calculateDetailedY(d).status,'complete');assert.ok(calculateDetailedY(d).indicators[7].raw<0);
});
test('T09: missing is not zero, incomplete detailed Y and P stay null',()=>{
  const d=sample();d.periods.current.interestDividendReceived='';const r=calcAllScores([year(d)],'full','manual')[0];assert.equal(r.y,null);assert.equal(r.p,null);assert.equal(r.yDetail.status,'missing');
  d.periods.current.interestDividendReceived=0;assert.equal(calculateDetailedY(d).status,'complete');
});
test('T10: missing prior, nonannual and consolidated accounts are not calculated',()=>{
  const d=sample();d.periods.prior={keishinOperatingCF:3100};assert.equal(calculateDetailedY(d).y,null);
  for(const context of [{months:9},{priorMonths:6},{consolidated:true},{entityType:'individual'}]){const x=sample();Object.assign(x.context,context);assert.equal(calculateDetailedY(x).status,'unsupported');}
});
test('T11/T12: detailed CF signs and two-period calculation match direct CF',()=>{
  const d=sample();d.options.cfMode='detail';
  for(const period of ['current','prior','prior2']) for(const k of CF_BALANCES)d.periods[period][k]=0;
  Object.assign(d.periods.current,{ordinaryProfit:6000,depreciation:500,corporateTaxes:2000});Object.assign(d.periods.prior,{ordinaryProfit:5000,depreciation:400,corporateTaxes:1000});
  assert.equal(calculateDetailedY(d).inputs.averageCF,4450);
  for(let i=0;i<CF_BALANCES.length;i++){const x=structuredClone(d);x.periods.current[CF_BALANCES[i]]=200;assert.equal(calculateDetailedY(x).inputs.averageCF,4450+[100,-100,100,-100,100][i]);}
  const direct=structuredClone(d);direct.options.cfMode='periods';direct.periods.current.keishinOperatingCF=4500;direct.periods.prior.keishinOperatingCF=4400;
  assert.equal(calculateDetailedY(d).y,calculateDetailedY(direct).y);
  delete d.periods.prior2.tradePayables;assert.equal(calculateDetailedY(d).y,null);
});
test('T13: repeated unit conversions preserve thousand-yen precision and half-thousand values',()=>{
  const doc={unit:'sen',netAssets:'12345',operatingCF:'-0.5',cfAuto:false};const converted=changeDocumentUnit(doc,'man');assert.equal(converted.netAssets,'1234.5');assert.equal(converted.operatingCF,'-0.05');assert.deepEqual(changeDocumentUnit(converted,'sen'),doc);
});
test('T14: balance mismatch is not silently reconciled',()=>{const d=sample();d.periods.current.totalAssets=71000;assert.equal(calculateDetailedY(d).status,'invalid');assert.equal(calculateDetailedY(d).y,null);});
test('T15/T16: reference scores never override calculated W/P, explicit override is separate',()=>{
  const y=year();y.referenceAssessments=[{id:'ref',scores:{w:411},confirmed:true,context:{...y.accuracy.context,industry:y.industry}}];y.activeReferenceId='ref';
  let s=calcAllScores([y],'full','manual')[0];assert.equal(s.computedW,0);assert.equal(s.w,0);assert.equal(compareAssessment(s,y.referenceAssessments[0],y).find(r=>r.key==='w').delta,-411);
  y.wOverride={enabled:true,value:411};s=calcAllScores([y],'full','manual')[0];assert.equal(s.w,411);assert.notEqual(s.computedP,s.effectiveP);assert.equal(compareAssessment(s,y.referenceAssessments[0],y).find(r=>r.key==='w').delta,-411);
});
test('T17: reference-only import and zero scores survive JSON persistence',()=>{
  const y=applyFinancialImport(year(),{patch:{},referenceScores:{w:0,p:0},fileName:'test.pdf'},sample().context);
  const saved=JSON.parse(JSON.stringify(y));assert.equal(saved.referenceAssessments[0].scores.w,0);assert.equal(saved.wOverride.enabled,false);assert.equal(calculateDetailedY(saved.accuracy).y,null);
});
test('T18: mismatched identity, industry and unsupported W rules exclude comparison',()=>{
  const y=year(),s=calcAllScores([y],'full','manual')[0],ref={scores:{y:745,w:0,z:s.z},confirmed:true,context:{...y.accuracy.context,industry:y.industry}};
  assert.equal(compareAssessment(s,ref,y).find(r=>r.key==='y').status,'一致');
  ref.context.companyId='other';assert.equal(compareAssessment(s,ref,y)[2].status,'条件不一致');ref.context.companyId='example';ref.context.industry='大工';assert.equal(compareAssessment(s,ref,y)[3].status,'条件不一致');
  ref.context.ruleSetId='previous';assert.equal(compareAssessment(s,ref,y)[4].status,'条件不一致');
});
test('T20: legacy migration is idempotent and does not invent financial facts',()=>{
  const old={...createDefaultYears(0)[0]};delete old.calculationVersion;delete old.accuracy;
  const migrated=migrateSavedYears([old]);assert.equal(migrated[0].calculationVersion,'legacy-v1');assert.deepEqual(migrateSavedYears(migrated),migrated);
  const upgraded=upgradeYear(migrated[0]);assert.equal(upgraded.accuracy.periods.current.netAssets,undefined);
});
test('T21: forecast clones drop references and retain independent snapshots',()=>{
  const y=year();y.referenceAssessments=[{id:'r'}];y.verificationCases=[{snapshot:structuredClone(y.accuracy)}];const next=cloneForecastAccuracy(y);next.accuracy.periods.current.sales=999;
  assert.equal(y.accuracy.periods.current.sales,'100000');assert.equal(next.accuracy.estimate,true);assert.equal(next.accuracy.confirmed,false);assert.deepEqual(next.referenceAssessments,[]);assert.deepEqual(next.verificationCases,[]);
});
test('T22: zero eligible cases are unverified and exclusion counts remain visible',()=>{
  assert.equal(summarizeCases([])[0].rate,null);
  const stats=summarizeCases([{calculationVersion:'accuracy-v2',rows:[{key:'y',status:'参考推計',delta:0}]}]);assert.equal(stats[2].count,0);assert.equal(stats[2].excluded,1);assert.equal(stats[2].rate,null);
});

test('simple results are excluded and repeated verification does not inflate sample size',()=>{
  const y=year(),s=calcAllScores([y],'simple','manual')[0];
  const ref={scores:{y:s.y},confirmed:true,context:{...y.accuracy.context,industry:y.industry}};
  assert.equal(compareAssessment(s,ref,y)[2].status,'参考推計');
  const stats=summarizeCases([
    {referenceId:'one',calculationVersion:'accuracy-v2',rows:[{key:'y',status:'差異あり',delta:10}]},
    {referenceId:'one',calculationVersion:'accuracy-v2',rows:[{key:'y',status:'一致',delta:0}]},
  ]);
  assert.equal(stats[2].count,1);assert.equal(stats[2].rate,1);
  const detailed=calcAllScores([y],'full','manual')[0];
  ref.scores.y=detailed.y-5;
  assert.equal(compareAssessment(detailed,ref,y)[2].pContribution,1);
  assert.equal(roundDecimal('.005',2),.01);
});

test('T14: a small original-document discrepancy requires explicit recorded selection',()=>{
 const d=sample();d.periods.current.totalAssets=70001;
 assert.equal(calculateDetailedY(d).status,'invalid');
 d.options.capitalReconciliation=true;
 assert.equal(calculateDetailedY(d).status,'complete');assert.equal(calculateDetailedY(d).warnings.length,1);
 d.periods.current.totalAssets=70002;assert.equal(calculateDetailedY(d).status,'invalid');
});
