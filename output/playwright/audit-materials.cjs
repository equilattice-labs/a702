const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const checks=[];
for(const part of ['src','public','dist']) for(const f of files(path.join('website',part))) {const g=path.join('website','a702',path.relative('website',f)); if(!fs.existsSync(g)||sha(f)!==sha(g))throw new Error('Mirror mismatch: '+f);checks.push(f);}
for(const f of ['index.html','vite.config.js','meterial.txt','package-lock.json'])if(sha('website/'+f)!==sha('website/a702/'+f))throw new Error('Mirror mismatch: '+f);
const abi=JSON.stringify(JSON.parse(fs.readFileSync('contracts/EvidaraEscrow.abi.json')));
for(const f of ['website/src/EvidaraEscrow.abi.json','website/src/abi.json','website/a702/src/EvidaraEscrow.abi.json','website/a702/src/abi.json'])if(JSON.stringify(JSON.parse(fs.readFileSync(f)))!==abi)throw new Error('ABI mismatch: '+f);
const old=/proofora/gi;for(const f of files('website/dist').concat(files('website/a702/dist'))){if(!/\.(js|css|html|svg|txt)$/.test(f))continue;const s=fs.readFileSync(f,'utf8').replace(/proofora-saved/g,'');if(old.test(s))throw new Error('Old display brand in '+f);}
console.log(JSON.stringify({mirrorFilesMatched:checks.length+4,abiCopiesIdentical:4,oldDisplayBrandAbsentInBothBuilds:true,assetsIdentical:sha('twitter/civiquill-mark.svg')===sha('website/public/civiquill-mark.svg')&&sha('twitter/civiquill-social.png')===sha('website/public/civiquill-social.png')},null,2));
