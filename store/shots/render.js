const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:440,height:956},deviceScaleFactor:3});
for(const n of [1,2,3,4,5]){await p.goto('file://'+__dirname+'/scene.html#'+n);await p.reload();await p.waitForTimeout(300);await p.screenshot({path:__dirname+`/0${n}.png`});}
await b.close();})();
