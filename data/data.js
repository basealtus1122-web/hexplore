/* =====================================================================
   Hexplore It — DATA
   구조:  CAT(계통) · SHARED(종족/직업/특성=시리즈 공용) · SERIES(시리즈별 참조표)
   여기만 계속 추가하면 됩니다.  엔진(app.js)은 손대지 않습니다.
   이름 표기 규칙: 화면에는 English (한글) 순으로 나옵니다.
   설명 토큰:
     {attack} {defence} {firstMastery} {secondMastery} ...  → 해당 능력 이름으로 자동 치환
     <hp>텍스트</hp> / <en>텍스트</en>  → 체력/에너지 강조색
     <kw>evasion</kw>  → 키워드(클릭 시 오버레이). 소문자 영문이 SERIES.keywords의 key와 매칭
     <state>vulnerable</state>  → 컨디션(클릭 시 오버레이). SERIES.conditions의 key와 매칭
   ===================================================================== */

/* ---------- 직업 계통 (게임 공용 색) ---------- */
const CAT = {
  striker:{en:"Striker",ko:"스트라이커",c:"#c9333a",g:"#ff5f68"},
  sapper: {en:"Sapper", ko:"새퍼",      c:"#8a54d4",g:"#bf94f5"},
  utility:{en:"Utility",ko:"유틸리티",  c:"#a5713e",g:"#d09a5f"},
  healer: {en:"Healer", ko:"힐러",      c:"#3773d8",g:"#71a5ff"},
  assist: {en:"Assist", ko:"어시스트",  c:"#33a457",g:"#63d688"},
  // dual 은 직업 데이터에서 category:{key:"dual",members:["striker","healer"]} 형태로 지정
};

/* 능력치 9종의 화면 순서·역할·게임 공용 테마색 (엔진이 참조) */
const STAT_ORDER = ["health","energy","attack","defence","firstMastery","secondMastery","navigate","explore","survival"];
const STAT_META = {
  health:       {role:"Vital",  roleKo:"체력",  group:"vital"},
  energy:       {role:"Vital",  roleKo:"에너지",group:"vital"},
  attack:       {role:"Attack", roleKo:"공격",  group:"combat"},
  defence:      {role:"Defence",roleKo:"방어",  group:"combat"},
  firstMastery: {role:"First Mastery", roleKo:"기술 1", group:"combat"},
  secondMastery:{role:"Second Mastery",roleKo:"기술 2", group:"combat"},
  navigate:     {role:"Navigate",roleKo:"길찾기",group:"skill"},
  explore:      {role:"Explore", roleKo:"탐험",  group:"skill"},
  survival:     {role:"Survival",roleKo:"생존",  group:"skill"},
};

/* =====================================================================
   SHARED — 시리즈 무관 (종족·직업·특성)
   ===================================================================== */
