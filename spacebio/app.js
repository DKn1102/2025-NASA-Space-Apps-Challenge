/* SpaceBio v4.2 app logic with Global Translate (KO/EN + scaffolding) */
// Expect window.PUBLICATIONS(_META) and window.I18N_RES from data/*.js

// ===== i18n =====
const Lang = {
  list: ['ko','en','es','fr','ja','zh'],
  getDefault(){
    const saved = localStorage.getItem('lang');
    if(saved && this.list.includes(saved)) return saved;
    const nav = (navigator.language||'').slice(0,2).toLowerCase();
    return this.list.includes(nav) ? nav : 'ko';
  },
  set(lang){
    if(!this.list.includes(lang)) lang='ko';
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    // RTL reserve (not used now):
    document.documentElement.dir = (['ar','he'].includes(lang)) ? 'rtl' : 'ltr';
    I18N.apply(lang);
  }
};

const I18N = {
  lang: 'ko',
  ui: {},
  content: {},
  apply(lang){
    this.lang = lang;
    const res = (window.I18N_RES && window.I18N_RES[lang]) || {};
    this.ui = res.ui || {};
    this.content = res.content || {};
    // Patch static UI texts already in DOM
    setText('appTitle', t('title_app'));
    setText('tabLabelOverview', t('tab_overview'));
    setText('tabLabelExplore', t('tab_explore'));
    setText('tabLabelKG', t('tab_kg'));
    setText('tabLabelKey', t('tab_key'));
    setText('headingYear', t('heading_year'));
    setText('hintMinBar', t('hint_minbar'));
    setText('headingTopics', t('heading_topics'));
    setText('headingKG', t('heading_kg'));
    setText('kgHint', t('kg_hint'));
    setText('headingKey', t('heading_key'));
    setText('langLabel', t('lang_label'));
    // placeholders
    setPlaceholder('search', t('search_placeholder'));
    setPlaceholder('kwInput', t('key_placeholder'));
    // buttons/text
    setButton('kwModeAny', t('btn_any'));
    setButton('kwModeAll', t('btn_all'));
    setButton('kwClear', t('btn_clear'));
    setButton('kwSave', t('btn_save_set'));
    setButton('kwDelete', t('btn_delete'));
    // messages
    setText('msgSelectTitle', t('msg_select_title'));
    // year filter placeholder will be applied in render functions via t()
    // re-render active tab to apply translations in generated UI
    const active = document.querySelector('.tabpanel.active');
    if(active){
      if(active.id==='tab-overview') renderOverview();
      if(active.id==='tab-explore') { buildYearOptions(); renderList(); }
      if(active.id==='tab-kg') renderGraph();
      if(active.id==='tab-key') renderKeywordUI();
    }
  }
};

function t(key){ return I18N.ui[key] || key; }
function trDynamic(str){ return (I18N.content && I18N.content[str]) || str; }
function setText(id, text){ const el=document.getElementById(id); if(el) el.textContent = text; }
function setPlaceholder(id, text){ const el=document.getElementById(id); if(el) el.placeholder = text; }
function setButton(id, text){ const el=document.getElementById(id); if(el) el.textContent = text; }

// ===== Utilities =====
const stopwords = new Set([
  'a','an','the','and','or','of','in','on','for','to','from','with','by','at','into','is','are','be','as','we','our','study','using','use','based','analysis','data','result','results','effect','effects','cell','cells','mouse','mice','rat','rats','human','space','microgravity','flight','ground','bion','experiment','mission','model','models','role','gene','genes','protein','proteins','response','responses','during','after','under','vs','versus','between','new','novel','case','theory','high','low','system','systems','function','functions'
]);

function tokenize(text){
  return text.toLowerCase().replace(/https?:\/\/\S+/g,' ').replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/).filter(w=>w && !stopwords.has(w) && !/[0-9]/.test(w));
}

function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

function groupByYear(records){
  const map = new Map();
  for(const r of records){ const y = (r.year==null)?'Unknown':r.year; map.set(y,(map.get(y)||0)+1); }
  const years = [...map.keys()].sort((a,b)=> a==='Unknown'?1:b==='Unknown'?-1:Number(a)-Number(b));
  return years.map(y=>({year:y, count: map.get(y)}));
}

// ===== Tabs =====
function setActiveTab(id){
  document.querySelectorAll('.tab').forEach(t=>{
    const on = t.dataset.target===id;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tabpanel').forEach(p=>{
    p.classList.toggle('active', p.id===id);
  });
  requestAnimationFrame(()=> setTimeout(()=>{
    if(id==='tab-overview') renderOverview();
    if(id==='tab-kg') renderGraph();
    if(id==='tab-key') renderKeywordUI();
  }, 0));
}
function initTabs(){ document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=> setActiveTab(tab.dataset.target));
}); document.querySelectorAll('.tab')[0].click(); }

// ===== Overview =====
const SCALE_MODE='sqrt';
function yScale(v,max){ if(max<=0)return 0; return (SCALE_MODE==='sqrt') ? Math.sqrt(v)/Math.sqrt(max) : v/max; }

function renderOverview(){
  const data=groupByYear(window.PUBLICATIONS);
  const svg=document.getElementById('bar');
  const w=svg.clientWidth||svg.parentNode.clientWidth; const h=svg.clientHeight||260;
  const pad={l:36,r:10,t:10,b:26}; const innerW=w-pad.l-pad.r; const innerH=h-pad.t-pad.b;
  const maxCount=Math.max(...data.map(d=>d.count))||1; const barW=innerW/Math.max(1,data.length);
  svg.innerHTML='';
  const g=document.createElementNS('http://www.w3.org/2000/svg','g');
  g.setAttribute('transform',`translate(${pad.l} ${pad.t})`); svg.appendChild(g);
  const ticks=4;
  for(let i=0;i<=ticks;i++){
    const y=innerH-i*innerH/ticks;
    const line=document.createElementNS(svg.namespaceURI,'line');
    line.setAttribute('x1',0);line.setAttribute('x2',innerW);line.setAttribute('y1',y);line.setAttribute('y2',y);
    line.setAttribute('stroke','#2a3355'); line.setAttribute('class','axis'); g.appendChild(line);
    const label=document.createElementNS(svg.namespaceURI,'text');
    label.textContent=Math.round(i*maxCount/ticks);
    label.setAttribute('x',-6); label.setAttribute('y',y+4); label.setAttribute('text-anchor','end'); label.setAttribute('class','axis-tick'); g.appendChild(label);
  }
  data.forEach((d,i)=>{
    const height=Math.max(6, yScale(d.count,maxCount)*innerH);
    const x=i*barW+4; const y=innerH-height;
    const rect=document.createElementNS(svg.namespaceURI,'rect');
    rect.setAttribute('x',x); rect.setAttribute('y',y);
    rect.setAttribute('width',Math.max(2,barW-8)); rect.setAttribute('height',height);
    rect.setAttribute('class', d.year==='Unknown' ? 'bar unknown' : 'bar'); g.appendChild(rect);
    const tl=document.createElementNS(svg.namespaceURI,'text');
    tl.textContent=d.year; tl.setAttribute('x', x+Math.max(2,barW-8)/2);
    tl.setAttribute('y', innerH+16); tl.setAttribute('text-anchor','middle'); tl.setAttribute('class','axis-tick'); g.appendChild(tl);
  });

  // topics
  setText('headingYear', t('heading_year'));
  setText('hintMinBar', t('hint_minbar'));
  setText('headingTopics', t('heading_topics'));

  const corpus=window.PUBLICATIONS.map(p=>p.Title).join(' ');
  const tokens=tokenize(corpus);
  const counts=new Map();
  for(const tt of tokens) counts.set(tt,(counts.get(tt)||0)+1);
  const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30);
  const wrap=document.getElementById('topics'); wrap.innerHTML='';
  top.forEach(([w,c])=>{
    const chip=document.createElement('span'); chip.className='chip'; chip.dataset.word=w;
    chip.textContent = `${w} · ${c}`; chip.style.cursor='pointer'; chip.title=t('topics_click');
    chip.addEventListener('click',()=>{ setActiveTab('tab-key'); pushSelectedChip(w);
      const input=document.getElementById('kwInput');
      if(input && !input.value.toLowerCase().includes(w)){ input.value=(input.value?input.value+' ':'')+w; }
      updateKeywordResults();
    });
    wrap.appendChild(chip);
  });
}

// ===== Explore =====
function buildYearOptions(){
  const years=[...new Set(window.PUBLICATIONS.map(p=>p.year))].sort((a,b)=> a==='Unknown'?1:b==='Unknown'?-1:Number(a)-Number(b));
  const sel=document.getElementById('yearFilter'); sel.innerHTML='';
  const optAll=document.createElement('option'); optAll.value='all'; optAll.textContent=t('year_all'); sel.appendChild(optAll);
  years.forEach(y=>{ const o=document.createElement('option'); o.value=y; o.textContent=y; sel.appendChild(o); });
}
function renderList(){
  const q=document.getElementById('search').value.trim().toLowerCase();
  const yv=document.getElementById('yearFilter').value;
  const list=document.getElementById('list'); list.innerHTML='';
  let items=window.PUBLICATIONS;
  if(yv!=='all') items = items.filter(p=> String(p.year)===String(yv));
  if(q) items = items.filter(p=> p.Title.toLowerCase().includes(q));
  items.forEach((p)=>{
    const div=document.createElement('div'); div.className='list-item'; div.textContent=p.Title;
    div.addEventListener('click',()=> loadDetail(p)); list.appendChild(div);
  });
  if(items.length===0){ const d=document.createElement('div'); d.className='list-item small'; d.textContent=t('no_matches'); list.appendChild(d); }
}

async function fetchReadableText(url){
  try{
    const prox='https://r.jina.ai/http/'+url.replace(/^https?:\/\//,'');
    const res = await fetch(prox,{mode:'cors'});
    if(!res.ok) throw new Error('fetch failed');
    return await res.text();
  }catch(e){ return null; }
}

function summarizeText(text){
  if(!text) return null;
  const s=text.split(/(?<=[\.\!\?])\s+/).map(t=>t.trim()).filter(t=>t.length>40&&t.length<300).slice(0,14);
  if(s.length===0) return null;
  const key=s.find(x=>/(microgravity|space|mouse|mice|rats?|cells?|bone|muscle|immune|radiation|ISS|Bion|flight)/i.test(x)) || s[0];
  const key60=key.length>60?key.slice(0,60):key;
  const expl=s.slice(0,5).join(' ');
  const bullets=s.slice(5,8);
  return {key:key60, expl, bullets};
}

function fallbackTitleSummary(p){
  const title=p.Title||'';
  const kicker=(title.length>60?title.slice(0,60):title);
  const kws=title.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w&&w.length>2);
  const focus=(kws.slice(0,6).join(', ')||'space biology, microgravity');
  const expl=[
    `This paper appears to address "${title}".`,
    `It likely relates to ${focus} within the context of space biology and/or microgravity studies.`,
    `Details such as experimental setup, cohorts, and outcomes require opening the original article.`,
    `This description is auto-generated from the title only (offline fallback).`
  ].join(' ');
  const bullets=[
    `Topic focus inferred from title: ${focus}.`,
    `Potential relevance: spaceflight/microgravity experimental findings.`,
    `Open the original link for verified methods and results.`
  ];
  return {key:kicker, expl, bullets};
}

