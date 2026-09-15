async page => {
 await page.bringToFront();
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:5199/');
 await page.getByRole('heading',{name:'The mission board 4'}).waitFor();
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'output/playwright/civiquill-production-desktop-viewport.png'});
 const metrics=await page.evaluate(()=>({visibility:document.visibilityState,paint:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),lcpMs:window.__lcp||null,resources:performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status}))}));
 return metrics;
}
