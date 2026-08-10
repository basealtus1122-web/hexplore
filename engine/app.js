/* =====================================================================
   Hexplore It — ENGINE (app.js)
   화면: builder → series → board.  board 상단 탭 + 오버레이 + 저장/기록.
   데이터(data.js)만 바꾸면 내용이 바뀌고, 이 파일은 대체로 건드리지 않습니다.
   ===================================================================== */
(function(){
const {CAT,STAT_ORDER,STAT_META,SHARED,SERIES}=window.HEX;

/* ---------- app state ---------- */
const APP={
  screen:"builder",              // builder | series | board
  sel:{raceId:null,classId:null,traitIds:[]},
  builderTab:"race",             // race | class | trait
  char:null,
  tab:"board",                   // board | keyword id...
};

/* ---------- utils ---------- */
const $=(s,r=document)=>r.querySelector(s);
const root=$("#app");
const clone=o=>JSON.parse(JSON.stringify(o));
const nm=o=>o?`${o.en} <span class="ko">(${o.ko})</span>`:"";
const zero=()=>({health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0});
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
};
function fmtDate(iso){if(!iso)return"—";const d=new Date(iso);return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;}

/* ---------- character build & compute ---------- */
function initTrack(t){if(!t)return null;if(t.type==="check")return{type:"check",used:false};if(t.type==="count")return{type:"count",value:0,max:t.max||3};return null;}
function buildCharacter(sel,seriesId){
  const race=SHARED.races[sel.raceId], cls=SHARED.classes[sel.classId];
  const char={
    raceId:sel.raceId,classId:sel.classId,traitIds:[...sel.traitIds],series:seriesId,
    filled:zero(),mod:zero(),
    curHealth:0,curEnergy:0,regenHealth:0,regenEnergy:0,
    gold:0,food:0,foodUse:race?race.foodUse:0,
    favoredEnemies:race?[clone(race.favoredEnemy)]:[],
    items:[],boosts:{},abilities:[],
    startDate:new Date().toISOString(),
  };
  if(race&&race.ability)char.abilities.push({id:"aRace",src:"race",name:clone(race.ability.name),desc:race.ability.desc,track:initTrack(race.ability.track)});
  sel.traitIds.forEach(tid=>{const t=SHARED.traits[tid];if(t)char.abilities.push({id:"t_"+tid,src:t.type,name:clone(t.name),desc:t.desc,track:initTrack(t.track)});});
  char.curHealth=effOf(char,"health");char.curEnergy=effOf(char,"energy");
  return char;
}
function baseCharOf(char,k){const cls=SHARED.classes[char.classId],race=SHARED.races[char.raceId];return (cls.stats[k]?cls.stats[k].base:0)+((race&&race.mods[k])||0);}
function effOf(char,k){return Math.max(0,baseCharOf(char,k)+char.filled[k]+char.mod[k]);}
function makeE(char,key){const s=(char.boosts&&char.boosts[key])||{};return{lv:k=>effOf(char,k),b:n=>s[n]||0,on:n=>(s[n]||0)>0};}
/* 강화(boost): 기술별 저장소 + 임의 랭크 스케줄. 구버전(평면) 저장본은 firstMastery로 마이그레이션 */
function normBoosts(char){if(!char.boosts||typeof char.boosts!=="object"){char.boosts={};return;}const ks=Object.keys(char.boosts);if(ks.length&&ks.every(k=>/^\d+$/.test(k)))char.boosts={firstMastery:Object.assign({},char.boosts)};}
function boostEarned(char,key){const st=SHARED.classes[char.classId].stats[key],lv=effOf(char,key);return st&&st.boostAt?st.boostAt.filter(t=>lv>=t).length:Math.floor(lv/3);}

/* ---------- text expand (tokens · kw · condition) ---------- */
function expand(char,t){
  const cls=SHARED.classes[char.classId];
  return t.replace(/\{(\w+)\}/g,(m,k)=>cls.stats[k]?`<span class="ref" style="color:var(--g-${k})">${cls.stats[k].name.en}</span>`:m)
    .replace(/<hp>(.*?)<\/hp>/g,'<b class="hpc">$1</b>')
    .replace(/<en>(.*?)<\/en>/g,'<b class="enc">$1</b>')
    .replace(/<kw>(.*?)<\/kw>/g,(m,x)=>`<span class="kw" data-kind="kw" data-term="${x.toLowerCase()}">${x}</span>`)
    .replace(/<state>(.*?)<\/state>/g,(m,x)=>`<span class="state" data-kind="state" data-term="${x.toLowerCase()}">${x}</span>`);
}

/* ---------- hexagon ---------- */
const HEX_ANGLES=[90,30,330,270,210,150];
const DMG={
  health:   {en:"Health dmg",   ko:"체력 피해",   color:"var(--g-health)"},
  energy:   {en:"Energy dmg",   ko:"에너지 피해", color:"var(--g-energy)"},
  influence:{en:"Influence dmg", ko:"영향력 피해", color:"#d072b6"},
};
/* st.dmg = "health" 또는 ["health","influence"] → 피해타입 태그(들) */
function dmgTags(dmg){
  if(!dmg)return"";
  return (Array.isArray(dmg)?dmg:[dmg]).filter(d=>DMG[d]).map(d=>{const c=DMG[d].color;
    return `<div class="dmg-tag" style="margin:4px 4px 0 0;display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;color:${c};border:1px solid ${c};background:color-mix(in srgb,${c} 14%,transparent)">${DMG[d].en} <span class="ko">(${DMG[d].ko})</span></div>`;
  }).join("");
}
function hexPath(cx,cy,R){return"M"+[0,60,120,180,240,300].map(a=>{const r=a*Math.PI/180;return`${(cx+R*Math.cos(r)).toFixed(2)},${(cy-R*Math.sin(r)).toFixed(2)}`}).join("L")+"Z";}
function renderHex(char,key,showName=true){
  const cls=SHARED.classes[char.classId],st=cls.stats[key],meta=STAT_META[key];
  const filled=char.filled[key],val=effOf(char,key),m=char.mod[key],bc=baseCharOf(char,key);
  const nmEn=st&&st.name?st.name.en:meta.role, nmKo=st&&st.name?st.name.ko:meta.roleKo;
  const cx=63,cy=63,R=52,apo=R*Math.cos(Math.PI/6);let pips="";
  HEX_ANGLES.forEach((a,i)=>{const r=a*Math.PI/180,px=cx+apo*Math.cos(r),py=cy-apo*Math.sin(r),on=i<filled;
    pips+=`<circle class="pip ${on?'full':'empty'}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${on?7:5.5}" ${on?`style="fill:var(--g-${key})"`:`style="stroke:var(--edge-bright)"`} data-hex="${key}" data-idx="${i}"></circle>`;});
  return `<div class="hex-cell">
    <svg class="hex-svg" viewBox="0 0 126 126">
      <path class="hex-poly" d="${hexPath(cx,cy,R)}" style="fill:color-mix(in srgb,var(--c-${key}) 26%,#12101a);stroke:var(--g-${key})"/>
      ${pips}
      <text class="hex-val" x="63" y="58" text-anchor="middle" dominant-baseline="middle" style="fill:var(--g-${key})">${val}</text>
      <text class="hex-sub" x="63" y="80" text-anchor="middle">base ${bc}${filled?` +${filled}`:""}${m?(m>0?` \u25B2${m}`:` \u25BC${-m}`):""}</text>
    </svg>
    ${showName?`<div class="hex-role">${meta.role} · ${meta.roleKo}</div><div class="hex-title" style="color:var(--g-${key})">${nmEn}</div><div class="hex-ko">${nmKo}</div>${dmgTags(st&&st.dmg)}`:""}
    <div class="hex-mod">
      <button data-mod="${key}" data-dir="-1" title="효과로 인한 감소">\u2212</button>
      <span class="mtag">${m?`<b>${m>0?'+':''}${m}</b>`:'효과'}</span>
      <button data-mod="${key}" data-dir="1" title="효과로 인한 증가">\uFF0B</button>
    </div></div>`;
}

/* ---------- mastery card (data-driven) ---------- */
function renderMastery(char,key){
  const cls=SHARED.classes[char.classId],st=cls.stats[key];
  if(!st||!st.desc)return"";
  const E=makeE(char,key),lv=effOf(char,key);
  const outs=(st.readout?st.readout(E):[]).map(o=>`<div class="stat-out"><span class="lab">${o.lab}</span><span class="num" style="${o.color==='neutral'?'color:var(--ink)':`color:var(--g-${o.color})`}">${o.val}</span></div>`).join("");
  let boostsHTML="";
  if(st.boosts&&st.boosts.length){
    const store=(char.boosts&&char.boosts[key])||{};
    const earned=boostEarned(char,key),used=Object.values(store).reduce((a,b)=>a+b,0);
    const sched=st.boostAt?` · ${st.boostAt.join('·')}랭크`:` · 3레벨마다`;
    const rows=st.boosts.map((b,i)=>{
      const n=i+1,cnt=store[n]||0,on=cnt>0,canPick=used<earned,locked=!on&&!canPick;
      const toggle=b.stack?`<button class="boost-toggle" data-boost="${n}" data-mkey="${key}" data-stack="1" ${!canPick?'disabled':''}>+</button>`
        :`<button class="boost-toggle" data-boost="${n}" data-mkey="${key}" ${(!on&&!canPick)?'disabled':''}>${on?'\u2726':'+'}</button>`;
      return `<div class="boost ${on?'on':''} ${locked?'locked':''}">${toggle}<div class="boost-txt">${expand(char,b.txt)}${b.stack&&cnt>0?`<span class="stack">\u00D7${cnt}</span>`:""}</div></div>`;
    }).join("");
    boostsHTML=`<div class="boosts"><div class="boost-head"><span>Boosts 강화${sched}</span><span class="pick-badge">획득 <b>${earned}</b> · 사용 <b>${used}</b></span></div>${rows}</div>`;
  }
  return `<div class="mastery ${key==='firstMastery'?'fm':'sm'}">
    <div class="m-head"><span class="m-name">${st.name.en}<span class="ko">(${st.name.ko})</span></span><span class="m-lvl">${STAT_META[key].role} · Lv <b>${lv}</b></span></div>
    <div class="readout">${outs}</div>
    <div class="m-desc">${expand(char,st.desc)}</div>
    ${boostsHTML}</div>`;
}

/* ---------- category tags ---------- */
function catTags(cls){
  const c=cls.category,keys=c.key==="dual"?(c.members||[]):[c.key];
  const tags=keys.filter(k=>CAT[k]).map(k=>{const t=CAT[k];return`<span class="cat-tag" style="color:${t.g};border-color:${t.c};background:color-mix(in srgb,${t.c} 12%,transparent)">${t.en} · ${t.ko}</span>`;}).join("");
  return c.key==="dual"?`<span class="cat-tag" style="color:var(--ink-dim);border-color:var(--edge-bright)">Dual · 듀얼</span>${tags}`:tags;
}
function catColor(cls){const c=cls.category,k=c.key==="dual"?(c.members&&c.members[0]):c.key;return CAT[k]?CAT[k].c:"var(--edge-bright)";}

/* =====================================================================
   SCREEN: BUILDER
   ===================================================================== */
function renderBuilder(){
  const raceList=Object.values(SHARED.races), classList=Object.values(SHARED.classes), traitList=Object.values(SHARED.traits);
  const seg=(id,label)=>`<button class="seg ${APP.builderTab===id?'on':''}" data-btab="${id}">${label}</button>`;
  let body="";
  if(APP.builderTab==="race") body=pickList(raceList,APP.sel.raceId,"race",r=>racePreview(r));
  else if(APP.builderTab==="class") body=pickList(classList,APP.sel.classId,"class",c=>classPreview(c));
  else body=traitPicker(traitList);

  const race=SHARED.races[APP.sel.raceId], cls=SHARED.classes[APP.sel.classId];
  const ready=APP.sel.raceId&&APP.sel.classId;
  const summary=`<div class="build-summary">
    <span class="bs ${race?'set':''}">종족 <b>${race?race.name.en:'—'}</b></span>
    <span class="bs ${cls?'set':''}">직업 <b>${cls?cls.name.en:'—'}</b></span>
    <span class="bs ${APP.sel.traitIds.length?'set':''}">특성 <b>${APP.sel.traitIds.length||'—'}</b></span>
  </div>`;

  root.innerHTML=`<div class="wrap">
    <div class="builder-head">
      <div class="wordmark">HEXPLORE IT</div>
      <div class="sub">Character Builder · 캐릭터 생성</div>
    </div>
    <div class="segbar">${seg("race","Race 종족")}${seg("class","Class 직업")}${seg("trait","Traits 특성")}</div>
    <div class="build-body">${body}</div>
    ${summary}
    <div class="build-actions">
      <button class="btn primary big" id="toSeries" ${ready?'':'disabled'}>확정 → 시리즈 선택</button>
      ${ready?'':'<span class="hint">종족과 직업을 선택하세요 (특성은 선택 사항 · 게임 중 추가 가능)</span>'}
    </div>
  </div>`;

  root.querySelectorAll("[data-btab]").forEach(b=>b.onclick=()=>{APP.builderTab=b.dataset.btab;renderBuilder();});
  root.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{
    const kind=b.dataset.kind,id=b.dataset.pick;
    if(kind==="race")APP.sel.raceId=(APP.sel.raceId===id?null:id);
    if(kind==="class")APP.sel.classId=(APP.sel.classId===id?null:id);
    renderBuilder();
  });
  root.querySelectorAll("[data-trait]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.trait,i=APP.sel.traitIds.indexOf(id);
    if(i>=0)APP.sel.traitIds.splice(i,1);else APP.sel.traitIds.push(id);
    renderBuilder();
  });
  const ts=$("#toSeries");if(ts)ts.onclick=()=>{if(ready){APP.screen="series";render();}};
}
function pickList(list,selId,kind,previewFn){
  if(!list.length)return`<div class="empty-note">데이터가 아직 없습니다. data.js에 추가하세요.</div>`;
  const cards=list.map(x=>`<button class="pick-card ${selId===x.id?'on':''}" data-pick="${x.id}" data-kind="${kind}">
    <div class="pc-name">${x.name.en}</div><div class="pc-ko">${x.name.ko}</div></button>`).join("");
  const sel=list.find(x=>x.id===selId);
  return `<div class="pick-grid">${cards}</div>${sel?`<div class="preview">${previewFn(sel)}</div>`:`<div class="empty-note">위에서 하나 선택하면 상세가 표시됩니다.</div>`}`;
}
function racePreview(r){
  const mods=STAT_ORDER.filter(k=>r.mods[k]).map(k=>`<span class="modpill" style="color:var(--g-${k})">${STAT_META[k].role} ${r.mods[k]>0?'+':''}${r.mods[k]}</span>`).join("")||`<span class="empty-note" style="padding:0">보정 없음</span>`;
  return `<div class="pv-title">${r.name.en} <span class="ko">(${r.name.ko})</span></div>
    <div class="pv-row"><span class="pv-lbl">Favored Enemy 숙적</span> ${r.favoredEnemy.en} (${r.favoredEnemy.ko})</div>
    <div class="pv-row"><span class="pv-lbl">Food Use 음식소모</span> ${r.foodUse}</div>
    <div class="pv-mods">${mods}</div>
    <div class="pv-ability">${r.ability?`<b>${r.ability.name.en} (${r.ability.name.ko})</b> — ${r.ability.desc.replace(/<[^>]+>/g,"")}`:""}</div>
    <div class="flavor">${r.flavor||""}</div>`;
}
function classPreview(c){
  const tag=catTags(c);
  const stats=STAT_ORDER.map(k=>c.stats[k]?`<span class="modpill" style="color:var(--g-${k})">${STAT_META[k].role} ${c.stats[k].base}</span>`:"").join("");
  const masteries=["firstMastery","secondMastery"].filter(k=>c.stats[k]&&c.stats[k].name).map(k=>`<div class="pv-row"><span class="pv-lbl" style="color:var(--g-${k})">${STAT_META[k].role}</span> ${c.stats[k].name.en} (${c.stats[k].name.ko})</div>`).join("");
  return `<div class="pv-title">${c.name.en} <span class="ko">(${c.name.ko})</span></div>
    <div style="margin:6px 0">${tag}</div>
    <div class="pv-mods">${stats}</div>
    ${masteries}
    <div class="pv-ability">${c.special?c.special.ko.replace(/<[^>]+>/g,""):""}</div>`;
}
function traitPicker(list){
  if(!list.length)return`<div class="empty-note">특성 데이터가 아직 없습니다. (traits / aspects / keepsakes)<br>data.js의 SHARED.traits 에 추가하세요. 게임 중에도 판에서 직접 추가할 수 있습니다.</div>`;
  const srcName={trait:"Trait 트레잇",aspect:"Aspect 애스펙트",keepsake:"Keepsake 킵세이크"};
  const cards=list.map(t=>`<button class="pick-card wide ${APP.sel.traitIds.includes(t.id)?'on':''}" data-trait="${t.id}">
    <div class="pc-src">${srcName[t.type]||t.type}</div>
    <div class="pc-name">${t.name.en} <span class="pc-ko">(${t.name.ko})</span></div>
    <div class="pc-desc">${t.desc.replace(/<[^>]+>/g,"")}</div></button>`).join("");
  return `<div class="pick-list">${cards}</div><div class="hint" style="margin-top:8px">여러 개 선택 가능 · 게임 중 판에서도 추가/제거할 수 있습니다.</div>`;
}