async function loadDetail(p){
  const detail=document.getElementById('detail');
  detail.innerHTML = `<p class="small">${t('loading_summary')}</p>`;
  const text=await fetchReadableText(p.Link);
  let sum=summarizeText(text);
  if(!sum) sum=fallbackTitleSummary(p);
  const bulletsHtml = sum.bullets?.length ? '<ul class="bullets">'+sum.bullets.map(b=>'<li>'+trDynamic(b)+'</li>').join('')+'</ul>' : '';
  detail.innerHTML = `
    <p class="title">${p.Title}</p>
    <p class="kicker">${trDynamic(sum.key)}</p>
    <p>${trDynamic(sum.expl)}</p>
    <p class="small"><strong>${t('key_sentences')}</strong></p>
    ${bulletsHtml}
    <div class="footer">
      <a class="btn" href="${p.Link}" target="_blank" rel="noopener">${t('open_original')}</a>
      <span class="small" style="margin-left:8px;opacity:.8">· ${t('disclaimer_medical')}</span>
    </div>
  `;
}

// ===== Knowledge Graph =====
function ensureCanvasSize(canvas, defaultH=420){
  const DPR=Math.max(1,Math.floor(window.devicePixelRatio||1));
  const parent=canvas.parentElement||canvas;
  const cssW=Math.max(300,Math.floor(parent.clientWidth||canvas.clientWidth||320));
  const cssH=defaultH;
  canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px';
  canvas.width=cssW*DPR; canvas.height=cssH*DPR;
  const ctx=canvas.getContext('2d'); ctx.setTransform(DPR,0,0,DPR,0,0);
  return {W:cssW,H:cssH,ctx};
}

function renderGraph(){
  const canvas=document.getElementById('kg');
  const {W,H,ctx}=ensureCanvasSize(canvas,420);
  ctx.clearRect(0,0,W,H);
  ctx.font='14px system-ui';
  const corpus=window.PUBLICATIONS.map(p=>p.Title).join(' ');
  const tokens=tokenize(corpus);
  const counts=new Map();
  for(const t of tokens) counts.set(t,(counts.get(t)||0)+1);
  const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([word,count])=>({word,count}));
  const nodes=top.map((t,i)=>({...t,x:(W/2)+Math.cos(i/top.length*2*Math.PI)*(H/2-40),y:(H/2)+Math.sin(i/top.length*2*Math.PI)*(H/2-40)}));
  for(let it=0;it<200;it++){
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];
        const wa=ctx.measureText(a.word).width; const wb=ctx.measureText(b.word).width;
        const ra=Math.max(18,wa/2), rb=Math.max(18,wb/2);
        const dx=b.x-a.x, dy=b.y-a.y; const dist=Math.hypot(dx,dy)||0.001;
        const minDist=ra+rb+12;
        if(dist<minDist){
          const push=(minDist-dist)/2; const ux=dx/dist, uy=dy/dist;
          a.x-=ux*push; a.y-=uy*push; b.x+=ux*push; b.y+=uy*push;
          a.x=Math.max(20,Math.min(W-20,a.x)); a.y=Math.max(20,Math.min(H-20,a.y));
          b.x=Math.max(20,Math.min(W-20,b.x)); b.y=Math.max(20,Math.min(H-20,b.y));
        }
      }
    }
  }
  nodes.forEach(n=>{
    ctx.fillStyle='#aecdff'; ctx.beginPath(); ctx.arc(n.x,n.y,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#eef3ff'; ctx.fillText(n.word,n.x+6,n.y+5);
  });
}

// ===== Keyword Search =====
function splitKeywords(input){ return (input||'').toLowerCase().replace(/[^\w\s,]/g,' ').split(/[\s,]+/).map(s=>s.trim()).filter(Boolean); }

function filterByKeywords(records,keywords,mode,yearValue){
  let items = (yearValue && yearValue!=='all') ? records.filter(p=> String(p.year)===String(yearValue)) : records;
  if(!keywords.length) return items;
  return items.filter(p=>{
    const t = p.Title.toLowerCase(); const has = kw => t.includes(kw);
    return mode==='all' ? keywords.every(has) : keywords.some(has);
  });
}

function highlight(title,keywords){
  if(!keywords.length) return title;
  const esc = keywords.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const re = new RegExp('(' + esc.join('|') + ')','ig');
  return title.replace(re,'<mark>$1</mark>');
}

function buildYearOptionsFor(elId){
  const years=[...new Set(window.PUBLICATIONS.map(p=>p.year))].sort((a,b)=>a==='Unknown'?1:b==='Unknown'?-1:Number(a)-Number(b));
  const sel=document.getElementById(elId); sel.innerHTML='';
  const optAll=document.createElement('option'); optAll.value='all'; optAll.textContent=t('year_all'); sel.appendChild(optAll);
  years.forEach(y=>{ const o=document.createElement('option'); o.value=y; o.textContent=y; sel.appendChild(o); });
}

function pushSelectedChip(word){
  const wrap=document.getElementById('kwSelected');
  if([...wrap.querySelectorAll('.chip')].some(c=>c.dataset.word===word)) return;
  const chip=document.createElement('span'); chip.className='chip'; chip.dataset.word=word; chip.textContent=word;
  chip.title='Remove'; chip.style.cursor='pointer';
  chip.addEventListener('click',()=>{ chip.remove(); updateKeywordResults(); });
  wrap.appendChild(chip);
}

function gatherKeywords(){
  const typed=splitKeywords(document.getElementById('kwInput').value);
  const selected=[...document.querySelectorAll('#kwSelected .chip')].map(c=>c.dataset.word);
  return [...new Set([...typed,...selected])];
}

function renderMiniChart(items){
  const svg=document.getElementById('kwMiniChart');
  const w=svg.clientWidth||svg.parentNode.clientWidth||320; const h=svg.clientHeight||120;
  const pad={l:30,r:6,t:6,b:18}; const innerW=w-pad.l-pad.r, innerH=h-pad.t-pad.b;
  svg.innerHTML='';
  const map=new Map();
  for(const p of items){ const y=p.year || 'Unknown'; map.set(y,(map.get(y)||0)+1); }
  const years=[...map.keys()].sort((a,b)=> (a==='Unknown')?1:(b==='Unknown')?-1:Number(a)-Number(b));
  const counts=years.map(y=>map.get(y));
  const maxC=Math.max(1,...counts); const barW=innerW/Math.max(1,years.length);
  const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.setAttribute('transform',`translate(${pad.l} ${pad.t})`); svg.appendChild(g);
  const ticks=2;
  for(let i=0;i<=ticks;i++){
    const y=innerH-i*innerH/ticks; const line=document.createElementNS(svg.namespaceURI,'line');
    line.setAttribute('x1',0); line.setAttribute('x2',innerW); line.setAttribute('y1',y); line.setAttribute('y2',y);
    line.setAttribute('stroke','#2a3355'); g.appendChild(line);
  }
  years.forEach((y,i)=>{
    const hgt=Math.max(4,(map.get(y)/maxC)*innerH); const x=i*barW+2; const y0=innerH-hgt;
    const rect=document.createElementNS(svg.namespaceURI,'rect');
    rect.setAttribute('x',x); rect.setAttribute('y',y0);
    rect.setAttribute('width',Math.max(2,barW-4)); rect.setAttribute('height',hgt);
    rect.setAttribute('fill', y==='Unknown' ? '#bfcfff' : '#8fb4ff'); rect.setAttribute('opacity', y==='Unknown'?0.65:1);
    g.appendChild(rect);
    if(years.length<=8){
      const tl=document.createElementNS(svg.namespaceURI,'text');
      tl.textContent=y; tl.setAttribute('x',x+Math.max(2,barW-4)/2);
      tl.setAttribute('y',innerH+14); tl.setAttribute('text-anchor','middle');
      tl.setAttribute('fill','#dfe7ff'); tl.setAttribute('font-size','11px'); g.appendChild(tl);
    }
  });
}

const SAVED_KEY='sb_saved_queries_v1';
function loadSavedSets(){ try{ return JSON.parse(localStorage.getItem(SAVED_KEY)||'[]'); } catch(e){ return []; } }
function saveSavedSets(arr){ localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); }
function refreshSavedSelect(){
  const sel=document.getElementById('kwSaved'); const arr=loadSavedSets();
  sel.innerHTML='';
  const ph=document.createElement('option'); ph.value=''; ph.textContent=t('saved_sets'); sel.appendChild(ph);
  arr.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=String(i);
    o.textContent=`${s.name} · ${s.mode} · ${s.year} · [${s.keywords.join(' ')}]`;
    sel.appendChild(o);
  });
}

function getCurrentQueryState(){
  return {
    name:new Date().toISOString().slice(0,19).replace('T',' '),
    keywords:gatherKeywords(),
    mode:(renderKeywordUI._mode||'any'),
    year:document.getElementById('kwYear').value||'all'
  };
}
function applySavedSet(s){
  document.getElementById('kwInput').value=s.keywords.join(' ');
  document.getElementById('kwSelected').innerHTML='';
  s.keywords.forEach(pushSelectedChip);
  setKwMode(s.mode);
  document.getElementById('kwYear').value=s.year;
  updateKeywordResults();
}

function initSavedUI(){
  refreshSavedSelect();
  document.getElementById('kwSave').addEventListener('click',()=>{
    const s=getCurrentQueryState();
    if(!s.keywords.length){ alert('No keywords to save.'); return; }
    const arr=loadSavedSets(); arr.unshift(s); saveSavedSets(arr); refreshSavedSelect();
  });
  document.getElementById('kwSaved').addEventListener('change',(e)=>{
    const idx=parseInt(e.target.value,10); const arr=loadSavedSets();
    if(Number.isInteger(idx)&&arr[idx]) applySavedSet(arr[idx]);
  });
  document.getElementById('kwDelete').addEventListener('click',()=>{
    const sel=document.getElementById('kwSaved'); const idx=parseInt(sel.value,10);
    const arr=loadSavedSets(); if(Number.isInteger(idx)&&arr[idx]){ arr.splice(idx,1); saveSavedSets(arr); refreshSavedSelect(); }
  });
}

