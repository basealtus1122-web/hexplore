/* =====================================================================
   Hexplore It — DATA
   구조:  CAT(계통) · SHARED(종족/직업/특성=시리즈 공용) · SERIES(시리즈별 참조표)
   여기만 계속 추가하면 됩니다.  엔진(app.js)은 손대지 않습니다.
   이름 표기 규칙: 화면에는 English (한글) 순으로 나옵니다.
   설명 토큰:
     {attack} {defence} {firstMastery} {secondMastery} ...  → 해당 능력 이름으로 자동 치환
     <st>health</st> <st>energy</st> <st>attack</st> …  → 스탯 용어를 English한글 + 스탯색으로 자동 렌더
     <kw>boost</kw> → Boost증폭 (용어집에서 이름을 찾아 자동 표기 · 클릭 시 정의)
     <state>vulnerable</state> → Vulnerable취약 (상태 표에서 자동 표기)
     <hp>텍스트</hp> / <en>텍스트</en>  → (구) 체력/에너지 강조색. 새 데이터는 <st> 사용
     <kw>evasion</kw>  → 키워드(클릭 시 오버레이). 소문자 영문이 SERIES.keywords의 key와 매칭
     <state>vulnerable</state>  → 상태(클릭 시 오버레이). SERIES.conditions의 key와 매칭
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

/* 숙적(Favored Enemy) 타입 — 게임에서 나온 것을 계속 추가.
   판의 '숙적 + 추가'에서 바로 고를 수 있게 쓰인다. (담피르처럼 '능력 참조'인 특수 경우는 제외) */
const FOE_TYPES = [
  {en:"Undead",   ko:"언데드"},
  {en:"Creature", ko:"생물"},
  {en:"Construct",ko:"구성물"},
  {en:"Humanoid", ko:"인간형"},
  {en:"Magical Nature",ko:"마법 생물"},
  {en:"Monstrous Humanoid",ko:"인간형 괴수"},
  {en:"Spirit",   ko:"영혼"},
  {en:"Ascendant",ko:"초월자"},
];

/* Greater Aspects(위대한 양상) — '다시 깨어난 자'가 하나를 선택한다.
   게임 중에도 판에서 추가할 수 있다. 설명은 추후에 채움. */
const GREATER_ASPECTS = [
  {id:"ghost",      name:{en:"Ghost",      ko:"유령"},        desc:""},
  {id:"lycan",      name:{en:"Lycan",      ko:"늑대인간"},    desc:""},
  {id:"reanimated", name:{en:"Reanimated", ko:"되살아난 자"}, desc:""},
  {id:"vampire",    name:{en:"Vampire",    ko:"뱀파이어"},    desc:""},
  {id:"zombie",     name:{en:"Zombie",     ko:"좀비"},        desc:""},
];

/* =====================================================================
   SHARED — 시리즈 무관 (종족·직업·특성)
   ===================================================================== */