/* =====================================================================
   SCREEN: SERIES
   ===================================================================== */
function renderSeries(){
  const race=SHARED.races[APP.sel.raceId], cls=SHARED.classes[APP.sel.classId];
  const cards=Object.values(SERIES).map(s=>`<button class="series-card" data-series="${s.id}">
    <div class="sc-badge">${s.short}</div>
    <div class="sc-name">${s.name.en}</div><div class="sc-ko">${s.name.ko}</div>
    <div class="sc-note">키워드 · 컨디션 · 룰 · 아이템 · 기타 참조표가 이 시리즈 기준으로 적용됩니다.</div>
  </button>`).join("");
  root.innerHTML=`<div class="wrap">
    <div class="builder-head"><div class="wordmark">HEXPLORE IT</div><div class="sub">Select Series · 시리즈 선택</div></div>
    <div class="chosen">${race.name.en} <span class="ko">(${race.name.ko})</span> · <span style="color:${catColor(cls)}">${cls.name.en}</span> <span class="ko">(${cls.name.ko})</span></div>
    <div class="series-grid">${cards}</div>
    <div class="build-actions"><button class="btn" id="backBuild">← 캐릭터 수정</button></div>
  </div>`;
  root.querySelectorAll("[data-series]").forEach(b=>b.onclick=()=>{
    APP.char=buildCharacter(APP.sel,b.dataset.series);APP.tab="board";APP.screen="board";render();
  });
  $("#backBuild").onclick=()=>{APP.screen="builder";render();};
}