function renderKeywordUI(){
  if(!renderKeywordUI._init){
    buildYearOptionsFor('kwYear');
    document.getElementById('kwModeAny').addEventListener('click',()=> setKwMode('any'));
    document.getElementById('kwModeAll').addEventListener('click',()=> setKwMode('all'));
    document.getElementById('kwInput').addEventListener('input', debounce(updateKeywordResults, 250));
    document.getElementById('kwYear').addEventListener('change', updateKeywordResults);
    document.getElementById('kwClear').addEventListener('click',()=>{
      document.getElementById('kwInput').value=''; document.getElementById('kwSelected').innerHTML=''; updateKeywordResults();
    });
    initSavedUI();
    renderKeywordUI._mode='any'; renderKeywordUI._init=true;
    // localize UI labels
    setButton('kwModeAny', t('btn_any'));
    setButton('kwModeAll', t('btn_all'));
    setButton('kwClear', t('btn_clear'));
    setButton('kwSave', t('btn_save_set'));
    setButton('kwDelete', t('btn_delete'));
  }
  updateKeywordResults();
}
function setKwMode(mode){
  renderKeywordUI._mode = (mode==='all'?'all':'any');
  document.getElementById('kwModeAny').classList.toggle('active', renderKeywordUI._mode==='any');
  document.getElementById('kwModeAny').setAttribute('aria-pressed', renderKeywordUI._mode==='any'?'true':'false');
  document.getElementById('kwModeAll').classList.toggle('active', renderKeywordUI._mode==='all');
  document.getElementById('kwModeAll').setAttribute('aria-pressed', renderKeywordUI._mode==='all'?'true':'false');
  updateKeywordResults();
}

function updateKeywordResults(){
  const keywords=gatherKeywords();
  const yearValue=document.getElementById('kwYear').value;
  const mode=renderKeywordUI._mode||'any';
  const items=filterByKeywords(window.PUBLICATIONS, keywords, mode, yearValue);
  renderMiniChart(items);
  const stat = `${items.length} ${t('matches')}` + (keywords.length? ` · keywords: ${keywords.join(', ')}` : '');
  setText('kwStats', stat);
  const list=document.getElementById('kwList'); list.innerHTML='';
  items.forEach(p=>{
    const div=document.createElement('div'); div.className='list-item';
    div.innerHTML=highlight(p.Title, keywords);
    div.addEventListener('click', ()=> window.open(p.Link,'_blank','noopener'));
    list.appendChild(div);
  });
  if(items.length===0){ const d=document.createElement('div'); d.className='list-item small'; d.textContent=t('no_matches'); list.appendChild(d); }
}

// ===== Init =====
function initExplore(){
  buildYearOptions();
  renderList();
  document.getElementById('search').placeholder = t('search_placeholder');
  document.getElementById('search').addEventListener('input', debounce(renderList,250));
  document.getElementById('yearFilter').addEventListener('change', renderList);
}
function init(){
  // language init
  const sel = document.getElementById('langSelect');
  const def = Lang.getDefault();
  sel.value = def;
  sel.addEventListener('change', ()=> Lang.set(sel.value));
  Lang.set(def);

  const meta=window.PUBLICATIONS_META || {source:'SB_publication_PMC.csv', rows:window.PUBLICATIONS?.length||0, headers:t('headers')};
  document.getElementById('banner').textContent = `${t('banner_prefix')}: ${meta.source} · rows: ${meta.rows} · headers: ${t('headers')}`;

  initTabs();
  renderOverview();
  initExplore();

  ['resize','orientationchange','visibilitychange'].forEach(ev=>{
    window.addEventListener(ev, debounce(()=>{
      const active=document.querySelector('.tabpanel.active'); if(!active) return;
      if(active.id==='tab-kg') renderGraph();
      if(active.id==='tab-key') renderKeywordUI();
      if(active.id==='tab-overview') renderOverview();
    },150));
  });
}
window.addEventListener('DOMContentLoaded', init);

