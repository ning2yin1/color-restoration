export function hslToHex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l);const channel=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0')};return '#'+channel(0)+channel(8)+channel(4)}
export function oklab(hex){const rgb=hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const [r,g,b]=rgb;const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]}
// Euclidean OKLab distance (0–~1). Score = clamp(100 - distance * 250, 0, 100).
// Time and observation counts never affect the score. Adjust sensitivity here.
export const SCORE_SENSITIVITY=250;
export function score(a,b){const x=oklab(a),y=oklab(b);return Math.round(Math.max(0,Math.min(100,100-Math.hypot(...x.map((v,i)=>v-y[i]))*SCORE_SENSITIVITY))*10)/10}
export function verdict(n){return n>=95?'奇跡の修復':n>=85?'見事な修復':n>=70?'美しい仕上がり':n>=50?'個性的な色彩':'新たな解釈'}