/* =====================================================================
   SCREEN: BOARD  (+ top tabs + overlay + toolbar)
   ===================================================================== */
function renderBoard(){
  const char=APP.char,cls=SHARED.classes[char.classId],series=SERIES[char.series];
  normBoosts(char);
  // top tabs
  const tabs=[{id:"board",label:"Board 캐릭터판"},{id:"keywords",label:"Keywords 키워드"},{id:"conditions",label:"Conditions 컨디션"},{id:"rules",label:"Rules 룰"},{id:"items",label:"Items 아이템"}];
  (series.extras||[]).forEach(x=>tabs.push({id:"extra:"+x.id,label:`${x.label.en} ${x.label.ko}`}));
  const tabbar=tabs.map(t=>`<button class="tab ${APP.tab===t.id?'on':''}" data-tab="${t.id}">${t.label}</button>`).join("");

  const toolbar=`<div class="toolbar">
    <button class="tbtn" id="tbSave">저장</button>
    <button class="tbtn" id="tbLoad">불러오기</button>
    <button class="tbtn" id="tbExport">파일로 내보내기</button>
    <button class="tbtn" id="tbRecords">게임 기록</button>
    <button class="tbtn warn" id="tbEnd">게임 종료·기록</button>
    <button class="tbtn" id="tbNew">새 캐릭터</button>
  </div>`;

  let content = APP.tab==="board" ? boardBody(char) : referenceBody(char,series,APP.tab);

  root.innerHTML=`<div class="wrap board-wrap">
    <div class="topbar">
      <div class="tb-id">${SHARED.races[char.raceId].name.en} · <span style="color:${catColor(cls)}">${cls.name.en}</span> <span class="series-pill">HEX ${series.short}</span></div>
      ${toolbar}
    </div>
    <div class="tabbar">${tabbar}</div>
    <div class="tab-content">${content}</div>
  </div>`;

  // tab switching
  root.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{APP.tab=b.dataset.tab;renderBoard();});
  // toolbar
  $("#tbSave").onclick=saveCharacterModal;
  $("#tbLoad").onclick=loadCharacterModal;
  $("#tbExport").onclick=exportCharacter;
  $("#tbRecords").onclick=recordsModal;
  $("#tbEnd").onclick=endGameModal;
  $("#tbNew").onclick=()=>{if(confirm("현재 캐릭터를 두고 새 캐릭터를 만들까요? (저장하지 않은 변경은 사라집니다)")){APP.sel={raceId:null,classId:null,traitIds:[]};APP.char=null;APP.screen="builder";render();}};

  if(APP.tab==="board")bindBoard(char);
  bindTerms(char);   // keyword/condition overlay from any tab
}