/* ====== SpaceBio v4.2 HOTFIX (append-only) ======
   Paste this block at the VERY BOTTOM of your existing app.js.
   It does NOT remove existing code; it wraps display-only functions.
   - /data-first CSV loader
   - Overview -> Top Keywords (bar)
   - Keyword mini chart -> keywords
=================================================== */
(function(){
  'use strict';

  // -- Data loader (/data first) --
  async function ensureDataLoaded(){
    try{
      if (Array.isArray(window.PUBLICATIONS) && window.PUBLICATIONS.length) return;

      async function tryCsv(path){
        try{
          const res = await fetch(path, {cache:'no-store'});
          if(!res.ok) return null;
          const text = await res.text();
          const lines = (text||'').trim().split(/\r?\n/);
          if(lines.length < 2) return null;
          function splitCSV(line){
            const out=[]; let cur='', q=false;
            for(let i=0;i<line.length;i++){
              const ch=line[i];
              if(ch==='\"'){ q=!q; continue; }
              if(ch===',' && !q){ out.push(cur.trim()); cur=''; continue; }
              cur+=ch;
            }
            out.push(cur.trim()); return out;
          }
          const headers = splitCSV(lines[0]).map(s=>(s||'').toLowerCase());
          const iTitle = headers.indexOf('title');
          const iLink  = headers.indexOf('link');
          const iYear  = headers.indexOf('year');
          if(iTitle < 0) return null;
          const rows=[];
          for(const line of lines.slice(1)){
            if(!line.trim()) continue;
            const cells = splitCSV(line);
            const Title = cells[iTitle] || '';
            const Link  = iLink >=0 ? (cells[iLink]||'#') : '#';
            const year  = iYear >=0 ? (cells[iYear]||'Unknown') : 'Unknown';
            if(Title) rows.push({Title, Link, year});
          }
          if(rows.length){ window.PUBLICATIONS = rows; return rows; }
          return null;
        }catch(e){ return null; }
      }

      const candidates = [
        'data/SB_publication_PMC.csv',
        'data/publications.csv',
        'SB_publication_PMC.csv'
      ];
      for(const c of candidates){
        const ok = await tryCsv(c);
        if(ok) return;
      }
      window.PUBLICATIONS = window.PUBLICATIONS || [];
    }catch(e){ window.PUBLICATIONS = window.PUBLICATIONS || []; }
  }
  window.ensureDataLoaded = window.ensureDataLoaded || ensureDataLoaded;

  // -- Make init async safely (if exists) --
  const __origInit = window.init;
  window.init = async function(){
    await ensureDataLoaded();
    if (typeof __origInit === 'function') return __origInit.apply(this, arguments);
  };

  // === Keyword utils ===
  function kp_tokenize(text){
    const STOP = new Set(["a","an","the","and","or","of","in","on","for","to","from","with","by","at","into","is","are","be","as","we","our","study","using","use","based","analysis","data","result","results","effect","effects","during","after","under","between","within","versus","vs","new","novel","system","systems"]);
    return (text||'').toLowerCase().replace(/[^A-Za-z0-9\s-]/g,' ').split(/\s+/).filter(w=> w && !STOP.has(w) && w.length>=3);
  }
  function kp_keywordCounts(records, limit=20){
    const map = new Map();
    for(const p of (records||[])){ for(const w of kp_tokenize(p.Title||'')){ map.set(w,(map.get(w)||0)+1); } }
    return [...map.entries()].map(([word,count])=>({word,count})).sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word)).slice(0, limit);
  }
  function kp_measure(text, font='14px system-ui'){
    const c = kp_measure._c || (kp_measure._c = document.createElement('canvas'));
    const ctx = c.getContext('2d'); ctx.font = font; return ctx.measureText(text||'').width;
  }
  function kp_ellipsis(text, max=18){ if(!text) return {short:'', full:''}; if(text.length<=max) return {short:text, full:text}; return {short:text.slice(0,max-1)+'…', full:text}; }

  // -- Patch renderOverview (display only) --
  const __origRenderOverview = window.renderOverview;
  window.renderOverview = function(){
    try{
      const dataAll = window.PUBLICATIONS || [];
      const svg = document.getElementById('bar');
      if(!svg) return __origRenderOverview && __origRenderOverview();

      const w = svg.clientWidth || (svg.parentNode && svg.parentNode.clientWidth) || 680;
      const topK = kp_keywordCounts(dataAll, 20);

      const longest = topK.reduce((m,d)=> Math.max(m, kp_measure(d.word)), 0);
      const pad = {l: Math.ceil(longest)+22, r:16, t:16, b:22};
      const barH = 20, gap = 10;
      const innerW = Math.max(100, w - pad.l - pad.r);
      const innerH = Math.max(0, topK.length*(barH+gap) - gap);

      svg.innerHTML=''; svg.setAttribute('height', pad.t + innerH + pad.b);
      const g = document.createElementNS(svg.namespaceURI,'g');
      g.setAttribute('transform', `translate(${pad.l} ${pad.t})`);
      svg.appendChild(g);

      const maxC = Math.max(1, ...topK.map(d=>d.count));
      topK.forEach((d,i)=>{
        const y = i*(barH+gap);
        const ell = kp_ellipsis(d.word, 18);

        const tl = document.createElementNS(svg.namespaceURI,'text');
        tl.textContent = ell.short;
        tl.setAttribute('x', -8); tl.setAttribute('y', y + barH*0.75);
        tl.setAttribute('text-anchor','end'); tl.setAttribute('class','axis-tick');
        tl.setAttribute('title', ell.full); tl.style.cursor = 'pointer';
        tl.addEventListener('click', ()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(tl);

        const wBar = Math.max(4, (d.count/maxC)*innerW);
        const rect = document.createElementNS(svg.namespaceURI,'rect');
        rect.setAttribute('x',0); rect.setAttribute('y',y);
        rect.setAttribute('width', wBar); rect.setAttribute('height', barH);
        rect.setAttribute('class','bar'); rect.setAttribute('role','img'); rect.setAttribute('aria-label', `${d.word}: ${d.count}`);
        rect.style.cursor='pointer';
        rect.addEventListener('click', ()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(rect);

        const val = document.createElementNS(svg.namespaceURI,'text');
        val.textContent = d.count;
        val.setAttribute('x', wBar + 6); val.setAttribute('y', y + barH*0.75);
        val.setAttribute('class','axis-tick');
        g.appendChild(val);
      });

      if(typeof setText==='function' && typeof t==='function'){
        try{ setText('headingYear', t('heading_topics')); }catch(_){}
        try{ setText('hintMinBar', t('topics_click')); }catch(_){}
      }
    }catch(e){
      return __origRenderOverview && __origRenderOverview();
    }
  };

  // -- Patch renderMiniChart (keyword mode) --
  const __origRenderMiniChart = window.renderMiniChart;
  window.renderMiniChart = function(items){
    try{
      const svg=document.getElementById('kwMiniChart');
      if(!svg) return __origRenderMiniChart && __origRenderMiniChart(items);
      const w=svg.clientWidth||(svg.parentNode&&svg.parentNode.clientWidth)||320;
      const h=svg.clientHeight||160;
      const pad={l:30,r:6,t:6,b:18}; const innerW=w-pad.l-pad.r, innerH=h-pad.t-pad.b;
      svg.innerHTML='';

      const current=(typeof gatherKeywords==='function')?gatherKeywords():[];
      let data;
      if(current && current.length){
        const titles=(items||[]).map(p=> (p.Title||'').toLowerCase());
        data=current.map(k=>{
          const kw=(k||'').toLowerCase();
          const c=titles.reduce((acc,t)=> acc + (t.includes(kw)?1:0), 0);
          return {word:k, count:c};
        });
      }else{
        data=kp_keywordCounts(items||[], 10);
      }

      const barW = innerW / Math.max(1, data.length);
      const maxC = Math.max(1, ...data.map(d=>d.count));
      const g=document.createElementNS(svg.namespaceURI,'g'); g.setAttribute('transform',`translate(${pad.l} ${pad.t})`); svg.appendChild(g);

      const ticks=2;
      for(let i=0;i<=ticks;i++){
        const y=innerH-i*innerH/ticks;
        const line=document.createElementNS(svg.namespaceURI,'line');
        line.setAttribute('x1',0); line.setAttribute('x2',innerW); line.setAttribute('y1',y); line.setAttribute('y2',y);
        line.setAttribute('stroke','#2a3355'); g.appendChild(line);
      }

      data.forEach((d,i)=>{
        const hgt=Math.max(4,(d.count/maxC)*innerH), x=i*barW+2, y0=innerH-hgt;
        const rect=document.createElementNS(svg.namespaceURI,'rect');
        rect.setAttribute('x',x); rect.setAttribute('y',y0);
        rect.setAttribute('width',Math.max(2,barW-4)); rect.setAttribute('height',hgt);
        rect.setAttribute('class','bar'); rect.setAttribute('role','img'); rect.setAttribute('aria-label', `${d.word}: ${d.count}`);
        rect.style.cursor='pointer';
        rect.addEventListener('click',()=>{ pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(rect);

        const ell = kp_ellipsis(d.word, Math.max(6, Math.floor(barW/8)));
        if(data.length<=12){
          const tl=document.createElementNS(svg.namespaceURI,'text');
          tl.textContent=ell.short; tl.setAttribute('x', x + Math.max(2,barW-4)/2);
          tl.setAttribute('y', innerH+14); tl.setAttribute('text-anchor','middle');
          tl.setAttribute('class','axis-tick'); tl.setAttribute('title', ell.full);
          g.appendChild(tl);
        }
      });
    }catch(e){
      return __origRenderMiniChart && __origRenderMiniChart(items);
    }
  };

})(); // ====== END HOTFIX ======

/* ====== SpaceBio v4.2 HOTFIX v2 (append-only) =============================
   Paste *at the very bottom* of your existing app.js (do not delete code).
   Adds display-level overrides and helpers ONLY.
   - Overview left: Top 10 keywords (bars). Numbers never clipped.
   - Overview right: ALL keywords as clickable buttons -> Keyword Search.
   - CSV loader: /data first (kept from v1). 
   - Hide "Knowledge Graph" tab & panel.
============================================================================ */
(function(){
  'use strict';

  /* ---------- Hide Knowledge Graph tab & panel (no DOM deletion) --------- */
  (function hideKG(){
    try{
      const tabs = Array.from(document.querySelectorAll('.tab'));
      for(const tab of tabs){
        if(/knowledge\s*graph/i.test((tab.textContent||'').trim())){
          tab.style.display = 'none';
          const tgt = tab.dataset && tab.dataset.target;
          if(tgt){
            const panel = document.getElementById(tgt);
            if(panel) panel.style.display = 'none';
          }
        }
      }
    }catch(e){ /* ignore */ }
  })();

  /* ---------------- Reuse / define keyword helpers ----------------------- */
  function kp_tokenize(text){
    const STOP = new Set(["a","an","the","and","or","of","in","on","for","to","from","with","by","at","into","is","are","be","as","we","our","study","using","use","based","analysis","data","result","results","effect","effects","during","after","under","between","within","versus","vs","new","novel","system","systems"]);
    return (text||'').toLowerCase().replace(/[^A-Za-z0-9\s-]/g,' ').split(/\s+/).filter(w=> w && !STOP.has(w) && w.length>=3);
  }
  function kp_counts(records){
    const map = new Map();
    for(const p of (records||[])){
      for(const w of kp_tokenize(p.Title||'')){ map.set(w,(map.get(w)||0)+1); }
    }
    return map;
  }
  function kp_top(map,limit=10){
    return [...map.entries()].map(([word,count])=>({word,count})).sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word)).slice(0,limit);
  }
  function kp_measure(text, font='14px system-ui'){
    const c = kp_measure._c || (kp_measure._c = document.createElement('canvas'));
    const ctx = c.getContext('2d'); ctx.font = font; return ctx.measureText(String(text||'')).width;
  }
  function kp_ellipsis(text, maxLen){
    if(!text) return {short:'', full:''};
    if(text.length<=maxLen) return {short:text, full:text};
    return {short:text.slice(0, maxLen-1)+'…', full:text};
  }

  /* ----------------- Left: Overview Top 10 bars -------------------------- */
  const __origRenderOverview = window.renderOverview;
  window.renderOverview = function(){
    try{
      const svg = document.getElementById('bar');
      if(!svg){ return __origRenderOverview && __origRenderOverview(); }

      const recs = window.PUBLICATIONS || [];
      const map = kp_counts(recs);
      const data = kp_top(map, 10); // <= Top 10

      // dynamic paddings (labels & counts)
      const longestLabelPx = data.reduce((m,d)=>Math.max(m, kp_measure(d.word)), 0);
      const maxCount = Math.max(1, ...data.map(d=>d.count));
      const maxCountText = String(maxCount);
      const countPadPx = kp_measure(maxCountText) + 18;

      const w = svg.clientWidth || (svg.parentNode && svg.parentNode.clientWidth) || 680;
      const barH = 22, gap = 10;
      const pad = {l: Math.ceil(longestLabelPx)+26, r: Math.max(22, Math.ceil(countPadPx)), t:16, b:22};
      const innerW = Math.max(120, w - pad.l - pad.r);
      const innerH = Math.max(0, data.length*(barH+gap) - gap);

      svg.innerHTML=''; svg.setAttribute('height', pad.t + innerH + pad.b);
      const g = document.createElementNS(svg.namespaceURI,'g');
      g.setAttribute('transform', `translate(${pad.l} ${pad.t})`);
      svg.appendChild(g);

      data.forEach((d,i)=>{
        const y = i*(barH+gap);
        const wBar = Math.max(6, (d.count/maxCount)*innerW);

        const lab = document.createElementNS(svg.namespaceURI,'text');
        const ell = kp_ellipsis(d.word, 22);
        lab.textContent = ell.short;
        lab.setAttribute('x', -10); lab.setAttribute('y', y + barH*0.72);
        lab.setAttribute('text-anchor','end'); lab.setAttribute('class','axis-tick');
        lab.setAttribute('title', ell.full);
        lab.style.cursor='pointer';
        lab.addEventListener('click',()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(lab);

        const rect = document.createElementNS(svg.namespaceURI,'rect');
        rect.setAttribute('x',0); rect.setAttribute('y',y);
        rect.setAttribute('width', wBar); rect.setAttribute('height', barH);
        rect.setAttribute('class','bar'); rect.style.cursor='pointer';
        rect.addEventListener('click',()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(rect);

        const val = document.createElementNS(svg.namespaceURI,'text');
        val.textContent = d.count;
        val.setAttribute('x', wBar + 8); val.setAttribute('y', y + barH*0.72);
        val.setAttribute('class','axis-tick');
        g.appendChild(val);
      });

      // Update headings/hints if i18n exists
      if(typeof setText==='function' && typeof t==='function'){
        try{ setText('headingYear', t('heading_topics')); }catch(_){}
        try{ setText('hintMinBar', t('topics_click')); }catch(_){}
      }

      // Also refresh right side "All Topics" buttons
      renderAllTopicsButtons(map);
    }catch(e){
      return __origRenderOverview && __origRenderOverview();
    }
  };

  /* -------------- Right: All Topics as clickable buttons ----------------- */
  function findRightCard(){
    // Heuristic: find the other Overview card that is NOT the one containing #bar
    const cards = Array.from(document.querySelectorAll('#tab-overview .card, section[role="tabpanel"].active .card'));
    if(!cards.length) return null;
    let barCard = null, other = null;
    for(const c of cards){
      if(c.querySelector && c.querySelector('#bar')) { barCard = c; continue; }
    }
    other = cards.find(c=>c!==barCard) || null;
    return other || barCard; // fallback
  }
  function renderAllTopicsButtons(map){
    try{
      const hostCard = findRightCard();
      if(!hostCard) return;
      // container
      let wrap = hostCard.querySelector('#sbAllTopics');
      if(!wrap){
        wrap = document.createElement('div');
        wrap.id = 'sbAllTopics';
        wrap.style.margin = '6px 6px 10px';
        wrap.style.display = 'flex';
        wrap.style.flexWrap = 'wrap';
        wrap.style.gap = '8px';
        wrap.style.maxHeight = '520px';
        wrap.style.overflow = 'auto';
        hostCard.appendChild(wrap);
      }else{
        wrap.innerHTML='';
      }
      // build buttons (all topics)
      const all = [...map.entries()].map(([word,count])=>({word,count})).sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word));
      for(const d of all){
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='pill';
        btn.style.borderRadius='999px';
        btn.style.padding='6px 10px';
        btn.style.border='1px solid #2a3355';
        btn.style.background='#203064';
        btn.style.color='#eef3ff';
        btn.style.cursor='pointer';
        btn.style.fontSize='12px';
        btn.textContent = `${d.word} · ${d.count}`;
        btn.addEventListener('click',()=>{
          setActiveTab && setActiveTab('tab-key');
          pushSelectedChip && pushSelectedChip(d.word);
          updateKeywordResults && updateKeywordResults();
        });
        wrap.appendChild(btn);
      }
    }catch(e){ /* ignore */ }
  }

})(); // END HOTFIX v2


