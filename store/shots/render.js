// Renders the App Store screenshots: 01 + 02 are one wide scene (#pano) cut in two.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
const p=await b.newPage({viewport:{width:880,height:956},deviceScaleFactor:3});
await p.goto('file://'+__dirname+'/scene.html#pano');await p.waitForTimeout(600);
await p.screenshot({path:__dirname+'/01.png',clip:{x:0,y:0,width:440,height:956}});
await p.screenshot({path:__dirname+'/02.png',clip:{x:440,y:0,width:440,height:956}});
const q=await b.newPage({viewport:{width:440,height:956},deviceScaleFactor:3});
for(const n of [3,4,5]){await q.goto('file://'+__dirname+'/scene.html#'+n);await q.reload();await q.waitForTimeout(500);await q.screenshot({path:__dirname+`/0${n}.png`});}
await b.close();})();