function boardBody(char){
  const cls=SHARED.classes[char.classId],race=SHARED.races[char.raceId];
  const foeHTML=char.favoredEnemies.map((f,i)=>`<span class="chip">${f.en} (${f.ko})<button data-foe="${i}">\u2715</button></span>`).join("")+`<button class="add-btn" id="addFoe">+ 추가</button>`;
  const combat=["attack","defence","firstMastery","secondMastery"].map(k=>renderHex(char,k)).join("");
  const skills=["navigate","explore","survival"].map(k=>renderHex(char,k)).join("");
  const masteries=`<div class="mastery-grid">${renderMastery(char,"firstMastery")}${renderMastery(char,"secondMastery")}</div>`;
  const srcMeta={race:["Race","종족","src-race"],trait:["Trait","트레잇","src-trait"],aspect:["Aspect","애스펙트","src-aspect"],keepsake:["Keepsake","킵세이크","src-keepsake"],class:["Class","직업","src-class"],event:["Event","이벤트","src-event"]};
  const abilityHTML=char.abilities.map(a=>{
    const m=srcMeta[a.src]||["?","?","src-event"];let track="";
    if(a.track&&a.track.type==="check")track=`<div class="ab-track"><div class="track-check"><button class="${a.track.used?'done':''}" data-abcheck="${a.id}">${a.track.used?'\u2713':''}</button></div><span style="font-size:12px;color:var(--ink-faint)">${a.track.used?'사용함 · 탭하여 초기화':'사용 시 탭'}</span></div>`;
    else if(a.track&&a.track.type==="count")track=`<div class="ab-track"><div class="track-count"><button data-abcount="${a.id}" data-dir="-1">\u2212</button><span class="cval">${a.track.value}</span><button data-abcount="${a.id}" data-dir="1">\uFF0B</button><span style="font-size:11px;color:var(--ink-faint)">/ ${a.track.max}</span></div></div>`;
    return `<div class="ability"><div class="ab-top"><span class="src-tag ${m[2]}">${m[0]} · ${m[1]}</span><span class="ab-name">${nm(a.name)}</span><button class="ab-remove" data-abremove="${a.id}">\u2715</button></div><div class="ab-desc">${expand(char,a.desc)}</div>${track}</div>`;
  }).join("");
  const itemHTML=char.items.length?char.items.map(it=>`<div class="item"><span class="txt">${it.text}</span><button data-itemremove="${it.id}">\u2715</button></div>`).join(""):`<div class="empty-note">아직 아이템 없음</div>`;

  return `
    <div class="identity">
      <div class="cat-row">${catTags(cls)}</div>
      <div class="name">${cls.name.en}<span class="ko">${cls.name.ko}</span></div>
      <div class="race-line">Race · 종족 · <b>${race.name.en} (${race.name.ko})</b></div>
      <div class="flavor">${race.flavor||""}</div>
      ${cls.special?`<div class="special" style="border-left-color:${catColor(cls)}"><b class="h" style="color:${catColor(cls)}">Class Trait · 직업 특성</b>${expand(char,cls.special.ko)}</div>`:""}
      <div class="foe"><div class="foe-label">Favored Enemy · 숙적</div><div class="foe-list">${foeHTML}</div></div>
    </div>
    <div class="section"><div class="sec-head">Vital · 생명력</div>
      <div class="vital-grid">${vitalCard(char,"hp","Health","체력","health","curHealth","regenHealth")}${vitalCard(char,"en","Energy","에너지","energy","curEnergy","regenEnergy")}</div>
    </div>
    <div class="section"><div class="sec-head">Survival Skills · 생존 능력치</div><div class="hex-wrap">${skills}</div></div>
    <div class="section"><div class="sec-head">Combat Abilities · 전투 능력치</div><div class="hex-wrap">${combat}</div>${masteries}</div>
    <div class="section"><div class="sec-head">Special Abilities · 특수 능력</div>${abilityHTML}
      <div class="ability-actions">
        <button class="add-btn" data-addability="free">+ 능력 직접 추가</button>
        <button class="add-btn" data-addability="keepsake">+ Keepsake 공개</button>
        <button class="add-btn" data-addability="event">+ Event 능력</button>
      </div>
    </div>
    <div class="section"><div class="sec-head">Resources · 자원</div>
      <div class="res-grid">${resCard(char,"gold","Gold","골드","gold")}${resCard(char,"food","Food","음식","food")}${resCard(char,"foodUse","Food Use","소모량","foodUse")}</div>
      <div class="items"><div class="sec-head" style="font-size:11px;margin:16px 0 10px">Items · 아이템</div><div class="item-list">${itemHTML}</div>
        <div class="ability-actions"><button class="add-btn" id="addItem">+ 아이템 추가</button></div>
      </div>
    </div>`;
}
function vitalCard(char,cls,en,ko,hexKey,curKey,regKey){
  const max=effOf(char,hexKey);
  return `<div class="vital ${cls}"><div class="hexside">${renderHex(char,hexKey,false)}</div>
    <div class="ctl"><div class="vital-name">${en} <span class="ko">(${ko})</span></div>
      <div class="cur-max"><span class="cur">${char[curKey]}</span><span class="slash">/</span><span class="maxv">${max}</span></div>
      <div class="row"><span class="lbl">Cur 현재</span><button class="sq" data-vital="${curKey}" data-dir="-1">\u2212</button><button class="sq" data-vital="${curKey}" data-dir="1">\uFF0B</button></div>
      <div class="row"><span class="lbl">Regen 재생</span><button class="sq" data-vital="${regKey}" data-dir="-1">\u2212</button><span class="rval">${char[regKey]}</span><button class="sq" data-vital="${regKey}" data-dir="1">\uFF0B</button></div>
    </div></div>`;
}
function resCard(char,cls,en,ko,key){
  return `<div class="res ${cls}"><div class="lab">${en}</div><div class="ko">${ko}</div><div class="val">${char[key]}</div>
    <div class="rowbtn"><button data-res="${key}" data-dir="-1">\u2212</button><button data-res="${key}" data-dir="1">\uFF0B</button></div></div>`;
}

