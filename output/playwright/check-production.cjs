async page => {
  const errors=[],failed=[],runs=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',req=>failed.push({url:req.url(),reason:req.failure()?.errorText}));
  await page.setViewportSize({width:1440,height:1000});
  await page.addInitScript(()=>{window.__lcp=0;new PerformanceObserver(list=>{window.__lcp=list.getEntries().at(-1)?.startTime||0;}).observe({type:'largest-contentful-paint',buffered:true});});
  for(const suffix of ['','a702/']) {
    await page.goto(`http://127.0.0.1:5199/${suffix}`);
    await page.getByRole('heading',{name:'The mission board 4'}).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    if((await page.title()).includes('Civiquill')===false)throw new Error('Production branding missing');
    await page.getByRole('button',{name:'What does a tokenized stock actually represent?',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.addScriptTag({path:'output/playwright/axe.min.js'});
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});
    const metrics=await page.evaluate(()=>({title:document.title,missions:document.querySelectorAll('.mission-row').length,lcpMs:window.__lcp,paint:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.transferSize})),overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)}));
    if(audit.length||metrics.overflow||metrics.brokenImages.length)throw new Error(JSON.stringify({suffix,audit,metrics}));
    runs.push({path:'/'+suffix,metrics,accessibility:audit,detail:'opened and closed'});
  }
  if(errors.length||failed.length)throw new Error(JSON.stringify({errors,failed}));
  await page.goto('http://127.0.0.1:5199/');
  await page.getByRole('heading',{name:'The mission board 4'}).waitFor();
  await page.screenshot({path:'output/playwright/civiquill-production-desktop.png',fullPage:true});
  await page.screenshot({path:'output/playwright/civiquill-production-desktop-viewport.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/civiquill-production-mobile.png',fullPage:true});
  await page.screenshot({path:'output/playwright/civiquill-production-mobile-viewport.png'});
  return {passed:true,runs,errors,failed};
}
