const CACHE='color-atelier-v2';
const FILES=['./','./index.html','./style.css','./script.js','./art.js','./color.js','./audio.js','./manifest.json','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
const BGM=new URL('./assets/audio/Café Piano.mp3',self.location).href;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.addAll(FILES);try{await cache.add(BGM)}catch{/* Missing music must not prevent offline game installation. */}}))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('color-atelier-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
async function mediaResponse(request){
 const cached=await caches.match(BGM);if(!cached)return fetch(request);
 const range=request.headers.get('range');if(!range)return cached;
 // Safari and other media players request byte ranges, including offline.
 const bytes=await cached.arrayBuffer(),match=/^bytes=(\d*)-(\d*)$/.exec(range);
 if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
 const start=match[1]?Number(match[1]):Math.max(0,bytes.byteLength-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(Number(match[2]),bytes.byteLength-1):bytes.byteLength-1;
 if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
 return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1)}});
}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.href===BGM){event.respondWith(mediaResponse(event.request).catch(()=>new Response('',{status:404})));return}
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)))}return response}).catch(async()=>await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match('./index.html'):new Response('',{status:404}))));
});
