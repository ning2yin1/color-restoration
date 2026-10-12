const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:8000/color-restoration/';
const sizes=[{width:1920,height:1080},{width:1366,height:768},{width:390,height:844},{width:375,height:667},{width:375,height:567}];
async function fits(page,selectors){
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#app')).opacity==='1');
 const metrics=await page.evaluate(()=>({height:innerHeight,width:innerWidth,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth}));
 assert.ok(metrics.scrollHeight<=metrics.height,`vertical overflow: ${JSON.stringify(metrics)}`);
 assert.ok(metrics.scrollWidth<=metrics.width,`horizontal overflow: ${JSON.stringify(metrics)}`);
 for(const selector of selectors){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.y>=0&&box.x>=0&&box.y+box.height<=metrics.height+.5&&box.x+box.width<=metrics.width+.5,`${selector} outside viewport`)}
 assert.ok(await page.evaluate(()=>getComputedStyle(document.body).overflowY!=='hidden'&&getComputedStyle(document.querySelector('#app')).overflowY!=='hidden'));
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=document-user-activation-required']});
 const context=await browser.newContext({viewport:sizes[0],hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);assert.equal(await page.locator('#atelier-bgm').evaluate(a=>a.paused),true);
 await page.locator('[data-work="cat"]').click();await page.waitForFunction(()=>{const a=document.querySelector('#atelier-bgm');return !a.paused&&a.currentTime>0});
 assert.equal(await page.locator('#atelier-bgm').evaluate(a=>a.loop),true);
 const audioId=await page.locator('#atelier-bgm').evaluate(a=>{a.dataset.identity='retained';return a.currentTime});
 for(const size of sizes){await page.locator('header [data-nav="gallery"]').click();await page.locator('[data-work="cat"]').click();await page.setViewportSize(size);await fits(page,['.observe-layout svg','h1','.panel h2','.panel>p:not(.hint)','#target','#mix']);await page.screenshot({path:`/tmp/cat-observe-${size.width}-${size.height}.png`});await page.locator('#mix').click();await fits(page,['#color-preview','#hsl-0','#hsl-1','#hsl-2','#reobserve','#finish']);assert.equal(await page.locator('#app svg').count(),0);for(const id of ['#hsl-0','#hsl-1','#hsl-2'])assert.ok((await page.locator(id).boundingBox()).width>=200&&(await page.locator(id).boundingBox()).height>=44);await page.screenshot({path:`/tmp/mix-${size.width}-${size.height}.png`});const touchBox=await page.locator('#hsl-0').boundingBox();await page.touchscreen.tap(touchBox.x+touchBox.width*.75,touchBox.y+touchBox.height/2);assert.notEqual(await page.locator('#hsl-0').inputValue(),'180');await page.locator('#hsl-0').fill('90');await page.locator('#reobserve').click();await fits(page,['.observe-layout svg','h1','.panel h2','.panel>p:not(.hint)','#mix']);await page.locator('#mix').click();assert.equal(await page.locator('#hsl-0').inputValue(),'90');await page.locator('#reobserve').click()}
 assert.equal(await page.locator('#atelier-bgm').getAttribute('data-identity'),'retained');assert.ok(await page.locator('#atelier-bgm').evaluate((a,t)=>a.currentTime>t,audioId));
 await page.locator('#atelier-bgm').evaluate(a=>a.currentTime=a.duration-.2);await page.waitForFunction(()=>document.querySelector('#atelier-bgm').currentTime<2);assert.equal(await page.locator('#atelier-bgm').evaluate(a=>a.paused),false);
 await page.locator('[data-nav="settings"]').click();await page.locator('[data-setting="bgmVolume"]').fill('12');await page.locator('[data-setting="sfxVolume"]').fill('65');await page.locator('[data-setting="bgmOn"]').uncheck();assert.equal(await page.locator('#atelier-bgm').evaluate(a=>a.paused),true);await page.reload();await page.locator('[data-nav="settings"]').click();assert.equal(await page.locator('[data-setting="bgmOn"]').isChecked(),false);assert.equal(await page.locator('[data-setting="bgmVolume"]').inputValue(),'12');assert.equal(await page.locator('[data-setting="sfxVolume"]').inputValue(),'65');await page.locator('[data-setting="bgmOn"]').check();await page.waitForFunction(()=>!document.querySelector('#atelier-bgm').paused);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const length=fs.statSync('assets/audio/Café Piano.mp3').size;
 assert.equal(await page.evaluate(async()=>{const c=await caches.open('color-atelier-v5');const r=await c.match(new URL('./assets/audio/Café Piano.mp3',location.href));return (await r.arrayBuffer()).byteLength}),length);
 await context.setOffline(true);await page.reload();await page.locator('[data-work="cat"]').click();await page.waitForFunction(()=>!document.querySelector('#atelier-bgm').paused&&document.querySelector('#atelier-bgm').currentTime>0);
 const range=await page.evaluate(async()=>{const r=await fetch('./assets/audio/Café Piano.mp3',{headers:{Range:'bytes=0-99'}});return {status:r.status,range:r.headers.get('content-range'),length:(await r.arrayBuffer()).byteLength}});
 assert.deepEqual(range,{status:206,range:`bytes 0-99/${length}`,length:100});await page.locator('#mix').click();await page.locator('#finish').click();assert.equal(await page.locator('.comparison svg').count(),2);assert.deepEqual(errors,[]);
 const noMusic=await browser.newContext({serviceWorkers:'block'});await noMusic.route('**/assets/audio/**',route=>route.fulfill({status:404,body:''}));const fallback=await noMusic.newPage();await fallback.goto(base);await fallback.locator('[data-work]').first().click();await fallback.locator('#mix').click();await fallback.locator('#finish').click();assert.equal(await fallback.locator('.comparison svg').count(),2);
 await browser.close();console.log('PASS: all requested viewports + reduced Safari-like height, full artwork and controls, no clipping/scroll; BGM gesture, continuity, loop, persisted independent settings, offline full MP3 and range playback, missing-audio fallback');
})().catch(e=>{console.error(e);process.exit(1)});
