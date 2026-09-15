const fs=require('fs');
for(const name of ['workspace','responsive','live','production','paint']) {
 const filename=`output/playwright/${name}-results.txt`;const buf=fs.readFileSync(filename);const source=buf[0]===255&&buf[1]===254?buf.toString('utf16le'):buf.toString('utf8');const lines=source.split(/\r?\n/);const json=lines.find(line=>line.startsWith('{'));
 if(!json)throw new Error(`Missing result ${filename}`);const value=JSON.parse(json);if(value.pass===false||value.passed===false)throw new Error(`Failed result ${filename}`);
 if(value.accessibility?.some(x=>x.violations?.length||x.id))throw new Error(`Accessibility failure ${filename}`);
 fs.writeFileSync(`output/playwright/${name}-results.json`,JSON.stringify(value,null,2)+'\n');console.log(`${name}: ${value.results?.length||value.total||value.runs?.length||'metrics'} passed`);
}