/* ====== SpaceBio v4.2 HOTFIX v3 (append-only, UI+layout) ==================
   Paste at the VERY BOTTOM of your existing app.js (do not delete code).
   Changes (display-only):
   1) Overview left: Top 10 keyword bars; dynamic element.style.height to avoid clipping.
   2) Overview right: All Topics panel with search/filter + Raw/Grouped toggle + limit.
   3) Auto-hide "Knowledge Graph" tab & panel.
============================================================================= */
(function(){
  'use strict';

  /* ---------------- Hide Knowledge Graph ---------------- */
  (function hideKG(){
    try{
      const tabs = Array.from(document.querySelectorAll('.tab'));
      for(const tab of tabs){
        if(/knowledge\s*graph/i.test((tab.textContent||'').trim())){
          tab.style.display = 'none';
          const tgt = tab.dataset && tab.dataset.target;
          if(tgt){ const p=document.getElementById(tgt); if(p) p.style.display='none'; }
        }
      }
    }catch(e){}
  })();

  /* ---------------- Keyword utilities ------------------- */
  function kp_tokenize(text){
    const STOP = new Set(["a","an","the","and","or","of","in","on","for","to","from","with","by","at","into","is","are","be","as","we","our","study","using","use","based","analysis","data","result","results","effect","effects","during","after","under","between","within","versus","vs","new","novel","system","systems"]);
    return (text||'').toLowerCase().replace(/[^A-Za-z0-9\s-]/g,' ').split(/\s+/).filter(w=> w && !STOP.has(w) && w.length>=3);
  }
  function kp_counts(records){
    const map = new Map();
    for(const p of (records||[])){
      for(const w of kp_tokenize(p.Title||'')){ map.set(w,(map.get(w)||0)+1); }
    }
    return map;
  }
  function kp_top(map,limit=10){
    return [...map.entries()].map(([word,count])=>({word,count})).sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word)).slice(0,limit);
  }
  function kp_measure(text, font='14px system-ui'){
    const c = kp_measure._c || (kp_measure._c = document.createElement('canvas'));
    const ctx = c.getContext('2d'); ctx.font = font; return ctx.measureText(String(text||'')).width;
  }

  /* ----------- Grouped topics (simple alias mapping) ---- */
  const SB_ALIAS = [
    {canon:'space/spaceflight', rx:/(^|\b)(spaceflight|space|station|iss|international|shuttle|mir)\b/},
    {canon:'microgravity',      rx:/(^|\b)(microgravity|micro-g|μg)\b/},
    {canon:'bone/skeletal',     rx:/(^|\b)(bone|skeletal|osteoblast|osteoclast|osteocyte)\b/},
    {canon:'muscle',            rx:/(^|\b)(muscle|myo|atrophy|sarcopenia)\b/},
    {canon:'immune',            rx:/(^|\b)(immune|cytokine|t[- ]?cell|b[- ]?cell|macrophage|inflamm)/},
    {canon:'neuro/behavior',    rx:/(^|\b)(neuro|brain|behavior|hippocampus|cortex)/},
    {canon:'cardio/vascular',   rx:/(^|\b)(cardio|heart|vascular|endotheli)/},
    {canon:'omics/genomics',    rx:/(^|\b)(omics|rna[- ]?seq|transcriptom|microarray|proteomic|metabolom|genome|genes?)/},
    {canon:'microbiome',        rx:/(^|\b)(microbiome|bacterial|bacteria|microbial|gut)/},
    {canon:'rodent',            rx:/(^|\b)(mouse|mice|murine|rat|rats)/},
    {canon:'plant/arabidopsis', rx:/(^|\b)(arabidopsis|thaliana|plant|seedling)/},
    {canon:'zebrafish',         rx:/(^|\b)(zebrafish|danio)/},
    {canon:'c. elegans',        rx:/(^|\b)(elegans|caenorhabditis)/}
  ];
  function groupedCounts(rawMap){
    const out = new Map();
    for(const [w,c] of rawMap.entries()){
      const hit = SB_ALIAS.find(a=>a.rx.test(w));
      const key = hit ? hit.canon : w;
      out.set(key, (out.get(key)||0) + c);
    }
    return out;
  }

  /* --------- Overview left: Top10 with dynamic height ---- */
  const __origRenderOverview = window.renderOverview;
  window.renderOverview = function(){
    try{
      const svg = document.getElementById('bar');
      if(!svg){ return __origRenderOverview && __origRenderOverview(); }

      const recs = window.PUBLICATIONS || [];
      const raw = kp_counts(recs);
      const data = kp_top(raw, 10);

      const longestLabelPx = data.reduce((m,d)=>Math.max(m, kp_measure(d.word)), 0);
      const maxCount = Math.max(1, ...data.map(d=>d.count));
      const maxCountText = String(maxCount);
      const countPadPx = kp_measure(maxCountText) + 22;

      const w = svg.clientWidth || (svg.parentNode && svg.parentNode.clientWidth) || 680;
      const barH = 26, gap = 12;
      const pad = {l: Math.ceil(longestLabelPx)+28, r: Math.max(26, Math.ceil(countPadPx)), t:18, b:24};
      const innerW = Math.max(120, w - pad.l - pad.r);
      const innerH = Math.max(0, data.length*(barH+gap) - gap);

      // override CSS height so nothing clips
      svg.innerHTML='';
      svg.removeAttribute('height');
      svg.style.height = (pad.t + innerH + pad.b) + 'px';

      const g = document.createElementNS(svg.namespaceURI,'g');
      g.setAttribute('transform', `translate(${pad.l} ${pad.t})`);
      svg.appendChild(g);

      data.forEach((d,i)=>{
        const y = i*(barH+gap);
        const wBar = Math.max(6, (d.count/maxCount)*innerW);

        const lab = document.createElementNS(svg.namespaceURI,'text');
        lab.textContent = d.word;
        lab.setAttribute('x', -10); lab.setAttribute('y', y + barH*0.72);
        lab.setAttribute('text-anchor','end'); lab.setAttribute('class','axis-tick');
        lab.style.cursor='pointer';
        lab.addEventListener('click',()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(lab);

        const rect = document.createElementNS(svg.namespaceURI,'rect');
        rect.setAttribute('x',0); rect.setAttribute('y',y);
        rect.setAttribute('width', wBar); rect.setAttribute('height', barH);
        rect.setAttribute('class','bar'); rect.style.cursor='pointer';
        rect.addEventListener('click',()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(rect);

        const val = document.createElementNS(svg.namespaceURI,'text');
        val.textContent = d.count;
        val.setAttribute('x', wBar + 8); val.setAttribute('y', y + barH*0.72);
        val.setAttribute('class','axis-tick');
        g.appendChild(val);
      });

      // refresh right panel with UI
      renderAllTopicsPanel(raw);
    }catch(e){
      return __origRenderOverview && __origRenderOverview();
    }
  };

  /* --------- Right: All Topics = searchable, limit, grouped/raw ---------- */
  function findRightCard(){
    const cards = Array.from(document.querySelectorAll('#tab-overview .card, section[role="tabpanel"].active .card'));
    if(!cards.length) return null;
    const barCard = cards.find(c=>c.querySelector && c.querySelector('#bar')) || null;
    const other = cards.find(c=>c!==barCard) || null;
    return other || barCard;
  }

  function ensureTopicUI(host){
    let tools = host.querySelector('#sbTopicTools');
    if(!tools){
      tools = document.createElement('div');
      tools.id = 'sbTopicTools';
      tools.style.display='flex';
      tools.style.flexWrap='wrap';
      tools.style.gap='8px';
      tools.style.margin='6px 6px 4px';
      tools.innerHTML = `
        <input id="sbTopicFilter" type="text" placeholder="Filter topics…" style="background:#0f1635;color:#eef3ff;border:1px solid #2a3355;border-radius:8px;padding:6px 10px;min-width:180px"/>
        <div class="pill-group">
          <button id="sbViewRaw" class="pill" style="padding:6px 10px;border-radius:999px">Raw</button>
          <button id="sbViewGrouped" class="pill" style="padding:6px 10px;border-radius:999px">Grouped</button>
        </div>
        <select id="sbLimit" style="background:#0f1635;color:#eef3ff;border:1px solid #2a3355;border-radius:8px;padding:6px 10px">
          <option value="30">Top 30</option>
          <option value="50">Top 50</option>
          <option value="80" selected>Top 80</option>
          <option value="all">All</option>
        </select>
      `;
      host.appendChild(tools);
      // interactions
      tools.addEventListener('click',e=>{
        if(e.target.id==='sbViewRaw' || e.target.id==='sbViewGrouped'){
          tools.dataset.mode = (e.target.id==='sbViewGrouped'?'grouped':'raw');
          tools.querySelector('#sbViewRaw').classList.toggle('active', tools.dataset.mode!=='grouped');
          tools.querySelector('#sbViewGrouped').classList.toggle('active', tools.dataset.mode==='grouped');
          renderList();
        }
      });
      tools.querySelector('#sbTopicFilter').addEventListener('input',()=>renderList());
      tools.querySelector('#sbLimit').addEventListener('change',()=>renderList());
      tools.dataset.mode = 'raw';
      tools.querySelector('#sbViewRaw').classList.add('active');
    }
    let wrap = host.querySelector('#sbAllTopics');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id='sbAllTopics';
      wrap.style.margin = '4px 6px 10px';
      wrap.style.display='flex';
      wrap.style.flexWrap='wrap';
      wrap.style.gap='8px';
      wrap.style.maxHeight='520px';
      wrap.style.overflow='auto';
      host.appendChild(wrap);
    }
    return {tools, wrap};

    function renderList(){ /* placeholder to be replaced */ }
  }

  function renderAllTopicsPanel(rawMap){
    const host = findRightCard(); if(!host) return;
    const {tools, wrap} = ensureTopicUI(host);

    function currentMap(){
      if((tools.dataset.mode||'raw')==='grouped') return groupedCounts(rawMap);
      return rawMap;
    }
    function currentLimit(){
      const v = (tools.querySelector('#sbLimit')||{}).value || '80';
      return v==='all' ? Infinity : parseInt(v,10);
    }
    function filterStr(){ return (tools.querySelector('#sbTopicFilter')||{}).value || ''; }

    function renderList(){
      const map = new Map(currentMap());
      const q = filterStr().trim().toLowerCase();
      let items = [...map.entries()].map(([word,count])=>({word,count}));
      if(q){ items = items.filter(d=>d.word.toLowerCase().includes(q)); }
      items.sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word));
      const lim = currentLimit();
      if(items.length>lim) items = items.slice(0, lim);

      wrap.innerHTML='';
      for(const d of items){
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='pill';
        btn.style.borderRadius='999px';
        btn.style.padding='6px 10px';
        btn.style.border='1px solid #2a3355';
        btn.style.background='#203064';
        btn.style.color='#eef3ff';
        btn.style.cursor='pointer';
        btn.style.fontSize='12px';
        btn.textContent = `${d.word} · ${d.count}`;
        btn.addEventListener('click',()=>{
          setActiveTab && setActiveTab('tab-key');
          pushSelectedChip && pushSelectedChip(d.word);
          updateKeywordResults && updateKeywordResults();
        });
        wrap.appendChild(btn);
      }
      if(items.length===0){
        const p=document.createElement('div');
        p.className='small'; p.textContent='No topics match.';
        wrap.appendChild(p);
      }
    }

    // Attach renderList into tools scope and initial render
    tools.renderList = renderList;
    renderList();
  }

})(); // END HOTFIX v3

