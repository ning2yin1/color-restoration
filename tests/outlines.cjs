const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {artworks,painting}=await import('../art.js');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  const cases=artworks.flatMap(work=>work.colors.map((_,target)=>({id:work.id,target,shape:work.parts.filter(p=>p.color===target).map(p=>p.shape).join(''),svg:painting(work,{target,highlight:true})})));
  const results=await page.evaluate(async cases=>{
   const scale=4,w=400*scale,h=300*scale;
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   async function pixels(content){const image=new Image(),url=URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="${w}" height="${h}">${content}</svg>`],{type:'image/svg+xml'}));image.src=url;await image.decode();ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0);URL.revokeObjectURL(url);return ctx.getImageData(0,0,w,h).data}
   async function check(shape,outline){const mask=await pixels(`<g fill="white" stroke="white" stroke-width="0">${shape}</g>`),stroke=await pixels(outline);let count=0,leaks=0;
    const inside=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&mask[(y*w+x)*4+3]>=128;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(stroke[(y*w+x)*4+3]<64)continue;count++;const center=inside(x,y);let boundary=false;
     // A 2.5-unit stroke lies within 1.25 units of the composite boundary.
     // Allow anti-aliasing, pixel-center sampling and <=0.125-unit simplification.
     search:for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){if(dx*dx+dy*dy>64)continue;if(inside(x+dx,y+dy)!==center){boundary=true;break search}}
     if(!boundary)leaks++;
    }
    return {count,leaks};
   }
   const output=[];
   for(const c of cases){const doc=new DOMParser().parseFromString(c.svg,'image/svg+xml'),path=doc.querySelector('.target-outline');if(!path)throw Error(`No highlight ${c.id}/${c.target}`);const metrics=await check(c.shape,new XMLSerializer().serializeToString(path));output.push({id:c.id,target:c.target,...metrics})}
   // Regression control: old per-part strokes must actually fail this check.
   const cat=cases.find(c=>c.id==='cat'&&c.target===3);
   const old=await check(cat.shape,`<g fill="none" stroke="white" stroke-width="2.5" stroke-dasharray="6 5">${cat.shape}</g>`);
   return {output,old};
  },cases);
  assert.equal(results.output.length,64);
  for(const r of results.output){assert.ok(r.count>0,`No visible stroke: ${r.id}/${r.target}`);assert.equal(r.leaks,0,`Interior or incorrect contour: ${JSON.stringify(r)}`)}
  assert.ok(results.old.leaks>100,'Regression control must detect old cat interior boundaries');
  // Verify all targets in the real UI at desktop and phone viewport sizes.
  for(const viewport of [{width:1366,height:768},{width:375,height:667}]){
   await page.setViewportSize(viewport);await page.goto('http://127.0.0.1:8000/color-restoration/');
   for(const work of artworks){await page.locator('header [data-nav="gallery"]').click();await page.locator(`[data-work="${work.id}"]`).click();for(let target=0;target<work.colors.length;target++){await page.locator('#target').selectOption(String(target));assert.equal(await page.locator('.target-outline').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth))} }
   await page.locator('header [data-nav="gallery"]').click();await page.locator('[data-work="cat"]').click();await page.locator('#target').selectOption('3');await page.screenshot({path:`/tmp/atelier-outline-cat-${viewport.width}.png`});
  }
  const representatives=artworks.map(work=>{const target=work.id==='cat'?3:work.id==='greenhouse'?5:work.id==='vase'?3:work.id==='lighthouse'?3:work.id==='orchard'?4:work.id==='sail'?4:1;return `<section><p>${work.title} / ${work.regions[target]}</p>${painting(work,{target,highlight:true})}</section>`}).join('');
  await page.setViewportSize({width:1440,height:1000});await page.setContent(`<style>body{margin:20px;background:#171d20;color:#ddd;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;font:14px sans-serif}svg{width:100%;display:block}.target-outline{opacity:.85}p{margin:0 0 10px}</style>${representatives}`);await page.screenshot({path:'/tmp/atelier-outline-all.png',fullPage:true});
  console.log(`PASS: all 64 target unions have visible outer strokes and zero interior-boundary pixels; old cat strokes fail (${results.old.leaks} interior pixels); all 12 works/64 targets displayed without overflow at PC and phone sizes`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
