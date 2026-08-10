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
          desc:`이번 라운드에 {attack} 행동을 <b>두 번</b> 사용한다. 대상이 <kw>energetic</kw>이 아니면 대상의 <kw>block</kw>·<kw>defend</kw>·<kw>reflect</kw>를 {firstMastery} 랭크만큼 감소시킨다. 직전 라운드에 {secondMastery} 사용 시 이번 라운드 적들의 타겟 수가 <b>1</b> 감소한다(최소 1). <lvl n="7">직전 라운드에 {secondMastery} 사용 시 이번 라운드 {attack}의 피해를 {firstMastery} 랭크 <b>절반</b>만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Magnified Beam",ko:"광선 집중"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
            {lab:"+Damage (기술1 후)", color:"defence", val:E.lv("defence").toFixed(1)},
          ],
          desc:`{attack} 랭크 + {secondMastery} 랭크만큼 <hp>체력 피해</hp>를 준다. 직전 라운드에 {firstMastery} 사용 시 이 피해를 {defence} 랭크만큼 <kw>boost</kw>한다. <lvl n="8"><en>에너지 3</en>을 추가 지불하면 이번 라운드에 {secondMastery} 행동을 한 번 더 사용할 수 있다.</lvl>`,
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
      special:{ko:`아이템을 판매하는 곳에 있을 때 게임 턴당 <b>1회</b>: <en>에너지 2</en>를 소모해 원하는 기술의 스탯 테스트를 한다. 성공하면 해당 기술 랭크의 <b>1/3</b>만큼 <b>골드</b>를 얻는다. 결과가 <b>헥스(Hex)</b>면 추가로 파워 업 하나를 뽑아 모든 영웅에게 적용한다.`},
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
          desc:`숙적에게 그룹이 주는 <hp>체력</hp>·<en>에너지</en>·<inf>영향력</inf> 피해를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. 또는 적의 <kw>outlast</kw>를 감소시키기 위해 선택한 스탯 테스트를 자동 성공시킨다. 이 기술은 <kw>sustain</kw> 가능.`,
          checks:[
            {at:6, txt:`<kw>sustain</kw> 중일 때 모든 영웅이 원하는 기술 하나에 임시 기어 업그레이드 <b>1</b>을 받는다.`},
            {at:9, txt:`<kw>sustain</kw> 중일 때 모든 영웅이 원하는 기술 하나에 임시 기어 업그레이드 <b>1</b>을 추가로 받는다.`},
          ],
        },
        secondMastery:{base:2, name:{en:"Song of the Troubadour",ko:"서정가"}, cost:1, boostAt:[4,8],
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 비전투·동료 에너지", color:"energy", val:(E.lv("secondMastery")/3).toFixed(1)},
            {lab:"Block 전투·그룹", color:"defence", val:(E.lv("secondMastery")/2).toFixed(1)},
          ],
          desc:`<b>비전투:</b> 모든 동료의 <en>에너지</en>를 {secondMastery} 랭크 <b>1/3</b>만큼 <kw>heal</kw>하거나, 이번 게임 턴에 영웅 하나의 모든 스탯 테스트에 <b>-1</b> 보너스를 준다. <b>전투:</b> 그룹이 {secondMastery} 랭크 <b>1/2</b>만큼 <kw>block</kw>을 얻는다. 이 기술은 <kw>sustain</kw> 가능. <b>4·8랭크에 아래에서 하나 선택(중복 가능):</b>`,
          boosts:[
            {stack:true, txt:`모든 동료가 <en>에너지 2 Regen</en>을 획득한다.`},
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
  aegis:{name:{en:"Aegis",ko:"이지스"}, desc:`Aegis is represented by an orange shield and often replaces the opponent's Level shield. Heroes may only deal Health damage to these opponents if they have a number of Attack Gear Upgrades equal to half the Aegis value (rounded up) or if the opponent's Energy is 0. Unless otherwise specified, the Aegis value is equal to the opponent's Level.`},
  ambush:{name:{en:"Ambush",ko:"매복"}, desc:`Opponents who Ambush take an action before combat begins. The rolled action only affects a single target. Ambush may include alternate effects after the keyword. If the heroes Ambush an opponent, roll target dice. The target hero takes an action before combat begins.`},
  augment:{name:{en:"Augment",ko:"보강"}, desc:`Binds an Element to a Defender or hero. See the Temple and Elements placard and Element Cards (TMoG).`},
  battlefield:{name:{en:"Battlefield",ko:"전장"}, desc:`A unique location to face an opponent. Battlefields are described in opponent descriptions and indicate when a hero may enter one. Heroes may only target Allies who share their Battlefield. Opponents are considered to be in each Battlefield unless otherwise specified. Heroes who change from one Battlefield to another gain any positioning modifiers starting the round after the switch.`},
  block:{name:{en:"Block",ko:"차단"}, desc:`Reduces total damage taken during the Resolution phase by the Block amount, beginning with Energy damage.`},
  boost:{name:{en:"Boost",ko:"증폭"}, desc:`Temporarily increases a numeric effect as specified. If a Boost effect does not have a duration, its effects remain active until the end of a combat round (or phase if gained outside of combat).`},
  corrosive:{name:{en:"Corrosive",ko:"부식"}, desc:`This damage cannot be Healed the round during which it is suffered. If suffered outside of combat, Corrosive damage cannot be Healed for the remainder of the current Game Turn. Corrosive damage prevents Vitals from being Raised above their maximum.`},
  counterattack:{name:{en:"Counterattack",ko:"반격"}, desc:`Counterattack occurs when a target suffers damage (unless otherwise stated). Heroes who Counterattack immediately gain a bonus Attack action against their opponent. This keyword may include a number in parenthesis. This is the number of Health damage that an opponent will deal to a target when they Counterattack. A Counterattack cannot be Counterattacked.`},
  critical:{name:{en:"Critical",ko:"치명타"}, desc:`Anytime a hero suffers 1 or more Critical damage from a single source, they gain 1 Critical Wound.`},
  "critical wound":{name:{en:"Critical Wound",ko:"치명상"}, desc:`Each hero may only sustain a number of Critical Wounds equal to 3 plus their initial Food Rating (max 6). If a hero suffers more than this, they immediately die. Critical Wounds may not be removed by items, abilities, or effects that Negate Conditions. Each hero removes 1 instance of Critical Wounds from themselves anytime they Camp.`},
  dangerous:{name:{en:"Dangerous",ko:"위험"}, desc:`Dangerous opponents are played as though the Game Difficulty is increased by 1. This may stack with itself.`},
  defend:{name:{en:"Defend",ko:"방어"}, desc:`Reduces each incoming damaging effect by the Defend amount during the Resolution phase.`},
  energetic:{name:{en:"Energetic",ko:"에너지체"}, desc:`If an opponent has at least half their Energy remaining, that action gains an additional effect. If an opponent has multiple Energy values, check against the highest current Energy.`},
  "energy drain":{name:{en:"Energy Drain",ko:"에너지 흡수"}, desc:`This is a type of Energy damage. If the damage exceeds the target's current Energy, the remainder is converted to Health damage.`},
  evasion:{name:{en:"Evasion",ko:"회피"}, desc:`Whenever a target with Evasion is targeted by an effect, roll a Core die. If the result is equal to or higher than the Evasion value, the target is unaffected by that effect. When a target with Evasion gains Evasion again, take the lower Evasion or decrease the current Evasion by 1.`},
  fuse:{name:{en:"Fuse",ko:"융합"}, desc:`Erase the appropriate filled in Gear Upgrade slot(s), but keep the rank bonus.`},
  harvest:{name:{en:"Harvest",ko:"수확"}, desc:`Roll a Core die. If the result is equal to or less than the number following this Keyword, the Resource shown is gained.`},
  hatred:{name:{en:"Hatred",ko:"증오"}, desc:`Opponents with Hatred are more likely to target and deal more damage to heroes of a specific type. Heroes of the specified type suffer a +2 penalty to their target die against attacks made from these opponents and those attacks deal additional damage to the Hated hero equal to the opponent's Level.`},
  hazardous:{name:{en:"Hazardous",ko:"재앙"}, desc:`The group does not gain the benefits of Camping or Moving Cautiously here and suffers 1 Elemental Health damage matching the associated Element at the end of the Movement Phase. Nether Tiles are always considered to be associated with Void. These effects are Negated while the group is in a Defender.`},
  heal:{name:{en:"Heal",ko:"회복"}, desc:`Increases current Health and/or Energy (as specified) up to the target's maximum by the Heal amount during the Resolution phase of combat, or anytime outside of combat.`},
  immune:{name:{en:"Immune",ko:"면역"}, desc:`Targets that are Immune cannot be damaged and suffer no ill effect by the effect(s) or Element(s) that follow this Keyword. Defenders Augmented with multiple Elements damage a Siege Opponent normally as long as they have any other Element Augmented that is not listed.`},
  loot:{name:{en:"Loot",ko:"전리품"}, desc:`Each hero gains any one Item worth X or less from any HEXplore It game.`},
  mutate:{name:{en:"Mutate",ko:"변이"}, desc:`The opponent immediately Mutates. Roll for a Mutation on the Opponent Mutation placard and apply it to your opponent. Allies cannot receive Mutations through this keyword.`},
  negate:{name:{en:"Negate",ko:"무효"}, desc:`Stops and removes an effect or attack, and all of its side effects.`},
  nonlethal:{name:{en:"Nonlethal",ko:"비치명타"}, desc:`Nonlethal damage cannot drop a Vital to 0, instead dropping it to a minimum of 1.`},
  piercing:{name:{en:"Piercing",ko:"관통"}, desc:`Deals damage which cannot be Defended or Blocked by the Piercing amount.`},
  raise:{name:{en:"Raise",ko:"증가"}, desc:`As Heal, except the total Healing may exceed the target's maximum Vitals, temporarily increasing the current amount by the Raise amount. Unless otherwise stated, Raised Vitals remain through the duration of the Game Turn in which they were gained or until lost.`},
  reflect:{name:{en:"Reflect",ko:"반사"}, desc:`Alters the target of an attack and/or effect back onto the attacker. An attack or effect may only be Reflected once. If there is a number in parenthesis behind this keyword, it is the maximum amount of damage that can be Reflected.`},
  regen:{name:{en:"Regen",ko:"재생"}, desc:`As Heal, except the Healing occurs during the Declaration phase of each round. Regen may only stack from different sources. Applicable only during combat.`},
  reinforce:{name:{en:"Reinforce",ko:"증원"}, desc:`Reinforce effects are only applied if the group consists of 4 or more heroes.`},
  revive:{name:{en:"Revive",ko:"부활"}, desc:`Brings back a deceased target and restores them to full Vitals unless otherwise stated.`},
  roam:{name:{en:"Roam",ko:"배회"}, desc:`Like Wander, but the distance moved is equal to the roll of the Hex die.`},
  "size matters":{name:{en:"Size Matters",ko:"크기 참조"}, desc:`A game value is determined by the target's Food Rating. This keyword will include a parenthesis that describes the modification: Equal to (=), Increase (+), Decrease (-), or Multiply (x) by that target's Food Rating. If an effect is targeting multiple heroes, each hero is affected individually and Food Ratings are not combined.`},
  soulless:{name:{en:"Soulless",ko:"영혼없음"}, desc:`All Energy damage this target suffers is Energy Drain.`},
  soar:{name:{en:"Soar",ko:"비상"}, desc:`If at least half the heroes rounded up have Soar, the group may move onto SkyTiles, Water, or Mountain Peak hexes.`},
  strengthen:{name:{en:"Strengthen",ko:"강화"}, desc:`Permanently increase a numeric effect when specific criteria are met.`},
  summon:{name:{en:"Summon",ko:"소환"}, desc:`Creates an ally for the summoner. During combat, this ally acts on behalf of the summoner. It may become a target, and may be damaged and/or killed.`},
  surge:{name:{en:"Surge",ko:"쇄도"}, desc:`A Surge effect occurs when an Elemental die results in a Surge roll.`},
  sustain:{name:{en:"Sustain",ko:"유지"}, desc:`You may spend 1 Energy each round to power the effect and may use other Abilities while the Sustained Ability continues throughout subsequent rounds. Unless otherwise stated, only one instance of the Sustained effect may be active at any time.`},
  teleport:{name:{en:"Teleport",ko:"순간이동"}, desc:`Instantly move to a new location up to the Teleport amount or where specified. Unless otherwise stated, Teleport may be used during any phase, but when used during the Movement phase, the group is considered to be Moving Normally.`},
  tenacious:{name:{en:"Tenacious",ko:"집요"}, desc:`The group may not Flee from Tenacious opponents.`},
  unyielding:{name:{en:"Unyielding",ko:"완고"}, desc:`Targets may be targeted more than once by this attack. Roll for targets for each attack made.`},
  wander:{name:{en:"Wander",ko:"헤매다"}, desc:`The group moves 1 hex in a random direction, as indicated by the Wander Compass.`},
  weakness:{name:{en:"Weakness",ko:"약점"}, desc:`This includes another Keyword, Element, or damage type. Whenever a target suffers at least 1 damage of the type specified or any amount of Void damage, roll the Hex die. This die may HEXplode for opponents only. The target suffers additional damage equal to the result (this damage cannot be reduced). Targets may have more than one Weakness, but Weakness of the same type does not stack.`},
};
const KW_SIEGE = {
  arcing:{name:{en:"Arcing",ko:"방전"}, desc:`When attacking a Defender, each other Defender in X hexes of that Defender suffers half the Siege Damage dealt. Arcing is reduced by 1 for each Specialist the targeted Defender has.`},
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