/* ====== SpaceBio v4.2 HOTFIX v4 (append-only) =============================
   Paste at the VERY BOTTOM of your existing app.js. Do NOT delete code.
   Fixes:
   1) TopN selector + Raw/Grouped now reliably refresh the right "All Topics".
   2) Language selector re-renders our added UI (simple i18n map included).
   3) Keyword tab mini chart shows only as many bars as fit the width.
   4) Mobile CSS: font sizes & layout so labels and pills don't get cut.
============================================================================ */
(function(){
  'use strict';

  /* ---------------------- CSS for mobile ---------------------- */
  (function injectMobileCSS(){
    if (document.getElementById('sbHotfixV4CSS')) return;
    const css = `
      @media (max-width: 640px){
        #tab-overview .card { margin: 8px 6px; }
        #tab-overview svg text.axis-tick { font-size: 12px; }
        .pill { font-size: 11px !important; padding: 6px 8px !important; }
        #sbAllTopics{ max-height: 360px !important; }
        .toolbar, #sbTopicTools{ gap: 6px !important; }
        #sbTopicFilter{ min-width: 140px !important; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'sbHotfixV4CSS';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /* -------------------- i18n helpers -------------------------- */
  const I18N = {
    'Filter topics…': {
      'ko':'토픽 필터…','en':'Filter topics…','es':'Filtrar temas…','fr':'Filtrer les sujets…','ja':'トピックを絞り込む…','zh':'筛选主题…'
    },
    'Raw': {'ko':'원문','en':'Raw','es':'Bruto','fr':'Brut','ja':'Raw','zh':'原始'},
    'Grouped': {'ko':'그룹','en':'Grouped','es':'Agrupado','fr':'Groupé','ja':'グループ','zh':'分组'},
    'Top 30': {'ko':'상위 30','en':'Top 30','es':'Top 30','fr':'Top 30','ja':'上位30','zh':'前30'},
    'Top 50': {'ko':'상위 50','en':'Top 50','es':'Top 50','fr':'Top 50','ja':'上位50','zh':'前50'},
    'Top 80': {'ko':'상위 80','en':'Top 80','es':'Top 80','fr':'Top 80','ja':'上位80','zh':'前80'},
    'All': {'ko':'전체','en':'All','es':'Todo','fr':'Tout','ja':'すべて','zh':'全部'},
    'No topics match.': {'ko':'일치하는 토픽이 없습니다.','en':'No topics match.','es':'No hay temas coincidentes.','fr':'Aucun sujet correspondant.','ja':'一致するトピックはありません。','zh':'没有匹配的主题。'}
  };
  function getLang(){
    // Try common selectors; fallback to 'en'
    const sel = document.querySelector('#lang, #language, select[aria-label="Language"], .lang-select select') ||
                document.querySelector('select:has(option[value="English"])');
    const val = sel && (sel.value || sel.selectedOptions?.[0]?.value);
    const txt = sel && (sel.selectedOptions?.[0]?.textContent || sel.value);
    const v = (val||txt||'en').toLowerCase();
    if (/ko|kr|korean|한국/.test(v)) return 'ko';
    if (/en|eng|english/.test(v)) return 'en';
    if (/es|spa|espa/.test(v)) return 'es';
    if (/fr|fra|fran/.test(v)) return 'fr';
    if (/ja|jp|日本/.test(v)) return 'ja';
    if (/zh|中|汉/.test(v)) return 'zh';
    return 'en';
  }
  function tr(s){
    const L = getLang();
    if (I18N[s] && I18N[s][L]) return I18N[s][L];
    return s;
  }

  /* -------------------- keyword helpers ----------------------- */
  function kp_tokenize(text){
    const STOP = new Set(["a","an","the","and","or","of","in","on","for","to","from","with","by","at","into","is","are","be","as","we","our","study","using","use","based","analysis","data","result","results","effect","effects","during","after","under","between","within","versus","vs","new","novel","system","systems"]);
    return (text||'').toLowerCase().replace(/[^A-Za-z0-9\s-]/g,' ').split(/\s+/).filter(w=> w && !STOP.has(w) && w.length>=3);
  }
  function kp_counts(records){
    const map = new Map();
    for(const p of (records||[])){
      for(const w of kp_tokenize(p.Title||'')){ map.set(w,(map.get(w)||0)+1); }
    }
    return map;
  }
  function kp_top(map,limit=10){
    return [...map.entries()].map(([word,count])=>({word,count})).sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word)).slice(0,limit);
  }

  /* ----------------- Right panel rebuilders ------------------- */
  function findRightCard(){
    const cards = Array.from(document.querySelectorAll('#tab-overview .card, section[role="tabpanel"].active .card'));
    if(!cards.length) return null;
    const barCard = cards.find(c=>c.querySelector && c.querySelector('#bar')) || null;
    const other = cards.find(c=>c!==barCard) || null;
    return other || barCard;
  }

  function rebuildTopicTools(host){
    let tools = host.querySelector('#sbTopicTools');
    if(!tools){
      tools = document.createElement('div');
      tools.id = 'sbTopicTools';
      tools.className = 'toolbar';
      tools.style.display='flex'; tools.style.flexWrap='wrap'; tools.style.gap='8px'; tools.style.margin='6px 6px 4px';
      host.prepend(tools);
    }
    tools.innerHTML = `
      <input id="sbTopicFilter" type="text" placeholder="${tr('Filter topics…')}" style="background:#0f1635;color:#eef3ff;border:1px solid #2a3355;border-radius:8px;padding:6px 10px;min-width:180px"/>
      <div class="pill-group">
        <button id="sbViewRaw" class="pill">${tr('Raw')}</button>
        <button id="sbViewGrouped" class="pill">${tr('Grouped')}</button>
      </div>
      <select id="sbLimit" style="background:#0f1635;color:#eef3ff;border:1px solid #2a3355;border-radius:8px;padding:6px 10px">
        <option value="30">${tr('Top 30')}</option>
        <option value="50">${tr('Top 50')}</option>
        <option value="80" selected>${tr('Top 80')}</option>
        <option value="all">${tr('All')}</option>
      </select>
    `;
    tools.dataset.mode = tools.dataset.mode || 'raw';
    tools.querySelector('#sbViewRaw').classList.toggle('active', tools.dataset.mode!=='grouped');
    tools.querySelector('#sbViewGrouped').classList.toggle('active', tools.dataset.mode==='grouped');
    return tools;
  }

  function renderAllTopicsPanel(rawMap){
    const host = findRightCard(); if(!host) return;
    const tools = rebuildTopicTools(host);

    let wrap = host.querySelector('#sbAllTopics');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id='sbAllTopics';
      wrap.style.margin = '4px 6px 10px';
      wrap.style.display='flex'; wrap.style.flexWrap='wrap';
      wrap.style.gap='8px'; wrap.style.maxHeight='520px'; wrap.style.overflow='auto';
      host.appendChild(wrap);
    }

    function currentMap(){
      if((tools.dataset.mode||'raw')==='grouped'){
        // simple grouping: merge common families
        const ALIASES = [
          {canon:'space/spaceflight', rx:/(^|\b)(spaceflight|space|station|iss|international|shuttle|mir)\b/},
          {canon:'microgravity',      rx:/(^|\b)(microgravity|micro-g|μg)\b/},
          {canon:'bone/skeletal',     rx:/(^|\b)(bone|skeletal|osteo(blast|clast|cyte))\b/},
          {canon:'muscle',            rx:/(^|\b)(muscle|myo|atrophy|sarcopenia)\b/},
          {canon:'immune',            rx:/(^|\b)(immune|cytokine|t[- ]?cell|b[- ]?cell|macrophage|inflamm)/},
          {canon:'omics/genomics',    rx:/(^|\b)(omics|rna[- ]?seq|transcriptom|microarray|proteomic|metabolom|genome|genes?)/},
          {canon:'rodent',            rx:/(^|\b)(mouse|mice|murine|rat|rats)\b/},
          {canon:'plant/arabidopsis', rx:/(^|\b)(arabidopsis|thaliana|plant|seedling)\b/}
        ];
        const out=new Map();
        for(const [w,c] of rawMap.entries()){
          const hit = ALIASES.find(a=>a.rx.test(w));
          const key = hit ? hit.canon : w;
          out.set(key,(out.get(key)||0)+c);
        }
        return out;
      }
      return rawMap;
    }

    function currentLimit(){
      const v = (tools.querySelector('#sbLimit')||{}).value || '80';
      return v==='all' ? Infinity : parseInt(v,10);
    }
    function filterStr(){ return (tools.querySelector('#sbTopicFilter')||{}).value || ''; }

    function paint(){
      const map = new Map(currentMap());
      const q = filterStr().trim().toLowerCase();
      let items = [...map.entries()].map(([word,count])=>({word,count}));
      if(q) items = items.filter(d=>d.word.toLowerCase().includes(q));
      items.sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word));
      const lim = currentLimit();
      if(items.length>lim) items = items.slice(0, lim);

      wrap.innerHTML='';
      for(const d of items){
        const btn = document.createElement('button');
        btn.type='button'; btn.className='pill';
        btn.style.borderRadius='999px'; btn.style.padding='6px 10px';
        btn.style.border='1px solid #2a3355'; btn.style.background='#203064';
        btn.style.color='#eef3ff'; btn.style.cursor='pointer'; btn.style.fontSize='12px';
        btn.textContent = `${d.word} · ${d.count}`;
        btn.addEventListener('click',()=>{
          setActiveTab && setActiveTab('tab-key');
          pushSelectedChip && pushSelectedChip(d.word);
          updateKeywordResults && updateKeywordResults();
        });
        wrap.appendChild(btn);
      }
      if(items.length===0){
        const p=document.createElement('div');
        p.className='small'; p.textContent=tr('No topics match.');
        wrap.appendChild(p);
      }
    }

    // Robust events (click/input/change on container)
    tools.addEventListener('click', (e)=>{
      if(e.target.id==='sbViewRaw' || e.target.id==='sbViewGrouped'){
        tools.dataset.mode = (e.target.id==='sbViewGrouped'?'grouped':'raw');
        tools.querySelector('#sbViewRaw').classList.toggle('active', tools.dataset.mode!=='grouped');
        tools.querySelector('#sbViewGrouped').classList.toggle('active', tools.dataset.mode==='grouped');
        paint();
      }
    });
    tools.addEventListener('input', (e)=>{ if(e.target.id==='sbTopicFilter') paint(); });
    tools.addEventListener('change', (e)=>{ if(e.target.id==='sbLimit') paint(); });

    paint();
  }

  /* -------------- Overview left re-render + right refresh --------------- */
  const __origRenderOverview = window.renderOverview;
  window.renderOverview = function(){
    try{
      const svg = document.getElementById('bar');
      if(!svg){ return __origRenderOverview && __origRenderOverview(); }
      const recs = window.PUBLICATIONS || [];
      const raw = kp_counts(recs);
      const data = kp_top(raw, 10);

      const longest = Math.max(...data.map(d=> (d.word||'').length), 6);
      const barH=26, gap=12;
      const labelPad = Math.ceil(longest*8)+28; // approx width
      const maxCount = Math.max(1, ...data.map(d=>d.count));
      const countPad = String(maxCount).length*8 + 28;
      const w = svg.clientWidth || (svg.parentNode && svg.parentNode.clientWidth) || 680;
      const pad={l:labelPad, r:countPad, t:18, b:24};
      const innerW = Math.max(120, w - pad.l - pad.r);
      const innerH = data.length*(barH+gap) - gap;

      svg.innerHTML=''; svg.style.height = (pad.t+innerH+pad.b)+'px';

      const g = document.createElementNS(svg.namespaceURI,'g');
      g.setAttribute('transform',`translate(${pad.l} ${pad.t})`); svg.appendChild(g);

      data.forEach((d,i)=>{
        const y=i*(barH+gap);
        const wBar=Math.max(6,(d.count/maxCount)*innerW);
        const lab=document.createElementNS(svg.namespaceURI,'text');
        lab.textContent=d.word; lab.setAttribute('x',-10); lab.setAttribute('y',y+barH*0.72);
        lab.setAttribute('text-anchor','end'); lab.setAttribute('class','axis-tick');
        lab.style.cursor='pointer';
        lab.addEventListener('click',()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(lab);

        const rect=document.createElementNS(svg.namespaceURI,'rect');
        rect.setAttribute('x',0); rect.setAttribute('y',y); rect.setAttribute('width',wBar); rect.setAttribute('height',barH);
        rect.setAttribute('class','bar'); rect.style.cursor='pointer';
        rect.addEventListener('click',()=>{ setActiveTab && setActiveTab('tab-key'); pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
        g.appendChild(rect);

        const val=document.createElementNS(svg.namespaceURI,'text');
        val.textContent=d.count; val.setAttribute('x', wBar+8); val.setAttribute('y', y+barH*0.72);
        val.setAttribute('class','axis-tick'); g.appendChild(val);
      });

      renderAllTopicsPanel(raw);
    }catch(e){
      return __origRenderOverview && __origRenderOverview();
    }
  };

  /* ---------- Keyword tab mini chart: auto-fit bars --------------------- */
  const __origRenderMiniChart = window.renderMiniChart;
  window.renderMiniChart = function(items){
    const svg=document.getElementById('kwMiniChart');
    if(!svg){ return __origRenderMiniChart && __origRenderMiniChart(items); }
    const w=svg.clientWidth|| (svg.parentNode && svg.parentNode.clientWidth) || 320;
    const h=svg.clientHeight||160;
    const pad={l:30,r:6,t:6,b:18}; const innerW=w-pad.l-pad.r, innerH=h-pad.t-pad.b;
    svg.innerHTML='';
    // compute keywords
    const titles=(items||[]).map(p=> (p.Title||'').toLowerCase());
    const map=new Map();
    for(const t of titles){
      for(const w of (t.match(/[a-z0-9\-]+/g)||[])){
        if(w.length<3) continue;
        map.set(w,(map.get(w)||0)+1);
      }
    }
    let data=[...map.entries()].map(([word,count])=>({word,count})).sort((a,b)=> b.count-a.count || a.word.localeCompare(b.word));

    // auto-fit: each bar min 64px + 8px gap
    const per = 72;
    const maxBars = Math.max(5, Math.floor(innerW / per));
    data = data.slice(0, Math.min(maxBars, data.length));

    const barW = Math.max(16, innerW / Math.max(1, data.length));
    const maxC = Math.max(1, ...data.map(d=>d.count));
    const g=document.createElementNS(svg.namespaceURI,'g'); g.setAttribute('transform',`translate(${pad.l} ${pad.t})`); svg.appendChild(g);

    data.forEach((d,i)=>{
      const hgt=Math.max(4,(d.count/maxC)*innerH), x=i*barW+2, y0=innerH-hgt;
      const rect=document.createElementNS(svg.namespaceURI,'rect');
      rect.setAttribute('x',x); rect.setAttribute('y',y0);
      rect.setAttribute('width',Math.max(12,barW-4)); rect.setAttribute('height',hgt);
      rect.setAttribute('class','bar'); rect.setAttribute('role','img'); rect.setAttribute('aria-label', `${d.word}: ${d.count}`);
      rect.style.cursor='pointer';
      rect.addEventListener('click',()=>{ pushSelectedChip && pushSelectedChip(d.word); updateKeywordResults && updateKeywordResults(); });
      g.appendChild(rect);

      const tl=document.createElementNS(svg.namespaceURI,'text');
      tl.textContent=d.word; tl.setAttribute('x', x + Math.max(12,barW-4)/2);
      tl.setAttribute('y', innerH+14); tl.setAttribute('text-anchor','middle');
      tl.setAttribute('class','axis-tick'); tl.setAttribute('title', d.word);
      g.appendChild(tl);
    });
  };

  /* ---------- Re-render when language changes --------------------------- */
  (function hookLang(){
    const langSel = document.querySelector('#lang, #language, select[aria-label="Language"], .lang-select select') ||
                    document.querySelector('select:has(option[value="English"])');
    if(!langSel) return;
    if(langSel.dataset.sbHooked) return;
    langSel.dataset.sbHooked = '1';
    langSel.addEventListener('change', ()=>{
      // rebuild right tools with translated strings & re-render overview
      const recs = window.PUBLICATIONS || [];
      const raw = kp_counts(recs);
      renderAllTopicsPanel(raw);
      if(typeof window.renderOverview==='function'){ window.renderOverview(); }
    });
  })();

})(); // END HOTFIX v4

/* ====== SpaceBio v4.2 HOTFIX v5 (remove Language selector) ===============
   Paste this block at the VERY BOTTOM of your existing app.js.
   - Hides/removes the Language dropdown and its label/container.
   - Disables interactions and clears any saved 'lang' key (if used).
   - No other behaviors changed.
============================================================================ */
(function(){
  'use strict';

  function killLangUI(){
    try{
      // CSS safeguard
      if(!document.getElementById('sbHotfixV5CSS')){
        const style = document.createElement('style');
        style.id = 'sbHotfixV5CSS';
        style.textContent = `
          .lang-select, #lang, #language, select[aria-label="Language"],
          label[for="lang"], label[for="language"],
          .language-switcher { display: none !important; visibility: hidden !important; }
        `;
        document.head.appendChild(style);
      }

      const sels = [
        '#lang', '#language', '.lang-select select', 'select[aria-label="Language"]'
      ].flatMap(sel => Array.from(document.querySelectorAll(sel)));

      sels.forEach(el=>{
        try{
          el.disabled = true;
          el.setAttribute('tabindex','-1');
          el.setAttribute('aria-hidden','true');
          // hide nearest container if present
          const container = el.closest('.lang-select') || el.parentElement;
          if(container) container.style.display='none';
          else el.style.display='none';
        }catch(_){}
      });

      // Hide any loose label that reads "Language"
      const labels = Array.from(document.querySelectorAll('label, .label, span, div')).filter(n=>/^\s*language\s*$/i.test((n.textContent||'').trim()));
      labels.forEach(n=>{
        const wrap = n.closest('div') || n;
        wrap.style.display='none';
      });

      // Optional: clear stored language code
      try{ localStorage.removeItem('lang'); }catch(_){}
    }catch(e){ /* ignore */ }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', killLangUI, {once:true});
  }else{
    killLangUI();
  }

})();



/* ====== SpaceBio v4.2 HOTFIX v6 (append-only) ============================
   Paste at the VERY BOTTOM of your existing app.js (DO NOT delete code).
   Changes:
   1) Overview left card title fixed to "Top Topics (by title tokens)" and aligned.
   2) Adds a low-opacity NASA Space Apps watermark to the UI (fixed position).
      - Looks for local assets (assets/spaceapps_seoul.png/svg or data/spaceapps_seoul.png).
      - Falls back to a text watermark if image not found.
   3) Hides/removes the "All years" selector from Keyword Search.
============================================================================ */
(function(){
  'use strict';

  /* ---------- 1) Fix Overview title text & alignment ---------- */
  function fixOverviewHeading(){
    try{
      const barCard = document.querySelector('#tab-overview .card #bar')?.closest('.card');
      if(!barCard) return;
      // Find header element inside card
      const header = barCard.querySelector('h3, h2, .card-title, .header, .title') || barCard.querySelector('[id*="heading"]');
      const txt = 'Top Topics (by title tokens)';
      if(header){
        header.textContent = txt;
        header.style.marginBottom = '10px';
      }
      // Optional hint
      const hint = barCard.querySelector('#hintMinBar, .muted, .small');
      if(hint && /year/i.test(hint.textContent||'')){
        hint.textContent = 'Click a bar or label to search by that keyword.';
      }
    }catch(e){ /* ignore */ }
  }

  /* -------------- 2) NASA Space Apps watermark ---------------- */
  function injectWatermark(){
    try{
      if(document.getElementById('sbWatermark')) return;
      const wrap = document.createElement('div');
      wrap.id = 'sbWatermark';
      wrap.style.position = 'fixed';
      wrap.style.right = '18px';
      wrap.style.bottom = '18px';
      wrap.style.width = '140px';
      wrap.style.height = '140px';
      wrap.style.opacity = '0.10';
      wrap.style.pointerEvents = 'none';
      wrap.style.zIndex = '10'; /* low overlay */
      document.body.appendChild(wrap);

      const img = document.createElement('img');
      img.id = 'sbWatermarkImg';
      img.alt = 'NASA Space Apps';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.filter = 'grayscale(20%)';
      wrap.appendChild(img);

      const candidates = [
        'assets/spaceapps_seoul.png',
        'assets/logos/spaceapps_seoul.png',
        'assets/spaceapps_seoul.svg',
        'data/spaceapps_seoul.png',
        'spaceapps_seoul.png'
      ];
      let idx = 0;
      function tryNext(){
        if(idx >= candidates.length){
          // fallback text badge
          wrap.removeChild(img);
          wrap.style.display = 'flex';
          wrap.style.alignItems = 'center';
          wrap.style.justifyContent = 'center';
          wrap.style.color = '#9fb2ff';
          wrap.style.border = '1px dashed #324071';
          wrap.style.borderRadius = '12px';
          wrap.style.fontWeight = '700';
          wrap.style.fontSize = '12px';
          wrap.textContent = 'NASA SPACE APPS';
          return;
        }
        const url = candidates[idx++];
        img.src = url + '?v=' + Date.now(); // bust cache
      }
      img.onerror = tryNext;
      img.onload = function(){ /* success, do nothing */ };
      tryNext();

    }catch(e){ /* ignore */ }
  }

  /* -------------- 3) Remove / hide "All years" selector --------------- */
  function killYearSelector(){
    try{
      // Look inside Keyword Search tab
      const tab = document.querySelector('#tab-key, #tab-keyword, #tab-keywords, section[data-tab="key"]');
      if(!tab) return;
      const selects = Array.from(tab.querySelectorAll('select'));
      for(const sel of selects){
        const txt = (sel.selectedOptions && sel.selectedOptions[0]?.textContent || '').trim().toLowerCase();
        const hasAllYears = txt.includes('years');
        const hasYearWord = Array.from(sel.options||[]).some(o => /years|\b20\d{2}\b|\b19\d{2}\b/i.test(o.textContent||''));
        if(hasAllYears || hasYearWord){
          sel.style.display = 'none';
          // also hide label next to it if any
          const label = sel.previousElementSibling;
          if(label && /year/i.test((label.textContent||''))) label.style.display='none';
        }
      }
    }catch(e){ /* ignore */ }
  }

  /* -------------- Hooks: initial + navigation ------------------ */
  function bootstrap(){
    fixOverviewHeading();
    injectWatermark();
    killYearSelector();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', bootstrap, {once:true});
  }else{
    bootstrap();
  }

  // Re-apply when tabs change, if app exposes setActiveTab
  const origSetActiveTab = window.setActiveTab;
  window.setActiveTab = function patchedTab(id){
    const ret = origSetActiveTab ? origSetActiveTab.apply(this, arguments) : undefined;
    try{ killYearSelector(); fixOverviewHeading(); }catch(_){}
    return ret;
  };

  // Also re-run after renderOverview
  const origRenderOverview = window.renderOverview;
  window.renderOverview = function patchedOverview(){
    const r = origRenderOverview ? origRenderOverview.apply(this, arguments) : undefined;
    try{ fixOverviewHeading(); }catch(_){}
    return r;
  };

})(); // END HOTFIX v6

/* ====== SpaceBio v4.2 HOTFIX v7 (append-only) ============================
   Paste this block at the VERY BOTTOM of your existing app.js.
   - Hides the "All years" dropdown in Explore Publications (and keeps hidden on tab switches).
   - Adds a small NASA Space Apps logo at the TOP-RIGHT of the app header.
   - Keeps previous hotfixes intact.
============================================================================ */
(function(){
  'use strict';

  /* --- Remove "All years" selector in Explore Publications & Keyword Search --- */
  function hideAllYearsInTabs(){
    try{
      const tabs = ['#tab-explore', '#tab-key', '#tab-keyword', '#tab-keywords'];
      for(const sel of tabs){
        const root = document.querySelector(sel);
        if(!root) continue;
        const selects = Array.from(root.querySelectorAll('select'));
        for(const s of selects){
          const selTxt = (s.selectedOptions && s.selectedOptions[0]?.textContent || '').trim().toLowerCase();
          const hasYearsWord = /all\s*years/i.test(selTxt) ||
            Array.from(s.options||[]).some(o => /all\s*years|^\s*20\d{2}\s*$|^\s*19\d{2}\s*$/i.test((o.textContent||'').trim()));
          if(hasYearsWord){
            // Hide select + near label
            s.style.display = 'none';
            const prev = s.previousElementSibling;
            if(prev && /year/i.test((prev.textContent||''))) prev.style.display='none';
            // Add data-flag so we don't process again
            s.dataset.sbHidden = '1';
          }
        }
      }
    }catch(e){ /* ignore */ }
  }

  /* --- Add Space Apps logo at top-right of the header --- */
  function injectTopRightLogo(){
    try{
      if(document.getElementById('sbHeaderLogo')) return;
      // Find a header container (title bar area)
      const host = document.querySelector('header, .header, .topbar, .app-header, body');
      const wrap = document.createElement('div');
      wrap.id = 'sbHeaderLogo';
      wrap.style.position = 'fixed';
      wrap.style.top = '12px';
      wrap.style.right = '16px';
      wrap.style.width = '96px';
      wrap.style.height = '96px';
      wrap.style.opacity = '0.25';       // light accent
      wrap.style.pointerEvents = 'none'; // purely decorative
      wrap.style.zIndex = '20';
      (host || document.body).appendChild(wrap);

      const img = document.createElement('img');
      img.alt = 'NASA Space Apps';
      img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain';
      img.style.filter='grayscale(10%)';
      wrap.appendChild(img);

      const candidates = [
        'assets/spaceapps_seoul.png',
        'assets/logos/spaceapps_seoul.png',
        'assets/spaceapps_seoul.svg',
        'data/spaceapps_seoul.png',
        'spaceapps_seoul.png'
      ];
      let i=0;
      function next(){
        if(i>=candidates.length){
          // fallback: text badge
          wrap.removeChild(img);
          wrap.style.display='flex';
          wrap.style.alignItems='center';
          wrap.style.justifyContent='center';
          wrap.style.borderRadius='12px';
          wrap.style.border='1px dashed #324071';
          wrap.style.color='#9fb2ff';
          wrap.style.fontWeight='700';
          wrap.style.fontSize='11px';
          wrap.textContent='NASA SPACE APPS';
          return;
        }
        img.src = candidates[i++] + '?v=' + Date.now();
      }
      img.onerror = next; img.onload = function(){};
      next();
    }catch(e){ /* ignore */ }
  }

  /* --- Boot and re-run on tab change ------------------------------------- */
  function boot(){
    hideAllYearsInTabs();
    injectTopRightLogo();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }

  // Re-run after tab switches
  const __origSetActiveTab = window.setActiveTab;
  window.setActiveTab = function patchedSetActiveTab(id){
    const r = __origSetActiveTab ? __origSetActiveTab.apply(this, arguments) : undefined;
    try{ hideAllYearsInTabs(); }catch(_){}
    return r;
  };

})(); // END HOTFIX v7


/* ====== SpaceBio v4.2 HOTFIX v8 (append-only) ============================
   Purpose: Replace the top-right NASA Space Apps header badge with the
   provided official image (no text fallback). Keep previous patches intact.
   HOW: Paste this block at the VERY BOTTOM of your existing app.js.
============================================================================ */
(function(){'use strict';
  function ensureTopRightLogo(){
    try{
      let wrap = document.getElementById('sbHeaderLogo');
      if(!wrap){
        const host = document.querySelector('header, .header, .topbar, .app-header, body') || document.body;
        wrap = document.createElement('div');
        wrap.id = 'sbHeaderLogo';
        host.appendChild(wrap);
      }
      // style
      Object.assign(wrap.style, {
        position:'fixed', top:'12px', right:'16px', width:'96px', height:'96px',
        opacity:'0.25', pointerEvents:'none', zIndex:'20'
      });
      // clear previous children (including any text fallback)
      while(wrap.firstChild) wrap.removeChild(wrap.firstChild);
      // inject exact image
      const img = document.createElement('img');
      img.alt = 'NASA Space Apps';
      img.src = 'data:image/png;base64,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iAB/CJCs/uRIW0SACBABIkAEKkiAZLWCAOl0IkAEiAARIAI/CZCs/mRBW/wmQOURASJABMSOAMmq2JmcOkwEiAARIAKVR4BktfLYUslEgN8EqDwiQAQEngDJqsCbiBpIBIgAESACwkOAZFV4bEUtJQJEgN8EqDwiwHcCJKt8R0oFEgEiQASIgPgSIFkVX9tTz4kAESAC/CZA5UmQrNJFQASIABEgAkSAbwRIVvmGkgoiAkSACBABIsBnWSWgRIAIEAEiQATEmQDJqjhbn/pOBIgAESACfCZAsspnoPwujsojAkSACBABYSJAsipM1qK2EgEiQASIgIATIFkVcANR8/hNgMojAkSACFQmAZLVyqRLZRMBIkAEiICYESBZFTODU3eJAL8JUHlEgAgUJ0CyWpwGbRMBIkAEiAARqBABktUK4aOTiQARIAL8JkDlCTcBklXhth+1nggQASJABASKAMmqQJmDGkMEiAARIAL8JlC15ZGsVi1vqo0IEAEiQAREmgDJqkiblzpHBIgAESACVUtAHGS1aolSbUSACBABIiDGBEhWxdj41HUiQASIABHgNwGSVX4TFYfyqI9EgAgQASLwGwIkq78BQ7uJABEgAkSACJSdAMlq2ZnRGUSA3wSoPCJABESGwP8AAAD//8RjIssAAAAGSURBVAMAbUzcsOBCCYsAAAAASUVORK5CYII=';
      Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', filter:'grayscale(10%)' });
      wrap.appendChild(img);
    }catch(e){ /* ignore */ }
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ensureTopRightLogo, {once:true}); }
  else ensureTopRightLogo();
  const _setActiveTab = window.setActiveTab;
  window.setActiveTab = function sbLogoPatch(){ const r = _setActiveTab ? _setActiveTab.apply(this, arguments) : undefined; try{ ensureTopRightLogo(); }catch(_ ){} return r; };
})();