/* ---------- reference tabs (keywords / conditions / rules / items / extras) ---------- */
function referenceBody(char,series,tab){
  const empty=msg=>`<div class="section"><div class="empty-note">${msg}</div></div>`;
  if(tab==="keywords"){
    const ks=series.keywords||{};if(!Object.keys(ks).length)return empty("이 시리즈의 키워드가 아직 비어 있습니다. data.js에서 채우세요.");
    return `<div class="section"><div class="sec-head">Keywords · 키워드</div>${Object.entries(ks).map(([k,v])=>refItem(v.name,v.desc)).join("")}</div>`;
  }
  if(tab==="conditions"){
    const cs=series.conditions||{};if(!Object.keys(cs).length)return empty("이 시리즈의 컨디션이 아직 비어 있습니다.");
    return `<div class="section"><div class="sec-head">Conditions · 컨디션</div>${Object.entries(cs).map(([k,v])=>refItem(v.name,v.desc)).join("")}</div>`;
  }
  if(tab==="rules"){
    const rs=series.rules||[];if(!rs.length)return empty("이 시리즈의 룰 참조표가 아직 비어 있습니다.");
    return `<div class="section"><div class="sec-head">Rules · 룰</div>${rs.map(r=>`<div class="ref-block"><div class="ref-name">${r.title.en} <span class="ko">(${r.title.ko})</span></div><div class="ref-desc">${r.body}</div></div>`).join("")}</div>`;
  }
  if(tab==="items"){
    const its=series.items||[];if(!its.length)return empty("이 시리즈의 아이템 표가 아직 비어 있습니다.");
    return `<div class="section"><div class="sec-head">Items · 아이템</div>${its.map(it=>refItem(it.name,it.desc,(it.tags||[]).join(" · "))).join("")}</div>`;
  }
  if(tab.startsWith("extra:")){
    const id=tab.slice(6),x=(series.extras||[]).find(e=>e.id===id);
    if(!x||!(x.entries||[]).length)return empty("이 참조표가 아직 비어 있습니다.");
    return `<div class="section"><div class="sec-head">${x.label.en} · ${x.label.ko}</div>${x.entries.map(e=>refItem(e.name,e.desc)).join("")}</div>`;
  }
  return empty("탭을 찾을 수 없습니다.");
}
function refItem(name,desc,tag){
  return `<div class="ref-block"><div class="ref-name">${name.en} <span class="ko">(${name.ko})</span>${tag?`<span class="ref-tag">${tag}</span>`:""}</div><div class="ref-desc">${desc||""}</div></div>`;
}

