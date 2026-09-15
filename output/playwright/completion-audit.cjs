const fs=require('fs');
const records=['workspace','responsive','live','production','paint'].map(n=>[n,JSON.parse(fs.readFileSync(`website/output/playwright/${n}-results.json`,'utf8'))]);
for(const [n,r] of records){if(r.pass===false||r.passed===false||r.failure)throw new Error(n+' failed');}
const report=fs.readFileSync('RESKIN-VALIDATION.md','utf8');
for(const m of report.matchAll(/\]\(([^)]+)\)/g))if(!/^https?:/.test(m[1])&&!fs.existsSync(m[1]))throw new Error('Missing report artifact '+m[1]);
const history=JSON.parse(fs.readFileSync('contracts/deployment-history/pre-civiquill/deployment.json','utf8').replace(/^\uFEFF/,''));
const current=JSON.parse(fs.readFileSync('contracts/deployment.json','utf8').replace(/^\uFEFF/,''));
if(JSON.stringify(history)!==JSON.stringify(current))throw new Error('Deployment changed');
console.log('Final evidence: reports pass, linked artifacts exist, deployment preserved.');