const SHARED = {

  races: {
    brightling: {
      id:"brightling",
      name:{en:"Brightling",ko:"브라이틀링"},
      favoredEnemy:{en:"Undead",ko:"언데드"},
      foodUse:1,
      mods:{health:0,energy:4,attack:0,defence:0,firstMastery:1,secondMastery:2,navigate:0,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴마다 1회, <en>에너지 1</en>을 소모해 2라운드 동안 <kw>evasion</kw> 8을 얻는다.",
        track:{type:"check"}},
      flavor:"일루먼(Ilumen) 100명 중 1명꼴로 브라이틀링이 태어난다. 대부분 하플링 남짓밖에 자라지 못하지만, 이들이 내뿜는 빛은 시력에 피해를 입힐 만큼 강렬하다.",
    },
    // 다음 종족은 여기에 같은 형식으로 추가
  },

  classes: {
    warlock: {
      id:"warlock",
      name:{en:"Warlock",ko:"워록"},
      category:{key:"striker"},
      special:{ko:"기술의 비용으로 자신의 <hp>Health (체력)</hp>이나 <en>Energy (에너지)</en>를 지불할 수 있다."},
      /* stats: base = 직업 고유 시작값. 최종값 = base + 종족보정 + 육각형 + 효과 */
      stats:{
        health:{base:6},
        energy:{base:5},
        attack:{base:2, name:{en:"Nether Pull",ko:"네더 풀"}},
        defence:{base:3, name:{en:"Shadow Ward",ko:"섀도우 워드"}},
        firstMastery:{base:2, name:{en:"Arcane Bolt",ko:"아케인 볼트"}, cost:3,
          /* readout: 엔진이 계산해 실시간 표시. desc 는 규칙 원문. boosts 는 강화 목록. */
          readout:(E)=>[
            {lab:"Cost 비용", color:"firstMastery",
             val: Math.max(0, 3 - E.b(1) + (E.on(2)?1:0)) },
            {lab:"Damage 피해", color:"health",
             val: (E.lv("firstMastery")*2 + (E.on(2)? E.lv("attack")/2 : 0)).toFixed(1) },
            ...(E.on(5)? [{lab:"+Energy 에너지", color:"energy", val:E.lv("attack").toFixed(1)}] : [])
          ],
          desc:`{firstMastery} 레벨 ×2 만큼의 <hp>체력 피해</hp>. 3레벨부터 매 3레벨마다 아래 강화 중 하나 선택 <state>(중복 가능, 취소 불가)</state>.`,
          boosts:[
            {stack:true, txt:`{firstMastery}의 생명력 비용 <b>-1</b> (최소 0).`},
            {txt:`피해량을 {attack} 레벨의 <b>절반</b>만큼 <kw>boost</kw>하고, 생명력 비용 <b>+1</b>.`},
            {txt:`일반 피해 대신 대상의 <kw>outlast</kw>에 피해 <b>2</b>를 줄 수도 있다.`},
            {txt:`대상은 전투 종료까지 <state>vulnerable</state> 상태가 된다.`},
            {txt:`추가로 {attack} 레벨만큼 <b>에너지 피해</b>를 입힌다.`},
          ],
        },
        secondMastery:{base:2, name:{en:"Eldritch Siphon",ko:"엘드리치 사이펀"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"secondMastery", val:1},
            {lab:"Damage 피해", color:"neutral", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
            {lab:"Heal 회복", color:"energy", val:((E.lv("attack")+E.lv("secondMastery"))/3).toFixed(1)},
          ],
          desc:`<en>에너지</en>로 지불 시: {attack}+{secondMastery} 랭크만큼 <hp>체력 피해</hp>, 그 <b>1/3</b>만큼 <kw>heal</kw>. <en>체력</en>으로 지불 시: 같은 양의 <en>에너지 피해</en>, 그 <b>1/3</b>만큼 <kw>heal</kw>. 8레벨부터 체력 1·에너지 1을 소모해 두 효과를 모두 얻는다.`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    phosromancer: {
      id:"phosromancer",
      name:{en:"Phosromancer",ko:"광채술사"},
      category:{key:"striker"},
      /* 직업 특성(special) 없음 — 엔진은 special 없으면 특성 박스를 생략 */
      stats:{
        health:{base:5},
        energy:{base:7},
        attack:{base:2, name:{en:"Shadow Slash",ko:"그림자 베기"}, dmg:"health"},  // (체력) = 체력 피해 타입
        defence:{base:1, name:{en:"Prism Shield",ko:"프리즘 방패"}},
        firstMastery:{base:1, name:{en:"Light Absorption",ko:"빛 흡수"}, cost:1,
          readout:(E)=>{
            const fm=E.lv("firstMastery");
            return [
              {lab:"Cost 비용", color:"energy", val:1},
              {lab:"Attacks 공격 횟수", color:"attack", val:2},
              {lab:"Block/Defend/Reflect 감소", color:"neutral", val:fm},
              ...(fm>=7 ? [{lab:"Attack boost (기술2 후)", color:"attack", val:(fm/2).toFixed(1)}] : [])
            ];
          },
          desc:`이번 라운드에 {attack} 행동을 <b>두 번</b> 사용한다. 대상이 <kw>energetic</kw>이 아니면 대상의 <kw>block</kw>·<kw>defend</kw>·<kw>reflect</kw>를 {firstMastery} 랭크만큼 감소시킨다. 직전 라운드에 {secondMastery} 사용 시 이번 라운드 적들의 타겟 수가 <b>1</b> 감소한다(최소 1). <b>7랭크+:</b> 직전 라운드에 {secondMastery} 사용 시 이번 라운드 {attack}의 피해를 {firstMastery} 랭크 <b>절반</b>만큼 <kw>boost</kw>한다.`,
        },
        secondMastery:{base:3, name:{en:"Magnified Beam",ko:"광선 집중"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
            {lab:"+Damage (기술1 후)", color:"defence", val:E.lv("defence").toFixed(1)},
          ],
          desc:`{attack} 랭크 + {secondMastery} 랭크만큼 <hp>체력 피해</hp>를 준다. 직전 라운드에 {firstMastery} 사용 시 이 피해를 {defence} 랭크만큼 <kw>boost</kw>한다. <b>8랭크+:</b> <en>에너지 3</en>을 추가 지불하면 이번 라운드에 {secondMastery} 행동을 한 번 더 사용할 수 있다.`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    // 다음 직업은 여기에 추가.  dual 예:  category:{key:"dual",members:["striker","sapper"]}
  },

  /* 특성: traits / aspects / keepsakes.  게임 중 추가·제거 가능. keepsake 은 공개형.
     지금은 예시만.  실제 데이터 주시면 채웁니다. */
  traits: {
    // 예시 (실데이터로 교체 예정)
    bloodPact:   {id:"bloodPact", type:"trait",  name:{en:"Blood Pact",ko:"피의 서약"},
      desc:"전투당 1회, 체력 2를 지불해 기술 하나를 즉시 재사용. (예시)", track:{type:"check"}},
    voidHunger:  {id:"voidHunger", type:"aspect", name:{en:"Hunger of the Void",ko:"공허의 굶주림"},
      desc:"<kw>heal</kw>할 때마다 공허 충전 +1 (최대 3). (예시)", track:{type:"count",max:3}},
  },
};

/* =====================================================================
   SERIES — 시리즈별 참조표.  탭: keywords · conditions · rules · items · extras[]
   내용은 비어 있어도 앱이 동작합니다. 채우기만 하면 탭에 반영됩니다.
   ===================================================================== */
const SERIES = {
  "4": {
    id:"4", name:{en:"Hexplore It — Edition 4", ko:"헥스플로어 잇 — 4편"}, short:"4",

    keywords: {
      evasion:{name:{en:"Evasion",ko:"회피"}, desc:"공격을 회피할 확률/수치. (정의 추후 채움)"},
      boost:  {name:{en:"Boost",ko:"부스트"},  desc:"수치를 일시적으로 강화한다. (정의 추후 채움)"},
      heal:   {name:{en:"Heal",ko:"회복"},     desc:"체력 또는 에너지를 회복한다. (정의 추후 채움)"},
      outlast:{name:{en:"Outlast",ko:"아웃라스트"}, desc:"적의 지속력 수치. (정의 추후 채움)"},
    },
    conditions: {
      vulnerable:{name:{en:"Vulnerable",ko:"취약"}, desc:"받는 피해가 증가한다. (정의 추후 채움)"},
    },
    rules: [
      // {title:{en,ko}, body:"..."}  형식으로 추가
    ],
    items: [
      // {name:{en,ko}, desc:"...", tags:[]}
    ],
    extras: [
      // {id:"...", label:{en,ko}, entries:[ {name:{en,ko}, desc:"..."} ]}
    ],
  },

  "5": {
    id:"5", name:{en:"Hexplore It — Edition 5", ko:"헥스플로어 잇 — 5편"}, short:"5",
    keywords: {
      evasion:{name:{en:"Evasion",ko:"회피"}, desc:"(5편 정의 추후 채움)"},
      boost:  {name:{en:"Boost",ko:"부스트"},  desc:"(5편 정의 추후 채움)"},
      heal:   {name:{en:"Heal",ko:"회복"},     desc:"(5편 정의 추후 채움)"},
      outlast:{name:{en:"Outlast",ko:"아웃라스트"}, desc:"(5편 정의 추후 채움)"},
    },
    conditions: {
      vulnerable:{name:{en:"Vulnerable",ko:"취약"}, desc:"(5편 정의 추후 채움)"},
    },
    rules: [],
    items: [],
    extras: [],
  },
};

/* 엔진에서 접근할 수 있게 전역으로 노출 */
window.HEX = { CAT, STAT_ORDER, STAT_META, SHARED, SERIES };