/* ---------- board interactions ---------- */
function bindBoard(char){
  root.querySelectorAll(".pip").forEach(p=>p.onclick=()=>{const k=p.dataset.hex,idx=+p.dataset.idx;char.filled[k]=(char.filled[k]>=idx+1)?idx:idx+1;renderBoard();});
  root.querySelectorAll("[data-mod]").forEach(b=>b.onclick=()=>{char.mod[b.dataset.mod]+=+b.dataset.dir;renderBoard();});
  root.querySelectorAll("[data-vital]").forEach(b=>b.onclick=()=>{const k=b.dataset.vital;char[k]=Math.max(0,char[k]+ +b.dataset.dir);renderBoard();});
  root.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>{const k=b.dataset.res;char[k]=Math.max(0,char[k]+ +b.dataset.dir);renderBoard();});
  root.querySelectorAll("[data-boost]").forEach(b=>b.onclick=()=>{
    if(b.disabled)return;const n=+b.dataset.boost,key=b.dataset.mkey||"firstMastery",stack=b.dataset.stack==="1";
    if(!char.boosts[key])char.boosts[key]={};const store=char.boosts[key];
    const earned=boostEarned(char,key),used=Object.values(store).reduce((a,x)=>a+x,0);
    if(used>=earned)return;
    if(stack)store[n]=(store[n]||0)+1;else if(!store[n])store[n]=1;
    renderBoard();
  });
  root.querySelectorAll("[data-abcheck]").forEach(b=>b.onclick=()=>{const a=char.abilities.find(x=>x.id===b.dataset.abcheck);a.track.used=!a.track.used;renderBoard();});
  root.querySelectorAll("[data-abcount]").forEach(b=>b.onclick=()=>{const a=char.abilities.find(x=>x.id===b.dataset.abcount);a.track.value=Math.max(0,Math.min(a.track.max,a.track.value+ +b.dataset.dir));renderBoard();});
  root.querySelectorAll("[data-abremove]").forEach(b=>b.onclick=()=>{char.abilities=char.abilities.filter(x=>x.id!==b.dataset.abremove);renderBoard();});
  root.querySelectorAll("[data-itemremove]").forEach(b=>b.onclick=()=>{char.items=char.items.filter(x=>x.id!==b.dataset.itemremove);renderBoard();});
  root.querySelectorAll("[data-foe]").forEach(b=>b.onclick=()=>{char.favoredEnemies.splice(+b.dataset.foe,1);renderBoard();});
  const af=$("#addFoe");if(af)af.onclick=addFoeModal;
  const ai=$("#addItem");if(ai)ai.onclick=addItemModal;
  root.querySelectorAll("[data-addability]").forEach(b=>b.onclick=()=>addAbilityModal(b.dataset.addability));
}
/* keyword/condition overlay — works on every tab */
function bindTerms(char){
  root.querySelectorAll("[data-term]").forEach(s=>s.onclick=()=>openTerm(char,s.dataset.kind,s.dataset.term));
}
function openTerm(char,kind,term){
  const series=SERIES[char.series];
  const dict=kind==="kw"?series.keywords:series.conditions;
  const v=dict&&dict[term];
  const title=kind==="kw"?"Keyword · 키워드":"Condition · 컨디션";
  openModal(`<div class="term-head">${title}</div>
    <h3 style="margin-top:4px">${v?`${v.name.en} <span style="font-size:14px;color:var(--ink-dim)">(${v.name.ko})</span>`:term}</h3>
    <div class="term-desc">${v?v.desc:"이 시리즈에 아직 정의가 없습니다. data.js에서 채우세요."}</div>
    <div class="modal-actions"><button class="btn primary" onclick="closeModal()">닫기</button></div>`);
}

