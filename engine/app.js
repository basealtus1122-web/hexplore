/* =====================================================================
   Hexplore It — ENGINE (app.js)
   화면: builder → series → board.  board 상단 탭 + 오버레이 + 저장/기록.
   데이터(data.js)만 바꾸면 내용이 바뀌고, 이 파일은 대체로 건드리지 않습니다.
   ===================================================================== */
(function(){
const {CAT,STAT_ORDER,STAT_META,SHARED,SERIES}=window.HEX;
const FOE_TYPES=window.HEX.FOE_TYPES||[];
const GREATER_ASPECTS=window.HEX.GREATER_ASPECTS||[];
/* 확장 표기 — 데이터에 exp:"H"(HExclusive, 빨강) 또는 exp:"R"(Rare, 금색)을 넣으면
   선택칸 배지에서 시리즈 번호 앞에 대문자로 붙는다. 예: H4, R4 */
const EXP_META={H:{ko:"HExclusive",c:"#e0474c"},R:{ko:"Rare",c:"#d4a636"}};
/* 상태 속성 — A=무관(아군·적 누구에게나) · P=지속(전투 후에도) · S=중첩(중복 획득) */
const COND_Q={A:{ko:"무관",t:"아군·적 누구에게나 적용",c:"#63d688"},P:{ko:"지속",t:"전투가 끝나도 유지",c:"#d4a636"},S:{ko:"중첩",t:"여러 번 얻을 수 있음",c:"#71a5ff"}};
const COND_NOTE=window.HEX.COND_NOTE||"";

/* ---------- app state ---------- */
const APP={
  screen:"builder",              // builder | series | board
  sel:{raceId:null,classId:null,traitIds:[],subRaceId:null,aspectId:null},
  builderTab:"race",             // race | class | trait
  sort:{race:"default",class:"default"},  // default(수록순) | abc(이름순) | ed(편순)
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
    subRaceId:sel.subRaceId||null,aspectId:sel.aspectId||null,raceForm:(race&&race.forms)?race.forms[0].id:null,
    filled:zero(),mod:zero(),
    curHealth:0,curEnergy:0,regenHealth:0,regenEnergy:0,
    gold:0,food:0,foodUse:race?race.foodUse:0,
    favoredEnemies:race?[clone(foeOf(sel.raceId,sel.subRaceId))]:[],
    items:[],boosts:{},mchecks:{},uses:{},abilities:[],
    counters:{},                                  /* 직업 전용 카운터(예: 심문관 트로피) */
    vitalPick:(cls&&cls.declareVital)?null:undefined,  /* 전투마다 선언하는 생명력(예: 정찰병) */
    startDate:new Date().toISOString(),
  };
  if(race&&race.ability&&!race.inheritsRace)char.abilities.push({id:"aRace",src:"race",name:clone(race.ability.name),desc:race.ability.desc,track:initTrack(race.ability.track)});
  /* 빌더에서 고른 양상은 항상 공개 — 판에 바로 붙는다 */
  if(sel.aspectId){const a=GREATER_ASPECTS.find(x=>x.id===sel.aspectId);
    if(a)char.abilities.push({id:"ga_"+a.id,src:"greater",name:clone(a.name),desc:a.desc||"(내용 추후 입력)",track:initTrack(a.track),mods:a.mods?clone(a.mods):null});}
  sel.traitIds.forEach(tid=>{const t=SHARED.traits[tid];if(t)char.abilities.push({id:"t_"+tid,src:t.type,name:clone(t.name),desc:t.desc,track:initTrack(t.track),mods:t.mods?clone(t.mods):null});});
  char.curHealth=effOf(char,"health");char.curEnergy=effOf(char,"energy");
  return char;
}
/* 종족 보정치 — '다시 깨어난 자'처럼 다른 종족을 물려받는 경우 그 종족의 보정치를 쓴다 */
function modsOf(char){
  const r=SHARED.races[char.raceId];if(!r)return zero();
  if(r.inheritsRace){const s=SHARED.races[char.subRaceId];return s?s.mods:zero();}
  if(r.forms){const m=Object.assign(zero(),r.mods);const f=r.forms.find(x=>x.id===char.raceForm)||r.forms[0];if(f&&f.mods)Object.assign(m,f.mods);return m;}
  return r.mods;
}
/* 물려받는 종족이면 그 종족의 숙적을, 아니면 자신의 숙적을 */
function foeOf(raceId,subRaceId){
  const r=SHARED.races[raceId];if(!r)return{en:"",ko:""};
  if(r.inheritsRace){const s=SHARED.races[subRaceId];return s?s.favoredEnemy:r.favoredEnemy;}
  return r.favoredEnemy;
}
/* 부착물(특성·양상·위대한 양상·keepsake) 보정치 합 — 종족과 같은 양식으로 mods를 가질 수 있다 */
function abilityMods(char,k){return (char.abilities||[]).reduce((s,a)=>s+((a.mods&&a.mods[k])||0),0);}
function baseCharOf(char,k){const cls=SHARED.classes[char.classId];return (cls.stats[k]?cls.stats[k].base:0)+(modsOf(char)[k]||0)+abilityMods(char,k);}
/* 형태 전환(예: 나구알 인간↔거대 고양이) — 형태별 보정치 적용, 전환 시 체력 회복 */
function formSwitcher(char,race){
  const cur=char.raceForm||race.forms[0].id;
  const lowE=!!(race.formCostEnergy&&char.curEnergy<race.formCostEnergy);
  const btns=race.forms.map(f=>{const on=f.id===cur;const dis=!on&&lowE;
    const base=on?'border:1px solid var(--g-attack);color:var(--ink);background:color-mix(in srgb,var(--c-attack) 16%,transparent)':'border:1px solid var(--edge-bright);color:var(--ink-dim);background:transparent';
    return `<button data-form="${f.id}"${dis?' disabled title="에너지 부족 — 변신할 수 없음"':''} style="font-family:'Cinzel';font-size:12.5px;padding:6px 13px;border-radius:9px;cursor:${dis?'not-allowed':'pointer'};${base}${dis?';opacity:.4':''}">${f.name.en}<span style="font-size:.86em;color:var(--ink-faint);margin-left:3px">${f.name.ko}</span></button>`;}).join("");
  const cost=[];
  if(race.formCostEnergy)cost.push(`<b style="color:var(--g-energy)">Energy</b>에너지 ${race.formCostEnergy} 소모`);
  if(race.formHealOnSwitch)cost.push(`<b style="color:var(--g-health)">Health</b>체력 ${race.formHealOnSwitch} 회복`);
  const note=cost.length?` <span style="text-transform:none;letter-spacing:0;font-family:'Noto Serif KR';color:var(--ink-faint)">· 변신 시 ${cost.join(" · ")}</span>`:"";
  return `<div class="foe" style="margin:2px 0 12px"><div class="foe-label">Form · 형태${note}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${btns}</div></div>`;
}
function effOf(char,k){return Math.max(0,baseCharOf(char,k)+char.filled[k]+char.mod[k]);}
/* readout 에 넘기는 계산기.
   lv(k) 최종 랭크 · b(n) 강화 스택 · on(n) 강화 활성 ·
   cur(k) 현재값(health/energy 는 판의 현재 수치) · miss(k) 잃은 양(최대−현재) */
function makeE(char,key){
  const s=(char.boosts&&char.boosts[key])||{};
  const cur=k=>k==="health"?char.curHealth:k==="energy"?char.curEnergy:effOf(char,k);
  /* cnt(id) 카운터 총합 · cnt(id,type) 그 유형만 — cls.counters 로 만든 값을 계산에 쓴다 */
  const cnt=(id,type)=>{const v=(char.counters||{})[id];
    if(v==null)return 0;
    if(typeof v==="number")return v;
    return type?(v[type]||0):Object.values(v).reduce((a,b)=>a+b,0);};
  return{lv:k=>effOf(char,k),b:n=>s[n]||0,on:n=>(s[n]||0)>0,
    cur,miss:k=>Math.max(0,effOf(char,k)-cur(k)),cnt,
    /* foe() 선언한 적 유형 · sel(id) 활성 목록 항목(없으면 빈 객체) */
    foe:()=>char.foePick||null,
    sel:id=>{const l=(char.roster||{})[id]||[],i=(char.rosterPick||{})[id];return (i!=null&&l[i])?l[i]:{};},
    /* 유형별 카운터에서 "n개마다 1" 로 파생되는 값(예: 마스터 트로피) */
    cntEvery:(id,per)=>Object.values((char.counters||{})[id]||{}).reduce((a,n)=>a+Math.floor(n/per),0)};
}
/* 강화(boost): 기술별 저장소 + 임의 랭크 스케줄. 구버전(평면) 저장본은 firstMastery로 마이그레이션 */
function normBoosts(char){if(!char.boosts||typeof char.boosts!=="object"){char.boosts={};return;}const ks=Object.keys(char.boosts);if(ks.length&&ks.every(k=>/^\d+$/.test(k)))char.boosts={firstMastery:Object.assign({},char.boosts)};}
function boostEarned(char,key){const st=SHARED.classes[char.classId].stats[key],lv=effOf(char,key);return st&&st.boostAt?st.boostAt.filter(t=>lv>=t).length:Math.floor(lv/3);}

/* ---------- text expand (tokens · kw · condition) ----------
   표기 규칙: 모든 키워드·스탯·상태 용어는 화면에 English한글 로 자동 렌더된다.
   데이터에는 키(영문 소문자)만 적으면 되고, 이름은 용어집(SERIES.keywords/exKeywords/conditions,
   STAT_META/DMG)에서 자동으로 가져온다.
     <kw>boost</kw>        → Boost증폭 (클릭 시 정의 오버레이)
     <state>vulnerable</state> → Vulnerable취약
     <st>health</st>       → Health체력 (해당 스탯 색)
   ------------------------------------------------------------ */
const _ko=s=>`<span style="font-size:.88em;letter-spacing:0">${s}</span>`;
/* 스탯 용어(영한): health/energy/influence/outlast 는 DMG, 나머지 9스탯은 STAT_META 사용 */
function statTerm(k){
  const d=DMG[k], meta=STAT_META[k];
  const en=d?d.en:(meta?meta.role:k), ko=d?d.ko:(meta?meta.roleKo:"");
  return `<b style="color:${statColor(k)}">${en}${ko?_ko(ko):""}</b>`;
}
/* 스탯 라벨(영한) — health/energy는 STAT_META.role이 둘 다 "Vital"이라 DMG 표를 우선 */
/* 숙적 표기 — 영문이 없거나 한글과 같으면 하나만 표시(시트 내부 참조는 한국어만) */
function foeLabel(f){return (f.en&&f.ko&&f.en!==f.ko)?`${f.en} (${f.ko})`:(f.ko||f.en||"");}
function statLabel(k){const d=DMG[k],m=STAT_META[k];return{en:d?d.en:(m?m.role:k),ko:d?d.ko:(m?m.roleKo:"")};}
/* <act>defend</act> → Defend방어 (영웅 행동). 키워드가 아니라 행동이므로 오버레이는 열리지 않는다.
   {defence} 는 그 직업의 방어 능력명이라, "아무 영웅이나 방어를 쓸 때"에는 이 토큰을 쓴다. */
const ACTS={attack:{en:"Attack",ko:"공격",c:"attack"},defend:{en:"Defend",ko:"방어",c:"defence"}};
function actTerm(k){const a=ACTS[k];if(!a)return k;
  return `<b style="color:var(--g-${a.c})">${a.en}${_ko(a.ko)}</b>`;}
/* 캐릭터가 없는 화면(빌더 미리보기)용 — 토큰을 영한 평문으로 바꾸고 나머지 태그는 제거 */
function previewText(t){
  if(!t)return"";
  const findKw=k=>{for(const s of Object.values(SERIES)){const v=(s.keywords&&s.keywords[k])||(s.exKeywords&&s.exKeywords[k])||(s.conditions&&s.conditions[k]);if(v)return v;}return null;};
  return t.replace(/<act>(\w+)<\/act>/g,(m,k)=>ACTS[k]?ACTS[k].en+ACTS[k].ko:k)
    .replace(/<st>(\w+)<\/st>/g,(m,k)=>{const l=statLabel(k);return l.en+l.ko;})
    .replace(/<(?:kw|state)>(.*?)<\/(?:kw|state)>/g,(m,x)=>{const v=findKw(x.toLowerCase());return v?v.name.en+v.name.ko:x;})
    .replace(/<[^>]+>/g,"");
}
function expand(char,t){
  const cls=SHARED.classes[char.classId], S=SERIES[char.series]||{};
  return t.replace(/\{(\w+)\}/g,(m,k)=>cls.stats[k]?`<span class="ref" style="color:var(--g-${k})">${cls.stats[k].name.en}</span>`:m)
    .replace(/<act>(\w+)<\/act>/g,(m,k)=>actTerm(k))
    .replace(/<st>(\w+)<\/st>/g,(m,k)=>statTerm(k))
    .replace(/<hp>(.*?)<\/hp>/g,'<b class="hpc">$1</b>')
    .replace(/<en>(.*?)<\/en>/g,'<b class="enc">$1</b>')
    .replace(/<inf>(.*?)<\/inf>/g,`<b style="color:${CLR_INFLUENCE}">$1</b>`)
    .replace(/<out>(.*?)<\/out>/g,`<b style="color:${CLR_OUTLAST}">$1</b>`)
    .replace(/<kw>(.*?)<\/kw>/g,(m,x)=>{
      const k=x.toLowerCase(), v=(S.keywords&&S.keywords[k])||(S.exKeywords&&S.exKeywords[k]);
      return `<span class="kw" data-kind="kw" data-term="${k}">${v?v.name.en+_ko(v.name.ko):x}</span>`;
    })
    .replace(/<state>(.*?)<\/state>/g,(m,x)=>{
      const k=x.toLowerCase(), v=S.conditions&&S.conditions[k];
      return `<span class="state" data-kind="state" data-term="${k}">${v?v.name.en+_ko(v.name.ko):x}</span>`;
    });
}

/* ---------- hexagon ---------- */
const HEX_ANGLES=[90,30,330,270,210,150];
const CLR_INFLUENCE="#c98a3c", CLR_OUTLAST="#a5713e";  // 영향력=청동색 · 지속력(outlast)=갈색
const DMG={
  health:   {en:"Health",   ko:"체력",   color:"var(--g-health)"},
  energy:   {en:"Energy",   ko:"에너지", color:"var(--g-energy)"},
  influence:{en:"Influence",ko:"영향력", color:CLR_INFLUENCE},
  outlast:  {en:"Outlast",  ko:"지속력", color:CLR_OUTLAST},
};
/* readout·태그 색 토큰 → CSS 색. 9스탯=--g-*, 특수(influence/outlast)·neutral은 별도 */
function statColor(c){return c==='neutral'?'var(--ink)':c==='influence'?CLR_INFLUENCE:c==='outlast'?CLR_OUTLAST:`var(--g-${c})`;}
/* st.dmg = "health" 또는 ["health","influence"] → 기본공격 피해타입: EnglishKorean, 여러개는 / 로 구분 */
function dmgTags(dmg,pick,needPick){
  if(!dmg)return"";
  /* 생명력을 선언하는 직업은 고른 유형만 표시하고, 아직 안 골랐으면 고르라고 안내한다 */
  if(needPick&&!pick)return `<div class="hex-dmg" style="font-size:11.5px;color:var(--ink-faint);font-style:italic">직업 특성에서 생명력을 선택하세요</div>`;
  let list=(Array.isArray(dmg)?dmg:[dmg]).filter(d=>DMG[d]);
  if(pick)list=list.filter(d=>d===pick);
  if(!list.length)return"";
  const inner=list.map(d=>`<span style="color:${DMG[d].color};font-weight:700">${DMG[d].en}<span style="font-size:.9em;opacity:.92">${DMG[d].ko}</span></span>`).join(`<span style="opacity:.4"> / </span>`);
  return `<div class="dmg-tag" style="margin-top:5px;font-size:12px;letter-spacing:.2px">${inner}</div>`;
}
function hexPath(cx,cy,R){return"M"+[0,60,120,180,240,300].map(a=>{const r=a*Math.PI/180;return`${(cx+R*Math.cos(r)).toFixed(2)},${(cy-R*Math.sin(r)).toFixed(2)}`}).join("L")+"Z";}
function renderHex(char,key,showName=true){
  const cls=SHARED.classes[char.classId],st=cls.stats[key],meta=STAT_META[key];
  const filled=char.filled[key],val=effOf(char,key),m=char.mod[key],bc=baseCharOf(char,key);
  const nmEn=st&&st.name?st.name.en:meta.role, nmKo=st&&st.name?st.name.ko:meta.roleKo;
  /* 육각형 칸(pip) — 탭하기 쉽게 크게. st.hexCost[i] 가 있으면 그 칸의 비용 숫자를 안에 표시 */
  const cx=72,cy=72,R=56,apo=R*Math.cos(Math.PI/6);let pips="";
  HEX_ANGLES.forEach((a,i)=>{const r=a*Math.PI/180,px=cx+apo*Math.cos(r),py=cy-apo*Math.sin(r),on=i<filled;
    const cost=st&&st.hexCost?st.hexCost[i]:null;
    pips+=`<circle class="pip ${on?'full':'empty'}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${on?13:12}" ${on?`style="fill:var(--g-${key})"`:`style="stroke:var(--edge-bright)"`} data-hex="${key}" data-idx="${i}"></circle>`;
    if(cost!=null)pips+=`<text class="pip-num" x="${px.toFixed(1)}" y="${py.toFixed(1)}" text-anchor="middle" dominant-baseline="central" style="fill:${on?'#12101a':'var(--ink-faint)'}">${cost}</text>`;
  });
  return `<div class="hex-cell">
    <button class="fuse-btn" data-fuse="${key}" ${filled?'':'disabled'} title="Fuse 융합: 육각형 1칸을 되돌리고 레벨은 그대로 유지(효과로 전환)" style="display:block;width:100%;margin:0 0 7px;min-height:34px;font-size:13px;font-weight:700;letter-spacing:.3px;border-radius:8px;${filled?`border:1px solid var(--g-${key});color:var(--g-${key});background:color-mix(in srgb,var(--c-${key}) 18%,transparent);cursor:pointer`:'border:1px dashed var(--edge-bright);color:var(--ink-faint);background:transparent;cursor:default;opacity:.5'}">Fuse 융합${filled?` <span style="font-weight:600">· ${filled}칸</span>`:''}</button>
    <svg class="hex-svg" viewBox="0 0 144 144">
      <path class="hex-poly" d="${hexPath(cx,cy,R)}" style="fill:color-mix(in srgb,var(--c-${key}) 26%,#12101a);stroke:var(--g-${key})"/>
      ${pips}
      <text class="hex-val" x="72" y="67" text-anchor="middle" dominant-baseline="middle" style="fill:var(--g-${key})">${val}</text>
      <text class="hex-sub" x="72" y="90" text-anchor="middle">base ${bc}${filled?` +${filled}`:""}${m?(m>0?` \u25B2${m}`:` \u25BC${-m}`):""}</text>
    </svg>
    ${showName?`<div class="hex-role">${meta.role} · ${meta.roleKo}</div><div class="hex-title" style="color:var(--g-${key})">${nmEn}</div><div class="hex-ko">${nmKo}</div>${dmgTags(st&&st.dmg, (key==="attack"&&cls.declareVital)?char.vitalPick:null, key==="attack"&&!!cls.declareVital)}`:""}
    <div class="hex-mod">
      <button data-mod="${key}" data-dir="-1" title="효과로 인한 감소">\u2212</button>
      <span class="mtag">${m?`<b>${m>0?'+':''}${m}</b>`:'효과'}</span>
      <button data-mod="${key}" data-dir="1" title="효과로 인한 증가">\uFF0B</button>
    </div></div>`;
}

/* 전투마다 선언하는 생명력 — cls.declareVital 이면 특성 박스에서 고르고, 기본공격 피해 유형에 반영된다 */
function vitalSwitcher(char,cls){
  if(!cls.declareVital)return"";
  const list=(cls.stats.attack&&cls.stats.attack.dmg)||[];
  const btns=list.filter(d=>DMG[d]).map(d=>{const on=char.vitalPick===d;
    return `<button data-vital-pick="${d}" style="font-family:'Cinzel';font-size:12px;padding:5px 11px;border-radius:8px;cursor:pointer;${on?`border:1px solid ${DMG[d].color};color:var(--ink);background:color-mix(in srgb,${DMG[d].color} 18%,transparent)`:'border:1px solid var(--edge-bright);color:var(--ink-dim);background:transparent'}">${DMG[d].en}<span style="font-size:.86em;color:var(--ink-faint);margin-left:2px">${DMG[d].ko}</span></button>`;}).join("");
  return `<div style="margin-top:9px"><div class="foe-label" style="margin-bottom:5px">Declared Vital · 선언한 생명력${char.vitalPick?"":` <span style="text-transform:none;letter-spacing:0;font-family:'Noto Serif KR';color:var(--ink-faint)">· 전투를 시작하며 하나 고르세요</span>`}</div><div style="display:flex;gap:7px;flex-wrap:wrap">${btns}</div></div>`;
}
/* 지금 상대하는 적 유형 — cls.declareFoe 이면 특성 박스에서 고른다(트로피 계산 등에 쓰임) */
function foeSwitcher(char,cls){
  if(!cls.declareFoe)return"";
  const btns=FOE_TYPES.map(f=>{const on=char.foePick===f.en;
    return `<button data-foe-pick="${f.en}" style="font-size:11.5px;padding:4px 9px;border-radius:8px;cursor:pointer;white-space:nowrap;${on?'border:1px solid var(--accent);color:var(--ink);background:color-mix(in srgb,var(--accent-dim) 20%,transparent)':'border:1px solid var(--edge-bright);color:var(--ink-dim);background:transparent'}">${f.en}<span style="font-size:.88em;color:var(--ink-faint);margin-left:2px">${f.ko}</span></button>`;}).join("");
  return `<div style="margin-top:10px"><div class="foe-label" style="margin-bottom:5px">Current Opponent · 지금 상대<span style="text-transform:none;letter-spacing:0;font-family:'Noto Serif KR';color:var(--ink-faint)"> · 고르면 같은 유형 트로피가 계산에 반영됩니다</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div></div>`;
}
/* 직접 채우는 목록 — cls.roster:[{id,name,fields:[{id,label,color}],countHint:(E)=>n}]
   여러 개를 보유하되 활성은 항상 하나. 활성 항목의 값이 readout 계산(E.sel)에 들어간다. */
function renderRoster(char,cls){
  if(!cls.roster||!cls.roster.length)return"";
  const R=char.roster||(char.roster={}),P=char.rosterPick||(char.rosterPick={});
  return cls.roster.map(r=>{
    const list=R[r.id]||(R[r.id]=[]),pick=P[r.id];
    const hint=r.countHint?r.countHint(makeE(char,"special")):null;
    const rows=list.map((e,i)=>{const on=pick===i;
      return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 9px;border-radius:10px;border:1px solid ${on?'var(--accent)':'var(--edge)'};background:${on?'color-mix(in srgb,var(--accent-dim) 12%,transparent)':'transparent'}">
        <button data-roster-pick="${r.id}" data-idx="${i}" title="활성으로 지정" style="font-family:'Cinzel';font-size:11px;padding:3px 9px;border-radius:7px;cursor:pointer;border:1px solid ${on?'var(--accent)':'var(--edge-bright)'};background:transparent;color:${on?'var(--ink)':'var(--ink-faint)'}">${on?'● 변신 중':'○ 대기'}</button>
        <input data-roster-name="${r.id}" data-idx="${i}" value="${(e.name||"").replace(/"/g,'&quot;')}" placeholder="이름" style="flex:1;min-width:90px;padding:4px 8px;border-radius:7px;border:1px solid var(--edge-bright);background:rgba(0,0,0,.25);color:var(--ink);font-family:'Noto Serif KR';font-size:12.5px">
        ${r.fields.map(f=>`<span style="display:flex;align-items:center;gap:4px"><span style="font-size:10.5px;color:var(--ink-faint);white-space:nowrap">${f.label}</span>
          <button class="sq" data-roster-num="${r.id}" data-idx="${i}" data-field="${f.id}" data-dir="-1">−</button>
          <span style="font-family:'Cinzel';font-weight:700;min-width:12px;text-align:center;color:${f.color?statColor(f.color):'var(--ink)'}">${e[f.id]||0}</span>
          <button class="sq" data-roster-num="${r.id}" data-idx="${i}" data-field="${f.id}" data-dir="1">＋</button></span>`).join("")}
        <button data-roster-del="${r.id}" data-idx="${i}" style="border:none;background:transparent;color:var(--ink-faint);cursor:pointer;font-size:13px">✕</button>
      </div>`;}).join("");
    return `<div style="margin-top:10px"><div class="foe-label" style="margin-bottom:6px">${r.name.en} · ${r.name.ko}
        <span style="text-transform:none;letter-spacing:0;font-family:'Noto Serif KR';color:var(--ink-faint)">· 보유 ${list.length}${hint!=null?` / 획득 가능 ${hint}`:""} · 변신 중인 하나만 계산에 반영</span></div>
      <div style="display:flex;flex-direction:column;gap:6px">${rows}</div>
      <button class="add-btn" data-roster-add="${r.id}" style="margin-top:7px">+ ${r.name.ko} 추가</button></div>`;
  }).join("");
}
/* 직업 전용 카운터 — cls.counters:[{id,name,perType?,derive?}]
   perType:true 면 숙적 유형(FOE_TYPES)별로 센다. derive 는 다른 카운터에서 자동 계산(읽기 전용). */
function renderCounters(char,cls){
  if(!cls.counters||!cls.counters.length)return"";
  const store=char.counters||(char.counters={});
  const blocks=cls.counters.map(c=>{
    if(c.derive){
      return `<div style="margin-top:9px"><span class="foe-label">${c.name.en} · ${c.name.ko}</span>
        <span style="font-family:'Cinzel';font-weight:700;font-size:17px;margin-left:8px;color:var(--accent)">${c.derive(store)}</span></div>`;
    }
    if(c.perType){
      const m=store[c.id]||(store[c.id]={});
      const rows=FOE_TYPES.map(f=>{const n=m[f.en]||0;
        return `<div style="display:flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid ${n?'var(--accent-dim)':'var(--edge)'};border-radius:9px;background:${n?'color-mix(in srgb,var(--accent-dim) 10%,transparent)':'transparent'}">
          <span style="font-size:11.5px;color:${n?'var(--ink)':'var(--ink-faint)'};white-space:nowrap">${f.en}<span style="font-size:.88em;color:var(--ink-faint);margin-left:2px">${f.ko}</span></span>
          <button class="sq" data-cnt="${c.id}" data-type="${f.en}" data-dir="-1">−</button>
          <span style="font-family:'Cinzel';font-weight:700;min-width:11px;text-align:center;color:${n?'var(--accent)':'var(--ink-faint)'}">${n}</span>
          <button class="sq" data-cnt="${c.id}" data-type="${f.en}" data-dir="1">＋</button></div>`;}).join("");
      const total=Object.values(m).reduce((a,b)=>a+b,0);
      return `<div style="margin-top:10px"><div class="foe-label" style="margin-bottom:6px">${c.name.en} · ${c.name.ko} <span style="color:var(--accent)">${total}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${rows}</div></div>`;
    }
    const n=store[c.id]||0;
    return `<div style="margin-top:9px;display:flex;align-items:center;gap:6px"><span class="foe-label">${c.name.en} · ${c.name.ko}</span>
      <button class="sq" data-cnt="${c.id}" data-dir="-1">−</button><span style="font-family:'Cinzel';font-weight:700;color:var(--accent)">${n}</span><button class="sq" data-cnt="${c.id}" data-dir="1">＋</button></div>`;
  }).join("");
  return blocks;
}
/* 직업 특성에도 실시간 수치를 붙일 수 있다 — special:{ko, readout:(E)=>[...]} */
function specialReadout(char,cls){
  const f=cls.special&&cls.special.readout;if(!f)return"";
  const outs=f(makeE(char,"special"));if(!outs||!outs.length)return"";
  return `<div class="readout" style="margin-top:8px">${outs.map(o=>`<div class="stat-out"><span class="lab">${o.lab}</span><span class="num" style="color:${statColor(o.color)}">${o.val}</span></div>`).join("")}</div>`;
}
/* ---------- mastery card (data-driven) ---------- */
function renderMastery(char,key){
  const cls=SHARED.classes[char.classId],st=cls.stats[key];
  if(!st||!st.desc)return"";
  const E=makeE(char,key),lv=effOf(char,key);
  const outs=(st.readout?st.readout(E):[]).map(o=>`<div class="stat-out"><span class="lab">${o.lab}</span><span class="num" style="color:${statColor(o.color)}">${o.val}</span></div>`).join("");
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
  // <lvl n="7">…</lvl> : 특정 랭크 이상에서 활성화되는 설명 — 행 분리, 미달 시 흐리게 → 도달 시 선명
  const descHtml=expand(char, st.desc.replace(/<lvl\s+n="?(\d+)"?>([\s\S]*?)<\/lvl>/g,(m,n,inner)=>{
    const active=lv>=+n;
    return `<div class="lvl-gate" style="margin-top:7px;padding:5px 9px;border-left:3px solid ${active?`var(--g-${key})`:'var(--edge-bright)'};border-radius:0 6px 6px 0;background:color-mix(in srgb,var(--c-${key}) ${active?18:7}%,transparent);opacity:${active?1:.42};transition:opacity .2s"><b style="font-size:11px;color:${active?`var(--g-${key})`:'var(--ink-faint)'}">${n}랭크${active?' ✓ 활성':'+'}</b> ${inner}</div>`;
  }));
  // st.checks : 특정 랭크에서 사용 가능해지는 on/off 체크박스
  let checksHTML="";
  if(st.checks&&st.checks.length){
    const cs=(char.mchecks&&char.mchecks[key])||{};
    const rows=st.checks.map((c,i)=>{
      const enabled=lv>=c.at,on=!!cs[i];
      return `<div class="boost ${on?'on':''} ${enabled?'':'locked'}"><button class="boost-toggle" data-mcheck="${key}" data-idx="${i}" ${enabled?'':'disabled'}>${on?'✓':''}</button><div class="boost-txt"><b style="font-size:11px;color:${enabled?`var(--g-${key})`:'var(--ink-faint)'}">${c.at}랭크</b> ${expand(char,c.txt)}</div></div>`;
    }).join("");
    checksHTML=`<div class="boosts"><div class="boost-head"><span>Sustained 보너스</span><span class="pick-badge">해당 랭크부터 사용</span></div>${rows}</div>`;
  }
  // 스킬 사용 트래커: 각 기술 카드에 체크(max:1) 또는 카운터. 전투 섹션의 턴/전투 리셋으로 초기화
  const uCur=(char.uses&&char.uses[key])||0, uMax=st.uses?st.uses.max:0, uScopeKo=((st.uses&&st.uses.scope)||'turn')==='combat'?'전투':'턴';
  const _bS="min-width:24px;height:24px;padding:0 6px;border-radius:6px;border:1px solid var(--edge-bright);background:transparent;color:var(--ink);cursor:pointer;font-weight:700;font-size:14px;line-height:1";
  const _wS="display:flex;align-items:center;gap:6px;margin:4px 0 9px;font-size:12px";
  const usesHTML = uMax===1
    ? `<div class="m-uses" style="${_wS}"><span style="color:var(--ink-faint)">Used 사용</span><button data-usetog="${key}" style="${_bS}${uCur?`;border-color:var(--g-${key});color:var(--g-${key});background:color-mix(in srgb,var(--c-${key}) 26%,transparent)`:''}">${uCur?'✓':''}</button><span style="color:var(--ink-faint);font-size:11px">${uScopeKo}당 1회</span></div>`
    : `<div class="m-uses" style="${_wS}"><span style="color:var(--ink-faint)">Used 사용</span><button data-use="${key}" data-dir="-1" style="${_bS}">−</button><b style="min-width:16px;text-align:center;color:var(--g-${key})">${uCur}</b><button data-use="${key}" data-dir="1" style="${_bS}">+</button><span style="color:var(--ink-faint);font-size:11px">${uMax?`/ ${uMax} · `:''}${uScopeKo} 사용</span></div>`;
  return `<div class="mastery ${key==='firstMastery'?'fm':'sm'}">
    <div class="m-head"><span class="m-name">${st.name.en}<span class="ko">(${st.name.ko})</span></span><span class="m-lvl">${STAT_META[key].role} · Lv <b>${lv}</b></span></div>
    <div class="readout">${outs}</div>
    ${usesHTML}
    <div class="m-desc">${descHtml}</div>
    ${boostsHTML}${checksHTML}</div>`;
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
/* 시리즈 공통 엠블럼 — 육각 6분할, 편 번호(오른쪽 위=1, 시계방향). 4편=보라(좌하)·5편=벚꽃(좌), 나머지는 어두운 회색 */
function emblem(){
  return `<svg class="emb" viewBox="-26 -26 52 52" aria-hidden="true">
    <defs>
      <clipPath id="embClip"><path d="M0,-24 L20.8,-12 L20.8,12 L0,24 L-20.8,12 L-20.8,-12 Z"/></clipPath>
      <filter id="embSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.4"/></filter>
    </defs>
    <g clip-path="url(#embClip)">
      <rect x="-26" y="-26" width="52" height="52" fill="#232830"/>
      <g filter="url(#embSoft)">
        <path d="M0,0 L0,24 L-20.8,12 Z" fill="#bf94f5"/>
        <path d="M0,0 L-20.8,12 L-20.8,-12 Z" fill="#f3a8c0"/>
      </g>
    </g>
    <path d="M0,-24 L20.8,-12 L20.8,12 L0,24 L-20.8,12 L-20.8,-12 Z" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
  </svg>`;
}
function brandHead(sub){
  return `<div class="builder-head"><div class="brand">${emblem()}<div class="wordmark">HEXPLORE IT</div></div><div class="sub">${sub}</div></div>`;
}
function renderBuilder(){
  const raceList=Object.values(SHARED.races), classList=Object.values(SHARED.classes), traitList=Object.values(SHARED.traits);
  const seg=(id,label)=>`<button class="seg ${APP.builderTab===id?'on':''}" data-btab="${id}">${label}</button>`;
  let body="";
  if(APP.builderTab==="race") body=pickList(raceList,APP.sel.raceId,"race",r=>racePreview(r));
  else if(APP.builderTab==="class") body=pickList(classList,APP.sel.classId,"class",c=>classPreview(c));
  else body=traitPicker(traitList);

  const race=SHARED.races[APP.sel.raceId], cls=SHARED.classes[APP.sel.classId];
  const needExtra=!!(race&&race.inheritsRace);
  const ready=APP.sel.raceId&&APP.sel.classId&&(!needExtra||(APP.sel.subRaceId&&APP.sel.aspectId));
  const sub=SHARED.races[APP.sel.subRaceId], asp=GREATER_ASPECTS.find(a=>a.id===APP.sel.aspectId);
  const summary=`<div class="build-summary">
    <span class="bs ${race?'set':''}">종족 <b>${race?race.name.en:'—'}</b></span>
    ${needExtra?`<span class="bs ${sub?'set':''}">기반 종족 <b>${sub?sub.name.en:'—'}</b></span>
    <span class="bs ${asp?'set':''}">위대한 양상 <b>${asp?asp.name.en:'—'}</b></span>`:""}
    <span class="bs ${cls?'set':''}">직업 <b>${cls?cls.name.en:'—'}</b></span>
    <span class="bs ${APP.sel.traitIds.length?'set':''}">특성 <b>${APP.sel.traitIds.length||'—'}</b></span>
  </div>`;

  root.innerHTML=`<div class="wrap">
    ${brandHead("Character Builder · 캐릭터 생성")}
    <div class="segbar">${seg("race","Race 종족")}${seg("class","Class 직업")}${seg("trait","Traits 특성")}</div>
    <div class="build-body">${body}</div>
    ${summary}
    ${cls?previewTotals(APP.sel):""}
    <div class="build-actions">
      <button class="btn primary big" id="toSeries" ${ready?'':'disabled'}>확정 → 시리즈 선택</button>
      ${ready?'':`<span class="hint">${needExtra&&APP.sel.raceId?'기반 종족과 위대한 양상까지 선택하세요':'종족과 직업을 선택하세요'} (특성은 선택 사항 · 게임 중 추가 가능)</span>`}
    </div>
  </div>`;

  root.querySelectorAll("[data-btab]").forEach(b=>b.onclick=()=>{APP.builderTab=b.dataset.btab;renderBuilder();});
  root.querySelectorAll("[data-sort]").forEach(b=>b.onclick=()=>{APP.sort[b.dataset.sortkind]=b.dataset.sort;renderBuilder();});
  root.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{
    const kind=b.dataset.kind,id=b.dataset.pick;
    if(kind==="race"){APP.sel.raceId=(APP.sel.raceId===id?null:id);APP.sel.subRaceId=null;APP.sel.aspectId=null;}
    if(kind==="class")APP.sel.classId=(APP.sel.classId===id?null:id);
    renderBuilder();
  });
  root.querySelectorAll("[data-subrace]").forEach(b=>b.onclick=()=>{APP.sel.subRaceId=(APP.sel.subRaceId===b.dataset.subrace?null:b.dataset.subrace);renderBuilder();});
  root.querySelectorAll("[data-aspect]").forEach(b=>b.onclick=()=>{APP.sel.aspectId=(APP.sel.aspectId===b.dataset.aspect?null:b.dataset.aspect);renderBuilder();});
  root.querySelectorAll("[data-trait]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.trait,i=APP.sel.traitIds.indexOf(id);
    if(i>=0)APP.sel.traitIds.splice(i,1);else APP.sel.traitIds.push(id);
    renderBuilder();
  });
  const ts=$("#toSeries");if(ts)ts.onclick=()=>{if(ready){APP.screen="series";render();}};
  placeInlinePreview();
}
/* 줄바꿈 위치가 폭에 따라 달라지므로 창 크기가 바뀌면 다시 배치 */
window.addEventListener("resize",()=>{if(APP.screen==="builder")placeInlinePreview();});
/* 목록 정렬 — 기본(데이터 수록순) · 이름순 · 편순(편→확장→이름) */
const SORTS=[["default","기본순"],["abc","이름순"],["ed","편순"]];
function sortList(list,mode){
  const a=[...list];
  if(mode==="abc")a.sort((x,y)=>x.name.en.localeCompare(y.name.en));
  else if(mode==="ed")a.sort((x,y)=>(x.ed||"").localeCompare(y.ed||"")||(x.exp||"").localeCompare(y.exp||"")||x.name.en.localeCompare(y.name.en));
  return a;
}
function sortBar(kind){
  const cur=APP.sort[kind]||"default";
  return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
    <span class="pv-lbl" style="margin:0">Sort 정렬</span>
    ${SORTS.map(([id,ko])=>`<button data-sort="${id}" data-sortkind="${kind}" style="font-size:11.5px;padding:4px 10px;border-radius:8px;cursor:pointer;${cur===id?'border:1px solid var(--accent);color:var(--ink);background:color-mix(in srgb,var(--accent-dim) 18%,transparent)':'border:1px solid var(--edge-bright);color:var(--ink-dim);background:transparent'}">${ko}</button>`).join("")}
  </div>`;
}
/* 확정 전 합계 능력치 — 직업 base + 종족 보정 + 특성/양상 보정 */
function previewTotals(sel){
  const cls=SHARED.classes[sel.classId];if(!cls)return"";
  const stub={raceId:sel.raceId,subRaceId:sel.subRaceId,raceForm:null};
  const race=SHARED.races[sel.raceId];
  if(race&&race.forms)stub.raceForm=race.forms[0].id;
  const rm=sel.raceId?modsOf(stub):zero();
  const extra=zero();
  sel.traitIds.forEach(tid=>{const t=SHARED.traits[tid];if(t&&t.mods)STAT_ORDER.forEach(k=>extra[k]+=(t.mods[k]||0));});
  if(sel.aspectId){const a=GREATER_ASPECTS.find(x=>x.id===sel.aspectId);
    if(a&&a.mods)STAT_ORDER.forEach(k=>extra[k]+=(a.mods[k]||0));}
  const cells=STAT_ORDER.map(k=>{
    const base=(cls.stats[k]&&cls.stats[k].base)||0, add=(rm[k]||0)+(extra[k]||0), l=statLabel(k);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 11px;border-radius:10px;border:1px solid var(--edge-bright);background:var(--panel-2);min-width:74px">
      <span style="font-family:'Cinzel';font-size:10px;letter-spacing:.04em;color:var(--g-${k})">${l.en}<span style="font-size:.9em;color:var(--ink-faint);margin-left:1px">${l.ko}</span></span>
      <span style="font-family:'Cinzel';font-weight:700;font-size:19px;color:var(--g-${k})">${base+add}</span>
      <span style="font-size:9.5px;color:var(--ink-faint)">${base}${add?(add>0?` +${add}`:` ${add}`):""}</span></div>`;}).join("");
  const note=race&&race.forms?` <span style="text-transform:none;letter-spacing:0;font-family:'Noto Serif KR';color:var(--ink-faint)">· ${race.forms[0].name.ko} 형태 기준</span>`:"";
  return `<div class="build-body" style="padding:13px"><div class="pv-lbl" style="margin:0 0 8px">Total Stats · 합계 능력치${note}</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap">${cells}</div>
    <div class="hint" style="margin-top:8px;text-align:left">직업 기본값 + 종족 보정${sel.traitIds.length||sel.aspectId?" + 특성/양상":""} · 육각형은 판에서 채웁니다</div></div>`;
}
function pickList(list,selId,kind,previewFn){
  if(!list.length)return`<div class="empty-note">데이터가 아직 없습니다. data.js에 추가하세요.</div>`;
  list=sortList(list,APP.sort[kind]);
  const cards=list.map(x=>`<button class="pick-card ${selId===x.id?'on':''}" data-pick="${x.id}" data-kind="${kind}">
    <div class="pc-name">${x.name.en}</div><div class="pc-ko">${x.name.ko}</div>${x.ed?`<span class="ed-badge" title="${EXP_META[x.exp]?EXP_META[x.exp].ko+" · ":""}${x.ed}편 수록">${x.exp&&EXP_META[x.exp]?`<b style="color:${EXP_META[x.exp].c}">${x.exp}</b>`:""}${x.ed}</span>`:""}</button>`).join("");
  const sel=list.find(x=>x.id===selId);
  /* 미리보기를 그리드 안에 넣어두면, placeInlinePreview()가 선택한 카드의 행 바로 아래로 옮긴다 */
  return `${sortBar(kind)}<div class="pick-grid">${cards}${sel?`<div class="preview inline">${previewFn(sel)}</div>`:""}</div>${sel?"":`<div class="empty-note">위에서 하나 선택하면 상세가 표시됩니다.</div>`}`;
}
/* 선택한 카드가 속한 줄의 끝으로 미리보기를 옮겨, 그 줄 바로 아래에 펼쳐지게 한다(아코디언 그리드).
   미리보기는 width:100% 라 항상 새 줄을 차지하므로, 그리드 끝에 둔 상태로 각 카드의 줄 위치를 잰다. */
function placeInlinePreview(){
  const grid=root.querySelector(".pick-grid");if(!grid)return;
  const pv=grid.querySelector(":scope > .preview.inline"),sel=grid.querySelector(":scope > .pick-card.on");
  if(!pv||!sel)return;
  grid.appendChild(pv);
  const rowTop=sel.offsetTop;
  let last=sel;
  grid.querySelectorAll(":scope > .pick-card").forEach(c=>{if(Math.abs(c.offsetTop-rowTop)<2)last=c;});
  if(last.nextElementSibling!==pv)last.after(pv);
  sel.classList.add("expanded");
}
function racePreview(r){
  const mods=STAT_ORDER.filter(k=>r.mods[k]).map(k=>{const l=statLabel(k);return `<span class="modpill" style="color:var(--g-${k})">${l.en}<span style="font-size:.88em">${l.ko}</span> ${r.mods[k]>0?'+':''}${r.mods[k]}</span>`;}).join("")||`<span class="empty-note" style="padding:0">보정 없음</span>`;
  return `<div class="pv-title">${r.name.en} <span class="ko">(${r.name.ko})</span></div>
    <div class="pv-row"><span class="pv-lbl">Favored Enemy 숙적</span> ${foeLabel(r.favoredEnemy)}</div>
    <div class="pv-row"><span class="pv-lbl">Food Use 음식소모</span> ${r.foodUse}</div>
    <div class="pv-mods">${mods}</div>
    ${r.forms?`<div class="pv-row"><span class="pv-lbl">Forms 형태</span> ${r.forms.map(f=>`${f.en||f.name.en} <span class="ko">(${f.name.ko})</span> — ${STAT_ORDER.filter(k=>f.mods&&f.mods[k]!=null).map(k=>{const l=statLabel(k);return `${l.en}${l.ko} ${f.mods[k]>0?'+':''}${f.mods[k]}`;}).join(", ")}`).join(" · ")}</div>`:""}
    <div class="pv-ability">${r.ability?`<b>${r.ability.name.en} (${r.ability.name.ko})</b> — ${previewText(r.ability.desc)}`:""}</div>
    <div class="flavor">${r.flavor||""}</div>
    ${r.inheritsRace?inheritPicker(r):""}`;
}
/* '다시 깨어난 자' 전용 — 기반 종족 + 위대한 양상 선택 */
function inheritPicker(r){
  const chip=(on,attr,label)=>`<button class="pick-card ${on?'on':''}" ${attr} style="display:inline-block;width:auto;padding:7px 13px;margin:0 6px 6px 0">${label}</button>`;
  const subs=Object.values(SHARED.races).filter(x=>!x.inheritsRace)
    .map(x=>chip(APP.sel.subRaceId===x.id,`data-subrace="${x.id}"`,`${x.name.en}<span class="pc-ko" style="margin-left:4px">${x.name.ko}</span>`)).join("");
  const asps=GREATER_ASPECTS
    .map(a=>chip(APP.sel.aspectId===a.id,`data-aspect="${a.id}"`,`${a.name.en}<span class="pc-ko" style="margin-left:4px">${a.name.ko}</span>`)).join("");
  const sub=SHARED.races[APP.sel.subRaceId];
  const mods=sub?STAT_ORDER.filter(k=>sub.mods[k]).map(k=>{const l=statLabel(k);return `<span class="modpill" style="color:var(--g-${k})">${l.en}<span style="font-size:.88em">${l.ko}</span> ${sub.mods[k]>0?'+':''}${sub.mods[k]}</span>`;}).join(""):"";
  return `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--edge)">
    <div class="pv-lbl" style="margin-bottom:7px">기반 종족 — 보정치와 숙적만 물려받습니다</div>
    <div>${subs}</div>
    ${sub?`<div class="pv-row" style="margin-top:6px"><span class="pv-lbl">Favored Enemy 숙적</span> ${foeLabel(sub.favoredEnemy)}</div><div class="pv-mods">${mods}</div>`:""}
    <div class="pv-lbl" style="margin:14px 0 7px">Greater Aspect 위대한 양상 — 하나 선택</div>
    <div>${asps}</div>
  </div>`;
}
function classPreview(c){
  const tag=catTags(c);
  const stats=STAT_ORDER.map(k=>{if(!c.stats[k])return"";const l=statLabel(k);return `<span class="modpill" style="color:var(--g-${k})">${l.en}<span style="font-size:.88em">${l.ko}</span> ${c.stats[k].base}</span>`;}).join("");
  const masteries=["firstMastery","secondMastery"].filter(k=>c.stats[k]&&c.stats[k].name).map(k=>`<div class="pv-row"><span class="pv-lbl" style="color:var(--g-${k})">${STAT_META[k].role}</span> ${c.stats[k].name.en} (${c.stats[k].name.ko})</div>`).join("");
  return `<div class="pv-title">${c.name.en} <span class="ko">(${c.name.ko})</span></div>
    ${c.flavor?`<div class="flavor" style="border-left-color:${catColor(c)};margin-top:6px">${c.flavor}</div>`:""}
    <div style="margin:6px 0">${tag}</div>
    <div class="pv-mods">${stats}</div>
    ${masteries}
    <div class="pv-ability">${c.special?previewText(c.special.ko):""}</div>`;
}
function traitPicker(list){
  if(!list.length)return`<div class="empty-note">특성 데이터가 아직 없습니다. (traits / aspects / keepsakes)<br>data.js의 SHARED.traits 에 추가하세요. 게임 중에도 판에서 직접 추가할 수 있습니다.</div>`;
  const srcName={trait:"Trait 트레잇",aspect:"Aspect 애스펙트",keepsake:"Keepsake 킵세이크"};
  const cards=list.map(t=>`<button class="pick-card wide ${APP.sel.traitIds.includes(t.id)?'on':''}" data-trait="${t.id}">
    <div class="pc-src">${srcName[t.type]||t.type}</div>
    <div class="pc-name">${t.name.en} <span class="pc-ko">(${t.name.ko})</span></div>
    <div class="pc-desc">${previewText(t.desc)}</div></button>`).join("");
  return `<div class="pick-list">${cards}</div><div class="hint" style="margin-top:8px">여러 개 선택 가능 · 게임 중 판에서도 추가/제거할 수 있습니다.</div>`;
}

/* =====================================================================
   SCREEN: SERIES
   ===================================================================== */
function renderSeries(){
  const race=SHARED.races[APP.sel.raceId], cls=SHARED.classes[APP.sel.classId];
  const cards=Object.values(SERIES).map(s=>`<button class="series-card" data-series="${s.id}">
    <div class="sc-badge" ${SERIES_ACCENT[s.id]?`style="color:${SERIES_ACCENT[s.id]}"`:""}>${s.short}</div>
    <div class="sc-name">${s.name.en}</div><div class="sc-ko">${s.name.ko}</div>
    <div class="sc-note">키워드 · 상태 · 룰 · 아이템 · 기타 참조표가 이 시리즈 기준으로 적용됩니다.</div>
  </button>`).join("");
  root.innerHTML=`<div class="wrap">
    ${brandHead("Select Series · 시리즈 선택")}
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
  normBoosts(char); if(!char.mchecks||typeof char.mchecks!=="object")char.mchecks={}; if(!char.uses||typeof char.uses!=="object")char.uses={};
  // top tabs
  const tabs=[{id:"board",label:"Board 캐릭터판"},{id:"keywords",label:"Keywords 키워드"}];
  if(series.exKeywords&&Object.keys(series.exKeywords).length)tabs.push({id:"exkeywords",label:"Siege 전용 키워드"});
  tabs.push({id:"conditions",label:"Conditions 상태"},{id:"rules",label:"Rules 룰"},{id:"items",label:"Items 아이템"});
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
  applyTheme();
  root.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{APP.tab=b.dataset.tab;renderBoard();});
  // toolbar
  $("#tbSave").onclick=saveCharacterModal;
  $("#tbLoad").onclick=loadCharacterModal;
  $("#tbExport").onclick=exportCharacter;
  $("#tbRecords").onclick=recordsModal;
  $("#tbEnd").onclick=endGameModal;
  $("#tbNew").onclick=()=>{if(confirm("현재 캐릭터를 두고 새 캐릭터를 만들까요? (저장하지 않은 변경은 사라집니다)")){APP.sel={raceId:null,classId:null,traitIds:[]};APP.char=null;APP.screen="builder";render();}};

  if(APP.tab==="board")bindBoard(char); else bindRefList();
  bindTerms(char);   // keyword/condition overlay from any tab
}

function boardBody(char){
  const cls=SHARED.classes[char.classId],race=SHARED.races[char.raceId];
  const foeHTML=char.favoredEnemies.map((f,i)=>`<span class="chip">${foeLabel(f)}<button data-foe="${i}">\u2715</button></span>`).join("")+`<button class="add-btn" id="addFoe">+ 추가</button>`;
  const combat=["attack","defence","firstMastery","secondMastery"].map(k=>renderHex(char,k)).join("");
  const skills=["navigate","explore","survival"].map(k=>renderHex(char,k)).join("");
  const masteries=`<div class="mastery-grid">${renderMastery(char,"firstMastery")}${renderMastery(char,"secondMastery")}</div>`;
  const srcMeta={race:["Race","종족","src-race"],trait:["Trait","트레잇","src-trait"],aspect:["Aspect","애스펙트","src-aspect"],greater:["Greater Aspect","위대한 양상","src-aspect"],keepsake:["Keepsake","킵세이크","src-keepsake"],class:["Class","직업","src-class"],event:["Event","이벤트","src-event"]};
  /* 같은 종류끼리 모아서 표시 — 양상과 위대한 양상은 나란히 */
  const SRC_ORDER={race:0,trait:1,aspect:2,greater:2,keepsake:3,class:4,event:5};
  const abilityHTML=char.abilities.slice().sort((a,b)=>(SRC_ORDER[a.src]??9)-(SRC_ORDER[b.src]??9)).map(a=>{
    const m=srcMeta[a.src]||["?","?","src-event"];let track="";
    if(a.track&&a.track.type==="check")track=`<div class="ab-track"><div class="track-check"><button class="${a.track.used?'done':''}" data-abcheck="${a.id}">${a.track.used?'\u2713':''}</button></div><span style="font-size:12px;color:var(--ink-faint)">${a.track.used?'사용함 · 탭하여 초기화':'사용 시 탭'}</span></div>`;
    else if(a.track&&a.track.type==="count")track=`<div class="ab-track"><div class="track-count"><button data-abcount="${a.id}" data-dir="-1">\u2212</button><span class="cval">${a.track.value}</span><button data-abcount="${a.id}" data-dir="1">\uFF0B</button><span style="font-size:11px;color:var(--ink-faint)">/ ${a.track.max}</span></div></div>`;
    return `<div class="ability"><div class="ab-top"><span class="src-tag ${m[2]}">${m[0]} · ${m[1]}</span><span class="ab-name">${nm(a.name)}</span><button class="ab-remove" data-abremove="${a.id}">\u2715</button></div><div class="ab-desc">${expand(char,a.desc)}</div>${a.mods?`<div class="pv-mods" style="margin-top:6px">${STAT_ORDER.filter(k=>a.mods[k]).map(k=>{const l=statLabel(k);return `<span class="modpill" style="color:var(--g-${k})">${l.en}<span style="font-size:.88em">${l.ko}</span> ${a.mods[k]>0?'+':''}${a.mods[k]}</span>`;}).join("")}</div>`:""}${track}</div>`;
  }).join("");
  const itemHTML=char.items.length?char.items.map(it=>`<div class="item"><span class="txt">${it.text}</span><button data-itemremove="${it.id}">\u2715</button></div>`).join(""):`<div class="empty-note">아직 아이템 없음</div>`;

  return `
    <div class="identity">
      <div class="cat-row">${catTags(cls)}</div>
      <div class="name">${cls.name.en}<span class="ko">${cls.name.ko}</span>${cls.flavor?`<span class="cls-quote" style="margin-left:10px;font-family:'Noto Serif KR';font-style:italic;font-weight:400;font-size:clamp(10px,1.5vw,13px);letter-spacing:0;color:var(--ink-faint);white-space:nowrap;border-left:2px solid ${catColor(cls)};padding-left:9px">${cls.flavor}</span>`:""}</div>
      <div class="race-line">Race · 종족 · <b>${race.name.en} (${race.name.ko})</b>${char.subRaceId&&SHARED.races[char.subRaceId]?` · 기반 <b>${SHARED.races[char.subRaceId].name.en} (${SHARED.races[char.subRaceId].name.ko})</b>`:""}${(()=>{const as=char.abilities.filter(a=>a.src==="aspect"||a.src==="greater");return as.length?` · 양상 ${as.map(a=>`<b>${a.name.en} (${a.name.ko})</b>`).join(", ")}`:"";})()}</div>
      <div class="flavor">${race.flavor||""}</div>
      ${cls.special?`<div class="special" style="border-left-color:${catColor(cls)}"><b class="h" style="color:${catColor(cls)}">Class Trait · 직업 특성</b>${expand(char,cls.special.ko)}${specialReadout(char,cls)}${vitalSwitcher(char,cls)}${foeSwitcher(char,cls)}${renderCounters(char,cls)}${renderRoster(char,cls)}</div>`:""}
      <div class="foe"><div class="foe-label">Favored Enemy · 숙적</div><div class="foe-list">${foeHTML}</div></div>
    </div>
    <div class="section"><div class="sec-head">Vital · 생명력</div>
      <div class="vital-grid">${vitalCard(char,"hp","Health","체력","health","curHealth","regenHealth")}${vitalCard(char,"en","Energy","에너지","energy","curEnergy","regenEnergy")}</div>
    </div>
    <div class="section"><div class="sec-head" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>Ability · 능력</span><span style="display:flex;gap:6px"><button class="tbtn" id="resetTurn" title="턴 사용 초기화">↺ 턴</button><button class="tbtn" id="resetCombat" title="전투 사용 초기화">↺ 전투</button></span></div>${race.forms?formSwitcher(char,race):""}<div class="hex-wrap">${combat}</div>${masteries}</div>
    <div class="section"><div class="sec-head">Skill · 스킬</div><div class="hex-wrap">${skills}</div></div>
    <div class="section"><div class="sec-head">Special Abilities · 특수 능력</div>${abilityHTML}
      <div class="ability-actions">
        <button class="add-btn" data-addability="free">+ 능력 직접 추가</button>
        <button class="add-btn" id="addAspect">+ Aspect 양상</button>
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
    return refList(char,"Keywords · 키워드",Object.values(ks));
  }
  if(tab==="exkeywords"){
    const ks=series.exKeywords||{};if(!Object.keys(ks).length)return empty("전용 키워드가 아직 비어 있습니다.");
    return refList(char,"5편 전용 키워드 · Siege",Object.values(ks));
  }
  if(tab==="conditions"){
    const cs=series.conditions||{};if(!Object.keys(cs).length)return empty("이 시리즈의 상태이 아직 비어 있습니다.");
    return refList(char,"Conditions · 상태",Object.values(cs),COND_NOTE+` <span style="opacity:.8">속성 — <b style="color:${COND_Q.A.c}">무관</b> ${COND_Q.A.t} · <b style="color:${COND_Q.P.c}">지속</b> ${COND_Q.P.t} · <b style="color:${COND_Q.S.c}">중첩</b> ${COND_Q.S.t}</span>`);
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
/* 검색 + 접기 목록 — 평소엔 이름만, 탭하면 설명이 펼쳐진다 */
function refList(char,title,list,note){
  const rows=list.map(v=>{
    const q=(v.q||[]).filter(x=>COND_Q[x]).map(x=>`<span title="${COND_Q[x].t}" style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:999px;margin-left:5px;color:${COND_Q[x].c};border:1px solid ${COND_Q[x].c};background:color-mix(in srgb,${COND_Q[x].c} 13%,transparent)">${COND_Q[x].ko}</span>`).join("");
    const plain=`${v.titleEn||v.name.en} ${v.name.ko} ${(v.q||[]).map(x=>COND_Q[x]?COND_Q[x].ko:"").join(" ")} ${(v.desc||"").replace(/<[^>]+>/g,"")}`.toLowerCase().replace(/"/g,"&quot;");
    return `<div class="ref-block refrow" data-s="${plain}" style="padding:0;margin:0;overflow:hidden;flex:0 0 auto;max-width:100%;transition:background .15s">
      <div class="refhead" style="display:flex;align-items:center;gap:7px;padding:7px 11px;cursor:pointer;user-select:none;white-space:nowrap">
        <span class="chev" style="color:var(--ink-faint);font-size:10px;transition:transform .15s;display:inline-block">▶</span>
        <span class="ref-name" style="font-size:13.5px">${v.titleEn||v.name.en}<span class="ko" style="margin-left:1px">${v.name.ko}</span></span>${q}
      </div>
      <div class="ref-desc refbody" style="display:none;padding:0 12px 11px 29px;margin-top:0">${expand(char,v.desc||"")}</div>
    </div>`;
  }).join("");
  return `<div class="section"><div class="sec-head">${title}</div>
    ${note?`<div class="special" style="margin:0 0 12px;border-left-color:var(--edge-bright)">${note}</div>`:""}
    <div class="reftools" style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
      <input id="refSearch" placeholder="검색 — 영문·한글·설명" autocomplete="off" style="flex:1;min-width:0;padding:8px 11px;border-radius:9px;border:1px solid var(--edge-bright);background:rgba(0,0,0,.25);color:var(--ink);font-family:'Noto Serif KR';font-size:13px">
      <button id="refAll" class="tbtn" style="white-space:nowrap">모두 펼치기</button>
    </div>
    <div id="refCount" style="font-size:11px;color:var(--ink-faint);margin:-4px 0 8px"></div>
    <div id="refWrap" style="display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start">${rows}</div></div>`;
}
/* 검색·접기 동작 (탭 렌더 후 호출) */
function bindRefList(){
  const box=$("#refSearch");if(!box)return;
  const rows=Array.from(root.querySelectorAll(".refrow"));
  const cnt=$("#refCount"), all=$("#refAll");
  /* 접힘 = 이름 크기만큼만(칩), 펼침 = 가로 전체 폭 + 설명 표시 */
  const open=(r,on)=>{
    r.querySelector(".refbody").style.display=on?"block":"none";
    r.querySelector(".chev").style.transform=on?"rotate(90deg)":"none";
    r.style.flex=on?"1 1 100%":"0 0 auto";
    r.style.background=on?"var(--panel)":"var(--panel-2)";
  };
  rows.forEach(r=>r.querySelector(".refhead").onclick=()=>open(r,r.querySelector(".refbody").style.display==="none"));
  const upd=()=>{
    const q=box.value.trim().toLowerCase();
    let n=0;
    rows.forEach(r=>{const hit=!q||r.dataset.s.includes(q);r.style.display=hit?"":"none";if(hit){n++;if(q)open(r,true);}});
    cnt.textContent=q?`${n}개 일치`:`${rows.length}개`;
  };
  box.oninput=upd;upd();
  let opened=false;
  all.onclick=()=>{opened=!opened;rows.forEach(r=>{if(r.style.display!=="none")open(r,opened);});all.textContent=opened?"모두 접기":"모두 펼치기";};
}
/* 키워드 표기: 영문명한글명 (예: Evasion회피) */
function kwItem(name,desc){
  return `<div class="ref-block"><div class="ref-name">${name.en}<span class="ko" style="margin-left:1px">${name.ko}</span></div><div class="ref-desc">${desc||""}</div></div>`;
}

/* ---------- board interactions ---------- */
function bindBoard(char){
  root.querySelectorAll(".pip").forEach(p=>p.onclick=()=>{const k=p.dataset.hex,idx=+p.dataset.idx;char.filled[k]=(char.filled[k]>=idx+1)?idx:idx+1;renderBoard();});
  root.querySelectorAll("[data-mod]").forEach(b=>b.onclick=()=>{char.mod[b.dataset.mod]+=+b.dataset.dir;renderBoard();});
  root.querySelectorAll("[data-fuse]").forEach(b=>b.onclick=()=>{if(b.disabled)return;const k=b.dataset.fuse;if(char.filled[k]>0){char.filled[k]-=1;char.mod[k]+=1;renderBoard();}});
  root.querySelectorAll("[data-form]").forEach(b=>b.onclick=()=>{if(b.disabled)return;const f=b.dataset.form;if(char.raceForm===f)return;const r=SHARED.races[char.raceId];if(r&&r.formCostEnergy){if(char.curEnergy<r.formCostEnergy)return;char.curEnergy-=r.formCostEnergy;}char.raceForm=f;if(r&&r.formHealOnSwitch)char.curHealth=Math.min(effOf(char,"health"),char.curHealth+r.formHealOnSwitch);renderBoard();});
  root.querySelectorAll("[data-vital]").forEach(b=>b.onclick=()=>{const k=b.dataset.vital;char[k]=Math.max(0,char[k]+ +b.dataset.dir);renderBoard();});
  root.querySelectorAll("[data-vital-pick]").forEach(b=>b.onclick=()=>{const d=b.dataset.vitalPick;char.vitalPick=(char.vitalPick===d?null:d);renderBoard();});
  root.querySelectorAll("[data-foe-pick]").forEach(b=>b.onclick=()=>{const d=b.dataset.foePick;char.foePick=(char.foePick===d?null:d);renderBoard();});
  root.querySelectorAll("[data-roster-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.rosterAdd;
    if(!char.roster)char.roster={};const l=char.roster[id]||(char.roster[id]=[]);l.push({name:""});
    if(!char.rosterPick)char.rosterPick={};if(char.rosterPick[id]==null)char.rosterPick[id]=l.length-1;renderBoard();});
  root.querySelectorAll("[data-roster-pick]").forEach(b=>b.onclick=()=>{const id=b.dataset.rosterPick,i=+b.dataset.idx;
    if(!char.rosterPick)char.rosterPick={};char.rosterPick[id]=(char.rosterPick[id]===i?null:i);renderBoard();});
  root.querySelectorAll("[data-roster-num]").forEach(b=>b.onclick=()=>{const id=b.dataset.rosterNum,i=+b.dataset.idx,f=b.dataset.field;
    const e=char.roster[id][i];e[f]=Math.max(0,(e[f]||0)+ +b.dataset.dir);renderBoard();});
  root.querySelectorAll("[data-roster-name]").forEach(inp=>inp.onchange=()=>{const id=inp.dataset.rosterName,i=+inp.dataset.idx;
    char.roster[id][i].name=inp.value;renderBoard();});
  root.querySelectorAll("[data-roster-del]").forEach(b=>b.onclick=()=>{const id=b.dataset.rosterDel,i=+b.dataset.idx;
    char.roster[id].splice(i,1);
    const p=(char.rosterPick||{})[id];
    if(p===i)char.rosterPick[id]=null;else if(p>i)char.rosterPick[id]=p-1;   /* 삭제로 인덱스가 밀리는 것 보정 */
    renderBoard();});
  root.querySelectorAll("[data-cnt]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.cnt,ty=b.dataset.type,dir=+b.dataset.dir;
    if(!char.counters)char.counters={};
    if(ty){const m=char.counters[id]||(char.counters[id]={});m[ty]=Math.max(0,(m[ty]||0)+dir);}
    else char.counters[id]=Math.max(0,(char.counters[id]||0)+dir);
    renderBoard();});
  root.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>{const k=b.dataset.res;char[k]=Math.max(0,char[k]+ +b.dataset.dir);renderBoard();});
  root.querySelectorAll("[data-boost]").forEach(b=>b.onclick=()=>{
    if(b.disabled)return;const n=+b.dataset.boost,key=b.dataset.mkey||"firstMastery",stack=b.dataset.stack==="1";
    if(!char.boosts[key])char.boosts[key]={};const store=char.boosts[key];
    const earned=boostEarned(char,key),used=Object.values(store).reduce((a,x)=>a+x,0);
    if(used>=earned)return;
    if(stack)store[n]=(store[n]||0)+1;else if(!store[n])store[n]=1;
    renderBoard();
  });
  root.querySelectorAll("[data-mcheck]").forEach(b=>b.onclick=()=>{if(b.disabled)return;const key=b.dataset.mcheck,i=+b.dataset.idx;if(!char.mchecks[key])char.mchecks[key]={};char.mchecks[key][i]=!char.mchecks[key][i];renderBoard();});
  root.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>{const k=b.dataset.use,st=SHARED.classes[char.classId].stats[k],mx=st.uses?st.uses.max:0;let v=(char.uses[k]||0)+ +b.dataset.dir;v=Math.max(0,v);if(mx>1)v=Math.min(mx,v);char.uses[k]=v;renderBoard();});
  root.querySelectorAll("[data-usetog]").forEach(b=>b.onclick=()=>{const k=b.dataset.usetog;char.uses[k]=char.uses[k]?0:1;renderBoard();});
  const rT=$("#resetTurn");if(rT)rT.onclick=()=>{["firstMastery","secondMastery"].forEach(k=>{const st=SHARED.classes[char.classId].stats[k];if(st&&st.desc&&!(st.uses&&st.uses.scope==='combat'))char.uses[k]=0;});renderBoard();};
  const rC=$("#resetCombat");if(rC)rC.onclick=()=>{["firstMastery","secondMastery"].forEach(k=>char.uses[k]=0);renderBoard();};
  root.querySelectorAll("[data-abcheck]").forEach(b=>b.onclick=()=>{const a=char.abilities.find(x=>x.id===b.dataset.abcheck);a.track.used=!a.track.used;renderBoard();});
  root.querySelectorAll("[data-abcount]").forEach(b=>b.onclick=()=>{const a=char.abilities.find(x=>x.id===b.dataset.abcount);a.track.value=Math.max(0,Math.min(a.track.max,a.track.value+ +b.dataset.dir));renderBoard();});
  root.querySelectorAll("[data-abremove]").forEach(b=>b.onclick=()=>{char.abilities=char.abilities.filter(x=>x.id!==b.dataset.abremove);renderBoard();});
  root.querySelectorAll("[data-itemremove]").forEach(b=>b.onclick=()=>{char.items=char.items.filter(x=>x.id!==b.dataset.itemremove);renderBoard();});
  root.querySelectorAll("[data-foe]").forEach(b=>b.onclick=()=>{char.favoredEnemies.splice(+b.dataset.foe,1);renderBoard();});
  const af=$("#addFoe");if(af)af.onclick=addFoeModal;
  const ai=$("#addItem");if(ai)ai.onclick=addItemModal;
  const ag=$("#addAspect");if(ag)ag.onclick=addAspectModal;
  root.querySelectorAll("[data-addability]").forEach(b=>b.onclick=()=>addAbilityModal(b.dataset.addability));
}
/* keyword/condition overlay — works on every tab */
function bindTerms(char){
  root.querySelectorAll("[data-term]").forEach(s=>s.onclick=()=>openTerm(char,s.dataset.kind,s.dataset.term));
}
function openTerm(char,kind,term){
  const series=SERIES[char.series];
  const v=kind==="kw"?((series.keywords&&series.keywords[term])||(series.exKeywords&&series.exKeywords[term])):(series.conditions&&series.conditions[term]);
  const title=kind==="kw"?"Keyword · 키워드":"Condition · 상태";
  openModal(`<div class="term-head">${title}</div>
    <h3 style="margin-top:4px">${v?`${v.titleEn||v.name.en}<span style="font-size:14px;color:var(--ink-dim);margin-left:2px">${v.name.ko}</span>`:term}</h3>
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
  const have=APP.char.favoredEnemies.map(f=>f.en);
  const quick=FOE_TYPES.filter(t=>!have.includes(t.en))
    .map(t=>`<button class="btn slot" data-foepick="${t.en}" data-foeko="${t.ko}" style="margin:0 6px 6px 0">${t.en}<span style="font-size:.88em">${t.ko}</span></button>`).join("");
  openModal(`<h3>Favored Enemy 추가</h3>
    ${quick?`<div class="field"><label>목록에서 선택</label><div style="display:flex;flex-wrap:wrap">${quick}</div></div>`:""}
    <div class="field"><label>English</label><input id="fEn" placeholder="Goblin"></div><div class="field"><label>한글</label><input id="fKo" placeholder="고블린"></div><div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="fSave">추가</button></div>`);
  document.querySelectorAll("[data-foepick]").forEach(b=>b.onclick=()=>{APP.char.favoredEnemies.push({en:b.dataset.foepick,ko:b.dataset.foeko});closeModal();renderBoard();});
  $("#fSave").onclick=()=>{const en=$("#fEn").value.trim(),ko=$("#fKo").value.trim();if(en||ko)APP.char.favoredEnemies.push({en:en||ko,ko:ko||en});closeModal();renderBoard();};
}
/* 양상 추가 — 맨 위에 '위대한 양상 공개', 그 아래 일반 양상 목록, 마지막에 직접 입력.
   양상·keepsake는 종족과 같은 양식(mods 포함 가능)이라 보정치가 있으면 능력치에 자동 반영된다. */
function addAspectModal(){
  const have=APP.char.abilities.map(a=>a.name.en);
  const btn=(attr,n)=>`<button class="btn slot" ${attr} style="margin:0 6px 6px 0">${n.en}<span style="font-size:.88em">${n.ko}</span></button>`;
  const greater=GREATER_ASPECTS.filter(a=>!have.includes(a.name.en)).map(a=>btn(`data-gapick="${a.id}"`,a.name)).join("");
  const normal=Object.values(SHARED.traits).filter(t=>t.type==="aspect"&&!have.includes(t.name.en)).map(t=>btn(`data-aspick="${t.id}"`,t.name)).join("");
  openModal(`<h3>Aspect 양상 추가</h3>
    <div class="field"><label>Aspect 양상</label>
      ${normal?`<div style="display:flex;flex-wrap:wrap">${normal}</div>`:`<div class="empty-note" style="padding:6px 0">목록이 아직 비어 있습니다.</div>`}</div>
    <div class="field">
      <button class="btn" id="gaReveal" style="width:100%">Greater Aspect 위대한 양상 공개 ▾</button>
      <div id="gaList" style="display:none;margin-top:8px">
        <div class="hint" style="margin-bottom:6px">특수 조건에서만 획득하는 양상입니다.</div>
        ${greater?`<div style="display:flex;flex-wrap:wrap">${greater}</div>`:`<div class="empty-note" style="padding:6px 0">추가할 위대한 양상이 없습니다.</div>`}
      </div>
    </div>
    <div class="field"><label>또는 직접 입력 — 이름 (English)</label><input id="gEn" placeholder="Aspect name"></div>
    <div class="field"><label>이름 (한글)</label><input id="gKo" placeholder="양상 이름"></div>
    <div class="field"><label>설명</label><textarea id="gDesc" placeholder="효과 설명…"></textarea></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">취소</button><button class="btn primary" id="gSave">추가</button></div>`);
  const add=(src,o,pre)=>{APP.char.abilities.push({id:pre+(o.id||"")+Date.now(),src,name:clone(o.name),desc:o.desc||"(내용 추후 입력)",track:initTrack(o.track),mods:o.mods?clone(o.mods):null});closeModal();renderBoard();};
  const rv=$("#gaReveal");if(rv)rv.onclick=()=>{const l=$("#gaList"),on=l.style.display==="none";l.style.display=on?"block":"none";rv.textContent=`Greater Aspect 위대한 양상 공개 ${on?"▴":"▾"}`;};
  document.querySelectorAll("[data-gapick]").forEach(b=>b.onclick=()=>add("greater",GREATER_ASPECTS.find(x=>x.id===b.dataset.gapick),"ga_"));
  document.querySelectorAll("[data-aspick]").forEach(b=>b.onclick=()=>add("aspect",SHARED.traits[b.dataset.aspick],"as_"));
  $("#gSave").onclick=()=>{
    const en=$("#gEn").value.trim(),ko=$("#gKo").value.trim();if(!en&&!ko){closeModal();return;}
    APP.char.abilities.push({id:"as"+Date.now(),src:"aspect",name:{en:en||ko,ko:ko||en},desc:$("#gDesc").value.trim()||"—",track:null,mods:null});
    closeModal();renderBoard();
  };
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
/* 편별 테마 — 캐릭터판에서는 그 편의 분위기 색을 적용(능력치 9색은 공용이라 그대로) */
const SERIES_ACCENT={"4":"#bf94f5","5":"#f3a8c0"};
function applyTheme(){
  document.documentElement.setAttribute("data-screen",APP.screen);
  const s=(APP.screen==="board"&&APP.char)?APP.char.series:null;
  if(s&&s!=="4")document.documentElement.setAttribute("data-series",s);
  else document.documentElement.removeAttribute("data-series");
}
/* 배경 무늬 — 은빛 격자는 CSS 배경(정적), 색 헥스만 SVG로 그려 윤곽을 따라 흐르게 한다.
   격자 규격은 style.css 의 --hexgrid 와 같아야 색 헥스가 격자에 정확히 겹친다. */
const HEXBG={R:26, ratio:.14, colors:["#f3a8c0","#bf94f5","#63d688"],
  dur:11,      /* 한 헥스가 밝아졌다 가라앉는 주기(초) */
  waves:1.6};  /* 화면 대각선에 동시에 보이는 파도 수 */
function paintHexBg(){
  const svg=document.querySelector("#hexbg svg");if(!svg)return;
  const R=HEXBG.R, dx=Math.sqrt(3)*R, dy=1.5*R, peri=6*R;
  const w=window.innerWidth, h=window.innerHeight;
  const cols=Math.ceil(w/dx)+2, rows=Math.ceil(h/dy)+2;
  /* 화면 크기가 같으면 다시 그리지 않는다(리렌더마다 무늬가 바뀌면 산만하다) */
  if(svg.dataset.size===cols+"x"+rows)return;
  svg.dataset.size=cols+"x"+rows;
  let seed=7, rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
  /* 파도는 좌하단 → 우상단으로 간다. 화면 y는 아래로 커지므로 s=(x-y)가 클수록 우상단이다. */
  const cells=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(rnd()>=HEXBG.ratio){rnd();continue;}                    /* 색 없는 칸은 배경 격자가 담당 */
    const col=HEXBG.colors[Math.floor(rnd()*3)%3];
    const cx=c*dx+(r%2?dx/2:0), cy=r*dy;
    cells.push({cx,cy,col,s:cx-cy});
  }
  if(!cells.length){svg.innerHTML="";return;}
  const sMin=Math.min(...cells.map(c=>c.s)), sMax=Math.max(...cells.map(c=>c.s));
  const span=(sMax-sMin)||1, DUR=HEXBG.dur, WAVES=HEXBG.waves;
  const parts=cells.map(({cx,cy,col,s})=>{
    const pts=[];
    for(let i=0;i<6;i++){const a=(60*i-90)*Math.PI/180;
      pts.push((cx+R*Math.cos(a)).toFixed(1)+","+(cy+R*Math.sin(a)).toFixed(1));}
    /* 우상단일수록 늦게 밝아진다. 화면 전체가 WAVES 주기에 걸쳐 훑이므로 파도가 이어진다. */
    const delay=-((sMax-s)/span)*WAVES*DUR;
    return `<path d="M${pts.join("L")}Z" stroke="${col}" style="--dur:${DUR}s;--delay:${delay.toFixed(2)}s"/>`;
  });
  svg.innerHTML=parts.join("");
}
function ensureHexBg(){
  if(!document.getElementById("hexbg")){
    const d=document.createElement("div");d.id="hexbg";d.setAttribute("aria-hidden","true");
    d.innerHTML='<i></i><svg xmlns="http://www.w3.org/2000/svg"></svg>';
    document.body.insertBefore(d,document.body.firstChild);
    let t;window.addEventListener("resize",()=>{clearTimeout(t);t=setTimeout(paintHexBg,200);});
  }
  paintHexBg();
}
function render(){
  ensureHexBg();
  applyTheme();
  if(APP.screen==="builder")renderBuilder();
  else if(APP.screen==="series")renderSeries();
  else renderBoard();
}
render();
})();
