const BGM_URL=new URL('./assets/audio/Café Piano.mp3',import.meta.url).href;
export class AtelierAudio {
 constructor(settings){
  this.settings=settings;this.last=0;
  // One retained media element: navigating screens never resets the music.
  this.bgm=new Audio(BGM_URL);this.bgm.id='atelier-bgm';this.bgm.loop=true;
  this.bgm.preload='auto';this.bgm.hidden=true;document.body.append(this.bgm);
  this.bgm.addEventListener('error',()=>{});
 }
 unlock(){
  try{
   this.ctx??=new (window.AudioContext||window.webkitAudioContext)();
   if(!this.bgmGain){this.bgmGain=this.ctx.createGain();this.ctx.createMediaElementSource(this.bgm).connect(this.bgmGain).connect(this.ctx.destination)}
   this.ctx.resume().catch(()=>{});this.unlocked=true;
   // Invoke play directly within the gesture, including on Safari.
   this.apply();
  }catch{}
 }
 apply(){
  if(this.bgmGain)this.bgmGain.gain.setTargetAtTime(this.settings.bgmVolume/100,this.ctx.currentTime,.15);
  if(this.settings.bgmOn&&this.unlocked){if(this.bgm.paused)this.bgm.play().catch(()=>{})}else this.bgm.pause();
 }
 play(kind='button'){
  if(!this.ctx||!this.settings.sfxOn)return;
  const now=this.ctx.currentTime;if(kind==='slider'&&now-this.last<.09)return;this.last=now;
  const notes=kind==='complete'?[523.25,659.25,783.99]:kind==='display'?[784,1176]:kind==='slider'?[660+Math.random()*70]:[440];
  notes.forEach((freq,i)=>{const start=now+i*.1;[1,2.01,3.97].forEach((partial,j)=>{
   const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=freq*partial;
   g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime((kind==='slider'?.025:.055)*(this.settings.sfxVolume/50)/(j+1)**2,start+.008);
   g.gain.exponentialRampToValueAtTime(.0001,start+(kind==='button'?.16:.65));o.connect(g).connect(this.ctx.destination);o.start(start);o.stop(start+.7);
  })});
  if(this.bgmGain){this.bgmGain.gain.setTargetAtTime(this.settings.bgmVolume/100*.85,now,.08);clearTimeout(this.duck);this.duck=setTimeout(()=>this.apply(),650)}
 }
}