/* =====================================================================
   MODALS (generic)
   ===================================================================== */
const bg=document.createElement("div");bg.className="modal-bg";bg.id="modalBg";bg.innerHTML='<div class="modal" id="modalInner"></div>';document.body.appendChild(bg);
bg.addEventListener("click",e=>{if(e.target===bg)closeModal();});
function openModal(h){$("#modalInner").innerHTML=h;bg.classList.add("on");}
function closeModal(){bg.classList.remove("on");}
window.closeModal=closeModal;

function addFoeModal(){
  openModal(`<h3>Favored Enemy 추가</h3><div class="field"><label>English</label><input id="fEn" placeholder="Goblin"></div><div class="field"><label>한글</label><input id="fKo" placeholder="고블린"></div><div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="fSave">추가</button></div>`);
  $("#fSave").onclick=()=>{const en=$("#fEn").value.trim(),ko=$("#fKo").value.trim();if(en||ko)APP.char.favoredEnemies.push({en:en||ko,ko:ko||en});closeModal();renderBoard();};
}
function addItemModal(){
  openModal(`<h3>Item 추가</h3><div class="field"><label>내용</label><input id="iTxt" placeholder="예: Shadow Dagger (그림자 단검) — 공격 +1"></div><div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="iSave">추가</button></div>`);
  $("#iSave").onclick=()=>{const t=$("#iTxt").value.trim();if(t)APP.char.items.push({id:"i"+Date.now(),text:t});closeModal();renderBoard();};
}
function addAbilityModal(kind){
  const srcSel=kind==="keepsake"?`<input type="hidden" id="aSrc" value="keepsake">`:kind==="event"?`<input type="hidden" id="aSrc" value="event">`:`<div class="field"><label>출처 Source</label><select id="aSrc"><option value="race">Race 종족</option><option value="trait">Trait 트레잇</option><option value="aspect">Aspect 애스펙트</option><option value="keepsake">Keepsake 킵세이크</option><option value="event">Event 이벤트</option></select></div>`;
  const title=kind==="keepsake"?"Keepsake 공개":kind==="event"?"Event 능력 추가":"능력 직접 추가";
  openModal(`<h3>${title}</h3>${srcSel}<div class="field"><label>이름 (English)</label><input id="aEn" placeholder="Ability name"></div><div class="field"><label>이름 (한글)</label><input id="aKo" placeholder="능력 이름"></div><div class="field"><label>설명</label><textarea id="aDesc" placeholder="효과 설명… ( <kw>heal</kw> , {attack} 토큰 사용 가능 )"></textarea></div><div class="field"><label>트래킹</label><select id="aTrack"><option value="none">없음 (참조 전용)</option><option value="check">1회용 체크</option><option value="count">카운터</option></select></div><div class="field" id="maxWrap" style="display:none"><label>최대치</label><input type="number" id="aMax" value="3"></div><div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="aSave">추가</button></div>`);
  $("#aTrack").onchange=e=>{$("#maxWrap").style.display=e.target.value==="count"?"block":"none";};
  $("#aSave").onclick=()=>{
    const en=$("#aEn").value.trim(),ko=$("#aKo").value.trim();if(!en&&!ko){closeModal();return;}
    const tt=$("#aTrack").value;let track=null;
    if(tt==="check")track={type:"check",used:false};
    if(tt==="count")track={type:"count",value:0,max:Math.max(1,+$("#aMax").value||3)};
    APP.char.abilities.push({id:"a"+Date.now(),src:$("#aSrc").value,name:{en:en||ko,ko:ko||en},desc:$("#aDesc").value.trim()||"—",track});
    closeModal();renderBoard();
    /* TODO: src==='event' 자유 입력 능력을 공유 라이브러리(Apps Script)로 append — 추후 연동 */
  };
}

