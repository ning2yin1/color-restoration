const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/color-restoration/');
  await page.locator('[data-work="dusk"]').click();await page.locator('#mix').click();
  for(const [i,v] of [[0,'0'],[1,'100'],[2,'50']])await page.locator(`#hsl-${i}`).fill(v);
  await page.locator('#finish').click();const score=await page.locator('.result-score').innerText();
  await page.locator('.overlay-details summary').click();
  assert.deepEqual(await page.locator('.overlay-labels span').allTextContents(),['原画','あなたの修復画']);
  const snapshots=[];
  for(const width of [1366,375]){await page.setViewportSize({width,height:768});
   const labels=await page.locator('.overlay-labels span').all();const left=await labels[0].boundingBox(),right=await labels[1].boundingBox();assert.ok(left.x+left.width<right.x);
   for(const position of [0,25,50,75,100]){await page.locator('#compare').fill(String(position));assert.equal(await page.locator('.divider').evaluate(el=>el.style.left),`${position}%`);const file=`/tmp/atelier-compare-${width}-${position}.png`;await page.locator('.overlay').screenshot({path:file});snapshots.push({file,position})}
   await page.locator('#compare').fill('50');await page.locator('#compare').press('ArrowRight');assert.equal(await page.locator('#compare').inputValue(),'51');assert.equal(await page.locator('.divider').evaluate(el=>el.style.left),'51%');
  }
  // Inspect actual rendered pixels: original warm sky on the left, red repair on the right.
  execFileSync('python',['-c',`import json,sys\nfrom PIL import Image\nfor item in json.loads(sys.argv[1]):\n im=Image.open(item['file']).convert('RGB')\n for percent in (10,90):\n  actual=im.getpixel((int(im.width*percent/100),int(im.height*.1)))\n  expected=(216,163,137) if percent<item['position'] else (255,0,0)\n  assert actual==expected,(item,percent,actual,expected)\nprint('Rendered left/right pixels verified')`,JSON.stringify(snapshots)],{stdio:'inherit'});
  assert.equal(await page.locator('.result-score').innerText(),score);await page.locator('#display').click();await page.reload();await page.locator('[data-nav="collection"]').click();await page.locator('[data-record]').click();assert.equal(await page.locator('.result-score').innerText(),score);await page.locator('.overlay-details summary').click();assert.deepEqual(await page.locator('.overlay-labels span').allTextContents(),['原画','あなたの修復画']);
  console.log('PASS: original left / repair right at 0/25/50/75/100%; labels and keyboard direction at desktop/phone widths; saved score and restored comparison unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