const SHARED = {

  races: {
    brightling: {
      id:"brightling", ed:"4",
      name:{en:"Brightling",ko:"브라이틀링"},
      favoredEnemy:{en:"Undead",ko:"언데드"},
      foodUse:1,
      mods:{health:0,energy:4,attack:0,defence:0,firstMastery:1,secondMastery:2,navigate:0,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴마다 1회, <st>energy</st> 1을 소모해 2라운드 동안 <kw>evasion</kw> 8을 얻는다.",
        track:{type:"check"}},
      flavor:"일루먼(Ilumen) 100명 중 1명꼴로 브라이틀링이 태어난다. 대부분 하플링 남짓밖에 자라지 못하지만, 이들이 내뿜는 빛은 시력에 피해를 입힐 만큼 강렬하다.",
    },
    corvus: {
      id:"corvus", ed:"4",
      name:{en:"Corvus",ko:"코르부스"},
      favoredEnemy:{en:"Creature",ko:"생물"},
      foodUse:2,
      mods:{health:1,energy:2,attack:0,defence:0,firstMastery:2,secondMastery:2,navigate:0,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>2회</b>까지, 지도 타일 가장자리에 도착했다면 <st>energy</st> 2를 소모해 지도 타일 2개를 공개한다. 그중 1개를 선택해 배치하고, 남은 하나는 더미에 섞어 넣는다.",
        track:{type:"count",max:2}},
      flavor:"코르부스는 까마귀 같이 생긴 인간형으로 영리하고 내성적입니다. 대부분의 감춰진 비밀들을 밝혀낼 수 있다고들 합니다.",
    },
    darkElf: {
      id:"darkElf", ed:"4",
      name:{en:"Dark Elf",ko:"다크엘프"},
      favoredEnemy:{en:"Construct",ko:"구성물"},
      foodUse:2,
      mods:{health:2,energy:2,attack:1,defence:0,firstMastery:1,secondMastery:1,navigate:1,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, Circumstance상황을 완료한 후 <st>energy</st> 2를 소모해 인접한 상황 슬롯을 플레이한다.",
        track:{type:"check"}},
      flavor:"다크엘프는 수세기 동안 지하에 살았습니다. 이들은 잔혹하고, 차별적이며, 다른 종족들에게 배척받습니다.",
    },
    dhampir: {
      id:"dhampir", ed:"4",
      name:{en:"Dhampir",ko:"담피르"},
      favoredEnemy:{en:"",ko:"능력 참조"},
      foodUse:2,
      mods:{health:3,energy:2,attack:1,defence:0,firstMastery:2,secondMastery:1,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 지난 라운드에 당신이 공격하여 피해를 준 적의 타입을 게임 턴 종료까지 당신의 숙적으로 취급한다.",
        track:{type:"check"}},
      flavor:"담피르는 교활하고 피에 굶주린 반(半)흡혈귀입니다.",
    },
    gutterGnome: {
      id:"gutterGnome", ed:"4",
      name:{en:"Gutter Gnome",ko:"하수구 노움"},
      favoredEnemy:{en:"Humanoid",ko:"인간형"},
      foodUse:1,
      mods:{health:0,energy:2,attack:0,defence:1,firstMastery:2,secondMastery:0,navigate:1,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 1을 소모해 달 주사위를 다시 굴리거나, 다른 주사위 대신 달 주사위를 굴릴 수 있다. 할당되지 않은 값이 나오면 아무 일도 일어나지 않는다.",
        track:{type:"check"}},
      flavor:"큰 도시의 하층민 취급을 받지만, 자신들은 전혀 신경 쓰지 않습니다.",
    },
    mirrorSkin: {
      id:"mirrorSkin", ed:"4",
      name:{en:"Mirror Skin",ko:"미러 스킨"},
      favoredEnemy:{en:"Humanoid",ko:"인간형"},
      foodUse:0,
      mods:{health:2,energy:3,attack:1,defence:1,firstMastery:0,secondMastery:0,navigate:1,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 자신이 뽑은 파워업 카드를 다른 영웅이 뽑은 파워업 카드로 복사할 수 있다.",
        track:{type:"check"}},
      flavor:"자신이 죽음을 목격한 인간형으로 변신할 수 있는 매우 희귀한 종족으로, 죽음의 전령으로 여겨져 사냥당하곤 합니다.",
    },
    myskia: {
      id:"myskia", ed:"4",
      name:{en:"Myskia",ko:"미스키아"},
      favoredEnemy:{en:"Creature",ko:"생물"},
      foodUse:2,
      mods:{health:1,energy:3,attack:0,defence:2,firstMastery:1,secondMastery:0,navigate:1,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 적의 <kw>ambush</kw>을 <kw>negate</kw>하고, 역으로 적을 <kw>ambush</kw>할 수 있다.",
        track:{type:"check"}},
      flavor:"사회에 숨어 지내는 괴물 박쥐 같은 인간형 종족입니다.",
    },
    panteran: {
      id:"panteran", ed:"4",
      name:{en:"Panteran",ko:"판테란"},
      favoredEnemy:{en:"Magical Nature",ko:"마법 생물"},
      foodUse:3,
      mods:{health:3,energy:1,attack:2,defence:0,firstMastery:0,secondMastery:1,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>health</st> 2와 <st>energy</st> 2를 소모해 기본 행동에 더해 기본 공격을 <b>2번</b> 더 할 수 있다.",
        track:{type:"check"}},
      flavor:"이 반쯤 고양이 같은 종족은 다양한 형태가 있습니다.",
    },
    ratkin: {
      id:"ratkin", ed:"4",
      name:{en:"Ratkin",ko:"랫킨"},
      favoredEnemy:{en:"Monstrous Humanoid",ko:"인간형 괴수"},
      foodUse:3,
      mods:{health:1,energy:0,attack:1,defence:0,firstMastery:1,secondMastery:0,navigate:2,explore:2,survival:2},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 자신의 Condition상태를 <kw>negate</kw>할 수 있다. 그렇게 했다면 <st>health</st> 3을 <kw>heal</kw>한다.",
        track:{type:"check"}},
      flavor:"작고 사악한 족속들로 태생적으로 곱추에 의심스럽습니다.",
    },
    reawakened: {
      id:"reawakened", ed:"4",
      name:{en:"Reawakened",ko:"다시 깨어난 자"},
      favoredEnemy:{en:"",ko:"능력 참조"},
      foodUse:0,
      mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      /* 특수: 다른 종족을 하나 골라 스탯 보정치와 숙적만 물려받고, 위대한 양상을 하나 고른다.
         엔진이 이 두 플래그를 보고 빌더에 추가 선택 화면을 띄운다. */
      inheritsRace:true,
      greaterAspect:true,
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"다른 종족을 하나 선택해 그 종족의 <b>스탯 보정치와 숙적만</b> 적용한다. 그리고 위대한 양상 중 하나를 선택한다.",
        track:null},
      flavor:"당신은 이미 한 번 죽었습니다.",
    },
    rona: {
      id:"rona", ed:"4",
      name:{en:"Rona",ko:"로나"},
      favoredEnemy:{en:"Spirit",ko:"영혼"},
      foodUse:2,
      mods:{health:1,energy:1,attack:1,defence:0,firstMastery:1,secondMastery:1,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"당신의 공격은 <st>energy</st> 피해를 입힐 수 있다. 게임 턴당 <b>1회</b>, <st>energy</st> 3을 소모해 이번 라운드 동안 적 하나의 <kw>energetic</kw> 효과를 <kw>negate</kw>한다.",
        track:{type:"check"}},
      flavor:"이 지역 출신을 로나라고 부릅니다. 미신을 믿고, 오컬트에 깊이 연관되어 사는 민족입니다.",
    },
    umbralShade: {
      id:"umbralShade", ed:"4",
      name:{en:"Umbral Shade",ko:"움브랄 쉐이드"},
      favoredEnemy:{en:"Spirit",ko:"영혼"},
      foodUse:1,
      mods:{health:2,energy:0,attack:1,defence:0,firstMastery:1,secondMastery:1,navigate:0,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>health</st> 2를 소모해 대상 하나의 <kw>block</kw>·<kw>defend</kw>·<kw>evasion</kw> 중 하나를 <b>3</b> 감소시킨다.",
        track:{type:"check"}},
      flavor:"한때 단순한 그림자였던 이 생명체는, 그림자의 정수 그 자체가 되었습니다. 더 이상 물질적이지 않고, 자유자재로 형체를 바꾸며, 그림자를 가로질러 다닙니다.",
    },
    alux: {
      id:"alux", ed:"5",
      name:{en:"Alux",ko:"알룩스"},
      favoredEnemy:{en:"Undead",ko:"언데드"},
      foodUse:0,
      mods:{health:0,energy:5,attack:0,defence:1,firstMastery:1,secondMastery:0,navigate:0,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 이번 라운드에 자신의 타겟 주사위에 <b>+5</b>를 하고 <kw>evasion</kw> 4를 얻는다.",
        track:{type:"check"}},
      flavor:"알룩스는 생애 대부분을 투명한 상태로 살아가는, 작고 장난기 많은 엘프를 닮은 정령들입니다. 자신들이 대지와 그 안의 모든 생명체를 수호한다고 주장합니다.",
    },
    jademar: {
      id:"jademar", ed:"5",
      name:{en:"Jademar",ko:"제이드마르"},
      favoredEnemy:{en:"Magical Nature",ko:"마법 생물"},
      foodUse:3,
      mods:{health:3,energy:0,attack:1,defence:1,firstMastery:0,secondMastery:0,navigate:0,explore:2,survival:3},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, 현재 페이즈가 끝날 때까지 <st>energy</st> 1을 소모해 자신의 능력이나 기술 하나의 랭크를 2 <kw>boost</kw>한다. 그 후, 자신이 선택한 동료 하나의 스탯 랭크를 자신의 해당 스탯 랭크로 취급한다.",
        track:{type:"check"}},
      flavor:"룬그레스트의 스톤마르의 사촌으로, 날카로운 지성의 소유자이다.",
    },
    kobold: {
      id:"kobold", ed:"5",
      name:{en:"Kobold",ko:"코볼트"},
      favoredEnemy:{en:"Monstrous Humanoid",ko:"인간형 괴수"},
      foodUse:1,
      mods:{health:3,energy:0,attack:1,defence:1,firstMastery:0,secondMastery:0,navigate:0,explore:3,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 시작 전, 기본 Element원소 유형 하나를 선택하고 <kw>augment</kw> 1을 얻는다. 게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 턴이 끝날 때까지 자신의 Element Augment를 1 증가시킬 수 있다.",
        track:{type:"check"}},
      flavor:"코볼트는 드래곤의 먼 친척입니다. 끊임없이 다투며 권력 구조를 흔들어 댑니다.",
    },
    nagual: {
      id:"nagual", ed:"5",
      name:{en:"Nagual",ko:"나구알"},
      favoredEnemy:{en:"Humanoid",ko:"인간형"},
      foodUse:3,
      /* 형태에 따라 attack/defence 보정치가 바뀐다. mods 는 인간(기본) 형태 값. */
      mods:{health:3,energy:1,attack:0,defence:3,firstMastery:0,secondMastery:0,navigate:1,explore:1,survival:1},
      forms:[
        {id:"human",    name:{en:"Human",ko:"인간"},        mods:{attack:0,defence:3}},
        {id:"greatCat", name:{en:"Great Cat",ko:"거대 고양이"}, mods:{attack:3,defence:0}},
      ],
      formHealOnSwitch:4,
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"<b>인간(Human)</b> 형태로 시작한다. 게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 형태를 변신할 수 있다. 변신하면 <st>attack</st>·<st>defence</st> 보정치가 형태에 맞게 바뀌고, <st>health</st> 4를 <kw>heal</kw>한다. (아래 형태 전환 사용)",
        track:{type:"check"}},
      flavor:"나구알은 표범이나 재규어로 변신할 수 있는 사나운 요정 종족입니다.",
    },
    nakaharan: {
      id:"nakaharan", ed:"5",
      name:{en:"Nakaharan",ko:"나카하란"},
      favoredEnemy:{en:"Construct",ko:"구성물"},
      foodUse:2,
      mods:{health:3,energy:1,attack:1,defence:0,firstMastery:1,secondMastery:1,navigate:1,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 능력이나 기술 하나를 선택한다. 이번 페이즈 동안, 선택한 능력·기술의 랭크는 해당 타입(능력 또는 기술)의 가장 높은 랭크와 같아진다.",
        track:{type:"check"}},
      flavor:"이들은 조상을 숭배하고, 가문에 대한 맹목적인 충성과 사랑을 표현합니다.",
    },
    tanuki: {
      id:"tanuki", ed:"5",
      name:{en:"Tanuki",ko:"타누키"},
      favoredEnemy:{en:"Magical Nature",ko:"마법 생물"},
      foodUse:2,
      mods:{health:0,energy:1,attack:0,defence:0,firstMastery:2,secondMastery:2,navigate:0,explore:0,survival:2},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 자신의 가장 낮은 Mastery(기술) 랭크 이하의 골드 비용을 가진 아이템 하나를 만들어 낸다. 이 아이템은 즉시 사용해야 하며, 게임 턴이 끝나면 사라진다.",
        track:{type:"check"}},
      flavor:"타누키는 근원에 둘러싸인 다재다능한 마법 생명체입니다.",
    },
    tengu: {
      id:"tengu", ed:"5",
      name:{en:"Tengu",ko:"텐구"},
      favoredEnemy:{en:"Monstrous Humanoid",ko:"인간형 괴수"},
      foodUse:1,
      mods:{health:3,energy:2,attack:1,defence:1,firstMastery:0,secondMastery:0,navigate:1,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"<kw>soar</kw>을 얻는다. 전투당 <b>1회</b>, <st>health</st> 2를 소모해 다음 중 하나를 얻는다 — <state>berserk</state> · <kw>reflect</kw> 3 · <kw>evasion</kw> 8. 선택한 효과는 3라운드 동안 <kw>sustain</kw>할 수 있다.",
        track:{type:"check"}},
      flavor:"텐구는 군사적이고, 호전적이며, 오만한 요괴입니다.",
    },
    xumucane: {
      id:"xumucane", ed:"5",
      name:{en:"Xumucane",ko:"쉬무카네"},
      favoredEnemy:{en:"Creature",ko:"생물"},
      foodUse:2,
      mods:{health:1,energy:3,attack:1,defence:1,firstMastery:1,secondMastery:0,navigate:1,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 턴당 <b>1회</b>, 자신이나 그룹이 파워업을 뽑은 후 <st>health</st> 2를 소모해 2장을 뽑고 1장을 고른다. 다른 1장은 파워업 덱의 맨 위나 맨 아래에 놓는다.",
        track:{type:"check"}},
      flavor:"쉬무카네는 우주가 우주적 순환에 따라 밀려오고 쓸려간다고 믿습니다. 맹렬하고 극적인 이들의 축제는 언제나 신들을 기립니다.",
    },
    voldwari: {
      id:"voldwari", ed:"5",
      name:{en:"Voldwari",ko:"볼드와리"},
      favoredEnemy:{en:"Spirit",ko:"영혼"},
      foodUse:2,
      mods:{health:2,energy:3,attack:0,defence:0,firstMastery:2,secondMastery:2,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:"게임 시작 전, 기본 Element 타입 하나를 선택해 <kw>immune</kw>을 얻는다. 전투당 <b>1회</b>, <st>energy</st> 3을 소모해 라운드 종료까지 피해 유형 하나에 <kw>immune</kw>을 얻는다.",
        track:{type:"check"}},
      flavor:"볼드와리는 엘프의 고대 친척으로, 다른 세계로 넘어갔다고 전해져 왔습니다. 이들은 매우 뛰어난 지능을 가지고 있습니다.",
    },
    // 다음 종족은 여기에 같은 형식으로 추가
  },

  classes: {
    warlock: {
      id:"warlock", ed:"4",
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
      id:"phosromancer", ed:"4",
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
      id:"bard", ed:"4",
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
  aegis:{name:{en:"Aegis",ko:"이지스"}, desc:`주황색 방패로 표기. 주로 적의 레벨 방패를 대체. 영웅의 공격 기어 업그레이드가 이지스 1/2 이상(올림)이거나 <st>energy</st>가 0이어야 <st>health</st> 피해를 줄 수 있다. 따로 언급이 없다면, 이지스 값은 적의 레벨과 같다.`},
  ambush:{name:{en:"Ambush",ko:"매복"}, desc:`매복한 적은 전투 시작 전에 행동을 하나 한다. 이 행동은 1명만 대상으로 한다. 키워드 뒤에 다른 효과도 포함할 수 있다. 영웅이 매복한 경우, 타겟 주사위를 굴려 타겟인 영웅 한 명이 전투 시작 전에 행동 하나를 한다.`},
  battlefield:{name:{en:"Battlefield",ko:"전장"}, desc:`적을 대면하는 특별한 장소. 전장은 적의 설명란에 적혀있으며 영웅이 언제 입장하는지 적혀있다. 영웅은 전장을 공유하는 동료만 대상으로 삼을 수 있다. 적은 따로 언급이 없다면 모든 전장에 있는 것으로 간주한다. 전장을 옮긴 영웅은 이동 후 라운드를 시작할 때 위치 보정치를 받습니다.`},
  block:{name:{en:"Block",ko:"차단"}, desc:`<st>energy</st> 피해부터 시작하여, Resolution 페이즈에 받는 총 피해량을 차단 수치만큼 감소.`},
  boost:{name:{en:"Boost",ko:"증폭"}, desc:`지시대로 특정 숫자 효과를 일시적으로 증가시킴. 따로 언급이 없다면 증폭의 효과는 전투 라운드(전투 밖이면 페이즈) 종료까지 유지됩니다.`},
  corrosive:{name:{en:"Corrosive",ko:"부식"}, desc:`이 피해를 받은 라운드에는 <kw>heal</kw>될 수 없음. 전투가 아닌 상황에서 받았다면 현재 게임 턴 동안 <kw>heal</kw>될 수 없음. 부식 피해는 Vital이 최대치 이상으로 <kw>raise</kw>되는 것을 막는다.`},
  counterattack:{name:{en:"Counterattack",ko:"반격"}, desc:`따로 언급이 없다면 대상이 피해를 받을 때 발생. 영웅은 즉시 적에게 보너스 <st>attack</st> 행동을 한 번 수행. 괄호 안의 숫자는 적이 반격할 때 입히는 <st>health</st> 피해량. 반격은 반격할 수 없음.`},
  critical:{name:{en:"Critical",ko:"치명타"}, desc:`언제든 영웅이 하나의 원천에서 1 이상의 치명타 피해를 받으면, 치명상 1개를 받습니다.`},
  "critical wound":{name:{en:"Critical Wound",ko:"치명상"}, desc:`각 영웅은 초기 음식소모량+3 만큼의 치명상을 견딜 수 있다(최대 6). 이 이상이 되면 즉시 사망합니다. 치명상은 상태를 무효화하는 아이템·어빌리티·효과 등으로 제거할 수 없습니다. 각 영웅은 Camp(야영)할 때 치명상 1개를 제거합니다.`},
  dangerous:{name:{en:"Dangerous",ko:"위험"}, desc:`위험 적은 게임 난이도를 1 증가한 것처럼 적용합니다. 이 효과는 중첩 가능합니다.`},
  defend:{name:{en:"Defend",ko:"방어"}, titleEn:"Defend X", desc:`Resolution 페이즈에 받는 각 피해 효과를 X만큼 감소시킵니다.`},
  energetic:{name:{en:"Energetic",ko:"에너지체"}, desc:`적의 <st>energy</st>가 절반 이상 남아있다면, 그 행동은 추가 효과를 얻습니다. 여러 <st>energy</st> 값이 있다면, 현재 가장 높은 <st>energy</st> 값을 참조합니다.`},
  "energy drain":{name:{en:"Energy Drain",ko:"에너지 흡수"}, desc:`<st>energy</st> 피해의 일종입니다. 대상의 현재 <st>energy</st>를 초과한 피해는 <st>health</st> 피해로 전환됩니다.`},
  evasion:{name:{en:"Evasion",ko:"회피"}, desc:`회피를 가진 대상이 효과의 대상이 될 때마다 코어 주사위를 굴립니다. 값이 회피 값 이상이면 그 효과를 무시합니다. 회피가 있는 대상이 회피를 또 얻으면, 더 낮은 값을 취하거나 현재 회피 값을 1 감소시킵니다.`},
  fuse:{name:{en:"Fuse",ko:"융합"}, desc:`적절한 기어 업그레이드 슬롯을 지웁니다. 랭크 보너스는 그대로 유지합니다.`},
  harvest:{name:{en:"Harvest",ko:"수확"}, desc:`코어 주사위를 굴립니다. 결과가 키워드 뒤의 숫자 이하라면, 표시된 자원을 획득합니다.`},
  hatred:{name:{en:"Hatred",ko:"증오"}, desc:`증오 적은 특정 타입의 영웅을 더 잘 노리고 더 큰 피해를 줍니다. 해당 타입의 영웅은 이 적의 공격에 대한 타겟 주사위에 +2 페널티를 받고, 그 공격은 증오 대상 영웅에게 적 레벨만큼 추가 피해를 줍니다.`},
  hazardous:{name:{en:"Hazardous",ko:"재앙"}, desc:`그룹은 이 지역에서 Camp(야영)나 Moving Cautiously(조심스럽게 이동)의 이익을 얻지 못하며, Movement 페이즈 종료 시 해당 원소의 <st>health</st> 피해를 1 받는다. Nether(네더) 타일은 항상 Void(공허) 타입이다. 이 효과는 Defender(방어자)에 있는 동안 무효가 된다.`},
  heal:{name:{en:"Heal",ko:"회복"}, desc:`현재 <st>health</st> 그리고/또는 <st>energy</st>를 (지정된 대로) 최대치 이내에서 Heal 수치만큼 회복한다. 전투 Resolution 페이즈, 또는 전투 밖 아무 때나 적용한다.`},
  immune:{name:{en:"Immune",ko:"면역"}, desc:`면역 대상은 이 키워드 뒤에 오는 효과나 원소로 인한 피해·부정적 효과를 받지 않는다. 여러 원소로 <kw>augment</kw>한 Defender는, 나열되지 않은 다른 원소를 하나라도 <kw>augment</kw>하고 있는 한 Siege(공성) 적에게 정상적으로 피해를 입힌다.`},
  loot:{name:{en:"Loot",ko:"전리품"}, desc:`모든 영웅은 헥스플로어 잇 시리즈 전체에서 가치 X 이하인 아이템 하나씩을 선택해 얻습니다.`},
  mutate:{name:{en:"Mutate",ko:"변이"}, desc:`적이 즉시 변이합니다. 적 변이 목록에 따라 주사위를 굴려 적에게 적용합니다. 동료는 이 키워드를 통해 변이하지 않습니다.`},
  negate:{name:{en:"Negate",ko:"무효"}, desc:`해당 효과나 공격, 그리고 그 모든 부가 효과를 멈추고 제거합니다.`},
  nonlethal:{name:{en:"Nonlethal",ko:"비치명타"}, desc:`비치명타 피해는 Vital을 0으로 만들 수 없습니다. 대신 최소 1을 남깁니다.`},
  piercing:{name:{en:"Piercing",ko:"관통"}, desc:`관통 수치만큼 <kw>defend</kw>나 <kw>block</kw>할 수 없는 피해를 입힙니다.`},
  raise:{name:{en:"Raise",ko:"증가"}, desc:`<kw>heal</kw>과 같지만, 총 회복이 대상의 최대 Vital을 초과할 수 있어 현재 수치를 Raise 수치만큼 일시적으로 증가시킵니다. 따로 언급이 없다면, 증가한 Vital은 얻은 게임 턴 동안(또는 잃을 때까지) 유지됩니다.`},
  reflect:{name:{en:"Reflect",ko:"반사"}, desc:`공격 그리고/또는 효과의 대상을 공격자에게로 되돌립니다. 하나의 공격·효과는 한 번만 반사될 수 있습니다. 키워드 뒤 괄호 안에 숫자가 있다면, 반사할 수 있는 최대 피해량입니다.`},
  regen:{name:{en:"Regen",ko:"재생"}, desc:`<kw>heal</kw>과 같지만, 매 라운드 Declaration 페이즈에 회복합니다. Regen은 서로 다른 원천에서 받은 것만 축적되며, 전투 중에만 적용됩니다.`},
  reinforce:{name:{en:"Reinforce",ko:"증원"}, desc:`증원 효과는 영웅 그룹이 4명 이상일 때만 적용됩니다.`},
  revive:{name:{en:"Revive",ko:"부활"}, desc:`따로 언급이 없는 한, 죽은 대상을 되살려 Vital을 최대치로 회복시킵니다.`},
  roam:{name:{en:"Roam",ko:"배회"}, desc:`<kw>wander</kw>와 같지만, 이동 거리는 Hex 주사위 값과 같습니다.`},
  "size matters":{name:{en:"Size Matters",ko:"크기 참조"}, desc:`게임 수치가 대상의 음식 소모량(Food Rating)에 따라 결정됩니다. 키워드 뒤 괄호의 기호에 따라 대상의 음식 소모량과 =일치, +증가, -감소, x곱하기를 적용합니다. 여러 영웅을 대상으로 하면 각각 따로 적용하며, 영웅들의 음식 소모량을 합치지 않습니다.`},
  soulless:{name:{en:"Soulless",ko:"영혼없음"}, desc:`이 대상이 받는 모든 <st>energy</st> 피해는 <kw>energy drain</kw>가 된다.`},
  soar:{name:{en:"Soar",ko:"비상"}, desc:`영웅들의 절반 이상(올림)이 비상을 가지고 있다면, 그룹은 SkyTile(하늘 타일)·Water(물)·Mountain Peak(산꼭대기) 헥스로 이동할 수 있습니다.`},
  strengthen:{name:{en:"Strengthen",ko:"강화"}, desc:`특정 조건이 충족되면 해당 숫자 효과를 영구적으로 증가시킵니다.`},
  summon:{name:{en:"Summon",ko:"소환"}, desc:`소환사를 위한 동료를 만듭니다. 전투 중 이 동료는 소환사를 대신해 행동합니다. 타겟이 될 수 있고, 피해를 받거나 죽을 수도 있습니다.`},
  surge:{name:{en:"Surge",ko:"쇄도"}, desc:`쇄도 효과는 원소 주사위가 쇄도(Surge)로 나올 때 발생합니다.`},
  sustain:{name:{en:"Sustain",ko:"유지"}, desc:`라운드마다 <st>energy</st> 1을 소모해 효과를 유지합니다. 유지 중인 능력이 이후 라운드에 계속되는 동안 다른 능력도 사용할 수 있습니다. 따로 언급이 없다면, 유지 효과는 한 번에 하나만 활성화됩니다.`},
  teleport:{name:{en:"Teleport",ko:"순간이동"}, desc:`지정된 장소, 또는 순간이동 수치 이내의 새 위치로 즉시 이동합니다. 따로 언급이 없다면 아무 페이즈에나 사용할 수 있으나, Movement 페이즈에 사용하면 그룹은 Moving Normally(일반 이동)한 것으로 간주합니다.`},
  tenacious:{name:{en:"Tenacious",ko:"집요"}, desc:`집요한 적에게서는 그룹이 Flee(도주)할 수 없습니다.`},
  unyielding:{name:{en:"Unyielding",ko:"완고"}, desc:`이 공격은 같은 대상을 여러 번 타겟할 수 있습니다. 매 공격마다 타겟을 굴립니다.`},
  wander:{name:{en:"Wander",ko:"헤매다"}, desc:`그룹은 Wander Compass(배회 나침반)에 표시된 대로 무작위 방향으로 1헥스 이동합니다.`},
  weakness:{name:{en:"Weakness",ko:"약점"}, desc:`다른 키워드·원소·피해 유형을 포함합니다. 대상이 지정된 유형의 피해를 1 이상, 또는 Void(공허) 피해를 얼마든지 받으면 Hex 주사위를 굴립니다. 대상은 그 결과만큼 추가 피해를 받으며, 이 피해는 감소시킬 수 없습니다. HEXplode(헥스플로드)는 적을 대상으로만 발생합니다. 대상은 여러 약점을 가질 수 있지만, 같은 유형의 약점은 중첩되지 않습니다.`},
};
const KW_SIEGE = {
  augment:{name:{en:"Augment",ko:"보강"}, desc:`원소를 Defender나 영웅에 엮는다. Temple(사원)·Elements(원소) 참조표 및 Element 카드 참조 (TMoG).`},
  arcing:{name:{en:"Arcing",ko:"방전"}, desc:`Defender를 공격할 때, 그 Defender로부터 X헥스 이내의 다른 Defender는 가해진 Siege(공성) 피해의 절반을 받는다. 방전은 목표 Defender가 가진 Specialist(전문가) 수만큼 1씩 감소한다.`},
  bolster:{name:{en:"Bolster",ko:"임시강화"}, desc:`Siege가 진행 중일 때, Villain 페이즈에 그룹이 Defender 안에 있다면 각 영웅은 <st>energy</st> 1을 소모하고 원하는 스킬 하나를 굴려 임시 보너스를 줄 수 있다. <st>navigate</st>: 이번 턴 이 Defender의 Range를 2 증가시킨다. <st>explore</st>: Range 안의 Siege 적에게 Siege 피해 1을 준다. <st>survival</st>: 이 Defender가 이번 턴에 Siege 피해를 받았고 Resilience가 1 이상 남아 있다면 Resilience 1을 얻는다. 굴림이 치명적 성공이면 소모한 <st>energy</st>를 되돌려받는다.`},
  bulwark:{name:{en:"Bulwark",ko:"방벽"}, desc:`방벽을 가진 대상은 받는 Siege 피해를 방벽 수치만큼 감소시킨다(최소 0). 이 키워드 뒤에 Element 타입이 붙으면 해당 타입의 피해에만 적용된다. 이 키워드를 가진 Siege 적을 상대할 때는, 공격하는 Defender가 가진 Specialist 수만큼 방벽이 1씩 감소한다.`},
  consume:{name:{en:"Consume",ko:"소모"}, desc:`이 키워드 뒤에는 자원 종류와 수량이 붙는다. 표시된 자원의 Stockpile을 소모 수치만큼 줄인다. 이 키워드를 가진 Siege 적은 Defender에게 Siege 피해를 조금이라도 줄 때마다 Stockpile을 줄인다. 소모할 자원이 남아 있지 않다면 대신 원하는 City-State 하나가 Resilience 1을 잃는다.`},
  cripple:{name:{en:"Cripple",ko:"손상"}, desc:`이 Siege 피해를 조금이라도 받은 Defender는 Power도 1 잃는다(최소 1).`},
  deconstruct:{name:{en:"Deconstruct",ko:"해체"}, desc:`Defender가 이 피해를 받을 때마다 Recruit 1을 잃는다. Recruit가 없다면 대신 Potential 1을 잃는다.`},
  equip:{name:{en:"Equip",ko:"장비"}, desc:`Defender에 Equip 카드를 부착한다. 그 Defender는 부착된 효과를 얻는다.`},
  freeze:{name:{en:"Freeze",ko:"빙결"}, desc:`이 Siege 적에게 피해를 받은 Defender는 이번 턴 Equip 효과를 잃는다.`},
  ignite:{name:{en:"Ignite",ko:"발화"}, desc:`이 Siege 적에게 피해를 받은 Defender 안에 있는 영웅은 X만큼 <kw>energy drain</kw>를 받고 <state>wounded</state> 상태가 된다. 발화는 목표 Defender가 가진 Specialist 수만큼 1씩 감소한다.`},
  imbalance:{name:{en:"Imbalance",ko:"불균형"}, desc:`Siege 카드를 뽑을 때마다 Elemental Imbalance가 발생한다. 불균형은 Jaethi의 참조판에 기록하며 각 Element마다 0~9 범위를 가진다.`},
  overpower:{name:{en:"Overpower",ko:"압도"}, desc:`Defender를 공격할 때, 이 Siege 적의 압도 수치가 그 Defender의 Power보다 크면 Siege 피해를 1 더 주고, 영웅들은 이번 턴 그 Defender를 <kw>bolster</kw>하는 데 가장 높은 랭크의 스킬을 사용할 수 없다. 압도는 목표 Defender가 가진 Specialist 수만큼 1씩 감소한다.`},
  retreat:{name:{en:"Retreat",ko:"후퇴"}, desc:`슬롯 2·3·4의 Siege 적이 처치되면 코어 주사위를 굴린다. 결과가 후퇴 수치 이하라면 죽음을 피한다(보상을 얻지 못한다). 이 Siege 적을 현재 슬롯의 왼쪽 슬롯 맨 아래에 놓는다. 후퇴는 공격하는 Defender가 가진 Recruit 수만큼 1씩 감소한다.`},
  siege:{name:{en:"Siege",ko:"공성"}, desc:`피해의 한 종류다. Siege 적이나 Defender는 받은 Siege 피해 1점마다 Resilience를 1 잃는다. Siege 피해를 조금이라도 받은 영웅은 대신 <kw>piercing</kw> <kw>energy drain</kw> 20을 받는다.`},
  swift:{name:{en:"Swift",ko:"신속"}, desc:`이 키워드를 가진 Siege 적은 2헥스 추가로 이동하며, City-State만 Magnetic으로 취급한다.`},
  tremor:{name:{en:"Tremor",ko:"진동"}, desc:`이 효과가 유지되는 동안, 효과 Range 안의 모든 Recruit·Specialist 보너스를 <kw>negate</kw>한다.`},
};

/* =====================================================================
   CONDITIONS(상태) — 4·5편 공용. 설명은 우선 영문 원문(한글화 예정)
   q: 속성 — A=무관(동료·적 누구에게나) · P=지속(전투 후에도) · S=중첩(중복 획득)
   ===================================================================== */
const COND_NOTE = `상태는 개별 영웅이나 그룹 전체에 영향을 줍니다. 따로 언급이 없다면, Resolution 페이즈에서 <b>피해가 먼저 처리된 뒤</b> 상태를 적용합니다.`;
const CONDITIONS = {
  berserk:{name:{en:"Berserk",ko:"광폭화"}, q:["A","S"], desc:`광폭화한 적은 자신의 레벨만큼 추가 피해를 준다. 광폭화한 영웅은 <st>attack</st> 랭크를 <st>survival</st> 랭크만큼 <kw>boost</kw>한다. 영웅은 이 효과를 <kw>sustain</kw>할 수 있다.`},
  bleeding:{name:{en:"Bleeding",ko:"출혈"}, q:["A","S"], desc:`출혈 대상은 매 라운드 Declaration 페이즈에 <st>health</st> 1을 잃는다. 출혈은 대상이 <kw>heal</kw>을 받거나 전투가 끝날 때까지 계속된다.`},
  blinded:{name:{en:"Blinded",ko:"실명"}, q:[], desc:`실명한 영웅은 행동할 때, 매 라운드 Declaration 페이즈에 <st>navigate</st> 굴림을 하고 실패하면 이번 라운드에 해당 능력의 랭크가 절반이 된다.`},
  bound:{name:{en:"Bound",ko:"결속"}, q:["A","P"], desc:`결속된 대상은 다른 존재와 생명력이 묶인다. 결속된 동료가 피해를 받을 때마다 결속된 대상도 같은 종류, 같은 양의 생명력을 잃는다. 두 대상이 서로 결속되어 있다면 결속으로 인한 Vital생명력 손실은 한 번만 적용한다.`},
  brainwashed:{name:{en:"Brainwashed",ko:"세뇌"}, q:["A"], desc:`세뇌된 대상은 정상적으로 행동할 수 없다. 자신의 적을 유일한 동료로, 그룹을 적으로 취급한다. 대상이 <st>attack</st>한다면 타겟 주사위를 굴려 어느 그룹원을 노리는지 정한다. 자신이나 동료를 대상으로 삼을 수 있는 능력·아이템을 쓴다면 대신 적을 대상으로 한다(<kw>heal</kw>·<kw>boost</kw> 등).`},
  burned:{name:{en:"Burned",ko:"화상"}, q:["A","S"], desc:`화상 상태라면 매 라운드 Declaration 페이즈 시작에 <st>health</st> 3을 잃고, <st>health</st>을 <kw>heal</kw>할 때마다 3 적게 회복한다. 회복 감소는 중첩되지만 피해는 중첩되지 않는다.`},
  captured:{name:{en:"Captured",ko:"포획"}, q:[], desc:`포획된 영웅은 매 라운드 Declaration 페이즈에 <st>explore</st> 굴림에 성공해야 하며, 실패하면 행동을 잃는다.`},
  charmed:{name:{en:"Charmed",ko:"매혹"}, q:[], desc:`매혹된 대상은 다음 라운드에 무작위 동료에게 <st>attack</st>을 사용해야 한다. 그럴 수 없다면 대신 적의 레벨만큼 <st>energy</st> 피해를 받는다. 그 후 매혹이 해제된다.`},
  confused:{name:{en:"Confused",ko:"혼란"}, q:["A"], desc:`이 상태는 피해보다 먼저 처리된다. 매 라운드 Resolution 페이즈에 아무 주사위나 굴린다. 결과가 짝수면 혼란 대상은 행동을 잃고, 홀수면 행동의 수치 효과가 절반으로 감소한다.`},
  cursed:{name:{en:"Cursed",ko:"저주"}, q:["P"], desc:`저주받은 영웅은 <kw>heal</kw>될 수 없다. 매 라운드 Declaration 페이즈와 매 게임 턴 Movement 페이즈에 스킬 3종을 모두 굴린다. 세 굴림에 모두 성공하면 저주가 해제된다.`},
  debilitated:{name:{en:"Debilitated",ko:"쇠약"}, q:["S"], desc:`쇠약해진 영웅은 피라미드 주사위 또는 달 주사위를 굴려, 나온 능력을 사용할 수 없다. 이 상태에 숫자가 지정되어 있다면 주사위를 굴리지 않고 지정된 능력을 사용할 수 없다. 영웅은 이 상태를 동시에 최대 3개까지만 받을 수 있다.`},
  disarmed:{name:{en:"Disarmed",ko:"무장해제"}, q:[], desc:`무장해제된 영웅은 무기를 잃는다. 매 라운드 <st>defence</st> 행동을 하고 10면 주사위를 <st>attack</st> 랭크에 대해(스킬처럼) 굴려 무기를 되찾으려 시도할 수 있다. 무장해제 중에는 직업의 기본 랭크 + 종족의 기본 보정치만큼만 피해를 줄 수 있다.`},
  diseased:{name:{en:"Diseased",ko:"감염"}, q:["P"], desc:`감염된 영웅이 <st>energy</st>를 쓰려면 먼저 <st>survival</st> 굴림에 성공해야 한다. 이 상태를 없애려면 <kw>heal</kw>을 제공하는 장소(마을·수도원 등)에서 <kw>heal</kw>해야 한다.`},
  disoriented:{name:{en:"Disoriented",ko:"균형상실"}, q:["S"], desc:`균형을 잃은 영웅은 스킬 굴림에서 치명적 실패 확률이 높아진다. 균형상실을 얻을 때마다 치명적 실패 범위가 2씩 늘어난다(첫 번째는 8-10, 두 번째는 6-10 등).`},
  dissonant:{name:{en:"Dissonant",ko:"부조화"}, q:["A","P","S"], desc:`대상의 패턴이 뒤틀려 흐트러지기 시작한다. 대상이 <st>energy</st> 피해를 받을 때마다 같은 양의 <kw>nonlethal</kw> <st>health</st> 피해를 함께 받는다. 부조화 상태의 영웅은 스탯 테스트에 -2 페널티를 받는다. 중첩은 페널티에만 적용된다.`},
  drained:{name:{en:"Drained",ko:"소진"}, q:["A","S"], desc:`소진 대상은 매 라운드 Declaration 페이즈 시작에 <st>energy</st> 3을 잃고, <st>energy</st>를 <kw>heal</kw>할 때마다 3 적게 회복한다. 회복 감소는 중첩되지만 피해는 중첩되지 않는다.`},
  encased:{name:{en:"Encased",ko:"감금"}, q:["A"], desc:`감금된 대상은 전투에서 적의 표적이 되지 않지만, 자신을 가둔 구속물은 자신이나 동료가 대상으로 삼을 수 있다. 감금된 대상은 매 라운드 <st>attack</st>만 사용할 수 있으며 구속물만 노릴 수 있다. 이 상태에는 괄호 안에 숫자가 있는데, 대상을 풀어주기 위해 구속물에 줘야 하는 <st>health</st> 피해량이다. 이 상태는 다른 수단으로 제거할 수 없고 전투가 끝나면 해제된다.`},
  entangled:{name:{en:"Entangled",ko:"얽힘"}, q:["S"], desc:`얽힌 영웅은 정상적으로 행동하려면 매 라운드 Declaration 페이즈에 <st>navigate</st> 굴림에 성공해야 한다. 실패하면 <st>attack</st>이나 <st>defence</st>만 -3 페널티를 받고 할 수 있다.`},
  fatigued:{name:{en:"Fatigued",ko:"피로"}, q:["A","S"], desc:`피로 대상은 전투 중 매 라운드 Declaration 페이즈 시작에 <st>energy</st> 1을 잃는다.`},
  frightened:{name:{en:"Frightened",ko:"공포"}, q:["S"], desc:`공포에 빠진 영웅은 <st>defence</st> 행동만 할 수 있고 -3 페널티를 받는다. 전투 중 매 라운드 Resolution 페이즈에 <st>survival</st>을 굴린다. 성공하면 상태가 해제된다.`},
  frozen:{name:{en:"Frozen",ko:"동결"}, q:[], desc:`동결된 영웅은 행동할 수 없다. 매 라운드 Declaration 페이즈에 <st>survival</st>을 굴린다. 2회 성공하면 정상적으로 행동할 수 있고 동결이 해제된다.`},
  imprisoned:{name:{en:"Imprisoned",ko:"투옥"}, q:[], desc:`투옥된 영웅은 자신의 의지와 무관하게 붙잡혀 있다. 소지금과 음식, 배낭을 사용할 수 없다. 영웅들이 City-State에 있지 않다면 피라미드 주사위를 굴려 City-State 중 한 곳으로 이동시킨다. 그룹은 Arena(투기장)에 한 번 참가하기로 선택할 수 있다. 획득한 소지금은 몰수된다. 이 상태에는 괄호 안에 숫자가 있으며, 그룹이 투옥되어 보낸 시간을 나타낸다. 게임 턴이 끝날 때 이 숫자만큼 Remnant를 보드에 놓는다. 그 후 그룹은 풀려나고 배낭을 다시 사용할 수 있다. 이 상태는 아이템으로 제거할 수 없다.`},
  irradiated:{name:{en:"Irradiated",ko:"피폭"}, q:[], desc:`이 상태를 얻은 대상은 괄호 안의 숫자에서 자신의 음식 소모량을 뺀 만큼 <kw>energy drain</kw>를 받는다. 이 상태를 얻은 영웅은 코어 주사위를 굴려 <kw>mutate</kw>되는 것에 저항할 수 있다. 굴리지 않거나 결과가 음식 소모량의 2배보다 크면 즉시 변이 카드를 뽑는다.`},
  "knocked down":{name:{en:"Knocked Down",ko:"넘어짐"}, q:[], desc:`넘어진 영웅은 행동할 수 없고, 스킬 굴림에 치명적 실패한다. 일어나기 위해 한 라운드를 <st>defence</st>해야 한다. 이렇게 <st>defence</st>하는 동안 아이템을 사용하거나 건넬 수 없다.`},
  petrified:{name:{en:"Petrified",ko:"석화"}, q:[], desc:`석화된 영웅은 행동할 수 없다. 대신 매 라운드 <st>defence</st>한다(아이템은 사용할 수 없다). 전투의 마지막 라운드가 끝난 뒤 <st>survival</st>을 굴린다. 성공하면 석화를 깨뜨리고, 실패하면 그 영웅은 죽는다.`},
  poisoned:{name:{en:"Poisoned",ko:"중독"}, q:["P"], desc:`중독된 영웅은 전투 중 매 라운드 Declaration 페이즈 시작과 매 Movement 페이즈 시작에 <st>health</st> 1을 잃는다. 또한 <st>energy</st>를 쓰려면 <st>survival</st> 굴림에 성공해야 한다. <st>survival</st> 굴림에 3회 성공하면 이 상태를 제거한다.`},
  slowed:{name:{en:"Slowed",ko:"감속"}, q:["A"], desc:`감속된 대상은 마법적 무기력에 사로잡힌다. <kw>immune</kw>을 제외한 모든 수동 방어 키워드를 잃고, 다른 모든 행동이 처리된 뒤에 자신의 행동을 한꺼번에 처리한다.`},
  "soul laced":{name:{en:"Soul Laced",ko:"영혼봉합"}, q:["A"], desc:`영혼봉합된 대상은 적의 생명력에 묶인다. Resolution 페이즈가 끝날 때 적은 대상의 현재 Vital 합계만큼 Soul Shield(영혼 방패)를 얻는다(이미 가지고 있다면 <kw>raise</kw>한다). 적의 <st>health</st>은 영향을 받지 않는다. 한 라운드 동안 Soul Shield가 피해를 받으면, 영혼봉합된 대상은 적 레벨의 2배만큼 <kw>piercing</kw> <kw>energy drain</kw>를 받는다. 이 상태는 적이 Soul Shield를 잃을 때 해제되며 다른 수단으로는 제거할 수 없다.`},
  surrounded:{name:{en:"Surrounded",ko:"포위"}, q:["A","S"], desc:`포위된 대상은 매 라운드 Declaration 페이즈 시작에 <kw>piercing</kw> <st>health</st> 피해 2를 받는다.`},
  swallowed:{name:{en:"Swallowed",ko:"삼켜짐"}, q:["A"], desc:`<state>encased</state>과 같지만, 삼켜진 대상은 동료가 대상으로 삼을 수 없다. 삼켜진 대상이 주는 피해는 일반 피해처럼 적의 <st>health</st>을 깎는다. 이 상태에는 괄호 안에 두 번째 숫자가 있는데, 삼켜진 대상이 전투 중 매 라운드 Declaration 페이즈에 받는 <st>health</st> 피해량이다.`},
  tethered:{name:{en:"Tethered",ko:"명줄"}, q:["A"], desc:`명줄이 묶인 대상은 <st>health</st> 또는 <st>energy</st>가 0이 되면 죽는다.`},
  trapped:{name:{en:"Trapped",ko:"덫에 걸림"}, q:[], desc:`덫에 걸린 영웅은 정상적으로 행동하려면 매 라운드 Declaration 페이즈에 <st>explore</st> 굴림에 성공해야 한다. 실패하면 <st>defence</st>만 할 수 있다.`},
  unconscious:{name:{en:"Unconscious",ko:"기절"}, q:["A"], desc:`기절한 대상은 행동할 수 없다. 매 라운드가 끝날 때 그 대상은 6면 주사위를 굴린다. 결과가 헥스면 깨어난다. 라운드마다 깨어날 확률이 1씩 올라간다. 영웅은 <st>defence</st> 행동을 해서 기절한 대상을 억지로 깨울 수 있지만, 그동안 아이템을 사용할 수 없다. 깨어난 다음 라운드에 그 대상은 모든 능력 랭크에 -3 페널티를 받는다.`},
  vulnerable:{name:{en:"Vulnerable",ko:"취약"}, q:["A","S"], desc:`취약한 대상은 전투 중 타겟 주사위 결과에 +2를 받고, 피해를 받을 때 1의 추가 피해를 받는다.`},
  wounded:{name:{en:"Wounded",ko:"상처"}, q:["P","S"], desc:`상처 입은 영웅은 <kw>heal</kw>을 받을 때까지 모든 능력·스킬 랭크에 -2 페널티를 받는다.`},
};

const SERIES = {
  "4": {
    id:"4", name:{en:"Hexplore It — Edition 4", ko:"헥스플로어 잇 — 4편"}, short:"4",

    keywords: KW_COMMON,
    conditions: CONDITIONS,
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
    conditions: CONDITIONS,
    rules: [],
    items: [],
    extras: [],
  },
};

/* 엔진에서 접근할 수 있게 전역으로 노출 */
window.HEX = { CAT, STAT_ORDER, STAT_META, SHARED, SERIES, FOE_TYPES, GREATER_ASPECTS, COND_NOTE };