/* ---------- save / load / export / import (개인 캐릭터) ---------- */
function saveCharacterModal(){
  openModal(`<h3>캐릭터 저장</h3><div class="field"><label>저장 이름</label><input id="sName" placeholder="예: 워록 1회차"></div><div class="hint">이 기기(브라우저)에 저장됩니다.</div><div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="sGo">저장</button></div>`);
  $("#sGo").onclick=()=>{
    const name=$("#sName").value.trim();if(!name)return;
    const all=store.get("hex.chars",{});all[name]=clone(APP.char);
    const ok=store.set("hex.chars",all);
    closeModal();
    openModal(`<h3>${ok?"저장 완료":"저장 실패"}</h3><div class="term-desc">${ok?`"${name}" 로 저장했습니다.`:"이 브라우저에서 로컬 저장이 막혀 있습니다. '파일로 내보내기'를 사용하세요."}</div><div class="modal-actions"><button class="btn primary" onclick="closeModal()">닫기</button></div>`);
  };
}
function loadCharacterModal(){
  const all=store.get("hex.chars",{});const names=Object.keys(all);
  const list=names.length?names.map(n=>`<div class="load-row"><button class="btn slot" data-load="${n}">${n}</button><button class="tbtn" data-del="${n}">삭제</button></div>`).join(""):`<div class="empty-note">저장된 캐릭터가 없습니다.</div>`;
  openModal(`<h3>캐릭터 불러오기</h3><div class="load-list">${list}</div>
    <div class="field" style="margin-top:14px"><label>또는 파일에서 가져오기</label><input type="file" id="impFile" accept="application/json"></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">닫기</button></div>`);
  root.ownerDocument.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{APP.char=clone(all[b.dataset.load]);APP.tab="board";APP.screen="board";closeModal();render();});
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{delete all[b.dataset.del];store.set("hex.chars",all);loadCharacterModal();});
  const f=$("#impFile");if(f)f.onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{APP.char=JSON.parse(r.result);APP.tab="board";APP.screen="board";closeModal();render();}catch(err){alert("파일을 읽을 수 없습니다.");}};r.readAsText(file);};
}
function exportCharacter(){
  const data=JSON.stringify(APP.char,null,2);const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`hexplore-${APP.char.classId}-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);
}

/* ---------- game records ---------- */
function endGameModal(){
  openModal(`<h3>게임 종료 · 기록</h3>
    <div class="field"><label>결과</label><select id="rResult"><option value="win">승리 Win</option><option value="loss">패배 Loss</option><option value="other">기타</option></select></div>
    <div class="field"><label>메모</label><textarea id="rMemo" placeholder="이번 게임에서 기록하고 싶은 내용…"></textarea></div>
    <div class="hint">종료 시점의 캐릭터 상태 전체가 스냅샷으로 함께 저장됩니다.</div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="rGo">기록 저장</button></div>`);
  $("#rGo").onclick=()=>{
    const char=APP.char,cls=SHARED.classes[char.classId],race=SHARED.races[char.raceId];
    const rec={
      start:char.startDate,end:new Date().toISOString(),
      race:race.name,class:cls.name,
      traits:char.abilities.filter(a=>["trait","aspect","keepsake"].includes(a.src)).map(a=>a.name.en),
      series:char.series,result:$("#rResult").value,memo:$("#rMemo").value.trim(),
      snapshot:clone(char),
    };
    const recs=store.get("hex.records",[]);recs.unshift(rec);const ok=store.set("hex.records",recs);
    closeModal();
    openModal(`<h3>${ok?"기록 저장됨":"저장 실패"}</h3><div class="term-desc">${ok?"게임 기록에 저장했습니다.":"로컬 저장이 막혀 있습니다."}</div><div class="modal-actions"><button class="btn primary" onclick="closeModal()">닫기</button></div>`);
  };
}
function recordsModal(){
  const recs=store.get("hex.records",[]);
  const rmap={win:"승리",loss:"패배",other:"기타"};
  const list=recs.length?recs.map((r,i)=>`<div class="rec">
    <div class="rec-top"><span class="rec-res ${r.result}">${rmap[r.result]||r.result}</span>
      <b>${r.class.en}</b> · ${r.race.en} · HEX ${r.series}
      <button class="tbtn" data-recdel="${i}" style="margin-left:auto">삭제</button></div>
    <div class="rec-meta">${fmtDate(r.start)} → ${fmtDate(r.end)}${r.traits&&r.traits.length?` · 특성 ${r.traits.length}`:""}</div>
    ${r.memo?`<div class="rec-memo">${r.memo}</div>`:""}
  </div>`).join(""):`<div class="empty-note">저장된 게임 기록이 없습니다.</div>`;
  openModal(`<h3>Game Records · 게임 기록</h3><div class="rec-list">${list}</div><div class="modal-actions"><button class="btn" onclick="closeModal()">닫기</button></div>`);
  document.querySelectorAll("[data-recdel]").forEach(b=>b.onclick=()=>{recs.splice(+b.dataset.recdel,1);store.set("hex.records",recs);recordsModal();});
}

/* =====================================================================
   ROUTER
   ===================================================================== */
function render(){
  if(APP.screen==="builder")renderBuilder();
  else if(APP.screen==="series")renderSeries();
  else renderBoard();
}
render();
})();
