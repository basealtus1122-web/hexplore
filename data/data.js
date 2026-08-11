/* =====================================================================
   Hexplore It — DATA
   구조:  CAT(계통) · SHARED(종족/직업/특성=시리즈 공용) · SERIES(시리즈별 참조표)
   여기만 계속 추가하면 됩니다.  엔진(app.js)은 손대지 않습니다.
   이름 표기 규칙: 화면에는 English (한글) 순으로 나옵니다.
   설명 토큰:
     {attack} {defence} {firstMastery} {secondMastery} ...  → 해당 능력 이름으로 자동 치환
     <st>health</st> <st>energy</st> <st>attack</st> …  → 스탯 용어를 English한글 + 스탯색으로 자동 렌더
     <kw>boost</kw> → Boost증폭 (용어집에서 이름을 찾아 자동 표기 · 클릭 시 정의)
     <state>vulnerable</state> → Vulnerable취약 (컨디션 표에서 자동 표기)
     <hp>텍스트</hp> / <en>텍스트</en>  → (구) 체력/에너지 강조색. 새 데이터는 <st> 사용
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
        desc:"게임 턴마다 1회, <st>energy</st> 1을 소모해 2라운드 동안 <kw>evasion</kw> 8을 얻는다.",
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
      flavor:"나의 권능에 경탄하라!",
      special:{ko:"기술의 비용으로 자신의 <st>health</st>이나 <st>energy</st>를 지불할 수 있다."},
      /* stats: base = 직업 고유 시작값. 최종값 = base + 종족보정 + 육각형 + 효과 */
      stats:{
        health:{base:6},
        energy:{base:5},
        attack:{base:2, name:{en:"Nether Pull",ko:"네더 풀"}, dmg:["health","energy"]},
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
          desc:`{firstMastery} 레벨 ×2 만큼 <st>health</st> 피해를 준다. 3레벨부터 매 3레벨마다 아래 강화 중 하나를 선택한다(중복 가능·취소 불가).`,
          boosts:[
            {stack:true, txt:`{firstMastery}의 생명력 비용 <b>-1</b> (최소 0).`},
            {txt:`피해량을 {attack} 레벨의 <b>절반</b>만큼 <kw>boost</kw>하고, 생명력 비용 <b>+1</b>.`},
            {txt:`일반 피해 대신 대상의 <st>outlast</st>에 피해 <b>2</b>를 줄 수도 있다.`},
            {txt:`대상은 전투 종료까지 <state>vulnerable</state> 상태가 된다.`},
            {txt:`추가로 {attack} 레벨만큼 <st>energy</st> 피해를 입힌다.`},
          ],
        },
        secondMastery:{base:2, name:{en:"Eldritch Siphon",ko:"엘드리치 사이펀"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"secondMastery", val:1},
            {lab:"Damage 피해", color:"neutral", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
            {lab:"Heal 회복", color:"energy", val:((E.lv("attack")+E.lv("secondMastery"))/3).toFixed(1)},
          ],
          desc:`<st>energy</st>로 지불 시: {attack}+{secondMastery} 랭크만큼 <st>health</st> 피해를 주고, 그 <b>1/3</b>만큼 <kw>heal</kw>한다. <st>health</st>으로 지불 시: 같은 양의 <st>energy</st> 피해를 주고, 그 <b>1/3</b>만큼 <kw>heal</kw>한다. <lvl n="8"><st>health</st> 1·<st>energy</st> 1을 소모해 두 효과를 모두 얻는다.</lvl>`,
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
      flavor:"어둠 속에 빛이 있다.",
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
          desc:`이번 라운드에 {attack} 행동을 <b>두 번</b> 사용한다. 대상이 <kw>energetic</kw> 상태가 아니면 대상의 <kw>block</kw>·<kw>defend</kw>·<kw>reflect</kw>를 {firstMastery} 랭크만큼 감소시킨다. 직전 라운드에 {secondMastery} 사용 시 이번 라운드 적들의 타겟 수가 <b>1</b> 감소한다(최소 1). <lvl n="7">직전 라운드에 {secondMastery} 사용 시 이번 라운드 {attack}의 피해를 {firstMastery} 랭크 <b>절반</b>만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Magnified Beam",ko:"광선 집중"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
            {lab:"+Damage (기술1 후)", color:"defence", val:E.lv("defence").toFixed(1)},
          ],
          desc:`{attack} 랭크 + {secondMastery} 랭크만큼 <st>health</st> 피해를 준다. 직전 라운드에 {firstMastery}을(를) 사용했다면 이 피해를 {defence} 랭크만큼 <kw>boost</kw>한다. <lvl n="8"><st>energy</st> 3을 추가로 지불하면 이번 라운드에 {secondMastery} 행동을 한 번 더 사용할 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    bard: {
      id:"bard",
      name:{en:"Bard",ko:"바드"},
      category:{key:"assist"},
      flavor:"물론 우리를 들어보셨겠죠.",
      special:{ko:`아이템을 판매하는 곳에 있을 때 게임 턴당 <b>1회</b>: <st>energy</st> 2를 소모해 원하는 기술의 스탯 테스트를 한다. 성공하면 해당 기술 랭크의 <b>1/3</b>만큼 <b>골드</b>를 얻는다. 결과가 <b>헥스(Hex)</b>면 추가로 파워 업 하나를 뽑아 모든 영웅에게 적용한다.`},
      stats:{
        health:{base:5},
        energy:{base:6},
        attack:{base:1, name:{en:"Strafing Sidestep",ko:"측면 이동"}, dmg:["health","influence"]},  // 체력 또는 영향력(택1)
        defence:{base:3, name:{en:"Second String",ko:"두번째 현"}},  // 특수규칙 뇌물(Bribe) = 추후작성
        firstMastery:{base:1, name:{en:"Dirge of the Dead",ko:"장송곡"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage boost 피해 증가", color:"neutral", val:E.lv("firstMastery")},
          ],
          desc:`숙적에게 그룹이 주는 <st>health</st>·<st>energy</st>·<st>influence</st> 피해를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. 또는 적의 <st>outlast</st>을 감소시키기 위해 선택한 스탯 테스트를 자동으로 성공시킨다. 이 기술은 <kw>sustain</kw>할 수 있다.`,
          checks:[
            {at:6, txt:`<kw>sustain</kw> 중일 때는 모든 영웅이 원하는 기술 하나에 임시 기어 업그레이드 <b>1</b>을 받는다.`},
            {at:9, txt:`<kw>sustain</kw> 중일 때 모든 영웅이 원하는 기술 하나에 임시 기어 업그레이드 <b>1</b>을 추가로 받는다.`},
          ],
        },
        secondMastery:{base:2, name:{en:"Song of the Troubadour",ko:"서정가"}, cost:1, boostAt:[4,8],
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 비전투·동료 에너지", color:"energy", val:(E.lv("secondMastery")/3).toFixed(1)},
            {lab:"Block 전투·그룹", color:"defence", val:(E.lv("secondMastery")/2).toFixed(1)},
          ],
          desc:`<b>비전투:</b> 모든 동료의 <st>energy</st>를 {secondMastery} 랭크 <b>1/3</b>만큼 <kw>heal</kw>하거나, 이번 게임 턴에 영웅 하나의 모든 스탯 테스트에 <b>-1</b> 보너스를 준다. <b>전투:</b> 그룹이 {secondMastery} 랭크 <b>1/2</b>만큼 <kw>block</kw>을 얻는다. 이 기술은 <kw>sustain</kw>할 수 있다. <b>4·8랭크에 아래에서 하나 선택(중복 가능):</b>`,
          boosts:[
            {stack:true, txt:`모든 동료가 <st>energy</st> <kw>regen</kw> 2를 획득한다.`},
            {stack:true, txt:`모든 영웅은 스탯 테스트에 <b>-2</b> 보너스를 받는다.`},
          ],
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:3, name:{en:"Explore",ko:"탐험"}},
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
/* =====================================================================
   KEYWORDS — 공용(4·5편) + 5편 전용(Siege). 이름=영문/한글, 설명은 우선 영문 원문(한글화 예정)
   key = 소문자 영문(스킬 <kw> 토큰과 매칭). 여러 단어는 공백 유지.
   ===================================================================== */
const KW_COMMON = {
  aegis:{name:{en:"Aegis",ko:"이지스"}, desc:`주황색 방패로 표기. 주로 적의 레벨 방패를 대체. 영웅의 공격 기어 업그레이드가 이지스 1/2 이상(올림)이거나 Energy가 0이어야 Health 피해를 줄 수 있다. 따로 언급이 없다면, 이지스 값은 적의 레벨과 같다.`},
  ambush:{name:{en:"Ambush",ko:"매복"}, desc:`매복한 적은 전투 시작 전에 행동을 하나 한다. 이 행동은 1명만 대상으로 한다. 키워드 뒤에 다른 효과도 포함할 수 있다. 영웅이 매복한 경우, 타겟 주사위를 굴려 타겟인 영웅 한 명이 전투 시작 전에 행동 하나를 한다.`},
  battlefield:{name:{en:"Battlefield",ko:"전장"}, desc:`적을 대면하는 특별한 장소. 전장은 적의 설명란에 적혀있으며 영웅이 언제 입장하는지 적혀있다. 영웅은 전장을 공유하는 아군만 대상으로 삼을 수 있다. 적은 따로 언급이 없다면 모든 전장에 있는 것으로 간주한다. 전장을 옮긴 영웅은 이동 후 라운드를 시작할 때 위치 보정치를 받습니다.`},
  block:{name:{en:"Block",ko:"차단"}, desc:`Energy 피해부터 시작하여, Resolution 단계에 받는 총 피해량을 차단 수치만큼 감소.`},
  boost:{name:{en:"Boost",ko:"증폭"}, desc:`지시대로 특정 숫자 효과를 일시적으로 증가시킴. 따로 언급이 없다면 증폭의 효과는 전투 라운드(전투 밖이면 페이즈) 종료까지 유지됩니다.`},
  corrosive:{name:{en:"Corrosive",ko:"부식"}, desc:`이 피해를 받은 라운드에는 Heal될 수 없음. 전투가 아닌 상황에서 받았다면 현재 게임 턴 동안 Heal될 수 없음. 부식 피해는 Vital이 최대치 이상으로 Raise되는 것을 막는다.`},
  counterattack:{name:{en:"Counterattack",ko:"반격"}, desc:`따로 언급이 없다면 대상이 피해를 받을 때 발생. 영웅은 즉시 적에게 보너스 Attack 행동을 한 번 수행. 괄호 안의 숫자는 적이 반격할 때 입히는 Health 피해량. 반격은 반격할 수 없음.`},
  critical:{name:{en:"Critical",ko:"치명타"}, desc:`언제든 영웅이 하나의 원천에서 1 이상의 치명타 피해를 받으면, 치명상 1개를 받습니다.`},
  "critical wound":{name:{en:"Critical Wound",ko:"치명상"}, desc:`각 영웅은 초기 음식소모량+3 만큼의 치명상을 견딜 수 있다(최대 6). 이 이상이 되면 즉시 사망합니다. 치명상은 상태를 무효화하는 아이템·어빌리티·효과 등으로 제거할 수 없습니다. 각 영웅은 Camp(야영)할 때 치명상 1개를 제거합니다.`},
  dangerous:{name:{en:"Dangerous",ko:"위험"}, desc:`위험 적은 게임 난이도를 1 증가한 것처럼 적용합니다. 이 효과는 중첩 가능합니다.`},
  defend:{name:{en:"Defend",ko:"방어"}, desc:`Resolution 페이즈에 받는 각 피해 효과를 방어 수치만큼 감소시킵니다.`},
  energetic:{name:{en:"Energetic",ko:"에너지체"}, desc:`적의 Energy가 절반 이상 남아있다면, 그 행동은 추가 효과를 얻습니다. 여러 Energy 값이 있다면, 현재 가장 높은 Energy 값을 참조합니다.`},
  "energy drain":{name:{en:"Energy Drain",ko:"에너지 흡수"}, desc:`Energy 피해의 일종입니다. 대상의 현재 Energy를 초과한 피해는 Health 피해로 전환됩니다.`},
  evasion:{name:{en:"Evasion",ko:"회피"}, desc:`회피를 가진 대상이 효과의 대상이 될 때마다 Core 주사위를 굴립니다. 값이 회피 값 이상이면 그 효과를 무시합니다. 회피가 있는 대상이 회피를 또 얻으면, 더 낮은 값을 취하거나 현재 회피 값을 1 감소시킵니다.`},
  fuse:{name:{en:"Fuse",ko:"융합"}, desc:`적절한 기어 업그레이드 슬롯을 지웁니다. 랭크 보너스는 그대로 유지합니다.`},
  harvest:{name:{en:"Harvest",ko:"수확"}, desc:`Core 주사위를 굴립니다. 결과가 키워드 뒤의 숫자 이하라면, 표시된 자원을 획득합니다.`},
  hatred:{name:{en:"Hatred",ko:"증오"}, desc:`증오 적은 특정 타입의 영웅을 더 잘 노리고 더 큰 피해를 줍니다. 해당 타입의 영웅은 이 적의 공격에 대한 타겟 주사위에 +2 패널티를 받고, 그 공격은 증오 대상 영웅에게 적 레벨만큼 추가 피해를 줍니다.`},
  hazardous:{name:{en:"Hazardous",ko:"재앙"}, desc:`그룹은 이 지역에서 Camp(야영)나 Moving Cautiously(조심스럽게 이동)의 이익을 얻지 못하며, 이동 페이즈 종료 시 해당 원소의 Health 피해를 1 받는다. Nether(네더) 타일은 항상 Void(공허) 타입이다. 이 효과는 Defender(방어자)에 있는 동안 무효가 된다.`},
  heal:{name:{en:"Heal",ko:"회복"}, desc:`현재 Health 그리고/또는 Energy를 (지정된 대로) 최대치 이내에서 Heal 수치만큼 회복한다. 전투 Resolution 페이즈, 또는 전투 밖 아무 때나 적용한다.`},
  immune:{name:{en:"Immune",ko:"면역"}, desc:`면역 대상은 이 키워드 뒤에 오는 효과나 원소로 인한 피해·부정적 효과를 받지 않는다. 여러 원소로 Augment(보강)한 Defender는, 나열되지 않은 다른 원소를 하나라도 Augment하고 있는 한 Siege(공성) 적에게 정상적으로 피해를 입힌다.`},
  loot:{name:{en:"Loot",ko:"전리품"}, desc:`모든 영웅은 헥스플로어 잇 시리즈 전체에서 가치 X 이하인 아이템 하나씩을 선택해 얻습니다.`},
  mutate:{name:{en:"Mutate",ko:"변이"}, desc:`적이 즉시 변이합니다. 적 변이 목록에 따라 주사위를 굴려 적에게 적용합니다. 동료는 이 키워드를 통해 변이하지 않습니다.`},
  negate:{name:{en:"Negate",ko:"무효"}, desc:`해당 효과나 공격, 그리고 그 모든 부가 효과를 멈추고 제거합니다.`},
  nonlethal:{name:{en:"Nonlethal",ko:"비치명타"}, desc:`비치명타 피해는 Vital을 0으로 만들 수 없습니다. 대신 최소 1을 남깁니다.`},
  piercing:{name:{en:"Piercing",ko:"관통"}, desc:`관통 수치만큼 Defend나 Block할 수 없는 피해를 입힙니다.`},
  raise:{name:{en:"Raise",ko:"증가"}, desc:`Heal과 같지만, 총 회복이 대상의 최대 Vital을 초과할 수 있어 현재 수치를 Raise 수치만큼 일시적으로 증가시킵니다. 따로 언급이 없다면, 증가한 Vital은 얻은 게임 턴 동안(또는 잃을 때까지) 유지됩니다.`},
  reflect:{name:{en:"Reflect",ko:"반사"}, desc:`공격 그리고/또는 효과의 대상을 공격자에게로 되돌립니다. 하나의 공격·효과는 한 번만 반사될 수 있습니다. 키워드 뒤 괄호 안에 숫자가 있다면, 반사할 수 있는 최대 피해량입니다.`},
  regen:{name:{en:"Regen",ko:"재생"}, desc:`Heal과 같지만, 매 라운드 Declaration 페이즈에 회복합니다. Regen은 서로 다른 원천에서 받은 것만 축적되며, 전투 중에만 적용됩니다.`},
  reinforce:{name:{en:"Reinforce",ko:"증원"}, desc:`증원 효과는 영웅 그룹이 4명 이상일 때만 적용됩니다.`},
  revive:{name:{en:"Revive",ko:"부활"}, desc:`따로 언급이 없는 한, 죽은 대상을 되살려 Vital을 최대치로 회복시킵니다.`},
  roam:{name:{en:"Roam",ko:"배회"}, desc:`Wander와 같지만, 이동 거리는 Hex 주사위 값과 같습니다.`},
  "size matters":{name:{en:"Size Matters",ko:"크기 참조"}, desc:`게임 수치가 대상의 음식 소모량(Food Rating)에 따라 결정됩니다. 키워드 뒤 괄호의 기호에 따라 대상의 음식 소모량과 =일치, +증가, -감소, x곱하기를 적용합니다. 여러 영웅을 대상으로 하면 각각 따로 적용하며, 영웅들의 음식 소모량을 합치지 않습니다.`},
  soulless:{name:{en:"Soulless",ko:"영혼없음"}, desc:`이 대상이 받는 모든 Energy 피해는 Energy Drain(에너지 흡수)이 된다.`},
  soar:{name:{en:"Soar",ko:"비상"}, desc:`영웅들의 절반 이상(올림)이 비상을 가지고 있다면, 그룹은 SkyTile(하늘 타일)·Water(물)·Mountain Peak(산꼭대기) 헥스로 이동할 수 있습니다.`},
  strengthen:{name:{en:"Strengthen",ko:"강화"}, desc:`특정 조건이 충족되면 해당 숫자 효과를 영구적으로 증가시킵니다.`},
  summon:{name:{en:"Summon",ko:"소환"}, desc:`소환사를 위한 동료를 만듭니다. 전투 중 이 동료는 소환사를 대신해 행동합니다. 타겟이 될 수 있고, 피해를 받거나 죽을 수도 있습니다.`},
  surge:{name:{en:"Surge",ko:"쇄도"}, desc:`쇄도 효과는 원소 주사위가 쇄도(Surge)로 나올 때 발생합니다.`},
  sustain:{name:{en:"Sustain",ko:"유지"}, desc:`라운드마다 Energy 1을 소모해 효과를 유지합니다. 유지 중인 능력이 이후 라운드에 계속되는 동안 다른 능력도 사용할 수 있습니다. 따로 언급이 없다면, 유지 효과는 한 번에 하나만 활성화됩니다.`},
  teleport:{name:{en:"Teleport",ko:"순간이동"}, desc:`지정된 장소, 또는 순간이동 수치 이내의 새 위치로 즉시 이동합니다. 따로 언급이 없다면 아무 페이즈에나 사용할 수 있으나, 이동 페이즈에 사용하면 그룹은 Moving Normally(일반 이동)한 것으로 간주합니다.`},
  tenacious:{name:{en:"Tenacious",ko:"집요"}, desc:`집요한 적에게서는 그룹이 Flee(도주)할 수 없습니다.`},
  unyielding:{name:{en:"Unyielding",ko:"완고"}, desc:`이 공격은 같은 대상을 여러 번 타겟할 수 있습니다. 매 공격마다 타겟을 굴립니다.`},
  wander:{name:{en:"Wander",ko:"헤매다"}, desc:`그룹은 Wander Compass(배회 나침반)에 표시된 대로 무작위 방향으로 1헥스 이동합니다.`},
  weakness:{name:{en:"Weakness",ko:"약점"}, desc:`다른 키워드·원소·피해 유형을 포함합니다. 대상이 지정된 유형의 피해를 1 이상, 또는 Void(공허) 피해를 얼마든지 받으면 Hex 주사위를 굴립니다. 대상은 그 결과만큼 추가 피해를 받으며, 이 피해는 감소시킬 수 없습니다. HEXplode(헥스플로드)는 적을 대상으로만 발생합니다. 대상은 여러 약점을 가질 수 있지만, 같은 유형의 약점은 중첩되지 않습니다.`},
};
const KW_SIEGE = {
  augment:{name:{en:"Augment",ko:"보강"}, desc:`원소를 Defender나 영웅에 엮는다. Temple(사원)·Elements(원소) 참조표 및 Element 카드 참조 (TMoG).`},
  arcing:{name:{en:"Arcing",ko:"방전"}, desc:`Defender를 공격할 때, 그 Defender로부터 X헥스 이내의 다른 Defender는 가해진 Siege(공성) 피해의 절반을 받는다. 방전은 목표 Defender가 가진 Specialist(전문가) 수만큼 1씩 감소한다.`},
  bolster:{name:{en:"Bolster",ko:"임시강화"}, desc:`During an ongoing Siege, if the group is in a Defender during the Villain phase, each hero may spend 1 Energy and roll one Skill of their choice to give it a temporary bonus — Navigation: increase this Defender's Range by 2 this turn; Explore: deal 1 Siege Damage to a Siege Opponent in Range; Survival: if this Defender suffered Siege Damage this turn and has at least 1 Resilience remaining, it gains +1 Resilience. If the roll Critically Succeeds, regain the Energy you spent.`},
  bulwark:{name:{en:"Bulwark",ko:"방벽"}, desc:`Targets with Bulwark reduce Siege Damage taken by the Bulwark amount (to a minimum of 0). An Element type may follow this Keyword to indicate this effect only triggers when damage of the matching type is being inflicted. Against Siege Opponents with this Keyword, Bulwark is reduced by 1 for each Specialist an attacking Defender has.`},
  consume:{name:{en:"Consume",ko:"소모"}, desc:`This Keyword is followed by a Resource type and amount. Reduce the Stockpile amount of the Resource shown by the Consume amount. Siege Opponents with this Keyword reduce the Stockpile amount each time they deal any amount of Siege Damage to any number of Defenders. If there are none left to Consume, a City-State of your choice loses 1 Resilience instead.`},
  cripple:{name:{en:"Cripple",ko:"손상"}, desc:`Defenders who suffer any of this Siege Damage also lose 1 Power (to a minimum of 1).`},
  deconstruct:{name:{en:"Deconstruct",ko:"해체"}, desc:`Each time a Defender suffers this damage, they lose 1 Recruit. If they have none, the Defender loses 1 Potential instead.`},
  equip:{name:{en:"Equip",ko:"장비"}, desc:`Attach an Equip card to a Defender. The Defender gains the attached effect.`},
  freeze:{name:{en:"Freeze",ko:"빙결"}, desc:`Defenders who suffer any damage from this Siege Opponent lose their Equip effects this turn.`},
  ignite:{name:{en:"Ignite",ko:"발화"}, desc:`Any heroes inside a Defender damaged by this Siege Opponent suffers X Energy Drain and are Wounded. Ignite is reduced by 1 for each Specialist the targeted Defender has.`},
  imbalance:{name:{en:"Imbalance",ko:"불균형"}, desc:`Each time a Siege card is drawn, an Elemental Imbalance occurs. Imbalance is recorded on Jaethi's placard and ranges from 0-9 for each Element.`},
  overpower:{name:{en:"Overpower",ko:"압도"}, desc:`When attacking a Defender, if this Siege Opponent's Overpower value is greater than the Defender's Power, it deals +1 Siege Damage and heroes may not use their highest ranked Skill to Bolster the Defender this turn. Overpower is reduced by 1 for each Specialist the targeted Defender has.`},
  retreat:{name:{en:"Retreat",ko:"후퇴"}, desc:`When Siege Opponents in Slots 2, 3, or 4 are vanquished, roll a Core die. If the result is equal to or less than its Retreat value, it evades death (do not gain rewards). Place this Siege Opponent on the bottom of the slot to the left of its current slot. Retreat is reduced by 1 for each Recruit an attacking Defender has.`},
  siege:{name:{en:"Siege",ko:"공성"}, desc:`This is a type of damage. A Siege Opponent or Defender loses 1 Resilience for each point of Siege Damage dealt. Heroes who suffer any amount of Siege Damage suffer 20 Piercing Energy Drain instead.`},
  swift:{name:{en:"Swift",ko:"신속"}, desc:`Siege Opponents with this Keyword move 2 additional hexes and treat only City-States as Magnetic.`},
  tremor:{name:{en:"Tremor",ko:"진동"}, desc:`Negate any Recruit and Specialist bonuses in Range of this effect while this effect is in play.`},
};

const SERIES = {
  "4": {
    id:"4", name:{en:"Hexplore It — Edition 4", ko:"헥스플로어 잇 — 4편"}, short:"4",

    keywords: KW_COMMON,
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
    keywords: KW_COMMON,
    exKeywords: KW_SIEGE,
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
