/* Gym Tracker – Zusatzfunktionen
   Muskel-Heatmap, Jahresrückblick, Streaks und Abzeichen, 1RM und Stärke-Level, Ghost-Modus,
   Scheiben-Rechner, Sprachsteuerung, Schnell-Training mit Supersätzen und teilbare Bilder.
   Alles wird aus den vorhandenen Daten berechnet. Das Datenformat der Trainings bleibt unverändert.
   Die Datei wird nach dem Hauptskript geladen. index.html ruft die Funktionen über window.GTX auf
   und läuft auch ohne diese Datei. */
(function(){
'use strict';

document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
tr.xgh td{padding:0 2px 5px;font-size:12px;color:var(--mut);text-align:left;font-variant-numeric:tabular-nums}
.xgb{margin-top:8px;font-size:13px;color:var(--mut)}
.xbar{height:6px;border-radius:3px;background:var(--card2);overflow:hidden;margin-top:4px}
.xbar i{display:block;height:100%;background:var(--acc);border-radius:3px}
.xbar.blue i{background:var(--blue)}
.chip.xrec{background:#4a1d1d;color:#fecaca;animation:xpulse 1s ease-in-out infinite}
@keyframes xpulse{50%{opacity:.55}}
.chip.xss{background:#172a45;color:var(--blue)}
.card.xssc{border-left:3px solid var(--blue)}
.card.xssa{margin-bottom:4px}
.xlvl{margin-top:8px;font-size:14px}
.xheat{display:flex;gap:10px;align-items:center}
.xheat svg{width:56%;max-width:260px;flex:none}
.xheat .grow div.m{display:flex;justify-content:space-between;font-size:13px;margin-top:5px}
.xleg{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:10px}
.xleg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
.xbadges{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.xbadge{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center;font-size:12px;color:var(--mut)}
.xbadge b{display:block;color:var(--txt);font-size:13px;margin:2px 0}
.xbadge .ic{font-size:28px;line-height:1.2}
.xbadge.off{opacity:.5}
.xbadge.off .ic{filter:grayscale(1)}
.xbadge.on{border-color:#245c38}
.xw{border-radius:16px;padding:18px 16px;margin-top:10px;color:#fff}
.xw small{display:block;font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.xw b{display:block;font-size:34px;line-height:1.15;margin:4px 0}
.xw span{font-size:15px;opacity:.95}
.xplates{display:flex;align-items:center;justify-content:center;gap:3px;height:120px;margin:12px 0;background:var(--card);border-radius:12px;overflow:hidden}
.xplates .bar{height:10px;width:46px;background:#9aa3b2;border-radius:2px}
.xplates .col{height:26px;width:10px;background:#9aa3b2;border-radius:2px}
.xplates .pl{width:15px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#111;writing-mode:vertical-rl}
.xq{border-top:1px solid var(--line);padding:9px 0;font-size:15px}
.xq:first-child{border-top:0}
`}));

const X={heat:'w',voice:null,rec:null,share:null,year:null};
const big=n=>Math.round(n).toLocaleString('de-CH');
const pl=(n,one,many)=>(typeof n==='number'?big(n):n)+' '+(+n===1?one:many);
const gymTime=min=>min<90?pl(Math.round(min),'Minute','Minuten'):(min>=600?Math.round(min/60):Math.round(min/6)/10)+' Stunden';
const musOf=e=>e.muscle||exInfo(e.exId).muscle||'';
const bodyKg=()=>{ const E=S.body.entries; return E.length?+E[E.length-1].kg||null:null };
const REFW=weekStart(new Date(2024,0,1)).getTime();
const weekIdx=d=>Math.round((weekStart(new Date(d)).getTime()-REFW)/6048e5);

/* ================= Statistik über alle Trainings (zwischengespeichert) ================= */
let cache={key:null,val:null};
function stats(){ if(cache.key===S.sessions) return cache.val;
  const asc=[...S.sessions].filter(s=>!isNaN(new Date(s.date))).sort((a,b)=>a.date<b.date?-1:1);
  const weeks=new Map(), weekMus=new Map(), best={}, exIds=new Set();
  let prs=0, ton=0, maxKg=0, sets=0, cardioMin=0, early=false, late=false;
  asc.forEach(s=>{ const d=new Date(s.date), wi=weekIdx(d), h=d.getHours(); weeks.set(wi,(weeks.get(wi)||0)+1);
    if(h<8) early=true; if(h>=21) late=true;
    (s.entries||[]).forEach(e=>{ if(e.cardio){ cardioMin+=+e.cardio.min||0; return } if(!e.sets||!e.sets.length) return;
      exIds.add(e.exId); const m=musOf(e); if(m){ if(!weekMus.has(wi)) weekMus.set(wi,new Set()); weekMus.get(wi).add(m) }
      let top=0; e.sets.forEach(st=>{ sets++; ton+=setVol(st); maxKg=Math.max(maxKg,+st.kg||0); top=Math.max(top,e1rm(st)) });
      if(best[e.exId]!=null&&top>best[e.exId]+0.01) prs++;
      best[e.exId]=Math.max(best[e.exId]||0,top) }) });
  const st=streaks([...weeks.keys()]);
  cache={key:S.sessions,val:{n:asc.length,ton,maxKg,sets,prs,cardioMin,early,late,exN:exIds.size,
    weekMax:Math.max(0,...weeks.values()),musMax:Math.max(0,...[...weekMus.values()].map(x=>x.size)),bodyN:S.body.entries.length,...st}};
  return cache.val }
function streaks(idx){ const set=new Set(idx), sorted=[...set].sort((a,b)=>a-b); let longest=0, run=0, prev=null;
  sorted.forEach(w=>{ run=prev!=null&&w===prev+1?run+1:1; longest=Math.max(longest,run); prev=w });
  const now=weekIdx(new Date()); let cur=0, w=set.has(now)?now:now-1; while(set.has(w)){ cur++; w-- }
  return {streak:cur,longest,thisWeek:set.has(now)} }

/* ================= Streaks und Abzeichen ================= */
const BADGES=[
 ['n1','🎬','Erster Schritt','1 Training',s=>[s.n,1]],
 ['n10','🔟','Dranbleiber','10 Trainings',s=>[s.n,10]],
 ['n25','🥉','Routine','25 Trainings',s=>[s.n,25]],
 ['n50','🥈','Halbes Hundert','50 Trainings',s=>[s.n,50]],
 ['n100','🥇','Hunderter-Club','100 Trainings',s=>[s.n,100]],
 ['n250','👑','Legende','250 Trainings',s=>[s.n,250]],
 ['st2','🔥','Zwei am Stück','2 Wochen in Folge',s=>[s.longest,2]],
 ['st4','🔥','Ein Monat','4 Wochen in Folge',s=>[s.longest,4]],
 ['st8','🔥','Zwei Monate','8 Wochen in Folge',s=>[s.longest,8]],
 ['st12','🔥','Ein Quartal','12 Wochen in Folge',s=>[s.longest,12]],
 ['st26','🔥','Halbes Jahr','26 Wochen in Folge',s=>[s.longest,26]],
 ['st52','🔥','Ganzes Jahr','52 Wochen in Folge',s=>[s.longest,52]],
 ['w3','📅','Dreierpack','3 Trainings in einer Woche',s=>[s.weekMax,3]],
 ['w4','📅','Viererpack','4 Trainings in einer Woche',s=>[s.weekMax,4]],
 ['w5','📅','Fünferpack','5 Trainings in einer Woche',s=>[s.weekMax,5]],
 ['kg50','🏋️','Erste 50 kg','Ein Satz mit 50 kg',s=>[s.maxKg,50]],
 ['kg100','🏋️','Erste 100 kg','Ein Satz mit 100 kg',s=>[s.maxKg,100]],
 ['kg150','🏋️','Erste 150 kg','Ein Satz mit 150 kg',s=>[s.maxKg,150]],
 ['kg200','🏋️','Erste 200 kg','Ein Satz mit 200 kg',s=>[s.maxKg,200]],
 ['t10','🚗','10 Tonnen','10 t insgesamt bewegt',s=>[s.ton/1000,10]],
 ['t50','🚚','50 Tonnen','50 t insgesamt bewegt',s=>[s.ton/1000,50]],
 ['t100','🐘','100 Tonnen','100 t insgesamt bewegt',s=>[s.ton/1000,100]],
 ['t250','🐋','250 Tonnen','250 t insgesamt bewegt',s=>[s.ton/1000,250]],
 ['t500','🚀','500 Tonnen','500 t insgesamt bewegt',s=>[s.ton/1000,500]],
 ['t1000','🏔️','1000 Tonnen','1000 t insgesamt bewegt',s=>[s.ton/1000,1000]],
 ['pr1','🏆','Erster Rekord','1 Rekord gebrochen',s=>[s.prs,1]],
 ['pr10','🏆','Rekordjäger','10 Rekorde gebrochen',s=>[s.prs,10]],
 ['pr25','🏆','Rekordsammler','25 Rekorde gebrochen',s=>[s.prs,25]],
 ['pr50','🏆','Rekordmaschine','50 Rekorde gebrochen',s=>[s.prs,50]],
 ['c60','❤️','Warm gelaufen','60 Min. Cardio',s=>[s.cardioMin,60]],
 ['c300','❤️','Ausdauer','300 Min. Cardio',s=>[s.cardioMin,300]],
 ['c1000','❤️','Marathon-Herz','1000 Min. Cardio',s=>[s.cardioMin,1000]],
 ['early','🌅','Frühaufsteher','Training vor 8 Uhr beendet',s=>[s.early?1:0,1]],
 ['late','🌙','Nachteule','Training nach 21 Uhr beendet',s=>[s.late?1:0,1]],
 ['ex20','🧭','Entdecker','20 verschiedene Übungen',s=>[s.exN,20]],
 ['mus','🧩','Rundum','Alle '+MUSCLES.length+' Muskelgruppen in einer Woche',s=>[s.musMax,MUSCLES.length]],
 ['bw10','⚖️','Waagen-Profi','10-mal Körpergewicht eingetragen',s=>[s.bodyN,10]],
];
function badges(){ const s=stats(); return BADGES.map(([id,icon,name,desc,f])=>{ const [v,t]=f(s); return {id,icon,name,desc,v,t,on:v>=t} }) }
function badgeIds(){ return badges().filter(b=>b.on).map(b=>b.id) }
function vHomeX(){ if(!S.sessions.length) return ''; const s=stats(), B=badges(), on=B.filter(b=>b.on).length;
  const next=B.filter(b=>!b.on&&b.t>1).sort((a,b)=>b.v/b.t-a.v/a.t)[0];
  let h=`<div class="card" data-act="x-badges" style="cursor:pointer"><div class="between"><div><div class="muted">Serie</div><div class="big" style="margin:0">${s.streak?'🔥 '+pl(s.streak,'Woche','Wochen'):'Noch keine Serie'}</div></div>
    <div style="text-align:right"><div class="muted">Abzeichen</div><div style="font-size:22px;font-weight:700">🏅 ${on}/${B.length}</div></div></div>
    <div class="muted" style="margin-top:6px">${s.streak&&!s.thisWeek?'Diese Woche noch kein Training. Ein Training hält die Serie am Leben.':s.streak?'Längste Serie: '+pl(s.longest,'Woche','Wochen')+'.':'Trainiere diese Woche, um eine Serie zu starten.'}</div>
    ${next?`<div class="muted" style="margin-top:8px;font-size:13px">Als Nächstes: ${next.icon} ${esc(next.name)} (${fmtProg(next)})</div><div class="xbar"><i style="width:${Math.min(100,100*next.v/next.t)}%"></i></div>`:''}</div>`;
  const now=new Date(), m=now.getMonth(), y=m===0?now.getFullYear()-1:now.getFullYear();
  if((m===11||m===0)&&S.sessions.filter(x=>new Date(x.date).getFullYear()===y).length>=5)
    h+=`<div class="card between" style="background:linear-gradient(120deg,#3b1d6e,#14532d);border:0"><span><b>🎁 Dein Jahresrückblick ${y}</b><br><span style="font-size:14px;opacity:.85">Tonnage, Lieblingsübung, Rekorde</span></span><button class="btn sm" data-act="x-wrapped" data-y="${y}">Ansehen</button></div>`;
  return h }
const fmtProg=b=>(b.t>=10?big(Math.min(b.v,b.t)):Math.floor(Math.min(b.v,b.t)))+'/'+b.t;
function vBadges(){ const s=stats(), B=badges();
  return panel('Serie und Abzeichen',`<div class="row" style="margin-top:6px"><div class="stat"><b>${s.streak}</b><span class="muted">Wochen in Folge</span></div><div class="stat"><b>${s.longest}</b><span class="muted">Längste Serie</span></div><div class="stat"><b>${B.filter(b=>b.on).length}/${B.length}</b><span class="muted">Abzeichen</span></div></div>
    <div class="muted" style="margin-top:8px">Eine Woche zählt, sobald du mindestens einmal trainiert hast.</div>
    <div class="xbadges">${B.map(b=>`<div class="xbadge ${b.on?'on':'off'}"><div class="ic">${b.icon}</div><b>${esc(b.name)}</b>${esc(b.desc)}${b.on||b.t<=1?'':`<div class="xbar"><i style="width:${Math.min(100,100*b.v/b.t)}%"></i></div>${fmtProg(b)}`}</div>`).join('')}</div>`) }
function vSummaryX(s){ let h=''; const pre=s.preBadges;
  if(pre){ const nw=badges().filter(b=>b.on&&!pre.includes(b.id));
    if(nw.length) h+=`<div style="text-align:left;margin-top:12px"><div class="muted" style="margin-bottom:4px">Neue Abzeichen 🏅</div>${nw.map(b=>`<div class="badge pr" style="margin-right:6px">${b.icon} ${esc(b.name)}</div>`).join('')}</div>` }
  const st=stats(); if(st.streak>1) h+=`<div class="muted" style="margin-top:12px">🔥 ${st.streak} Wochen in Folge</div>`;
  if(s.prs&&s.prs.length) h+=`<div class="row" style="margin-top:12px;justify-content:center">${s.prs.map((p,k)=>`<button class="btn sm ghost" data-act="x-share-pr" data-k="${k}">📤 ${s.prs.length>1?esc(p.name):'Rekord teilen'}</button>`).join('')}</div>`;
  return h }

/* ================= Geschätztes 1RM und Stärke-Level ================= */
/* Grobe Richtwerte als Vielfaches des Körpergewichts: Einsteiger, Fortgeschritten, Sehr fortgeschritten, Elite.
   Kurzhantel-Übungen pro Hantel. Maschinen unterscheiden sich stark, die Einordnung ist nur eine Orientierung. */
const STD={bench:[.75,1.25,1.75,2],incline_bench:[.75,1,1.5,1.75],close_bench:[.75,1,1.5,1.75],db_bench:[.3,.45,.6,.8],incline_db:[.3,.4,.55,.7],
 chest_press:[.75,1.25,1.75,2.25],ohp:[.55,.8,1.1,1.4],db_ohp:[.25,.35,.5,.6],shoulder_press_m:[.5,.85,1.25,1.65],lat_raise_db:[.1,.2,.3,.4],
 squat:[1.25,1.5,2.25,2.75],hack_squat:[1.25,2,2.75,3.5],leg_press:[1.75,2.75,4,5],leg_ext:[.75,1.25,1.75,2.25],
 deadlift:[1.5,2,2.5,3],rdl_bb:[1,1.5,2,2.5],rdl:[.35,.5,.7,.9],hip_thrust:[1,1.75,2.5,3.5],leg_curl:[.5,.75,1.1,1.5],seated_leg_curl:[.5,.75,1.1,1.5],
 lat_pulldown:[.75,1,1.5,1.75],lat_pulldown_close:[.75,1,1.5,1.75],row_close:[.75,1,1.5,1.75],row_wide:[.75,1,1.5,1.75],tbar_row:[.75,1,1.5,1.75],db_row:[.35,.55,.75,1],
 ez_curl:[.4,.6,.85,1.1],db_curl:[.15,.3,.45,.6],hammer:[.15,.3,.45,.6],tri_pushdown:[.45,.7,1,1.35],tri_rope:[.4,.6,.9,1.2]};
const LEVELS=['Anfänger','Einsteiger','Fortgeschritten','Sehr fortgeschritten','Elite'];
const oneRm=st=>st&&+st.kg>0?Math.round(e1rm(st)*2)/2:null;
function level(exId,rm){ const t=STD[exId], bw=bodyKg(); if(!t||!bw||!rm) return null;
  const th=t.map(x=>x*bw*(ST().sex==='w'?0.6:1)); let li=0; th.forEach((v,k)=>{ if(rm>=v) li=k+1 });
  const lo=li?th[li-1]:0, hi=li<4?th[li]:null;
  return {li,name:LEVELS[li],next:hi?LEVELS[li+1]:null,missing:hi?Math.max(0.5,Math.ceil((hi-rm)*2)/2):0,pct:hi?Math.max(0,Math.min(100,100*(rm-lo)/(hi-lo))):100} }
function vProgExtra(id,pr){ const rm=oneRm(pr&&pr.best); if(!rm) return '';
  const L=level(id,rm);
  let h=`<div class="xlvl"><div class="between"><span class="muted">Geschätztes 1RM <b style="color:var(--txt)">${rm} kg</b></span>${L?`<span class="chip hl">${L.name}</span>`:''}</div>`;
  if(L) h+=`<div class="xbar blue"><i style="width:${L.pct}%"></i></div><div class="muted" style="font-size:13px;margin-top:3px">${L.next?`Noch ${L.missing} kg bis «${L.next}»`:'Höchste Stufe erreicht'}</div>`;
  else if(STD[id]&&!bodyKg()) h+=`<div class="muted" style="font-size:13px;margin-top:3px">Trag oben dein Körpergewicht ein, dann siehst du dein Stärke-Level.</div>`;
  return h+'</div>' }
function vProgDetails(id,pr){ const rm=oneRm(pr&&pr.best); if(!rm) return '';
  const step=+ST().step||2.5, at=r=>Math.floor(rm/(1+r/30)/step)*step;
  return `<div class="muted" style="margin-top:10px;font-size:13px">Aus dem 1RM abgeleitet: ${[3,5,8,10,12].map(r=>`${r} Wdh. ≈ <span style="color:var(--txt)">${r2(at(r))} kg</span>`).join(' · ')}</div>
    <div class="tools"><button class="btn xs ghost" data-act="x-share-best" data-id="${esc(id)}">📤 Rekord als Bild</button></div>` }
function infoChips(id,best){ const rm=oneRm(best&&best.st); if(!rm) return ''; const L=level(id,rm);
  return `<span class="chip hl">1RM ≈ ${rm} kg</span>${L?`<span class="chip hl">${L.name}</span>`:''}` }

/* ================= Muskel-Heatmap ================= */
const HEATMODES={w:'Diese Woche',lw:'Letzte Woche',m:'Ø 4 Wochen'};
function muscleSets(mode){ const ws=weekStart().getTime(), W=6048e5;
  const from=mode==='w'?ws:mode==='lw'?ws-W:Date.now()-4*W, to=mode==='lw'?ws:Infinity, div=mode==='m'?4:1, out={};
  MUSCLES.forEach(m=>out[m]=0);
  S.sessions.forEach(s=>{ const t=new Date(s.date).getTime(); if(!(t>=from&&t<to)) return;
    (s.entries||[]).forEach(e=>{ if(!e.sets) return; const m=musOf(e); if(m in out) out[m]+=e.sets.length/div }) });
  return out }
const heatCol=n=>n<=0?'#303644':n<5?'#1c5b39':n<10?'#2c9a59':'#4ade80';
function bodySVG(v){ const c=m=>`fill="${heatCol(v[m])}" data-act="x-heat-m" data-m="${esc(m)}"`, base='fill="#232833"';
  const fig=(cx,back)=>{ const el=(dx,cy,rx,ry,m,rot)=>[-1,1].map(sg=>`<ellipse cx="${cx+sg*dx}" cy="${cy}" rx="${rx}" ry="${ry}" ${m?c(m):base}${rot?` transform="rotate(${sg*rot} ${cx+sg*dx} ${cy})"`:''}/>`).join('');
    let h=`<circle cx="${cx}" cy="15" r="10" ${base}/><rect x="${cx-4}" y="23" width="8" height="10" ${base}/>
      <path d="M${cx-23},35 Q${cx},28 ${cx+23},35 L${cx+18},72 L${cx+17},108 Q${cx},114 ${cx-17},108 L${cx-18},72 Z" ${base}/>`;
    h+=el(30,58,5.5,13,null,8)+el(35,88,4.5,15,null,6)+el(37,107,4,5)+el(10,140,9,28)+el(9,194,6.5,24)+el(9,222,6,4);
    h+=el(25,39,7.5,6.5,'Schultern');
    if(!back){ h+=el(9.5,48,9,7.5,'Brust')+el(30,57,4.6,10.5,'Bizeps',8)
        +`<rect x="${cx-8.5}" y="59" width="17" height="40" rx="6" ${c('Bauch')}/><path d="M${cx},61 V97 M${cx-8},72 H${cx+8} M${cx-8},84 H${cx+8}" stroke="#171a21" stroke-width="1.2" fill="none" pointer-events="none"/>`
        +el(10,138,7.5,23,'Beine')+el(9,192,4.6,17,'Waden') }
    else { h+=`<path d="M${cx-17},34 Q${cx},29 ${cx+17},34 L${cx+17},66 Q${cx+12},86 ${cx},96 Q${cx-12},86 ${cx-17},66 Z" ${c('Rücken')}/><path d="M${cx},34 V94" stroke="#171a21" stroke-width="1.2" pointer-events="none"/>`
        +el(30,57,4.6,10.5,'Trizeps',8)+el(8.5,112,8.5,9,'Beinbeuger & Po')+el(10,144,7,19,'Beinbeuger & Po')+el(9,191,5.6,17,'Waden') }
    return h+`<text x="${cx}" y="240" text-anchor="middle" font-size="9" fill="#8b93a3">${back?'hinten':'vorne'}</text>` };
  return `<svg viewBox="0 0 200 244" role="img" aria-label="Muskel-Heatmap">${fig(52,false)}${fig(148,true)}</svg>` }
function vHeat(){ const v=muscleSets(X.heat), list=MUSCLES.map(m=>[m,v[m]]).sort((a,b)=>b[1]-a[1]), zero=list.filter(x=>x[1]<=0).map(x=>x[0]);
  const f=n=>Number.isInteger(n)?n:n.toFixed(1);
  return `<div class="sec">Muskeln</div><div class="card"><div class="seg" style="margin-top:0">${Object.entries(HEATMODES).map(([k,l])=>`<button class="${X.heat===k?'on':''}" data-act="x-heat" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="xheat" style="margin-top:10px">${bodySVG(v)}<div class="grow">${list.map(([m,n])=>`<div class="m"><span>${esc(m)}</span><span style="color:${n>0?'var(--txt)':'var(--mut)'}">${f(n)}</span></div><div class="xbar"><i style="width:${Math.min(100,n*10)}%;background:${heatCol(n)}"></i></div>`).join('')}</div></div>
    <div class="xleg"><span><i style="background:${heatCol(0)}"></i>0</span><span><i style="background:${heatCol(1)}"></i>1–4</span><span><i style="background:${heatCol(5)}"></i>5–9</span><span><i style="background:${heatCol(10)}"></i>10+ Sätze${X.heat==='m'?' pro Woche':''}</span></div>
    <div class="muted" style="margin-top:8px;font-size:13px">${zero.length&&zero.length<MUSCLES.length?'Noch offen: '+zero.map(esc).join(', ')+'. ':''}Gezählt wird der Hauptmuskel jeder Übung. Als Richtwert gelten etwa 10 bis 20 Sätze pro Muskel und Woche.</div></div>` }
function vProgressTop(){ if(!S.sessions.length) return '';
  const y=new Date().getFullYear();
  return `<div class="row" style="margin-bottom:4px"><button class="btn sm" style="flex:1" data-act="x-badges">🏅 Abzeichen</button><button class="btn sm" style="flex:1" data-act="x-wrapped" data-y="${y}">🎁 Jahresrückblick</button></div>`+vHeat() }

/* ================= Ghost-Modus ================= */
const ghostOn=()=>ST().ghost!==false;
function ghostTxt(it,r,ls){ let h='👻 '+fmtSet(ls); const reps=num(r.reps); if(reps==null) return h;
  const cur={kg:num(r.kg)??(+ls.kg||0),reps}; if(it.uni) cur.repsR=num(r.repsR)??reps;
  const a=e1rm(cur), b=e1rm(ls), dk=r2(cur.kg-(+ls.kg||0)), dr=effReps(cur)-effReps(ls), p=[];
  if(dk) p.push((dk>0?'+':'')+dk+' kg'); if(dr) p.push((dr>0?'+':'')+dr+' Wdh.');
  return h+(a>b+.01?` <span class="up">▲ ${p.join(' · ')}</span>`:a<b-.01?` <span class="down">▼ ${p.join(' · ')}</span>`:' <span style="color:var(--txt)">= gleich stark</span>') }
function ghostRow(i,j,it,r,last){ const ls=ghostOn()&&last&&last.sets[j]; if(!ls) return '';
  return `<tr class="xgh"><td></td><td colspan="${it.uni?4:3}" id="gh${i}_${j}">${ghostTxt(it,r,ls)}</td></tr>` }
function ghostBarInner(it,last){ const useVol=last.sets.some(s=>+s.kg>0), val=s=>useVol?setVol(s):(+s.reps||0)+(+s.repsR||0);
  const g=last.sets.slice(0,Math.max(1,it.rows.length)).reduce((a,s)=>a+val(s),0); if(!g) return '';
  const me=it.rows.reduce((a,r)=>{ const reps=num(r.reps); if(reps==null) return a; const s={kg:num(r.kg)||0,reps}; if(it.uni) s.repsR=num(r.repsR)??reps; return a+val(s) },0);
  const u=useVol?' kg':' Wdh.', d=Math.round(me-g);
  return `<div class="between"><span>👻 ${useVol?'Volumen':'Wiederholungen'} gegen letztes Mal</span><span style="color:${me>=g?'var(--acc)':'var(--txt)'}">${me>=g?(d>0?'Geschlagen 🎉 +'+big(d)+u:'Gleichstand'):big(me)+' / '+big(g)+u}</span></div><div class="xbar"><i style="width:${Math.min(100,100*me/g)}%"></i></div>` }
function ghostBar(i,it,last){ if(!ghostOn()||!last) return ''; return `<div class="xgb" id="gb${i}">${ghostBarInner(it,last)}</div>` }
function ghostLive(t){ const ds=t.dataset; if(!ds.f||!S.draft||!ghostOn()) return; const i=+ds.i, j=+ds.j, it=S.draft.items[i]; if(!it||!it.rows) return;
  const last=lastFor(it.exId); if(!last) return;
  const c=$('gh'+i+'_'+j); if(c&&last.sets[j]) c.innerHTML=ghostTxt(it,it.rows[j],last.sets[j]);
  const b=$('gb'+i); if(b) b.innerHTML=ghostBarInner(it,last) }

/* ================= Supersätze ================= */
function ssPartner(i){ const I=S.draft&&S.draft.items, it=I&&I[i]; if(!it||!it.ss) return -1;
  if(I[i+1]&&I[i+1].ss===it.ss) return i+1; if(I[i-1]&&I[i-1].ss===it.ss) return i-1; return -1 }
function cardCls(i){ const p=ssPartner(i); return p<0?'':' xssc'+(p>i?' xssa':'') }
function ssSkip(i){ const p=ssPartner(i); if(p!==i+1) return ''; const n=S.draft.items[p];
  if(!n.rows||n.rows.every(r=>r.done)) return ''; toast('Supersatz: direkt weiter mit '+n.name); return true }
function ssToggle(i){ const I=S.draft.items; if(ssPartner(i)>=0){ const p=ssPartner(i); delete I[i].ss; delete I[p].ss }
  else if(I[i+1]&&I[i+1].kind==='s'){ const q=ssPartner(i+1); if(q>=0){ delete I[q].ss } const id='s'+Date.now().toString(36); I[i].ss=id; I[i+1].ss=id; toast('Supersatz: Pause erst nach der zweiten Übung') }
  saveDraft(); render() }
function exTools(i,it){ const I=S.draft.items, p=ssPartner(i);
  if(p>=0) return p>i?`<button class="btn xs ghost on" data-act="x-ss" data-i="${i}">⛓ Supersatz lösen</button>`:'';
  return I[i+1]&&I[i+1].kind==='s'&&ssPartner(i+1)<0?`<button class="btn xs ghost" data-act="x-ss" data-i="${i}">⛓ Supersatz</button>`:'' }

/* ================= Sprachsteuerung ================= */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const UNITS={null:0,ein:1,eins:1,eine:1,einen:1,zwei:2,zwo:2,drei:3,vier:4,fünf:5,funf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,elf:11,zwölf:12,zwolf:12,
 dreizehn:13,vierzehn:14,fünfzehn:15,sechzehn:16,siebzehn:17,achtzehn:18,neunzehn:19};
const TENS={zwanzig:20,dreissig:30,vierzig:40,fünfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90};
function wordNum(w){ if(w in UNITS) return UNITS[w]; if(w in TENS) return TENS[w];
  let m=w.match(/^(.*)einhalb$/); if(m){ const a=m[1]?wordNum(m[1]):0; return a==null?null:a+.5 }
  m=w.match(/^(.*)hundert(.*)$/); if(m){ const a=m[1]?wordNum(m[1]):1, b=m[2]?wordNum(m[2].replace(/^und/,'')):0; return a==null||b==null?null:a*100+b }
  m=w.match(/^(.+)und(.+)$/); if(m&&m[1] in UNITS&&m[2] in TENS) return UNITS[m[1]]+TENS[m[2]];
  return null }
function parseVoice(text){ let t=' '+String(text||'').toLowerCase().replace(/ß/g,'ss').replace(/[.!?;:]+(\s|$)/g,' ').replace(/(\d)\s*,\s*(\d)/g,'$1.$2')+' ';
  t=t.split(/\s+/).map(w=>{ const n=wordNum(w); return n==null?w:String(n) }).join(' ');
  t=' '+t.replace(/(\d+)\s*(?:komma|punkt)\s*(\d+)/g,'$1.$2').replace(/(\d+)\s+0\.5(?!\d)/g,(m,a)=>String(+a+.5))+' ';
  const out={}, N='(\\d+(?:\\.\\d+)?)', take=re=>{ const m=t.match(re); if(!m) return null; t=t.replace(m[0],' '); return m };
  let m;
  if(/\b(gleich|nochmal|noch einmal|wie vorher|wie letztes mal|dasselbe)\b/.test(t)) out.same=true;
  if(m=take(new RegExp('links\\s*'+N))) out.reps=+m[1]; else if(m=take(new RegExp(N+'\\s*links'))) out.reps=+m[1];
  if(m=take(new RegExp('rechts\\s*'+N))) out.repsR=+m[1]; else if(m=take(new RegExp(N+'\\s*rechts'))) out.repsR=+m[1];
  if(m=take(new RegExp(N+'\\s*(?:kg|kilo\\w*)'))) out.kg=+m[1];
  if(out.reps==null&&(m=take(new RegExp(N+'\\s*(?:wiederholung\\w*|wdh\\w*|reps?|stück)')))) out.reps=+m[1];
  if(out.kg==null&&out.reps==null&&(m=take(new RegExp(N+'\\s*(?:mal|x|×)\\s*'+N)))){ out.kg=+m[1]; out.reps=+m[2] }
  if(out.reps==null&&(m=take(new RegExp(N+'\\s*mal\\b')))) out.reps=+m[1];
  const rest=(t.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
  if(out.kg==null&&out.reps==null){ if(rest.length>=2){ out.kg=rest[0]; out.reps=rest[1] } else if(rest.length===1) out.reps=rest[0] }
  else if(out.reps==null&&rest.length) out.reps=rest[0];
  else if(out.kg==null&&rest.length) out.kg=rest[0];
  if(out.reps!=null) out.reps=Math.round(out.reps); if(out.repsR!=null) out.repsR=Math.round(out.repsR);
  if(out.kg!=null&&(out.kg<0||out.kg>999)) delete out.kg; if(out.reps!=null&&(out.reps<1||out.reps>200)) delete out.reps;
  return out.kg!=null||out.reps!=null||out.same?out:null }
function voiceApply(i,p){ const D=S.draft, it=D&&D.items[i]; if(!it||!it.rows) return;
  let j=it.rows.findIndex(r=>!r.done); if(j<0){ const l=it.rows[it.rows.length-1]; it.rows.push({kg:l?l.kg:'',reps:'',repsR:'',done:false}); j=it.rows.length-1 }
  const r=it.rows[j]; if(p.kg!=null) r.kg=String(p.kg); if(p.reps!=null) r.reps=String(p.reps);
  if(it.uni){ if(p.repsR!=null) r.repsR=String(p.repsR); else if(p.reps!=null) r.repsR=String(p.reps) }
  saveDraft(); render();
  if(p.reps==null&&!p.same){ toast(p.kg+' kg eingetragen. Wiederholungen fehlen noch.'); return }
  if(ST().voiceDone!==false){ const b=document.querySelector(`[data-act="done"][data-i="${i}"][data-j="${j}"]`); if(b) b.click() }
  const rr=it.rows[j]; toast(`Satz ${j+1}: ${rr.kg||0} kg × ${rr.reps}${it.uni?'/'+rr.repsR:''}${rr.done?' ✓':''}`) }
function voiceStart(i){ if(!SR){ toast('Spracherkennung wird hier nicht unterstützt'); return }
  if(X.rec){ try{X.rec.abort()}catch(e){} X.rec=null; const same=X.voice===i; X.voice=null; if(same){ render(); return } }
  let rec; try{ rec=new SR() }catch(e){ toast('Spracherkennung nicht verfügbar'); return }
  rec.lang='de-DE'; rec.interimResults=false; rec.maxAlternatives=4; let got=false;
  rec.onresult=ev=>{ const res=ev.results[ev.results.length-1]; let p=null, heard='';
    for(let k=0;k<res.length&&!p;k++){ heard=heard||res[k].transcript; p=parseVoice(res[k].transcript) }
    got=true; if(p) voiceApply(i,p); else toast('Nicht verstanden: «'+heard+'»') };
  rec.onerror=ev=>{ got=true; toast({'not-allowed':'Mikrofon ist blockiert. Bitte in den Browser-Einstellungen erlauben.','service-not-allowed':'Spracherkennung ist auf diesem Gerät ausgeschaltet.','network':'Die Spracherkennung braucht hier eine Internetverbindung.','no-speech':'Nichts gehört. Sag z. B. «80 Kilo, 8 Wiederholungen».','audio-capture':'Kein Mikrofon gefunden.'}[ev.error]||'Spracherkennung fehlgeschlagen') };
  rec.onend=()=>{ if(X.rec===rec){ X.rec=null; X.voice=null; render() } };
  try{ rec.start(); X.rec=rec; X.voice=i; render() }catch(e){ toast('Spracherkennung konnte nicht starten') } }

/* ================= Scheiben-Rechner ================= */
const PLATE_IDS=['bench','incline_bench','close_bench','ohp','skullcrusher','squat','deadlift','rdl_bb','hip_thrust','tbar_row','ez_curl','leg_press','hack_squat','calf_press'];
const BAR_DEF={ez_curl:10,skullcrusher:10,leg_press:0,hack_squat:0,tbar_row:0,calf_press:0};
const PLATE_COL={25:'#ef4444',20:'#3b82f6',15:'#facc15',10:'#22c55e',5:'#f1f5f9',2.5:'#94a3b8',1.25:'#cbd5e1'};
const plateList=()=>{ const l=(Array.isArray(ST().plates)?ST().plates:[25,20,15,10,5,2.5,1.25]).map(Number).filter(x=>x>0); return [...new Set(l)].sort((a,b)=>b-a) };
const barFor=ex=>{ const b=ST().bars&&ST().bars[ex]; return b!=null?+b:(ex in BAR_DEF?BAR_DEF[ex]:(ST().barKg!=null?+ST().barKg:20)) };
function plateCalc(total,bar,plates){ const U=x=>Math.round(x*100), side=U(total-bar)/2;
  if(!(total>0)||side<0) return {err:total>0?'Das Ziel ist leichter als die Stange.':'Gewicht eingeben.'};
  if(!plates.length) return {err:'Keine Scheiben eingestellt.'};
  const P=plates.map(U), g=P.reduce((a,b)=>{ while(b){ [a,b]=[b,a%b] } return a }), max=Math.floor(side/g);
  const cnt=new Int32Array(max+1).fill(1e9), via=new Int32Array(max+1).fill(-1); cnt[0]=0;
  for(let v=1;v<=max;v++) P.forEach((p,k)=>{ const q=p/g; if(q<=v&&cnt[v-q]+1<cnt[v]){ cnt[v]=cnt[v-q]+1; via[v]=k } });
  let v=max; while(v>0&&cnt[v]>=1e9) v--;
  const used=[]; for(let w=v;w>0;w-=P[via[w]]/g) used.push(plates[via[w]]);
  used.sort((a,b)=>b-a); const real=r2(bar+2*v*g/100);
  return {side:used,total:real,exact:Math.abs(real-total)<0.001} }
function platesOut(){ const M=S.modal, kg=num(M.kg), bar=M.bar, r=plateCalc(kg,bar,plateList());
  if(r.err) return `<div class="muted" style="padding:14px 0">${r.err}</div>`;
  const mx=Math.max(...plateList(),1), pl=p=>`<div class="pl" style="height:${Math.round(34+66*Math.sqrt(p/mx))}px;background:${PLATE_COL[p]||'#a78bfa'}">${p}</div>`;
  const cnt={}; r.side.forEach(p=>cnt[p]=(cnt[p]||0)+1);
  return `<div class="xplates">${[...r.side].reverse().map(pl).join('')}<div class="col"></div><div class="bar"></div><div class="col"></div>${r.side.map(pl).join('')}</div>
    <div style="font-size:18px;font-weight:700;text-align:center">${r.side.length?'Pro Seite: '+Object.keys(cnt).map(Number).sort((a,b)=>b-a).map(p=>(cnt[p]>1?cnt[p]+'× ':'')+p).join(' + ')+' kg':'Nur die Stange, keine Scheiben'}</div>
    <div class="muted" style="text-align:center;margin-top:4px">${bar?bar+' kg Stange':'ohne Stangengewicht'} + 2 × ${r2((r.total-bar)/2)} kg = <b style="color:var(--txt)">${r.total} kg</b></div>
    ${r.exact?'':`<div class="badge" style="display:block;text-align:center">Mit deinen Scheiben gehen ${r.total} kg statt ${kg} kg.</div>`}` }
function vPlates(M){ const name=M.ex?exInfo(M.ex).name:'';
  return panel('Scheiben-Rechner',`${name?`<div class="muted" style="margin-top:6px">${esc(name)}</div>`:''}
    <div class="setrow" style="border:0"><span>Zielgewicht (kg)</span><input type="number" inputmode="decimal" step="0.25" data-k="xpl" data-xpl="1" value="${esc(M.kg)}"></div>
    <div class="muted" style="font-size:13px">Stange</div><div class="row" style="margin-top:6px">${[20,15,10,7.5,0].map(b=>`<button class="btn sm ghost ${M.bar===b?'on':''}" data-act="x-bar" data-v="${b}">${b?b+' kg':'keine'}</button>`).join('')}</div>
    <div id="xplOut">${platesOut()}</div>
    <div class="muted" style="font-size:13px;margin-top:12px">Vorhandene Scheiben: ${plateList().join(', ')} kg. Das lässt sich in den Einstellungen ändern.</div>`) }
function exChips(i,it){ let h='';
  if(ssPartner(i)>=0) h+='<span class="chip xss">⛓ Supersatz</span>';
  if(SR&&ST().voice!==false) h+=`<button class="chip hl ${X.voice===i?'xrec':''}" data-act="x-voice" data-i="${i}">🎤 ${X.voice===i?'Ich höre …':'Ansagen'}</button>`;
  if(PLATE_IDS.includes(it.exId)||!CAT[it.exId]) h+=`<button class="chip hl" data-act="x-plates" data-i="${i}">🏋️ Scheiben</button>`;
  return h }

/* ================= Schnell-Training ================= */
const WORK=45, WORK_UNI=75, SWITCH=75;
const ssRest=(a,b)=>Math.max(45,Math.round(Math.max(a.rest,b.rest)*.75/15)*15);
const blockSec=bl=>bl.length===1?bl[0].sets*((bl[0].uni?WORK_UNI:WORK)+bl[0].rest)+SWITCH
  :Math.max(bl[0].sets,bl[1].sets)*((bl[0].uni?WORK_UNI:WORK)+(bl[1].uni?WORK_UNI:WORK)+15+ssRest(bl[0],bl[1]))+SWITCH*1.5;
function calib(dayId){ const d=S.plan.days[dayId], rs=[];
  S.sessions.filter(s=>s.dayId===dayId&&s.durationMin>5&&!(s.entries||[]).some(e=>e.cardio)).slice(0,5).forEach(s=>{ let est=0;
    (s.entries||[]).forEach(e=>{ if(!e.sets) return; const pe=(d.exercises||[]).find(x=>x.id===e.exId); est+=e.sets.length*((e.uni?WORK_UNI:WORK)+(pe&&pe.rest!=null?+pe.rest:ST().defRest))+SWITCH });
    if(est>0) rs.push(s.durationMin*60/est) });
  if(!rs.length) return 1; rs.sort((a,b)=>a-b); return Math.max(.7,Math.min(1.5,rs[Math.floor(rs.length/2)])) }
function quickPlan(dayId,min){ const d=S.plan.days[dayId], all=d.exercises||[], f=calib(dayId);
  const exs=all.filter(e=>!isCardio(e.id)).map(e=>{ const info=exInfo(e.id); return {...e,sets:+e.sets||ST().defSets,rest:e.rest!=null?+e.rest:ST().defRest,muscle:e.muscle||info.muscle,uni:e.uni!=null?!!e.uni:!!info.uni} });
  const cardio=all.filter(e=>isCardio(e.id)), cardioSec=cardio.reduce((a,c)=>a+(+c.target||10)*60,0), n=exs.length;
  /* Weglassen: zuerst Übungen, deren Muskel schon eine frühere Übung abdeckt, dann von hinten */
  const dupe=exs.map((e,k)=>k>0&&exs.slice(0,k).some(x=>x.muscle===e.muscle)), idx=exs.map((e,k)=>k);
  const dropOrder=[...idx.filter(k=>dupe[k]).reverse(),...idx.filter(k=>!dupe[k]).reverse()];
  const build=(pair,cut,drop)=>{ const gone=new Set(dropOrder.slice(0,drop)), list=exs.filter((e,k)=>!gone.has(k)).map((e,k,arr)=>({...e,orig:e.sets,sets:k>=arr.length-cut?Math.min(e.sets,2):e.sets}));
    const blocks=[], used=new Set();
    for(let a=0;a<list.length;a++){ if(used.has(a)) continue; used.add(a); let b=-1;
      if(pair>=2||(pair===1&&a>0)) for(let k=a+1;k<list.length;k++) if(!used.has(k)&&list[k].muscle!==list[a].muscle){ b=k; break }
      if(b>=0){ used.add(b); blocks.push([list[a],list[b]]) } else blocks.push([list[a]]) }
    return {blocks,dropped:exs.filter((e,k)=>gone.has(k)),cardio:[],sec:blocks.reduce((t,bl)=>t+blockSec(bl),0)*f} };
  const normal=build(0,0,0); normal.cardio=cardio; normal.sec+=cardioSec;
  const res={normalMin:Math.round(normal.sec/60),droppedCardio:cardio};
  if(!n||normal.sec<=min*60) return {...res,...normal,droppedCardio:[],fits:true,unchanged:true};
  /* Alle Varianten durchrechnen und die nehmen, die in die Zeit passt und am meisten Sätze behält */
  let pick=null, bestScore=-1, shortest=null;
  for(let dr=0;dr<=Math.max(0,n-2);dr++) for(let c=0;c<=n-dr;c++) for(let pr=0;pr<=2;pr++){ const q=build(pr,c,dr);
    if(!shortest||q.sec<shortest.sec) shortest=q;
    if(q.sec>min*60) continue;
    const score=q.blocks.reduce((a,bl)=>a+bl.reduce((x,e)=>x+e.sets,0),0)*10-dr*15-pr;
    if(score>bestScore){ bestScore=score; pick=q } }
  return {...res,...(pick||shortest),fits:!!pick} }
function vQuick(M){ const d=S.plan.days[M.d]; if(!d) return panel('Schnell-Training','<div class="muted">Kein Plan gefunden.</div>');
  const q=quickPlan(M.d,M.min), line=e=>`<b>${esc(e.name)}</b> <span class="muted">${pl(e.sets,'Satz','Sätze')}${e.orig&&e.orig!==e.sets?' statt '+e.orig:''}</span>`;
  let h=`<div class="muted" style="margin-top:6px">${esc(d.name)} · normal etwa ${q.normalMin} Min.</div>
    <div class="row" style="margin-top:10px">${[15,20,25,30,40,50].map(m=>`<button class="btn sm ghost ${M.min===m?'on':''}" data-act="x-quick-min" data-v="${m}">${m} Min.</button>`).join('')}</div>
    <div class="card" style="margin-top:12px">`;
  if(q.unchanged) h+=`<div class="xq">Dein normaler Plan passt in ${M.min} Minuten. Es wird nichts gekürzt.</div>`;
  q.blocks.forEach(bl=>{ h+=bl.length===2?`<div class="xq"><span class="chip xss">⛓ Supersatz</span> <span class="muted">Pause ${fmtT(ssRest(bl[0],bl[1]))} nach beiden</span><div style="margin-top:4px">${line(bl[0])}</div><div>${line(bl[1])}</div></div>`:`<div class="xq">${line(bl[0])}</div>` });
  (q.cardio||[]).forEach(c=>{ h+=`<div class="xq"><b>${esc(c.name)}</b> <span class="muted">Cardio</span></div>` });
  h+=`</div>`;
  const out=[...q.dropped,...q.droppedCardio];
  if(out.length) h+=`<div class="muted" style="margin-bottom:10px">Heute weggelassen: ${out.map(e=>esc(e.name)).join(', ')}.</div>`;
  h+=`<div class="muted" style="margin-bottom:10px">Geschätzt etwa <b style="color:var(--txt)">${Math.round(q.sec/60)} Min.</b>${q.fits?'':' Kürzer geht es nicht sinnvoll, ohne dass nur eine Übung übrig bleibt.'} Dein Plan bleibt unverändert, die Kürzung gilt nur für heute.</div>
    <button class="btn pri" data-act="x-quick-go">So starten</button>`;
  return panel('⏱ Wenig Zeit?',h) }
function quickStart(M){ const d=S.plan.days[M.d], q=quickPlan(M.d,M.min), items=[];
  q.blocks.forEach((bl,k)=>{ const R=bl.length===2?ssRest(bl[0],bl[1]):null;
    bl.forEach(e=>{ const it=makeItem(R==null?e:{...e,rest:R}); if(R!=null) it.ss='q'+k; items.push(it) }) });
  (q.cardio||[]).forEach(c=>items.push(makeItem(c)));
  S.modal=null; S.draft={dayId:M.d,dayName:d.name+(q.unchanged?'':' (kurz)'),startedAt:Date.now(),note:'',items};
  saveDraft(); S.view='workout'; render(); scrollTo(0,0) }

/* ================= Jahresrückblick ================= */
const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'], WDAYS=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
function tonFun(kg){ const t=kg/1000, pick=(w,one,many)=>{ const n=t/w, v=n>=10?Math.round(n):Math.round(n*10)/10; return v+' '+(v===1?one:many) };
  if(t>=300) return 'So viel wie '+pick(150,'Blauwal','Blauwale')+' 🐋';
  if(t>=10) return 'So viel wie '+pick(5,'Elefant','Elefanten')+' 🐘';
  if(t>=1.5) return 'So viel wie '+pick(1.5,'Auto','Autos')+' 🚗';
  if(t>=.25) return 'So viel wie '+pick(.25,'Klavier','Klaviere')+' 🎹';
  return '' }
function wrapped(y){ const inY=s=>new Date(s.date).getFullYear()===y, asc=[...S.sessions].filter(s=>!isNaN(new Date(s.date))).sort((a,b)=>a.date<b.date?-1:1), ss=asc.filter(inY);
  const w={y,n:ss.length,min:0,ton:0,sets:0,reps:0,cardioMin:0,km:0}; if(!ss.length) return w;
  const exN={}, exName={}, mus={}, mon=Array(12).fill(0), wd=Array(7).fill(0), prog={}; let heavy=null;
  asc.forEach(s=>{ const cur=inY(s), before=new Date(s.date).getFullYear()<y; if(!cur&&!before) return;
    if(cur){ const d=new Date(s.date); w.min+=+s.durationMin||0; mon[d.getMonth()]++; wd[d.getDay()]++ }
    (s.entries||[]).forEach(e=>{ if(e.cardio){ if(cur){ w.cardioMin+=+e.cardio.min||0; w.km+=+e.cardio.dist||0 } return } if(!e.sets||!e.sets.length) return;
      const top=e.sets.reduce((a,b)=>e1rm(b)>e1rm(a)?b:a), p=prog[e.exId]=prog[e.exId]||{name:e.name,n:0};
      if(before){ if(!p.base||e1rm(top)>e1rm(p.base)) p.base=top; return }
      p.n++; if(!p.base) p.base=top; if(!p.best||e1rm(top)>e1rm(p.best)) p.best=top;
      exN[e.exId]=(exN[e.exId]||0)+e.sets.length; exName[e.exId]=e.name; const m=musOf(e); if(m) mus[m]=(mus[m]||0)+e.sets.length;
      e.sets.forEach(st=>{ w.sets++; w.ton+=setVol(st); w.reps+=(+st.reps||0)+(+st.repsR||0); if(!heavy||+st.kg>+heavy.st.kg) heavy={name:e.name,st} }) }) });
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0];
  const fe=top(exN); if(fe) w.fav={id:fe[0],name:exName[fe[0]],sets:fe[1]};
  const fm=top(mus); if(fm) w.muscle={name:fm[0],sets:fm[1]};
  if(heavy&&+heavy.st.kg>0) w.heavy=heavy;
  w.month=MONTHS[mon.indexOf(Math.max(...mon))]; w.monthN=Math.max(...mon); w.wday=WDAYS[wd.indexOf(Math.max(...wd))];
  w.longest=streaks(ss.map(s=>weekIdx(s.date))).longest; w.weeks=new Set(ss.map(s=>weekIdx(s.date))).size;
  Object.values(prog).forEach(p=>{ if(!p.best||!p.base||!(+p.base.kg>0)||p.best===p.base) return; const a=e1rm(p.base), b=e1rm(p.best), pct=100*(b-a)/a;
    if(pct>0.5&&(!w.pr||pct>w.pr.pct)) w.pr={name:p.name,from:p.base,to:p.best,pct} });
  const bw=S.body.entries.filter(x=>String(x.d).slice(0,4)===String(y)); if(bw.length>1) w.bw=r2(bw[bw.length-1].kg-bw[0].kg);
  return w }
function years(){ const ys=new Set(S.sessions.map(s=>new Date(s.date).getFullYear()).filter(y=>y>2000)); ys.add(new Date().getFullYear()); return [...ys].sort((a,b)=>b-a) }
function vWrapped(M){ const w=wrapped(M.y), ys=years();
  const card=(g,small,bigT,sub)=>`<div class="xw" style="background:linear-gradient(135deg,${g})"><small>${small}</small><b>${bigT}</b>${sub?`<span>${sub}</span>`:''}</div>`;
  let h=ys.length>1?`<div class="row" style="margin-top:8px">${ys.map(y=>`<button class="btn sm ghost ${y===M.y?'on':''}" data-act="x-wrapped" data-y="${y}">${y}</button>`).join('')}</div>`:'';
  if(!w.n) return panel('🎁 Jahresrückblick '+M.y,h+`<div class="muted" style="padding:20px 0">In ${M.y} gibt es noch keine Trainings.</div>`);
  h+=card('#14532d,#166534','Dein Jahr '+w.y,pl(w.n,'Training','Trainings'),`in ${pl(w.weeks,'Woche','Wochen')}${w.min?' · '+gymTime(w.min)+' im Gym':''}`);
  if(w.ton>0) h+=card('#7c2d12,#b45309','Bewegtes Gewicht',(w.ton>=10000?big(w.ton/1000)+' t':big(w.ton)+' kg'),[tonFun(w.ton),pl(w.sets,'Satz','Sätze')+', '+pl(w.reps,'Wiederholung','Wiederholungen')].filter(Boolean).join('<br>'));
  if(w.fav) h+=card('#1e3a8a,#1d4ed8','Lieblingsübung',esc(w.fav.name),pl(w.fav.sets,'Satz','Sätze')+(w.muscle?' · meisttrainiert: '+esc(w.muscle.name):''));
  if(w.longest) h+=card('#9a3412,#dc2626','Längste Serie','🔥 '+pl(w.longest,'Woche','Wochen'),'am Stück trainiert');
  if(w.pr) h+=card('#581c87,#7e22ce','Grösster Fortschritt',esc(w.pr.name),`von ${fmtSet(w.pr.from)} auf ${fmtSet(w.pr.to)} · 1RM +${Math.round(w.pr.pct)} %`);
  if(w.heavy) h+=card('#134e4a,#0f766e','Schwerster Satz',fmtSet(w.heavy.st)+' kg',esc(w.heavy.name));
  h+=card('#3f3f46,#52525b','Dein Rhythmus',w.wday,`ist dein häufigster Trainingstag · stärkster Monat: ${w.month} (${w.monthN})`);
  if(w.cardioMin>0) h+=card('#831843,#be185d','Cardio',big(w.cardioMin)+' Min.',w.km?r2(w.km)+' km zurückgelegt':'');
  if(w.bw!=null) h+=card('#1f2937,#374151','Körpergewicht',(w.bw>0?'+':'')+w.bw+' kg','vom ersten bis zum letzten Eintrag '+w.y);
  h+=`<button class="btn pri" style="margin-top:14px" data-act="x-share-wrapped">📤 Als Bild teilen</button>`;
  return panel('🎁 Jahresrückblick '+w.y,h) }

/* ================= Teilbare Bilder ================= */
function canvas(c1,c2){ const cv=document.createElement('canvas'); cv.width=1080; cv.height=1350; const x=cv.getContext('2d');
  const g=x.createLinearGradient(0,0,1080,1350); g.addColorStop(0,c1); g.addColorStop(1,c2); x.fillStyle=g; x.fillRect(0,0,1080,1350);
  x.fillStyle='rgba(255,255,255,.05)'; x.beginPath(); x.arc(980,160,330,0,7); x.fill(); x.beginPath(); x.arc(80,1320,260,0,7); x.fill();
  x.textBaseline='alphabetic'; return [cv,x] }
const FONT='-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
function txt(x,s,px,y,o={}){ x.font=(o.w||700)+' '+px+'px '+FONT; x.fillStyle=o.c||'#fff'; x.textAlign=o.a||'left'; x.fillText(s,o.x||90,y) }
function wrapTxt(x,s,px,y,o={}){ x.font=(o.w||800)+' '+px+'px '+FONT; const max=o.max||900, lines=[]; let cur='';
  String(s).split(/\s+/).forEach(wd=>{ const t=cur?cur+' '+wd:wd; if(x.measureText(t).width>max&&cur){ lines.push(cur); cur=wd } else cur=t }); if(cur) lines.push(cur);
  lines.slice(0,o.lines||3).forEach((l,k)=>txt(x,l,px,y+k*px*1.15,o)); return y+Math.min(lines.length,o.lines||3)*px*1.15 }
function footer(x,left){ x.fillStyle='rgba(255,255,255,.18)'; x.fillRect(90,1210,900,2); txt(x,left,38,1275,{w:500,c:'rgba(255,255,255,.7)'}); txt(x,'Gym Tracker 💪',38,1275,{w:700,c:'rgba(255,255,255,.9)',a:'right',x:990}) }
function drawPR(p){ const [cv,x]=canvas('#0b1f14','#14532d');
  txt(x,'🏆',150,250); txt(x,'NEUER REKORD',46,350,{c:'#4ade80',w:800});
  let y=wrapTxt(x,p.name,86,470,{lines:3});
  const main=(+p.st.kg||0)+' kg × '+p.st.reps+(p.st.repsR!=null&&p.st.repsR!==''?'/'+p.st.repsR:'');
  let px=190; x.font='800 '+px+'px '+FONT; while(x.measureText(main).width>900&&px>80){ px-=10; x.font='800 '+px+'px '+FONT }
  y=Math.max(y+px*.75,760); txt(x,main,px,y,{c:'#4ade80',w:800});
  const rm=oneRm(p.st); if(rm){ y+=110; txt(x,'Geschätztes 1RM: '+rm+' kg',52,y,{w:600}) }
  if(p.prev){ y+=80; txt(x,'Vorher: '+(+p.prev.kg||0)+' kg × '+p.prev.reps,46,y,{w:500,c:'rgba(255,255,255,.7)'}) }
  footer(x,new Date(p.date||Date.now()).toLocaleDateString('de-CH',{day:'numeric',month:'long',year:'numeric'})); return cv }
function drawWrapped(w){ const [cv,x]=canvas('#2e1065','#14532d');
  txt(x,'MEIN TRAININGSJAHR',44,170,{c:'#c4b5fd',w:800}); txt(x,String(w.y),200,360,{w:800});
  const rows=[[pl(w.n,'Training','Trainings'),w.min?gymTime(w.min)+' im Gym':'in '+pl(w.weeks,'Woche','Wochen')]];
  if(w.ton>0) rows.push([(w.ton>=10000?big(w.ton/1000)+' t':big(w.ton)+' kg')+' bewegt',tonFun(w.ton)||pl(w.sets,'Satz','Sätze')]);
  if(w.fav) rows.push([w.fav.name,'Lieblingsübung · '+pl(w.fav.sets,'Satz','Sätze')]);
  if(w.longest) rows.push(['🔥 '+pl(w.longest,'Woche','Wochen')+' in Folge','längste Serie']);
  if(w.pr) rows.push([w.pr.name+' +'+Math.round(w.pr.pct)+' %','grösster Fortschritt beim 1RM']);
  let y=490; rows.slice(0,5).forEach(([a,b])=>{ let px=64; x.font='800 '+px+'px '+FONT; while(x.measureText(a).width>900&&px>36){ px-=4; x.font='800 '+px+'px '+FONT }
    txt(x,a,px,y,{w:800}); txt(x,b,36,y+50,{w:500,c:'rgba(255,255,255,.72)'}); y+=142 });
  footer(x,'Jahresrückblick'); return cv }
function openShare(cv,name){ cv.toBlob(blob=>{ if(!blob){ toast('Bild konnte nicht erstellt werden'); return }
  if(X.share) URL.revokeObjectURL(X.share.url);
  X.share={blob,name,url:URL.createObjectURL(blob)}; S.modal={mode:'x-share'}; render() },'image/png') }
function vShare(){ const s=X.share; if(!s) return panel('Teilen','');
  return panel('Bild teilen',`<img src="${s.url}" alt="Vorschau" style="display:block;width:100%;max-width:340px;margin:10px auto;border-radius:14px">
    <div class="row"><button class="btn pri" style="flex:1" data-act="x-share-go">📤 Teilen</button><button class="btn" style="flex:1" data-act="x-share-dl">Speichern</button></div>
    <div class="muted" style="margin-top:10px;font-size:13px">Das Bild entsteht auf deinem Gerät. Es wird nur geteilt, wenn du es selbst verschickst.</div>`) }
function download(){ const s=X.share, l=document.createElement('a'); l.href=s.url; l.download=s.name; document.body.appendChild(l); l.click(); l.remove(); toast('Bild gespeichert') }
async function shareGo(){ const s=X.share; if(!s) return;
  try{ const file=new File([s.blob],s.name,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:'Gym Tracker'}); return } }
  catch(e){ if(e&&e.name==='AbortError') return }
  download() }
const slug=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30);
function shareBest(id){ let best=null, prev=null; const asc=[...S.sessions].sort((a,b)=>a.date<b.date?-1:1);
  asc.forEach(s=>{ const e=(s.entries||[]).find(x=>x.exId===id&&x.sets&&x.sets.length); if(!e) return; const top=e.sets.reduce((a,b)=>e1rm(b)>e1rm(a)?b:a);
    if(!best||e1rm(top)>e1rm(best.st)+.01){ prev=best; best={name:e.name,st:top,date:s.date} } });
  if(best) openShare(drawPR({...best,prev:prev&&prev.st}),'rekord-'+slug(best.name)+'.png') }

/* ================= Einstellungen ================= */
function vSettingsX(){ const s=ST(), chk=(k,l)=>`<label class="chkrow"><span>${l}</span><input type="checkbox" data-set="${k}" ${s[k]!==false?'checked':''}></label>`;
  return `<div class="sec">Extras</div><div class="card">
    ${chk('ghost','Ghost-Modus: pro Satz gegen das letzte Training antreten')}
    ${SR?chk('voice','Sprachsteuerung anzeigen (🎤 Ansagen)')+chk('voiceDone','Nach der Ansage den Satz automatisch abhaken'):'<div class="muted" style="padding:8px 0;border-top:1px solid var(--line)">Sprachsteuerung: Dieser Browser unterstützt keine Spracherkennung.</div>'}
    <div class="setrow"><span>Stärke-Level berechnen für</span><select data-xsel="sex"><option value="m" ${s.sex!=='w'?'selected':''}>Mann</option><option value="w" ${s.sex==='w'?'selected':''}>Frau</option></select></div>
    <div class="setrow"><span>Gewicht der Langhantel (kg)</span><input type="number" inputmode="decimal" step="0.5" data-k="xbar" data-xnum="barKg" value="${esc(s.barKg!=null?s.barKg:20)}"></div>
    <div class="setrow" style="flex-wrap:wrap"><span style="flex:1 0 100%">Vorhandene Scheiben (kg, mit Komma getrennt)</span><input type="text" inputmode="text" data-k="xplates" data-xplates="1" value="${esc(plateList().join(', '))}" style="width:100%"></div>
    <button class="btn sm ghost" style="margin-top:8px" data-act="x-plates-open">🏋️ Scheiben-Rechner öffnen</button>
    ${SR?'<div class="muted" style="margin-top:10px;font-size:13px">Hinweis zur Sprachsteuerung: Die Spracherkennung stammt vom Browser bzw. vom Betriebssystem. Je nach Gerät wird die Aufnahme dafür an Google oder Apple gesendet und braucht Internet. Deine Trainingsdaten bleiben auf dem Gerät.</div>':''}</div>` }

/* ================= Fenster und Ereignisse ================= */
function panel(title,body){ return `<div class="modal" data-act="m-close-bg"><div class="panel"><div class="panel-h between"><b>${title}</b><button class="btn xs ghost" data-act="m-close">✕</button></div><div class="panel-b">${body}</div></div></div>` }
function vModalX(M){ return {'x-badges':vBadges,'x-plates':vPlates,'x-quick':vQuick,'x-wrapped':vWrapped,'x-share':vShare}[M.mode](M) }

window.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-act^="x-"]'); if(!b) return;
  const a=b.dataset.act, i=+b.dataset.i, M=S.modal;
  switch(a){
  case 'x-badges': S.modal={mode:'x-badges'}; render(); break;
  case 'x-heat': X.heat=b.dataset.v; render(); break;
  case 'x-heat-m': { const m=b.dataset.m, n=muscleSets(X.heat)[m]; toast(m+': '+(Number.isInteger(n)?n:n.toFixed(1))+' Sätze'+(X.heat==='m'?' pro Woche':'')); break }
  case 'x-wrapped': S.modal={mode:'x-wrapped',y:+b.dataset.y||new Date().getFullYear()}; render(); break;
  case 'x-quick': S.modal={mode:'x-quick',d:b.dataset.d,min:25}; render(); break;
  case 'x-quick-min': M.min=+b.dataset.v; render(); break;
  case 'x-quick-go': quickStart(M); break;
  case 'x-ss': ssToggle(i); break;
  case 'x-voice': voiceStart(i); break;
  case 'x-plates': { const it=S.draft.items[i], r=it.rows.find(x=>!x.done)||it.rows[it.rows.length-1], inp=document.querySelector(`[data-f="kg"][data-i="${i}"]`);
    S.modal={mode:'x-plates',ex:it.exId,kg:(r&&r.kg)||(inp&&num(inp.placeholder)!=null?inp.placeholder:''),bar:barFor(it.exId)}; render(); break }
  case 'x-plates-open': S.modal={mode:'x-plates',ex:'',kg:'60',bar:barFor('')}; render(); break;
  case 'x-bar': M.bar=+b.dataset.v; if(M.ex){ S.settings={...S.settings,bars:{...(S.settings.bars||{}),[M.ex]:M.bar}}; saveSettings().catch(()=>{}) } render(); break;
  case 'x-share-pr': { const p=S.summary&&S.summary.prs[+b.dataset.k]; if(p) openShare(drawPR(p),'rekord-'+slug(p.name)+'.png'); break }
  case 'x-share-best': shareBest(b.dataset.id); break;
  case 'x-share-wrapped': { const w=wrapped(M.y); openShare(drawWrapped(w),'jahresrueckblick-'+w.y+'.png'); break }
  case 'x-share-go': shareGo(); break;
  case 'x-share-dl': download(); break;
  } });
window.addEventListener('input',e=>{ const t=e.target, ds=t.dataset; if(!ds) return;
  if(ds.f) ghostLive(t);
  else if(ds.xpl&&S.modal){ S.modal.kg=t.value; $('xplOut').innerHTML=platesOut() } });
window.addEventListener('change',e=>{ const t=e.target, ds=t.dataset; if(!ds) return;
  if(ds.xsel){ S.settings={...S.settings,[ds.xsel]:t.value}; saveSettings().catch(()=>{}) }
  else if(ds.xnum){ const v=num(t.value); if(v==null||v<0){ render(); return } S.settings={...S.settings,[ds.xnum]:v}; saveSettings().catch(()=>{}) }
  else if(ds.xplates){ const l=[...new Set(t.value.split(/[;\s]+/).map(x=>num(x)).filter(x=>x>0&&x<=50))].sort((a,b)=>b-a);
    if(!l.length){ toast('Bitte Scheiben als Zahlen eingeben, z. B. 20, 10, 5, 2.5'); render(); return }
    S.settings={...S.settings,plates:l}; saveSettings().then(()=>toast('Scheiben gespeichert')).catch(()=>{}) } });

window.GTX={home:vHomeX,progressTop:vProgressTop,progExtra:vProgExtra,progDetails:vProgDetails,infoChips,summary:vSummaryX,badgeIds,
  ghostRow,ghostBar,exChips,exTools,cardCls,ssSkip,settings:vSettingsX,modal:vModalX,
  _test:{parseVoice,plateCalc,quickPlan,stats,wrapped,level,streaks,weekIdx}};
render();
})();
