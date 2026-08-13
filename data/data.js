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
  firstMastery: {role:"First Mastery", roleKo:"마스터리 1", group:"combat"},
  secondMastery:{role:"Second Mastery",roleKo:"마스터리 2", group:"combat"},
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
  /* 아래는 적 서브타입 — 카드에 함께 표기되며 숙적으로도 지정된다 */
  {en:"Horde",    ko:"무리"},
  {en:"Swarm",    ko:"떼"},
  {en:"Titanic",  ko:"거대"},
  {en:"Elemental",ko:"원소"},
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
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 당신이 뽑은 파워업 카드를 다른 영웅이 뽑은 파워업 카드로 복사할 수 있다.",
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
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 당신의 Condition상태를 <kw>negate</kw>할 수 있다. 그렇게 했다면 <st>health</st> 3을 <kw>heal</kw>한다.",
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
      name:{en:"Umbral Shade",ko:"암영 망령"},
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
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 이번 라운드에 당신의 타겟 주사위에 <b>+5</b>를 하고 <kw>evasion</kw> 4를 얻는다.",
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
        desc:"게임 턴당 <b>1회</b>, 현재 페이즈가 끝날 때까지 <st>energy</st> 1을 소모해 당신의 능력이나 기술 하나의 랭크를 2 <kw>boost</kw>한다. 그 후, 당신이 선택한 동료 하나의 스탯 랭크를 당신의 해당 스탯 랭크로 취급한다.",
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
        desc:"게임 시작 전, 기본 Element원소 유형 하나를 선택하고 <kw>augment</kw> 1을 얻는다. 게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 턴이 끝날 때까지 당신의 Element Augment를 1 증가시킬 수 있다.",
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
      formCostEnergy:2,
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
        desc:"게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 당신의 가장 낮은 Mastery(마스터리) 랭크 이하의 골드 비용을 가진 아이템 하나를 만들어 낸다. 이 아이템은 즉시 사용해야 하며, 게임 턴이 끝나면 사라진다.",
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
        desc:"게임 턴당 <b>1회</b>, 당신이나 그룹이 파워업을 뽑은 후 <st>health</st> 2를 소모해 2장을 뽑고 1장을 고른다. 다른 1장은 파워업 덱의 맨 위나 맨 아래에 놓는다.",
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
    // ===== 5편 확장 종족 (이름만 초벌 · 스탯/능력 추후 입력) =====
    // --- Return to the Domain of Mirza Noctis ---
    archon:{ id:"archon", ed:"4", exp:"H", name:{en:"Archon",ko:"아르콘"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    ettin:{ id:"ettin", ed:"4", exp:"H", name:{en:"Ettin",ko:"에틴"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    incubus:{ id:"incubus", ed:"4", exp:"H", name:{en:"Incubus",ko:"인큐버스"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    legion:{ id:"legion", ed:"4", exp:"H", name:{en:"Legion",ko:"군단"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    leprechaun:{ id:"leprechaun", ed:"4", exp:"H", name:{en:"Leprechaun",ko:"레프러콘"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    minotaur:{ id:"minotaur", ed:"4", exp:"H", name:{en:"Minotaur",ko:"미노타우로스"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    redcap:{ id:"redcap", ed:"4", exp:"H", name:{en:"Redcap",ko:"레드캡"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    solarElf:{ id:"solarElf", ed:"4", exp:"H", name:{en:"Solar Elf",ko:"태양 엘프"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    succubus:{ id:"succubus", ed:"4", exp:"H", name:{en:"Succubus",ko:"서큐버스"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    rubyGolem:{ id:"rubyGolem", ed:"4", exp:"R", name:{en:"Ruby Golem",ko:"루비 골렘"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    youngRedDragon:{ id:"youngRedDragon", ed:"4", exp:"R", name:{en:"Young Red Dragon",ko:"어린 레드 드래곤"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    youngSilverDragon:{ id:"youngSilverDragon", ed:"4", exp:"R", name:{en:"Young Silver Dragon",ko:"어린 실버 드래곤"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    // --- Return to Caprakan ---
    chaneque:{ id:"chaneque", ed:"5", exp:"H", name:{en:"Chaneque",ko:"차네케"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    hexanthi:{ id:"hexanthi", ed:"5", exp:"H", name:{en:"Hexanthi",ko:"헥산티"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    saurian:{ id:"saurian", ed:"5", exp:"H", name:{en:"Saurian",ko:"사우리안"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    voidTouched:{ id:"voidTouched", ed:"5", exp:"H", name:{en:"Void Touched",ko:"공허에 닿은 자"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    youngGreenDragon:{ id:"youngGreenDragon", ed:"5", exp:"R", name:{en:"Young Green Dragon",ko:"어린 그린 드래곤"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    // --- Return to Ishidan ---
    hitodama:{ id:"hitodama", ed:"5", exp:"H", name:{en:"Hitodama",ko:"히토다마"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    kitsune:{ id:"kitsune", ed:"5", exp:"H", name:{en:"Kitsune",ko:"키츠네"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    oni:{ id:"oni", ed:"5", exp:"H", name:{en:"Oni",ko:"오니"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    sarugami:{ id:"sarugami", ed:"5", exp:"H", name:{en:"Sarugami",ko:"사루가미"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    prismaticDragon:{ id:"prismaticDragon", ed:"5", exp:"R", name:{en:"Prismatic Dragon",ko:"프리즈매틱 드래곤"},
      favoredEnemy:{en:"—",ko:"미정"}, foodUse:1, mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"}, desc:"(내용 추후 입력)", track:{type:"check"}}, flavor:"" },
    // 다음 종족은 여기에 같은 형식으로 추가
  },

  classes: {
    warlock: {
      id:"warlock", ed:"4",
      /* 육각형 칸의 골드 비용 — 그룹별 시작값에서 칸마다 1씩 오른다(생명력 2·능력 4·기술 3) */
      hexStart:{vital:2, combat:4, skill:3},
      name:{en:"Warlock",ko:"워록"},
      category:{key:"striker"},
      flavor:"나의 권능에 경탄하라!",
      special:{ko:"마스터리의 비용으로 당신의 <st>health</st>이나 <st>energy</st>를 지불할 수 있다."},
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
              ...(fm>=7 ? [{lab:"Attack boost (마스터리2 후)", color:"attack", val:(fm/2).toFixed(1)}] : [])
            ];
          },
          desc:`이번 라운드에 {attack} 행동을 <b>두 번</b> 사용한다. 대상이 <kw>energetic</kw> 상태가 아니면 대상의 <kw>block</kw>·<kw>defend</kw>·<kw>reflect</kw>를 {firstMastery} 랭크만큼 감소시킨다. 직전 라운드에 {secondMastery} 사용 시 이번 라운드 적들의 타겟 수가 <b>1</b> 감소한다(최소 1). <lvl n="7">직전 라운드에 {secondMastery} 사용 시 이번 라운드 {attack}의 피해를 {firstMastery} 랭크 <b>절반</b>만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Magnified Beam",ko:"광선 집중"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
            {lab:"+Damage (마스터리1 후)", color:"defence", val:E.lv("defence").toFixed(1)},
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
      special:{ko:`아이템을 판매하는 곳에 있을 때 게임 턴당 <b>1회</b>: <st>energy</st> 2를 소모해 원하는 <b>마스터리</b>의 스탯 테스트를 한다. 성공하면 해당 마스터리 랭크의 <b>1/3</b>만큼 <b>골드</b>를 얻는다. 결과가 <b>헥스(Hex)</b>면 추가로 파워 업 하나를 뽑아 모든 영웅에게 적용한다.`},
      stats:{
        health:{base:5},
        energy:{base:6},
        attack:{base:1, name:{en:"Strafing Sidestep",ko:"측면 이동"}, dmg:["health","influence"]},  // 체력 또는 영향력(택1)
        defence:{base:3, name:{en:"Second String",ko:"두번째 현"}, bribe:true},  // 특수규칙 뇌물(Bribe) = 추후작성
        firstMastery:{base:1, name:{en:"Dirge of the Dead",ko:"장송곡"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage boost 피해 증가", color:"neutral", val:E.lv("firstMastery")},
          ],
          desc:`숙적에게 그룹이 주는 <st>health</st>·<st>energy</st>·<st>influence</st> 피해를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. 또는 적의 <st>outlast</st>을 감소시키기 위해 선택한 스탯 테스트를 자동으로 성공시킨다. 이 마스터리는 <kw>sustain</kw>할 수 있다.`,
          checks:[
            {at:6, txt:`<kw>sustain</kw> 중일 때는 모든 영웅이 원하는 임시 기어 업그레이드 <b>1</b>을 받는다.`},
            {at:9, txt:`<kw>sustain</kw> 중일 때 모든 영웅이 원하는 임시 기어 업그레이드 <b>1</b>을 추가로 받는다.`},
          ],
        },
        secondMastery:{base:2, name:{en:"Song of the Troubadour",ko:"서정가"}, cost:1, boostAt:[4,8],
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 비전투·동료 에너지", color:"energy", val:(E.lv("secondMastery")/3).toFixed(1)},
            {lab:"Block 전투·그룹", color:"defence", val:(E.lv("secondMastery")/2).toFixed(1)},
          ],
          desc:`<b>비전투:</b> 모든 동료의 <st>energy</st>를 {secondMastery} 랭크 <b>1/3</b>만큼 <kw>heal</kw>하거나, 이번 게임 턴에 영웅 하나의 모든 스탯 테스트에 <b>-1</b> 보너스를 준다. <b>전투:</b> 그룹이 {secondMastery} 랭크 <b>1/2</b>만큼 <kw>block</kw>을 얻는다. 이 마스터리는 <kw>sustain</kw>할 수 있다. <b>4·8랭크에 아래에서 하나 선택(중복 가능):</b>`,
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
    // ===== 4편 직업 (이름만 초벌 · 스탯/능력 추후 입력) · Bard 는 위에 완성본 =====
    cursedOne: {
      id:"cursedOne", ed:"4",
      name:{en:"Cursed One",ko:"저주받은 자"},
      category:{key:"assist"},
      flavor:"화가난 날 좋아하지 않을 걸?",
      /* 또다른 자아는 여러 개 보유할 수 있고(Ego 4랭크마다 +1), 변신 중인 하나만 계산에 반영된다 */
      roster:[{id:"alterEgo", name:{en:"Alter Ego",ko:"또다른 자아"},
        fields:[{id:"level",label:"Lv 레벨",color:"neutral"},{id:"health",label:"HP 체력",color:"health"}],
        countHint:(E)=>1+Math.floor(E.lv("firstMastery")/4)}],
      special:{ko:`게임 시작 시, <b>Horde무리·Swarm떼</b>가 아닌 <b>Monstrous Humanoid인간형 괴수</b> <b>Encounter조우</b> 중 레벨이 가장 낮은 것을 찾아 <b>Alter Ego또다른 자아</b>로 획득한다. {firstMastery} 랭크 <b>4마다</b>, 현재 또다른 자아보다 레벨이 <b>1</b> 높은 Monstrous Humanoid인간형 괴수를 찾아 추가로 획득한다.`},
      stats:{
        health:{base:7}, energy:{base:4},
        attack:{base:2, name:{en:"Nether Strength",ko:"네더의 힘"}, dmg:["health","influence","outlast"]},
        defence:{base:1, name:{en:"Molt",ko:"탈피"}},
        firstMastery:{base:3, name:{en:"Ego",ko:"자아"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 비전투 회복", color:"health", val:(E.lv("firstMastery")/3).toFixed(1)},
            {lab:"Boost 재사용 증폭", color:"attack", val:E.lv("firstMastery").toFixed(1)},
            /* 변신 중인 또다른 자아의 값에서 자동 계산 */
            {lab:"변신 최대 체력 +", color:"health", val:((E.sel("alterEgo").health||0)/2).toFixed(1)},
            {lab:"목표 주사위 페널티", color:"neutral", val:E.sel("alterEgo").level||0},
          ],
          desc:`<b>비전투:</b> 대상의 <st>health</st>을 {firstMastery} 랭크의 <b>1/3</b>만큼 <kw>heal</kw>한다. <b>전투:</b> 전투가 끝날 때까지 원하는 <b>또다른 자아</b>로 변신한다. 현재·최대 <st>health</st>이 그 또다른 자아 <st>health</st>의 <b>절반</b>만큼 올라가고, 목표 주사위에 그 레벨만큼 페널티를 받는다. 전투 중 {firstMastery}를 다시 사용하면 다음 공격의 피해를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. <lvl n="6">이 라운드에 {attack} 또는 {defence}를 사용할 수 있다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Speciality",ko:"특기"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Skill 기술 보너스", color:"neutral", val:"-1"},
            {lab:"Boost 전투 증폭", color:"attack", val:E.lv("secondMastery").toFixed(1)},
          ],
          desc:`<b>비전투:</b> 해당 페이즈(Movement·Skill 등)가 끝날 때까지 모든 영웅이 기술 판정에 <b>-1</b> 보너스를 받는다. 특정 기술의 랭크 <b>5마다</b> 그 기술에 <b>-1</b> 보너스가 추가된다. <b>전투:</b> 또다른 자아로 변신한 뒤 사용하면, 그 Encounter조우의 행동 중 하나를 수행하고 그 피해를 {secondMastery} 랭크만큼 <kw>boost</kw>한다. <lvl n="8">{secondMastery}로 피해를 입은 대상은 다음 라운드에 목표를 <b>1</b> 적게 잡는다(최소 1).</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    shadowRider: {
      id:"shadowRider", ed:"4",
      name:{en:"Shadow Rider",ko:"그림자 기수"},
      category:{key:"assist"},
      flavor:"그림자와 먼지로 이루어진.",
      special:{ko:`각 마스터리가 <b>처음으로 8랭크</b>가 될 때마다, 그룹의 <b>Movement Speed이동 속도</b>가 <b>1</b> 증가한다(<b>Moving Cautiously신중한 이동</b> 포함).`},
      stats:{
        health:{base:6}, energy:{base:5},
        attack:{base:2, name:{en:"Death Aura",ko:"죽음의 오라"}, dmg:["health","energy"]},
        defence:{base:1, name:{en:"Canter",ko:"구보"}},
        firstMastery:{base:2, name:{en:"Tireless Shadowhorse",ko:"지치지 않는 그림자말"}, cost:1, uses:{max:1,scope:"turn"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Time 시간", color:"neutral", val:"+3"},
            {lab:"Boost 동료 공격·방어", color:"attack", val:E.lv("firstMastery").toFixed(1)},
            ...(E.lv("firstMastery")>=8?[{lab:"Boost 대상 행동", color:"attack", val:E.lv("attack").toFixed(1)}]:[]),
          ],
          desc:`턴당 <b>1회</b>까지 사용해, 당신의 <b>Time시간</b>을 <b>3</b> 늘리거나 이번 턴 모든 이동 유형의 속도를 <b>1</b> 올린다(<b>Camping야영</b> 포함). <b>Event 페이즈</b>에 사용해 쓰지 않은 이동력을 원하는 만큼 쓸 수도 있다. 이 초과 이동은 그룹의 이동 유형을 바꾸지 않는다. <b>전투:</b> 이번 라운드 동료 하나의 <act>attack</act>·<act>defend</act> 랭크를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. <lvl n="5">이번 턴에 {defence}도 사용할 수 있다.</lvl> <lvl n="8">다음 라운드에 대상 하나의 행동 랭크를 {attack} 랭크만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Umbral Arrow",ko:"암영 화살"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 체력·에너지", color:"health", val:(E.lv("secondMastery")/2).toFixed(1)},
            ...(E.lv("secondMastery")>=6?[{lab:"Reflect 반사", color:"defence", val:(E.lv("defence")/3).toFixed(1)}]:[]),
          ],
          desc:`이번 라운드 <b>Resolution 페이즈</b>에 동료가 능력으로 적에게 피해를 줄 때마다, 그 적을 목표로 삼아 {secondMastery} 랭크의 <b>절반</b>만큼 <st>health</st>·<st>energy</st> 피해를 줄 수 있다. <lvl n="6">목표로 삼는 동료 1명당 <st>energy</st> <b>1</b>을 추가로 소모해, 적이 그 동료에게 주는 피해를 {defence} 랭크의 <b>1/3</b>까지 <kw>reflect</kw>한다.</lvl>`,
        },
        navigate:{base:3, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    enchanter: {
      id:"enchanter", ed:"4",
      name:{en:"Enchanter",ko:"인챈터"},
      category:{key:"healer"},
      flavor:"약간의 마법이면 놀라운 일을 해낼 수 있지.",
      /* 손에 든 정수 장수 — 게임 시작 3장에서 시작한다 */
      counters:[{id:"essence", name:{en:"Essence",ko:"정수"}}],
      special:{ko:`게임 시작 전, 파워업을 <b>3</b>장 뽑아 당신의 <b>Essence정수</b>로 획득한다. {secondMastery} 랭크 <b>4마다</b> 턴당 <b>1회</b>, 파워업 버린 더미의 맨 위 카드를 가져와 정수에 추가할 수 있다. 정수를 버릴 때는 파워업 버린 더미의 <b>맨 아래</b>에 놓는다.`},
      stats:{
        health:{base:4}, energy:{base:7},
        attack:{base:1, name:{en:"Blasting Rod",ko:"폭발 지팡이"}, dmg:["health","influence"]},
        defence:{base:1, name:{en:"Pattern Ward",ko:"패턴 결계"}},
        firstMastery:{base:3, name:{en:"Restorative Boon",ko:"회복의 은총"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Regen 전투 재생", color:"health", val:(E.lv("firstMastery")/2).toFixed(1)},
            {lab:"Essence 추가 소모", color:"defence", val:Math.floor(E.lv("defence")/3)},
          ],
          desc:`<b>비전투:</b> <b>정수</b> <b>1</b>장을 버리고, 그 카드의 효과를 영웅 하나에게 해당 페이즈가 끝날 때까지 부여한다. <b>전투:</b> 추가로 그 영웅은 {firstMastery} 랭크의 <b>절반</b>만큼 <st>health</st> <kw>regen</kw>도 전투가 끝날 때까지 얻는다. {defence} 랭크 <b>3마다</b> 정수를 <b>1</b>장 더 버리고 그 효과와 <kw>regen</kw>을 영웅 하나에게 부여할 수 있다. <lvl n="9"><st>energy</st> <b>1</b>을 추가로 소모해 버린 정수 하나의 효과를 <b>2배</b>로 만든다(버린 정수당 1회).</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Enchantment",ko:"마법 부여"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Raise 체력 증가", color:"health", val:(E.lv("secondMastery")+E.lv("attack")/2).toFixed(1)},
            {lab:"Essence 회수 주기", color:"secondMastery", val:Math.floor(E.lv("secondMastery")/4)},
          ],
          desc:`<b>정수</b> <b>1</b>장을 버리고, 영웅 하나에게 원하는 <b>Gear Upgrade장비 강화</b>를 턴이 끝날 때까지 부여한다. 그 영웅의 <st>health</st>을 {secondMastery} 랭크 + {attack} 랭크의 <b>절반</b>만큼 <kw>raise</kw>한다. <lvl n="8">정수를 <b>3</b>장 더 버려 그 장비 강화를 <b>영구</b>로 만들 수 있다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    monk: {
      id:"monk", ed:"4",
      name:{en:"Monk",ko:"몽크"},
      category:{key:"healer"},
      flavor:"모든 것이 완전한 균형에 이르리라.",
      special:{ko:`당신이 <b>살아 있는 유일한 영웅</b>이 아니라면 {attack}으로 <st>health</st> 피해를 줄 수 없다. 당신의 능력을 사용하거나 공격을 <kw>evasion</kw>할 때마다, 대상 하나의 <st>health</st>을 당신의 현재 <st>energy</st>만큼 <kw>heal</kw>한다.`,
        readout:(E)=>[{lab:"Heal 회복 = 현재 에너지", color:"energy", val:E.cur("energy").toFixed(1)}]},
      stats:{
        health:{base:8}, energy:{base:8},
        attack:{base:1, name:{en:"Chi Block",ko:"점혈"}, dmg:["energy","influence","outlast"]},
        defence:{base:2, name:{en:"Aura Shield",ko:"오라 방패"}},
        firstMastery:{base:2, name:{en:"Cleanse",ko:"정화"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 회복", color:"health", val:(E.lv("firstMastery")/2).toFixed(1)},
            ...(E.lv("firstMastery")>=8?[{lab:"Raise 에너지 증가", color:"energy", val:(E.lv("defence")/2).toFixed(1)}]:[]),
          ],
          desc:`살아 있는 존재에게 당신의 기운을 흘려보낸다. 대상 하나의 <b>Condition상태</b>나 효과 중 원하는 하나를 무효화하고, 그 대상은 {firstMastery} 랭크의 <b>절반</b>만큼 <st>health</st>을 <kw>heal</kw>한다. 그 영웅은 전투가 끝날 때까지 모든 스탯 테스트에 <b>-1</b> 보너스를 받는다. 이 효과는 중첩된다. <lvl n="5"><st>energy</st> <b>1</b>을 소모해 다른 동료 하나도 목표로 삼을 수 있다.</lvl> <lvl n="8">동료에게 {firstMastery}를 사용할 때마다, 그 동료의 <st>energy</st>를 {defence} 랭크의 <b>절반</b>만큼 <kw>raise</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Chakra Flow",ko:"차크라 흐름"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Evasion 회피", color:"survival", val:Math.max(0,10-Math.floor(E.lv("secondMastery")/3))},
            ...(E.lv("secondMastery")>=10?[{lab:"Block 차단", color:"defence", val:(E.lv("defence")/2).toFixed(1)}]:[]),
          ],
          desc:`다음 라운드가 끝날 때까지 <kw>evasion</kw> <b>10</b>을 얻는다. <kw>evasion</kw>에 성공할 때마다 즉시 {attack}을 사용할 수 있다. <b>3랭크부터 3랭크마다</b> 얻는 <kw>evasion</kw> 수치가 <b>1</b>씩 낮아진다. <lvl n="5">대신 동료 하나를 목표로 삼아 그 동료가 <kw>evasion</kw>를 얻게 할 수 있다. 그 동료가 <kw>evasion</kw>에 성공할 때마다 당신이 즉시 {attack}을 사용할 수 있다.</lvl> <lvl n="10">이 <kw>evasion</kw>를 가진 영웅이 공격을 <kw>evasion</kw>하지 못할 때마다, 라운드가 끝날 때까지 {defence} 랭크의 <b>절반</b>만큼 <kw>block</kw>을 얻는다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    scourgeEater: {
      id:"scourgeEater", ed:"4",
      name:{en:"Scourge Eater",ko:"재앙 포식자"},
      category:{key:"healer"},
      flavor:"너의 고통은 내가 삼킬 것이다.",
      stats:{
        health:{base:9}, energy:{base:5},
        attack:{base:2, name:{en:"Torment Levy",ko:"고통 징수"}},
        defence:{base:3, name:{en:"Pain Tolerance",ko:"통증 내성"}},
        firstMastery:{base:1, name:{en:"Wound Transfer",ko:"상처 전이"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"타겟 주사위 감소", color:"neutral", val:(E.lv("firstMastery")/3).toFixed(1)},
            {lab:"피해 감소", color:"defence", val:(E.lv("defence")/2).toFixed(1)},
            {lab:"Heal 회복 상한", color:"health", val:E.lv("firstMastery").toFixed(1)},
          ],
          desc:`동료의 상처를 당신이 대신 짊어진다. 이번 라운드 당신의 타겟 주사위를 {firstMastery} 랭크의 <b>1/3</b>만큼 낮춘다. 이번 라운드 당신이 받는 피해를 {defence} 랭크의 <b>절반</b>만큼 줄일 수 있다. <b>Resolution 페이즈</b>가 끝나 모든 피해가 처리된 뒤, 동료 하나의 <st>health</st>을 최대 {firstMastery} 랭크만큼 <kw>heal</kw>하고 당신이 같은 양의 피해를 받는다. 이 <kw>heal</kw>은 <kw>negate</kw>될 수 없고 동료를 <kw>revive</kw>시킬 수도 없다. <lvl n="5">이 효과로 <kw>corrosive</kw> 피해도 <kw>heal</kw>할 수 있다.</lvl> <lvl n="8">{firstMastery}를 라운드당 <b>2회</b>까지 사용할 수 있다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Inflict Scourge",ko:"재앙 부여"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            /* 주 피해 = 지금 잃어버린 체력(+6랭크부터 공격 랭크). 판의 현재 체력에 따라 실시간으로 바뀐다 */
            {lab:"Damage 피해", color:"health", val:(E.miss("health")+(E.lv("secondMastery")>=6?E.lv("attack"):0)).toFixed(1)},
            {lab:"Regen 재생 2라운드", color:"health", val:(E.lv("secondMastery")/2).toFixed(1)},
            {lab:"전투 종료 회복", color:"defence", val:E.lv("defence").toFixed(1)},
          ],
          desc:`당신의 상처를 적에게 되돌린다. 선언 시점에 <b>잃어버린 <st>health</st>만큼</b> <kw>piercing</kw> <st>health</st> 피해를 준다. 또한 다음 <b>2라운드</b> 동안 {secondMastery} 랭크의 <b>절반</b>만큼 <st>health</st> <kw>regen</kw>을 얻는다. 이 <kw>regen</kw>은 <b>Declaration 페이즈</b>가 끝날 때 당신을 <kw>heal</kw>한다. 이 <kw>regen</kw>을 가진 채로 전투가 끝나면 {defence} 랭크만큼 <st>health</st>을 <kw>heal</kw>한다. <lvl n="6">{attack} 랭크만큼 피해를 추가로 준다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    witch: {
      id:"witch", ed:"4",
      name:{en:"Witch",ko:"마녀"},
      category:{key:"sapper"},
      flavor:"장막을 꿰뚫어 보렴 모든 것이 밝혀질 것이란다",
      /* 고통 카드 보유 수 — 4랭크 이상에서 피해 계산에 그대로 들어간다 */
      counters:[{id:"affliction", name:{en:"Affliction",ko:"고통"}}],
      special:{ko:`게임 시작 시 원하는 <b>Familiar사역마</b> 하나를 골라 가지고 시작한다. {defence} 랭크 대신 당신의 사역마 능력 랭크를 사용할 수 있다.`},
      stats:{
        health:{base:4}, energy:{base:8},
        attack:{base:2, name:{en:"Baneful Curse",ko:"파멸의 저주"}, dmg:["health","energy"]},
        defence:{base:1, name:{en:"Familiar's Aid",ko:"사역마의 조력"}},
        firstMastery:{base:2, name:{en:"Hex",ko:"주술"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"energy",
             val:(E.lv("attack")+E.lv("firstMastery")+(E.lv("firstMastery")>=4?6*E.cnt("affliction"):0)).toFixed(1)},
            {lab:"Raise 증가", color:"energy", val:(E.lv("firstMastery")/2).toFixed(1)},
          ],
          desc:`적을 약화시키고 당신과 동료에게 힘을 준다. {attack} 랭크 + {firstMastery} 랭크만큼 <st>energy</st> 피해를 주고, {firstMastery} 랭크의 <b>절반</b>만큼 <st>energy</st>를 원하는 영웅들에게 나눠 <kw>raise</kw>한다. <lvl n="4">전투 중이 아닐 때 {firstMastery}를 사용해, 플레이 중이거나 버린 더미에 있는 <b>Affliction고통</b> 카드 1장을 가져와 획득한다. {firstMastery}는 당신이 가진 <b>고통</b> 1장마다 <st>energy</st> 피해 <b>6</b>을 추가로 준다.</lvl> <lvl n="7">이 라운드에 {attack}도 함께 사용할 수 있다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Coven",ko:"마녀 집회"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Ally Spend 동료 소모 상한", color:"defence", val:E.lv("defence").toFixed(1)},
            {lab:"Reduce 감소 기본", color:"secondMastery", val:(E.lv("secondMastery")/2).toFixed(1)},
            ...(E.lv("secondMastery")>=6?[{lab:"Piercing 관통 피해", color:"health", val:(3*E.cnt("affliction")).toFixed(1)}]:[]),
          ],
          desc:`동료는 각자 {defence} 랭크까지 <st>energy</st>를 소모할 수 있다. 적 공격의 피해를 {secondMastery} 랭크의 <b>절반</b> + <st>energy</st>를 소모한 동료 <b>1명당 1</b>만큼 감소시킨다. <lvl n="6">적의 <st>energy</st>가 0이면, 당신이 가진 <b>고통</b> 1장마다 <kw>piercing</kw> <st>health</st> 피해 <b>3</b>도 준다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    inquisitor: {
      id:"inquisitor", ed:"4",
      name:{en:"Inquisitor",ko:"심문관"},
      category:{key:"utility"},
      flavor:"네 눈으로 봐도 믿지 못할 것이다.",
      declareFoe:true,   /* 지금 상대하는 적 유형 — 같은 유형 트로피가 계산에 들어간다 */
      /* 트로피는 숙적과 같은 유형별로 센다. 마스터 트로피는 같은 유형 2개마다 1로 자동 계산 */
      counters:[
        {id:"trophy", name:{en:"Trophy",ko:"트로피"}, perType:true},
        {id:"masterTrophy", name:{en:"Master Trophy",ko:"마스터 트로피"},
         derive:(c)=>Object.values(c.trophy||{}).reduce((a,n)=>a+Math.floor(n/2),0)},
      ],
      special:{ko:`적을 쓰러뜨릴 때마다 그 유형을 <b>Trophy트로피</b>로 기록한다. 피해를 줄 때, 대상과 유형이 같은 트로피 <b>1개마다 피해 1</b>을 추가로 준다. 같은 유형의 트로피를 <b>2개</b> 모을 때마다 <b>Master Trophy마스터 트로피</b>가 <b>1</b> 증가한다.`,
        readout:(E)=>E.foe()?[{lab:"추가 피해 · 같은 유형", color:"attack", val:E.cnt("trophy",E.foe())}]:[]},
      stats:{
        health:{base:7}, energy:{base:5},
        attack:{base:2, name:{en:"Blessed Crossbow",ko:"축복받은 석궁"}, dmg:["health","outlast"]},
        defence:{base:1, name:{en:"Exploitation",ko:"약점 공략"}},
        firstMastery:{base:1, name:{en:"Trophy Hunter",ko:"트로피 사냥꾼"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health",
             val:(E.lv("attack")+E.lv("firstMastery")+(E.lv("firstMastery")>=8?3*E.cntEvery("trophy",2):0)).toFixed(1)},
            ...(E.lv("firstMastery")>=6?[{lab:"Reflect 반사", color:"defence", val:E.cntEvery("trophy",2)}]:[]),
          ],
          desc:`{attack} 랭크 + {firstMastery} 랭크만큼 <st>health</st> 피해를 준다. <lvl n="6">라운드가 끝날 때까지 가진 마스터 트로피 <b>개수</b>만큼 <kw>reflect</kw>를 얻는다.</lvl> <lvl n="8">가진 마스터 트로피 <b>1개마다</b> 이 마스터리의 피해를 <b>3</b>씩 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Bestiary",ko:"마물 도감"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Skill 기술 보너스", color:"secondMastery", val:(E.lv("secondMastery")/3).toFixed(1)},
            {lab:"피해 감소", color:"defence", val:(E.lv("defence")/3).toFixed(1)},
            {lab:"지속 라운드", color:"neutral", val:1+(E.foe()?E.cnt("trophy",E.foe()):0)},
          ],
          desc:`라운드가 끝날 때까지 그룹이 모든 기술 판정에 {secondMastery} 랭크의 <b>1/3</b>만큼 보너스를 받고, 받는 모든 피해를 {defence} 랭크의 <b>1/3</b>만큼 줄인다. 적과 유형이 같은 트로피를 <b>1개 가질 때마다</b> 이 효과의 지속시간이 <b>1라운드</b> 늘어난다. <lvl n="8">전투가 끝날 때까지, 영웅들은 매 라운드 <b>Favored Opponent 주사위</b>를 <b>1회</b> 다시 굴려 더 유리한 결과를 택할 수 있다. 이 효과는 중첩되지 않는다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:3, name:{en:"Survival",ko:"생존"}},
      }
    },
    medium: {
      id:"medium", ed:"4",
      name:{en:"Medium",ko:"영매"},
      category:{key:"utility"},
      flavor:"이곳에 무언가 있는 게 느껴져.",
      special:{ko:`<st>energy</st> 랭크 <b>5마다</b>, 다음 <b>Spirit영혼 Encounter조우</b>를 찾아 <b>Possessor빙의령</b>으로 획득한다. 빙의령은 전투에 참여하지 않고 피해도 받지 않으며, 자기 것이 아니라 <b>당신의 <st>energy</st></b>를 소모한다.`,
        readout:(E)=>[{lab:"Possessor 빙의령", color:"energy", val:Math.floor(E.lv("energy")/5)}]},
      stats:{
        health:{base:6}, energy:{base:6},
        attack:{base:1, name:{en:"Phantom Guide",ko:"유령 안내자"}, dmg:["health","influence"]},
        defence:{base:2, name:{en:"Trance",ko:"접신"}},
        firstMastery:{base:2, name:{en:"Spiritual Synergy",ko:"영적 공명"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Boost 증폭", color:"firstMastery", val:(E.lv("firstMastery")/2).toFixed(1)},
            ...(E.lv("firstMastery")>=5?[{lab:"Heal 전환 증폭", color:"defence", val:(E.lv("defence")/2).toFixed(1)}]:[]),
          ],
          desc:`빙의령 <b>각각</b>에서 원하는 행동을 하나씩 수행하고, 그 수치 효과를 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다. <lvl n="5">빙의령의 공격 행동을 사용할 때, 그 피해 전부를 <st>energy</st> <kw>heal</kw>으로 바꿀 수 있다. 목표 수는 바뀌지 않으며, 그룹 대상 행동이 아니라면 목표를 직접 고를 수 있다. 이때 수치 효과는 {firstMastery} 대신 {defence} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Otherworldly Knowledge",ko:"이계의 지식"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"스탯 테스트 보너스", color:"neutral", val:"-"+Math.floor(E.lv("energy")/5)},
            {lab:"Boost 전투 증폭", color:"secondMastery", val:(E.lv("secondMastery")/2).toFixed(1)},
            ...(E.lv("secondMastery")>=6?[{lab:"Heal 회복", color:"health", val:(E.lv("attack")/2).toFixed(1)}]:[]),
          ],
          desc:`<b>비전투:</b> 게임 턴이 끝날 때까지 빙의령 <b>1체마다</b> 모든 스탯 테스트에 <b>-1</b> 보너스를 받는다. <lvl n="7">동료들도 이 보너스를 받는다.</lvl> <b>전투:</b> 빙의령 <b>각각</b>에서 원하는 행동을 하나씩 수행하고, 그 수치 효과를 {secondMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다. <lvl n="6">대상 <b>2명</b>이 {attack} 랭크의 <b>절반</b>만큼 <st>health</st>을 <kw>heal</kw>한다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    scout: {
      id:"scout", ed:"4",
      name:{en:"Scout",ko:"정찰병"},
      category:{key:"utility"},
      flavor:"급할수록 돌아가라.",
      declareVital:true,   /* 전투마다 생명력 유형 하나를 선언 — 기본공격 피해 유형에 반영 */
      special:{ko:`전투를 시작할 때마다 <b>Vital생명력</b> 유형을 하나 선언한다. {attack}는 전투가 끝날 때까지 그 생명력에만 영향을 줄 수 있다. 새 적이 전투에 합류하면 선언한 생명력을 다시 고를 수 있다.`},
      stats:{
        health:{base:5}, energy:{base:5},
        attack:{base:2, name:{en:"Superior Tactics",ko:"우월한 전술"}, dmg:["health","energy","influence","outlast"]},
        defence:{base:2, name:{en:"Evasive Maneuvers",ko:"회피 기동"}, bribe:true},
        firstMastery:{base:1, name:{en:"Recon and Camouflage",ko:"정찰과 위장"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Stat Test 판정 횟수", color:"firstMastery", val:E.lv("firstMastery")>=7?"3 / 6":"3"},
          ],
          desc:`이 마스터리는 <b>Movement 페이즈</b>에만 사용할 수 있다. {firstMastery}에 대해 스탯 테스트를 <b>3회</b> 굴린다. 성공한 만큼 그 게임 턴 동안 다음 중 하나로 쓸 수 있다 — <b>Moon 주사위</b>를 굴려 그 결과를 대상의 <b>Favored Opponent</b> 판정에 더하기 · 실패한 스탯 테스트를 성공으로 바꾸기 · 방금 굴린 <b>Circumstance상황</b>을 다시 굴리기. <lvl n="7"><st>energy</st> <b>1</b>을 추가로 소모해 <b>3회</b> 대신 <b>6회</b> 굴릴 수 있다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Honed Instinct",ko:"벼려진 직감"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Boost 능력 증폭", color:"attack", val:Math.max(1,E.lv("secondMastery")/3).toFixed(1)},
            ...(E.lv("secondMastery")>=5?[{lab:"아이템 사용 수", color:"explore", val:(E.lv("explore")/2).toFixed(1)}]:[]),
          ],
          desc:`이번 라운드가 끝날 때까지 모든 영웅의 능력 랭크를 {secondMastery} 랭크의 <b>1/3</b>만큼(<b>최소 1</b>) <kw>boost</kw>하고, 전투가 끝날 때까지 적에게 <b>Mark표식</b>을 남긴다. 표식이 남은 적에게는 모든 공격 능력이 <kw>piercing</kw> 피해를 준다. <act>defend</act>를 사용하는 영웅 <b>1명마다</b> 표식이 남은 대상이 받는 회복이 <b>5</b>씩 줄어든다. {attack}는 표식이 남은 적에게 라운드당 <b>2회</b> 사용할 수 있다. <lvl n="5">표식이 남은 적과 맞선 상태에서 {defence}를 사용할 때, 아이템을 <b>1개</b> 대신 {explore} 랭크의 <b>절반</b>만큼 사용할 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:3, name:{en:"Explore",ko:"탐험"}},
        survival:{base:3, name:{en:"Survival",ko:"생존"}},
      }
    },
    bloodMage:{   id:"bloodMage",   ed:"4", name:{en:"Blood Mage",ko:"블러드 메이지"},  category:{key:"dual",members:["striker","sapper"]}, stats:{} },
    deathKnight:{ id:"deathKnight", ed:"4", name:{en:"Death Knight",ko:"데스 나이트"},  category:{key:"dual",members:["healer","sapper"]},  stats:{} },
    demonologist:{id:"demonologist",ed:"4", name:{en:"Demonologist",ko:"악마학자"},     category:{key:"dual",members:["utility","assist"]}, stats:{} },
    // ===== 5편 · The Mountains of Godai (이름만 초벌) =====
    dragoon: {
      id:"dragoon", ed:"5",
      name:{en:"Dragoon",ko:"드라군"},
      category:{key:"striker"},
      flavor:"진노는 위에서 내리친다.",
      special:{ko:`게임 턴당 <b>1회</b>, 전투 중에 <st>health</st> <b>1</b>을 소모해 <state>berserk</state> 상태가 될 수 있다. 이 효과는 <kw>sustain</kw>할 수 있지만, 매 라운드 <st>energy</st> <b>1</b> 대신 <st>health</st> <b>1</b>을 소모한다.`},
      stats:{
        health:{base:7}, energy:{base:4},
        attack:{base:2, name:{en:"Wind Lance",ko:"바람 창"}, dmg:["health","outlast"]},
        defence:{base:3, name:{en:"Deflect",ko:"쳐내기"}},
        firstMastery:{base:1, name:{en:"Leap",ko:"도약"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"타겟 주사위 +", color:"neutral", val:E.lv("firstMastery").toFixed(1)},
            {lab:"Counterattack 반격", color:"attack", val:(E.lv("attack")/2).toFixed(1)},
            ...(E.lv("firstMastery")>=4?[{lab:"Block 차단", color:"defence", val:(E.lv("defence")/2).toFixed(1)}]:[]),
          ],
          desc:`<b>비전투:</b> 게임 턴이 끝날 때까지 <kw>soar</kw>을 얻는다. <b>전투:</b> 라운드가 끝날 때까지 당신의 타겟 주사위를 {firstMastery} 랭크만큼 올리고, {attack} 랭크의 <b>절반</b>만큼 <kw>counterattack</kw>을 얻는다. <lvl n="4">이번 라운드에 {defence} 랭크의 <b>절반</b>만큼 <kw>block</kw>도 얻는다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Downstrike",ko:"내리찍기"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery")).toFixed(1)},
          ],
          desc:`{attack} 랭크 + {secondMastery} 랭크만큼 <st>health</st> 피해를 준다. <b>직전 라운드에 {firstMastery}를 썼다면</b> 이 피해는 <kw>piercing</kw>을 얻고 피해를 <b>1</b> <kw>strengthen</kw>한다. <b>직전 라운드에 {defence}를 썼다면</b> 이번 라운드에 <kw>counterattack</kw>도 얻는다.`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:4, name:{en:"Survival",ko:"생존"}},
      }
    },
    samurai: {
      id:"samurai", ed:"5",
      name:{en:"Samurai",ko:"사무라이"},
      category:{key:"striker"},
      flavor:"모든 것에 나의 명예를 건다.",
      /* 전투 중 자세 하나를 유지한다 — 고른 자세가 검술·합기도 계산에 반영된다 */
      stances:[
        {id:"iaido", name:{en:"Iaido",ko:"거합"},   note:"Evasion회피 10"},
        {id:"itto",  name:{en:"Itto-ryu",ko:"일도류"}, note:"Counterattack반격 = 검술 ÷2"},
        {id:"nito",  name:{en:"Nito-ryu",ko:"이도류"}, note:"Block차단 = 카루타 ÷2"},
      ],
      special:{ko:`{defence} 랭크 <b>4마다</b> 타겟 주사위에 <b>+1</b> 페널티를 얻는다.`,
        readout:(E)=>[{lab:"타겟 주사위 페널티", color:"neutral", val:"+"+Math.floor(E.lv("defence")/4)}]},
      stats:{
        health:{base:7}, energy:{base:5},
        attack:{base:2, name:{en:"Katana",ko:"카타나"}},
        defence:{base:2, name:{en:"Karuta",ko:"카루타"}},
        firstMastery:{base:1, name:{en:"Kenjutsu",ko:"검술"}, cost:1,
          readout:(E)=>{
            const s=E.stance();
            return [{lab:"Cost 비용", color:"energy", val:1},
              ...(s==="iaido"?[{lab:"Evasion 회피", color:"survival", val:10}]:[]),
              ...(s==="itto"?[{lab:"Counterattack 반격", color:"attack", val:(E.lv("firstMastery")/2).toFixed(1)}]:[]),
              ...(s==="nito"?[{lab:"Block 차단", color:"defence", val:(E.lv("defence")/2).toFixed(1)}]:[]),
              {lab:"자세 강화 횟수", color:"firstMastery", val:E.lv("firstMastery")>=4?1+Math.floor((E.lv("firstMastery")-4)/2):0}];
          },
          desc:`전투가 끝나거나 이 마스터리를 다시 쓸 때까지 <b>Stance자세</b> 셋 중 하나를 취한다 — <b>Iaido거합</b>(<kw>evasion</kw> <b>10</b>) · <b>Itto-ryu일도류</b>({firstMastery} 랭크의 <b>절반</b>만큼 <kw>counterattack</kw>) · <b>Nito-ryu이도류</b>({defence} 랭크의 <b>절반</b>만큼 <kw>block</kw>). <lvl n="4">4랭크부터 <b>2랭크마다</b> 자세 하나를 골라 강화한다 — 그 자세일 때 주는 모든 피해를 <kw>boost</kw>하고 자세 보너스가 <b>1</b> 올라간다.</lvl> <lvl n="10">자세 <b>2개</b>를 동시에 취할 수 있다. 단 둘 다 유지하려면 {firstMastery}를 <kw>sustain</kw>해야 한다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Aikido",ko:"합기도"}, cost:1,
          readout:(E)=>{
            const s=E.stance(), base=E.lv("secondMastery");
            const dmg=s==="iaido"?base+E.lv("attack")/2 : s==="itto"?base+E.lv("attack") : base;
            return [{lab:"Cost 비용", color:"energy", val:1},
              {lab:s==="nito"?"Damage 피해 ×2회":"Damage 피해", color:"health", val:dmg.toFixed(1)},
              ...(s==="iaido"?[{lab:"회피 성공 시", color:"health", val:(dmg*2).toFixed(1)}]:[])];
          },
          desc:`{secondMastery} 랭크만큼 <st>health</st> 피해를 주며, 자세에 따라 효과가 붙는다 — <b>거합</b>: 피해를 {attack} 랭크의 <b>절반</b>만큼 <kw>boost</kw>하고, 이번 라운드에 공격을 <kw>evasion</kw>했다면 피해가 <b>2배</b>가 된다 · <b>일도류</b>: 피해를 {attack} 랭크만큼 <kw>boost</kw>하고 <kw>piercing</kw>을 얻는다 · <b>이도류</b>: 피해가 <b>2번</b> 발생하며, 두 번째는 다른 적을 목표로 삼을 수 있다. <lvl n="6">라운드가 끝날 때 자세를 바꿀 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    spearMaster: {
      id:"spearMaster", ed:"5",
      name:{en:"Spear Master",ko:"창왕"},
      category:{key:"assist"},
      flavor:"내 손이 닿지 않는 곳은 없다.",
      special:{ko:`기본 공격을 할 때 <st>energy</st> <b>1</b>을 소모해, 대상 하나에게 {defence} 랭크의 <b>절반</b>만큼 <kw>block</kw>을 줄 수 있다.`,
        readout:(E)=>[{lab:"Block 차단", color:"defence", val:(E.lv("defence")/2).toFixed(1)}]},
      stats:{
        health:{base:5}, energy:{base:6},
        attack:{base:2, name:{en:"Lunge",ko:"찌르기"}},
        defence:{base:1, name:{en:"Reposition",ko:"재배치"}},
        firstMastery:{base:2, name:{en:"Atlatl",ko:"아틀라틀"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("firstMastery")).toFixed(1)},
            {lab:"Bleeding 출혈", color:"health", val:(E.lv("firstMastery")/3).toFixed(1)},
            ...(E.lv("firstMastery")>=5?[{lab:"Vulnerable 추가 피해", color:"attack", val:(E.lv("firstMastery")/2).toFixed(1)}]:[]),
          ],
          desc:`{firstMastery} 랭크 + {attack} 랭크만큼 <st>health</st> 피해를 주고 적은 <state>bleeding</state> 상태가 된다. 이 <state>bleeding</state> 피해는 1이 아니라 {firstMastery} 랭크의 <b>1/3</b>이다. <lvl n="5"><st>energy</st> <b>1</b>을 추가로 소모해 <state>vulnerable</state>이나 <state>slowed</state>도 걸 수 있다. <state>vulnerable</state> 상태인 적은 1이 아니라 {firstMastery} 랭크의 <b>절반</b>만큼 추가 피해를 받는다.</lvl> <lvl n="7">적이 <state>bleeding</state> 상태인 동안 그 적의 <st>health</st>·<st>energy</st> 회복 효과를 <kw>negate</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Sōjutsu",ko:"창술"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"① 방어 전환 · Defend", color:"defence", val:(E.lv("defence")/2).toFixed(1)},
            {lab:"① 반격 피해", color:"health", val:E.lv("attack").toFixed(1)},
            {lab:"② 동료 피해 증폭", color:"attack", val:(E.lv("secondMastery")+E.lv("attack")/2).toFixed(1)},
            {lab:"③ 피해 감소", color:"secondMastery", val:Math.max(1,E.lv("secondMastery")/3).toFixed(1)},
          ],
          desc:`이 마스터리를 쓸 때 다음 중 <b>하나</b>를 고른다 — <b>①</b> 단일 대상 공격의 목표를 자신으로 바꾸고, {defence} 랭크의 <b>절반</b>만큼 <kw>defend</kw>를 얻으며 {attack} 랭크만큼 <st>health</st> 피해를 준다 · <b>②</b> 동료 공격의 <st>health</st> 피해를 {secondMastery} 랭크 + {attack} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다 · <b>③</b> 적 공격의 피해를 {secondMastery} 랭크의 <b>1/3</b>만큼 줄인다(<b>최소 1</b>). <lvl n="9"><st>energy</st> <b>2</b>를 추가로 소모해 효과를 <b>2개</b> 쓸 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    astrologist: {
      id:"astrologist", ed:"5",
      name:{en:"Astrologist",ko:"점성술사"},
      category:{key:"healer"},
      flavor:"끝없는 순환과 무한한 가능성.",
      stats:{
        health:{base:3}, energy:{base:8},
        attack:{base:1, name:{en:"Starfall",ko:"별똥별"}, dmg:["health","influence"]},
        defence:{base:2, name:{en:"Akashic Link",ko:"아카식 연결"}},
        firstMastery:{base:2, name:{en:"Sky Reading",ko:"천문 읽기"}, cost:2, uses:{max:3,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"비전투 · 뒤집는 카드", color:"defence", val:Math.max(1,Math.floor(E.lv("defence")/4))},
            {lab:"Defend 방어", color:"defence", val:3},
            {lab:"Raise 그룹 체력", color:"health", val:(E.lv("firstMastery")/2).toFixed(1)},
          ],
          desc:`<b>비전투:</b> 턴당 <b>1회</b>, {defence} 랭크 <b>4마다</b>(<b>최소 1</b>) <b>아무 덱</b>이나 맨 위 카드를 뒤집는다. <b>전투:</b> 라운드당 <b>3회</b>까지 쓸 수 있다. 사용할 때마다 <kw>defend</kw> <b>3</b>을 얻고, 다음 라운드 <b>Declaration 페이즈</b>에 그룹의 <st>health</st>을 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>raise</kw>한다. 이 <kw>raise</kw> 효과는 <b>서로 중첩된다</b>. <lvl n="6">전투 밖에서도 <kw>raise</kw> 효과를 얻는다.</lvl> <lvl n="8">한 라운드에 이 마스터리를 <b>3번</b> 쓰면 <kw>raise</kw> 양을 <b>1</b> <kw>strengthen</kw>한다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Energetic Connection",ko:"에너지 연결"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 체력", color:"health", val:E.lv("secondMastery").toFixed(1)},
            {lab:"Heal 에너지", color:"energy", val:3},
            {lab:"스탯 테스트 보너스", color:"neutral", val:"-2"},
          ],
          desc:`<b>비전투 · 전투 라운드당 2회</b>까지, 동료의 <st>health</st>을 {secondMastery} 랭크만큼 <kw>heal</kw>하거나 <st>energy</st>를 <b>3</b> <kw>heal</kw>한다. 그 대상의 다음 스탯 테스트에 <b>-2</b> 보너스가 붙는다(중첩되지 않음). <lvl n="7"><b>Camping야영</b> 중 <b>Movement 페이즈</b>에 사용해 쓰러진 영웅을 <kw>revive</kw>시킬 수 있다. 되살아난 영웅은 <st>health</st> 랭크 <b>1</b> 또는 <st>energy</st> 랭크 <b>2</b>를 잃는다(본인 선택).</lvl>`,
        },
        navigate:{base:4, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    sage: {
      id:"sage", ed:"5",
      name:{en:"Sage",ko:"현자"},
      category:{key:"healer"},
      flavor:"중요한 말이 아니라면, 침묵하라.",
      special:{ko:`게임 턴당 <b>2회</b>까지 <st>energy</st> <b>2</b>를 소모해 다음 중 하나를 한다 — 대상 하나에게 원하는 <b>Element원소</b> 하위 유형을 게임 턴이 끝날 때까지 <b>숙적</b>으로 부여한다 · <kw>harvest</kw> 판정에 <b>-3</b> 보너스를 준다.`},
      stats:{
        health:{base:4}, energy:{base:8},
        attack:{base:1, name:{en:"Inner Light",ko:"내면의 빛"}, dmg:["health","influence"]},
        defence:{base:1, name:{en:"Epistemic Resolve",ko:"확고한 인식"}},
        firstMastery:{base:2, name:{en:"Resonance",ko:"공명"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 회복", color:"health", val:(E.lv("defence")+E.lv("attack")/2).toFixed(1)},
            ...(E.lv("firstMastery")>=5?[
              {lab:"Regen 재생", color:"health", val:(E.lv("firstMastery")/3).toFixed(1)},
              {lab:"스탯 테스트 보너스", color:"neutral", val:"-"+Math.floor(E.lv("firstMastery")/3)}]:[]),
          ],
          desc:`대상 하나의 <st>health</st>을 {defence} 랭크 + {attack} 랭크의 <b>절반</b>만큼 <kw>heal</kw>한다. 이 마스터리는 전투 밖에서도 쓸 수 있다. <lvl n="5">대상은 다음 중 하나를 함께 얻는다(본인 선택) — 전투가 끝날 때까지 {firstMastery} 랭크의 <b>1/3</b>만큼 <st>health</st> <kw>regen</kw> · {firstMastery} 랭크 <b>3마다</b> 다음 스탯 테스트에 <b>-1</b> 보너스. 이 스탯 테스트 보너스는 이후 게임 턴에도 쓸 수 있지만 <b>서로 중첩되지 않는다</b>.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Attune",ko:"조율"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"Element Tier +", color:"secondMastery", val:Math.floor(E.lv("secondMastery")/4)},
          ],
          desc:`이 마스터리는 전투 밖에서도 쓸 수 있다. 당신이 원하는 영웅 하나가 <b>Stockpile</b>에 있는 <b>Element원소</b> 하나의 <b>Augment보강</b> 효과를 얻는다. {secondMastery} 랭크 <b>4마다</b> 그 <b>Element Tier</b>를 <b>1</b> 올린다. 이 효과는 페이즈가 끝날 때나 라운드가 끝날 때 중 <b>먼저 오는 쪽</b>까지 지속된다. 전투 중에는 <kw>sustain</kw>할 수 있다. <lvl n="5">다음 중 하나를 대신 할 수도 있다 — 페이즈가 끝날 때까지 적의 키워드 효과 하나를 <kw>negate</kw> · 대상 하나의 <kw>regen</kw> 효과를 <b>2배</b>로 만들고 그것을 원하는 다른 대상에게도 준다.</lvl>`,
        },
        navigate:{base:3, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:3, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    magician: {
      id:"magician", ed:"5",
      name:{en:"Magician",ko:"마술사"},
      category:{key:"sapper"},
      flavor:"매직 미사일을 얕보지 마라.",
      special:{ko:`당신의 공격 능력은 <b>마스터리로도 취급</b>되며, 쓰는 데 <st>energy</st> <b>1</b>이 든다. 마스터리 랭크 보너스를 주는 파워업을 얻을 때마다, 그 보너스를 당신의 마스터리 중 <b>아무 하나</b>에 적용할 수 있다.`},
      stats:{
        health:{base:4}, energy:{base:10},
        attack:{base:1, name:{en:"Magic Missile",ko:"매직 미사일"}, dmg:["health","energy"]},
        defence:{base:1, name:{en:"Earth Shroud",ko:"대지의 장막"}},
        firstMastery:{base:3, name:{en:"Nexus Arc",ko:"넥서스 아크"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 에너지 피해", color:"energy", val:(E.lv("attack")+E.lv("firstMastery")).toFixed(1)},
          ],
          desc:`적에게 {attack} 랭크 + {firstMastery} 랭크만큼 <st>energy</st> 피해를 주고 이번 라운드에 <kw>counterattack</kw>을 얻는다. <kw>counterattack</kw>할 때는 <st>energy</st>가 들지 않으며, 그 피해는 <st>energy</st> 피해로 바뀐다. 이 마스터리는 <kw>counterattack</kw> 효과를 유지하기 위해 <kw>sustain</kw>할 수 있다. <lvl n="7">이 마스터리를 <kw>sustain</kw>하는 중에 죽으면 {defence}에 대해 스탯 테스트를 굴린다. <b>대성공</b>이면 <st>health</st> <b>1</b>로 라운드를 마치며, 다음 라운드에는 {firstMastery}를 <kw>sustain</kw>할 수 없다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Quantum Leap",ko:"양자 도약"}, cost:2, uses:{max:1,scope:"turn"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"비전투 · 사용 횟수", color:"secondMastery", val:Math.floor(E.lv("secondMastery")/5)},
            {lab:"Teleport 헥스", color:"navigate", val:(E.lv("secondMastery")/2).toFixed(1)},
            {lab:"Boost 다음 라운드", color:"attack", val:E.lv("secondMastery").toFixed(1)},
          ],
          desc:`<b>비전투:</b> {secondMastery} 랭크 <b>5마다</b> 게임 턴당 <b>1회</b>씩 사용해, 그룹을 {secondMastery} 랭크의 <b>절반</b>까지의 헥스만큼 <kw>teleport</kw>시킨다. <b>전투:</b> 이번 라운드에 대상 <b>1명</b>을 적이 목표로 삼을 수 없게 만든다. 다음 라운드에 그 대상은 행동 랭크에 {secondMastery} 랭크만큼 <kw>boost</kw>을 얻는다.`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    mesmer: {
      id:"mesmer", ed:"5",
      name:{en:"Mesmer",ko:"최면술사"},
      category:{key:"sapper"},
      flavor:"말해봐, 무엇이 진짜일까?",
      special:{ko:`당신의 기본 공격은 <st>health</st> 피해 대신 <kw>energy drain</kw>를 준다.`},
      stanceLabel:{en:"Shapeshift",ko:"변신"},
      stances:[{id:"shifted", name:{en:"Shapeshifted",ko:"변신 중"}, note:"환각·기술 증폭 + 반사 · 다시 누르면 해제"}],
      stats:{
        health:{base:6}, energy:{base:8},
        attack:{base:1, name:{en:"Hallucinate",ko:"환각"}, dmg:["drain"]},
        defence:{base:1, name:{en:"Duplicity",ko:"기만"}, bribe:true},
        firstMastery:{base:2, name:{en:"Shapeshift",ko:"변신"}, cost:2, uses:{max:1,scope:"turn"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            ...(E.stance()==="shifted"?[
              {lab:"Boost 환각·기술", color:"attack", val:(E.lv("firstMastery")/2).toFixed(1)},
              {lab:"Reflect 반사", color:"defence", val:(E.lv("defence")/3).toFixed(1)}]:[]),
          ],
          desc:`강력한 짐승의 모습으로 변한다. 전투 밖에서는 게임 페이즈당 <b>1회</b> 쓸 수 있고, 전투 중에는 <kw>sustain</kw>할 수 있다. 변신한 동안 {attack} 랭크와 기술 하나의 랭크를 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>하고, {defence} 랭크의 <b>1/3</b>만큼 <kw>reflect</kw>를 얻는다. <lvl n="6"><st>outlast</st>을 가진 적과 맞설 때, {firstMastery}를 쓴 라운드에 행동을 하나 더 할 수 있다.</lvl> <lvl n="9">변신한 동안 <b>모든 기술</b>이 <kw>boost</kw>을 얻는다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Reflection",ko:"반영"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Reflect 반사", color:"defence", val:(E.lv("secondMastery")/2).toFixed(1)},
            {lab:"반격 Energy Drain", color:"energy", val:E.lv("attack").toFixed(1)},
          ],
          desc:`이번 라운드에 대상 하나가 {secondMastery} 랭크의 <b>절반</b>만큼 <kw>reflect</kw>를 얻는다. <kw>sustain</kw>할 수 있으며, 한 번 고른 대상은 바꿀 수 없다. 그 대상이 적의 목표가 되면, 적에게 {attack} 랭크만큼 <kw>energy drain</kw>를 주거나 적의 <st>outlast</st>을 <b>1</b> 줄인다. 대상 하나당 <b>3개</b>까지 걸 수 있다. <lvl n="7">라운드당 <b>2회</b>까지 쓸 수 있다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:4, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    ninja: {
      id:"ninja", ed:"5",
      name:{en:"Ninja",ko:"닌자"},
      category:{key:"utility"},
      flavor:"고요할 때 힘을 얻고, 움직일 때 폭풍이 된다.",
      /* 닌자 두루마리 보유 수 — 인술·환술에서 소모한다 */
      counters:[{id:"scroll", name:{en:"Ninja Scroll",ko:"닌자 두루마리"}}],
      special:{ko:`아이템을 파는 곳에서 <b>Ninja Scroll닌자 두루마리</b>를 <b>골드 2</b>에 살 수 있다. 닌자만 쓸 수 있으며, 쓰면 소모된다.`},
      stats:{
        health:{base:5}, energy:{base:7},
        attack:{base:2, name:{en:"Kusarigama",ko:"사슬낫"}, dmg:["health","outlast"]},
        defence:{base:1, name:{en:"Vanish",ko:"은신"}},
        firstMastery:{base:2, name:{en:"Ninjutsu",ko:"인술"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("firstMastery")+E.lv("attack")/2).toFixed(1)},
            {lab:"두루마리 보유", color:"explore", val:E.cnt("scroll")},
          ],
          desc:`{firstMastery} 랭크 + {attack} 랭크의 <b>절반</b>만큼 <st>health</st> 또는 <st>energy</st> 피해를 준다. 닌자 두루마리 <b>1</b>개를 써서 그 피해를 <b>Air바람·Earth대지·Fire불·Water물</b> 중 하나로 바꿀 수 있다. <lvl n="4">바꾼 원소의 효과가 함께 붙는다 — <b>바람</b>: <kw>piercing</kw> · <b>대지</b>: <kw>corrosive</kw> · <b>불</b>: 대상이 <state>burned</state> 상태가 된다 · <b>물</b>: 피해를 <b>절반</b>으로 줄이고 그만큼 <kw>heal</kw>으로 바꾼다.</lvl> <lvl n="8">인술이나 환술을 쓸 때 두루마리를 <b>1</b>개 대신 <b>2</b>개까지 쓸 수 있다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Genjutsu",ko:"환술"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"주사위 보정 총량", color:"secondMastery", val:(E.lv("secondMastery")/2+E.lv("defence")/2).toFixed(1)},
            {lab:"0 만들 때 Energy Drain", color:"energy", val:(E.lv("secondMastery")*2).toFixed(1)},
          ],
          desc:`대상 여럿의 타겟 주사위 결과나 <kw>evasion</kw> 굴림을 최대 {secondMastery} 랭크의 <b>절반</b> + {defence} 랭크의 <b>절반</b>만큼 조정한다. 조정으로 결과가 <b>0</b>이 된 대상은 공격을 피하며, <kw>counterattack</kw>하거나 당신이 {secondMastery} 랭크의 <b>2배</b>만큼 <kw>energy drain</kw>를 준다. 이번 라운드에 그룹은 그룹 대상 공격에 대해서도 타겟 주사위를 굴릴 수 있다. <lvl n="4">닌자 두루마리를 써서 대상 <b>1</b>명에게 <b>2라운드</b> 동안 다음 중 하나를 준다 — <kw>block</kw> <b>4</b> · <kw>counterattack</kw> · <kw>evasion</kw> <b>9</b> · <st>health</st> <kw>regen</kw> <b>2</b>. 이 보너스들은 중첩되지 않는다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    windRider: {
      id:"windRider", ed:"5",
      name:{en:"Wind Rider",ko:"바람 기수"},
      category:{key:"utility"},
      flavor:"높은 곳에서 비로소 선명해진다.",
      special:{ko:`<kw>soar</kw>을 얻는다. <b>Moving Recklessly무모한 이동</b> 중에는 그룹의 <b>Movement Speed이동 속도</b>가 <b>2</b> 오른다. 또한 지도를 확장할 때마다, 처음 놓은 타일에 인접하게 지도 타일을 <b>1</b>장 더 놓을 수 있다.`},
      stats:{
        health:{base:7}, energy:{base:7},
        attack:{base:2, name:{en:"Charge",ko:"돌진"}},
        defence:{base:2, name:{en:"Vantage Point",ko:"조망점"}},
        firstMastery:{base:1, name:{en:"Whirlwind",ko:"회오리"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:E.lv("attack").toFixed(1)},
            {lab:"적 방어·차단·피해 감소", color:"defence", val:(E.lv("firstMastery")/3).toFixed(1)},
          ],
          desc:`적에게 {attack} 랭크만큼 <st>health</st> 피해를 주거나 적의 <st>outlast</st>을 <b>2</b> 조정한다. 이번 라운드에 적의 <kw>defend</kw>·<kw>block</kw>과 적이 주는 피해를 {firstMastery} 랭크의 <b>1/3</b>만큼 줄인다. <lvl n="6"><st>energy</st> <b>2</b>를 추가로 소모해, 게임 턴마다 처음 쓸 때 {firstMastery}의 피해를 <b>1</b> <kw>strengthen</kw>한다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Ascend",ko:"상승"}, cost:1, uses:{max:1,scope:"turn"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"비전투 이동 헥스", color:"navigate", val:(E.lv("secondMastery")/3).toFixed(1)},
            {lab:"Block 차단 총량", color:"defence", val:(E.lv("defence")+E.lv("secondMastery")).toFixed(1)},
            {lab:"다음 라운드 Boost", color:"attack", val:(E.lv("firstMastery")/2).toFixed(1)},
          ],
          desc:`<b>비전투:</b> 게임 턴당 <b>1회</b>까지, 아무 페이즈에나 써서 그룹을 {secondMastery} 랭크의 <b>1/3</b>까지의 헥스만큼 이동시킨다. <b>전투:</b> {defence} 랭크 + {secondMastery} 랭크만큼 <kw>block</kw>을 얻어, 대상 <b>2명</b>까지 골라 원하는 대로 분배한다. 다음 라운드에 그들이 주는 피해와 그들이 일으키는 회복 효과를 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다.`,
        },
        navigate:{base:3, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    ancestralChanneler:{id:"ancestralChanneler",ed:"5",name:{en:"Ancestral Channeler",ko:"선조 강령사"},category:{key:"dual",members:["utility","assist"]},stats:{} },
    kensai:{      id:"kensai",      ed:"5", name:{en:"Kensai",ko:"검성"},               category:{key:"dual",members:["striker","assist"]}, stats:{} },
    mycotomancer:{id:"mycotomancer",ed:"5", name:{en:"Mycotomancer",ko:"균사술사"},     category:{key:"dual",members:["assist","healer"]},  stats:{} },
    threadMage:{  id:"threadMage",  ed:"5", name:{en:"Thread Mage",ko:"직조 마법사"},     category:{key:"dual",members:["sapper","healer"]},  stats:{} },
    // 다음 직업은 여기에 추가.  dual 예:  category:{key:"dual",members:["striker","sapper"]}
  },

  /* 특성: traits / aspects / keepsakes.  게임 중 추가·제거 가능. keepsake 은 공개형.
     지금은 예시만.  실제 데이터 주시면 채웁니다. */
  traits: {
    // 예시 (실데이터로 교체 예정)
    bloodPact:   {id:"bloodPact", type:"trait",  name:{en:"Blood Pact",ko:"피의 서약"},
      desc:"전투당 1회, 체력 2를 지불해 마스터리 하나를 즉시 재사용. (예시)", track:{type:"check"}},
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
   key = 소문자 영문(기술 <kw> 토큰과 매칭). 여러 단어는 공백 유지.
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
  bolster:{name:{en:"Bolster",ko:"임시강화"}, desc:`Siege가 진행 중일 때, Villain 페이즈에 그룹이 Defender 안에 있다면 각 영웅은 <st>energy</st> 1을 소모하고 원하는 기술 하나를 굴려 임시 보너스를 줄 수 있다. <st>navigate</st>: 이번 턴 이 Defender의 Range를 2 증가시킨다. <st>explore</st>: Range 안의 Siege 적에게 Siege 피해 1을 준다. <st>survival</st>: 이 Defender가 이번 턴에 Siege 피해를 받았고 Resilience가 1 이상 남아 있다면 Resilience 1을 얻는다. 굴림이 치명적 성공이면 소모한 <st>energy</st>를 되돌려받는다.`},
  bulwark:{name:{en:"Bulwark",ko:"방벽"}, desc:`방벽을 가진 대상은 받는 Siege 피해를 방벽 수치만큼 감소시킨다(최소 0). 이 키워드 뒤에 Element 타입이 붙으면 해당 타입의 피해에만 적용된다. 이 키워드를 가진 Siege 적을 상대할 때는, 공격하는 Defender가 가진 Specialist 수만큼 방벽이 1씩 감소한다.`},
  consume:{name:{en:"Consume",ko:"소모"}, desc:`이 키워드 뒤에는 자원 종류와 수량이 붙는다. 표시된 자원의 Stockpile을 소모 수치만큼 줄인다. 이 키워드를 가진 Siege 적은 Defender에게 Siege 피해를 조금이라도 줄 때마다 Stockpile을 줄인다. 소모할 자원이 남아 있지 않다면 대신 원하는 City-State 하나가 Resilience 1을 잃는다.`},
  cripple:{name:{en:"Cripple",ko:"손상"}, desc:`이 Siege 피해를 조금이라도 받은 Defender는 Power도 1 잃는다(최소 1).`},
  deconstruct:{name:{en:"Deconstruct",ko:"해체"}, desc:`Defender가 이 피해를 받을 때마다 Recruit 1을 잃는다. Recruit가 없다면 대신 Potential 1을 잃는다.`},
  equip:{name:{en:"Equip",ko:"장비"}, desc:`Defender에 Equip 카드를 부착한다. 그 Defender는 부착된 효과를 얻는다.`},
  freeze:{name:{en:"Freeze",ko:"빙결"}, desc:`이 Siege 적에게 피해를 받은 Defender는 이번 턴 Equip 효과를 잃는다.`},
  ignite:{name:{en:"Ignite",ko:"발화"}, desc:`이 Siege 적에게 피해를 받은 Defender 안에 있는 영웅은 X만큼 <kw>energy drain</kw>를 받고 <state>wounded</state> 상태가 된다. 발화는 목표 Defender가 가진 Specialist 수만큼 1씩 감소한다.`},
  imbalance:{name:{en:"Imbalance",ko:"불균형"}, desc:`Siege 카드를 뽑을 때마다 Elemental Imbalance가 발생한다. 불균형은 Jaethi의 참조판에 기록하며 각 Element마다 0~9 범위를 가진다.`},
  overpower:{name:{en:"Overpower",ko:"압도"}, desc:`Defender를 공격할 때, 이 Siege 적의 압도 수치가 그 Defender의 Power보다 크면 Siege 피해를 1 더 주고, 영웅들은 이번 턴 그 Defender를 <kw>bolster</kw>하는 데 가장 높은 랭크의 기술을 사용할 수 없다. 압도는 목표 Defender가 가진 Specialist 수만큼 1씩 감소한다.`},
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
  cursed:{name:{en:"Cursed",ko:"저주"}, q:["P"], desc:`저주받은 영웅은 <kw>heal</kw>될 수 없다. 매 라운드 Declaration 페이즈와 매 게임 턴 Movement 페이즈에 기술 3종을 모두 굴린다. 세 굴림에 모두 성공하면 저주가 해제된다.`},
  debilitated:{name:{en:"Debilitated",ko:"쇠약"}, q:["S"], desc:`쇠약해진 영웅은 피라미드 주사위 또는 달 주사위를 굴려, 나온 능력을 사용할 수 없다. 이 상태에 숫자가 지정되어 있다면 주사위를 굴리지 않고 지정된 능력을 사용할 수 없다. 영웅은 이 상태를 동시에 최대 3개까지만 받을 수 있다.`},
  disarmed:{name:{en:"Disarmed",ko:"무장해제"}, q:[], desc:`무장해제된 영웅은 무기를 잃는다. 매 라운드 <st>defence</st> 행동을 하고 10면 주사위를 <st>attack</st> 랭크에 대해(기술처럼) 굴려 무기를 되찾으려 시도할 수 있다. 무장해제 중에는 직업의 기본 랭크 + 종족의 기본 보정치만큼만 피해를 줄 수 있다.`},
  diseased:{name:{en:"Diseased",ko:"감염"}, q:["P"], desc:`감염된 영웅이 <st>energy</st>를 쓰려면 먼저 <st>survival</st> 굴림에 성공해야 한다. 이 상태를 없애려면 <kw>heal</kw>을 제공하는 장소(마을·수도원 등)에서 <kw>heal</kw>해야 한다.`},
  disoriented:{name:{en:"Disoriented",ko:"균형상실"}, q:["S"], desc:`균형을 잃은 영웅은 기술 굴림에서 치명적 실패 확률이 높아진다. 균형상실을 얻을 때마다 치명적 실패 범위가 2씩 늘어난다(첫 번째는 8-10, 두 번째는 6-10 등).`},
  dissonant:{name:{en:"Dissonant",ko:"부조화"}, q:["A","P","S"], desc:`대상의 패턴이 뒤틀려 흐트러지기 시작한다. 대상이 <st>energy</st> 피해를 받을 때마다 같은 양의 <kw>nonlethal</kw> <st>health</st> 피해를 함께 받는다. 부조화 상태의 영웅은 스탯 테스트에 -2 페널티를 받는다. 중첩은 페널티에만 적용된다.`},
  drained:{name:{en:"Drained",ko:"소진"}, q:["A","S"], desc:`소진 대상은 매 라운드 Declaration 페이즈 시작에 <st>energy</st> 3을 잃고, <st>energy</st>를 <kw>heal</kw>할 때마다 3 적게 회복한다. 회복 감소는 중첩되지만 피해는 중첩되지 않는다.`},
  encased:{name:{en:"Encased",ko:"감금"}, q:["A"], desc:`감금된 대상은 전투에서 적의 표적이 되지 않지만, 자신을 가둔 구속물은 자신이나 동료가 대상으로 삼을 수 있다. 감금된 대상은 매 라운드 <st>attack</st>만 사용할 수 있으며 구속물만 노릴 수 있다. 이 상태에는 괄호 안에 숫자가 있는데, 대상을 풀어주기 위해 구속물에 줘야 하는 <st>health</st> 피해량이다. 이 상태는 다른 수단으로 제거할 수 없고 전투가 끝나면 해제된다.`},
  entangled:{name:{en:"Entangled",ko:"얽힘"}, q:["S"], desc:`얽힌 영웅은 정상적으로 행동하려면 매 라운드 Declaration 페이즈에 <st>navigate</st> 굴림에 성공해야 한다. 실패하면 <st>attack</st>이나 <st>defence</st>만 -3 페널티를 받고 할 수 있다.`},
  fatigued:{name:{en:"Fatigued",ko:"피로"}, q:["A","S"], desc:`피로 대상은 전투 중 매 라운드 Declaration 페이즈 시작에 <st>energy</st> 1을 잃는다.`},
  frightened:{name:{en:"Frightened",ko:"공포"}, q:["S"], desc:`공포에 빠진 영웅은 <st>defence</st> 행동만 할 수 있고 -3 페널티를 받는다. 전투 중 매 라운드 Resolution 페이즈에 <st>survival</st>을 굴린다. 성공하면 상태가 해제된다.`},
  frozen:{name:{en:"Frozen",ko:"동결"}, q:[], desc:`동결된 영웅은 행동할 수 없다. 매 라운드 Declaration 페이즈에 <st>survival</st>을 굴린다. 2회 성공하면 정상적으로 행동할 수 있고 동결이 해제된다.`},
  imprisoned:{name:{en:"Imprisoned",ko:"투옥"}, q:[], desc:`투옥된 영웅은 자신의 의지와 무관하게 붙잡혀 있다. 소지금과 음식, 배낭을 사용할 수 없다. 영웅들이 City-State에 있지 않다면 피라미드 주사위를 굴려 City-State 중 한 곳으로 이동시킨다. 그룹은 Arena(투기장)에 한 번 참가하기로 선택할 수 있다. 획득한 소지금은 몰수된다. 이 상태에는 괄호 안에 숫자가 있으며, 그룹이 투옥되어 보낸 시간을 나타낸다. 게임 턴이 끝날 때 이 숫자만큼 Remnant를 보드에 놓는다. 그 후 그룹은 풀려나고 배낭을 다시 사용할 수 있다. 이 상태는 아이템으로 제거할 수 없다.`},
  irradiated:{name:{en:"Irradiated",ko:"피폭"}, q:[], desc:`이 상태를 얻은 대상은 괄호 안의 숫자에서 자신의 음식 소모량을 뺀 만큼 <kw>energy drain</kw>를 받는다. 이 상태를 얻은 영웅은 코어 주사위를 굴려 <kw>mutate</kw>되는 것에 저항할 수 있다. 굴리지 않거나 결과가 음식 소모량의 2배보다 크면 즉시 변이 카드를 뽑는다.`},
  "knocked down":{name:{en:"Knocked Down",ko:"넘어짐"}, q:[], desc:`넘어진 영웅은 행동할 수 없고, 기술 굴림에 치명적 실패한다. 일어나기 위해 한 라운드를 <st>defence</st>해야 한다. 이렇게 <st>defence</st>하는 동안 아이템을 사용하거나 건넬 수 없다.`},
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
  wounded:{name:{en:"Wounded",ko:"상처"}, q:["P","S"], desc:`상처 입은 영웅은 <kw>heal</kw>을 받을 때까지 모든 능력·기술 랭크에 -2 페널티를 받는다.`},
};

/* 전투 흐름 — 두 편 공통 */
const RULES_COMBAT = {title:{en:"Combat Reference", ko:"전투 참조표"}, body:`
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>Declaration 선언</b> — 영웅들이 이번 라운드에 할 행동을 고른다. <b>목표는 아직 정하지 않는다.</b></span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>Opponent 적</b> — <b>헥스 주사위</b>로 적의 행동을 정한다(적마다 따로).<br>
      <b>목표 지정</b> — 영웅마다 <b>코어 주사위</b> + 보정치를 굴려 <b>가장 높은 영웅</b>이 목표가 된다.</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><b>Resolution 처리</b> — 양쪽 효과를 <b>동시에</b> 적용한다.</span></div>
  </div>
  <div class="rule-h">Resolution 적용 순서</div>
  <div class="rule-grid">
    <div class="rule-k">① 피해 감소</div><div class="rule-v">먼저 적용한다</div>
    <div class="rule-k">② 피해 · 회복</div><div class="rule-v">남은 피해와 회복 효과를 계산해 적용한다</div>
    <div class="rule-k">③ 상태</div><div class="rule-v">모든 피해 계산이 <b>끝난 뒤</b> 마지막에 적용한다</div>
  </div>
  <div class="rule-h">추가 예정</div>
  <div class="rule-v">뇌물 · 도주 · 격파 시 규칙 · 죽음 규칙</div>
  <div class="rule-en">Declaration (choose actions, no targets) &rarr; Opponent (Hex die per opponent; each hero rolls a Core die plus
  modifiers, highest becomes the target) &rarr; Resolution (simultaneous: damage reduction first, then damage and healing;
  Conditions apply last).</div>`};


const BREACH_TAB = {id:"breach", label:{en:"The Breach", ko:"균열"}, entries:[
        {name:{en:"Overview & Changes",ko:"개요 · 바뀌는 것"}, desc:`녹티스가 <b>승천에 성공한 뒤</b>의 미래를 다루는 대체 게임 모드. 균열에서 넘어온 <b>네 공포</b>를 막아야 하며, 이번엔 <b>녹티스가 유일한 아군</b>이다.<br>
          <b>피의 웅덩이가 100에서 거꾸로 줄어든다.</b> 수도원에 룬을 바치거나 지하묘지에서 룬을 활성화해도 웅덩이가 줄지 않는다(그 효과는 무시).<br>
          <b>미르자 녹티스와는 싸울 수 없다.</b> 코어의 녹티스 판 대신 <b>Mirza Noctis Ascended</b> 판을 쓰고, 녹티스는 매 게임 턴 <b>맨 처음</b>에 행동한다.<br>
          지도는 <b>처음부터 전부 공개</b>된 상태로 시작한다(던전은 그대로).<br>
          새로 <b>보라 룬</b>을 얻을 수 있고, 영웅은 <b>Madness광기</b>를 얻는다.<br>
          네 공포는 <b>레벨이 변하는 보스</b>로, 각자 <b>전용 덱</b>이 상황 슬롯 하나를 차지한다. 행동은 매 턴 <b>빌런 단계</b>에 정해진다.<br>
          <b>승리</b> — 네 공포를 모두 쓰러뜨리거나 <b>사건의 지평선에서 균열을 닫으면</b> 이긴다.<br>
          <b>패배</b> — 피의 웅덩이가 <b>0</b>이 되었는데 공포가 하나라도 살아 있거나, <b>영웅이 전멸</b>하면 진다.`},

        {name:{en:"Setup",ko:"준비"}, desc:`<b>지도</b> — A~N 전체를 원하는 방향으로 모두 깐다.<br>
          <b>첫 공포</b> — 달 주사위를 굴려 균열을 뚫고 나온 첫 공포를 정한다(<b>~3 Calamity · 4~6 Tragedy · 7~9 Cataclysm · 10~12 Disaster</b>).
          그 공포의 덱을 <b>밤 바 1번 슬롯</b>에 <b>뒷면으로</b> 놓고, 판을 꺼내 <b>레벨 5</b>로 기록한 뒤 토큰을 지정된 자리에 놓는다.<br>
          <b>상황 카드</b> — 낮·밤 덱을 섞고 각 <b>2~4번 슬롯</b>에 3장씩 공개한다. <b>낮 1번은 비워 둔다</b>. Interrupt가 나오면 덱에 다시 섞고 다시 뽑는다.<br>
          <b>룬 스톤</b> — 공개된 조사 위치마다 그 조사의 <b>룬 보상과 맞는</b> 룬 스톤을 놓는다.<br>
          <b>기타</b> — 던전 덱 4종을 섞어 던전 타일 옆에 둔다. 각 플레이어에게 코어 주사위 3색과 <b>치명상·광기 트래커</b>를 준다.
          콜렉터 주사위는 녹티스 단계에 굴리고, 단서 큐브는 조사 결과가 나올 때 놓는다.<br>
          <b>시작 위치</b> — 낮·밤을 고른 뒤 <b>마을 · 수도원 · 지하묘지</b> 중에서 고른다(콜렉터 주사위로 무작위 결정도 가능 — 1 마을 · 2 수도원 · 3 지하묘지).
          <b>마을</b>은 굴림으로 정한 마을에서 그 마을의 시작 장비를 받는다.
          <b>수도원·지하묘지</b>는 달 주사위로 번호를 정하고(<b>~3</b> 1번 · <b>4~6</b> 2번 · <b>7~9</b> 3번 · <b>10~12</b> 4번) 아래를 얻는다 —
          <b>수도원</b>: 각자 골드 5 · 음식 소모량×4 · 그룹 기어 업그레이드 3개 · 그 수도원의 <b>Grace</b> ·
          <b>지하묘지</b>: 각자 골드 15 · 음식 소모량×2 · 그룹 기어 업그레이드 3개 · 그 지하묘지 <b>해금 + 피의 마법 1티어</b>.`},

        {name:{en:"Noctis Acts",ko:"녹티스의 행동"}, desc:`녹티스는 매 턴 <b>균열을 닫으려</b> 애쓴다. 그 행동이 영웅들에게 영향을 주기도 한다.<br>
          시작 시 <b>콜렉터 주사위 7개</b>를 갖고, 피의 웅덩이가 <b>90부터 20 줄어들 때마다 1개씩</b> 잃는다(90에 6개, 70에 5개, 50에 4개 …).<br>
          이 단계에 주사위를 모두 굴려 <b>합계</b>로 Ascended 판의 행동을 처리한다.<br>
          <b>Dark Grace</b> — 주사위 중 <b>4개 이상이 같은 값</b>이면(남은 주사위가 4개 미만이면 전부 일치) 그룹이 다크 그레이스를 얻는다.
          어떤 것을 얻는지는 <b>일치한 눈(1·2·3)</b>으로 정해지고, <b>랭크는 일치한 개수</b>와 같다. <b>한 번에 하나만</b> 가질 수 있으나 새로 얻으면 교체할 수 있다.<br>
          <b>콜렉터 주사위</b>는 이 모드에서 <b>지도에 놓지 않는다</b>. 콜렉터를 놓으라는 효과는 무시한다.<br>
          <b>마을의 콜렉터</b> — 마을에는 여전히 콜렉터가 있는 것으로 친다. 밤에 마주치면 콜렉터 주사위로 수를 정하고 종류를 굴린다.
          마을에서 콜렉터를 쓰러뜨릴 때마다 <b>싸운 콜렉터 수만큼 피의 웅덩이를 줄인다</b>. (콜렉터 <b>3마리</b>마다 게임 난이도 +1은 그대로.)`},

        {name:{en:"The Horrors",ko:"공포"}, desc:`첫 공포는 게임 시작 전에 나오고, 나머지 셋은 피의 웅덩이가 <b>80 · 60 · 40</b>이 될 때 나온다. 나올 때마다 달 주사위로 어느 공포인지 정한다(이미 나왔거나 쓰러진 공포가 나오면 다시 굴린다).<br>
          <b>레벨은 등장 순서로</b> 정해진다 — 첫 <b>5</b> · 둘째 <b>7</b> · 셋째 <b>9</b> · 넷째 <b>11</b>.
          공포를 쓰러뜨렸는데 지도에 다른 공포가 없으면, 피의 웅덩이를 <b>다음 단계로 낮추고</b> 다음 공포가 등장한다.<br>
          피의 웅덩이가 <b>0</b>이 되는 순간 다섯째 공포 <b>World Render</b>가 넘어오고, 그 시점에 <b>패배</b>한다.<br>
          <b>레벨</b> — 진행 중에 오르내린다. 전투 시 생명력과 행동이 레벨의 영향을 받으며, 판에 레벨 기호가 있으면 그 값이 <b>현재 레벨</b>이다.
          <b>7·9·11</b>처럼 숫자가 적힌 것은 그 레벨 <b>이상</b>일 때 얻는 추가 효과이며, 여러 개가 동시에 적용될 수 있다.
          전투 전에 <b>보라 룬</b>을 버려 <b>1개당 레벨 1</b>을 낮출 수 있다(최소 1).<br>
          <b>목표와 이동</b> — 공포는 통행 불가 지형을 <b>무시</b>하고, 서로 같은 칸에 겹칠 수 있으며, 지도의 틈을 <b>이동 1헥스 비용</b>으로 순간이동해 건넌다.
          파괴된 목표는 더 이상 이벤트 장소가 아니다.
          <b>Calamity</b>: 지하묘지 · 5레벨 3헥스 / 9레벨 5헥스 · 파괴하면 Encounter 버린 더미 맨 위 카드를 얻는다 ·
          <b>Tragedy</b>: 마을 · 2헥스 / 9레벨 4헥스 · 파괴하면 Encounter 덱에서 1장을 형태로 얻는다 ·
          <b>Disaster</b>: 수도원 · 2헥스 / 9레벨 4헥스 · 파괴하면 <b>레벨 +1</b> ·
          <b>Cataclysm</b>: 보스 위치 · 5레벨 3헥스 / 9레벨 2헥스 / 11레벨 1헥스 · <b>2곳 파괴마다 레벨 +1</b>.<br>
          <b>빌런 행동</b> — 웅덩이를 줄인 뒤 달 주사위를 굴려 공포 판의 표를 본다. <b>2·7 Tragedy · 3·8 Cataclysm · 4·9 Calamity · 5·10 Disaster</b>는 그 공포가 있을 때만,
          <b>6</b>은 공포가 있으면 <b>한 번만</b> 공통으로, <b>11~12</b>는 <b>등장 순서대로 모든 공포</b>가 행동한다.`},

        {name:{en:"Facing Horrors",ko:"공포와의 전투"}, desc:`공포와 맞설 때는 그 공포 판의 <b>반대면(보스 면)</b>을 쓴다. 같은 칸에 여럿이 있으면 <b>동시에</b> 상대할 수도 있다.<br>
          전투 전에 <b>보라 룬</b>을 바쳐 레벨을 낮추거나 <b>보스 강화</b>를 버릴 수 있다. 그 뒤 생명력과 패시브를 적고 전투를 시작한다.<br>
          <b>Titanic 거대</b> — 거대 적은 <b>체력과 에너지 생명력을 여러 개</b> 갖는다(그래도 적 하나로 친다). 쓰러뜨리려면 <b>모든 체력</b>을 0으로 만들어야 한다.
          체력 생명력이 하나뿐인 적이 이 유형을 얻으면 원래 체력과 같은 값의 체력이 <b>하나 더</b> 생긴다.
          각 영웅은 Resolution 단계에 <b>어느 생명력을 때릴지</b> 고른다. 체력을 참조하는 효과는 <b>가장 높은 현재 체력</b>을 쓴다.
          숙적 피해는 라운드마다 <b>하나의 생명력에만</b> 들어간다.<br>
          <b>격파 시</b> — 보스 판의 보상을 얻고(마지막 공포는 제외), <b>Horrific Choice</b> 중 하나를 고른다 —
          ① 각 영웅이 <b>광기를 최대 3개</b> 제거 · ② 그 공포 덱에서 <b>레벨의 절반(내림)</b>만큼 카드를 뽑아 원하는 것을 즉시 사용(이걸 고르면 ①은 못 고른다).
          그 뒤 토큰과 판을 치우고, 공포 덱도 빼서 <b>상황 슬롯을 원래대로</b> 되돌린다.`},

        {name:{en:"Madness",ko:"광기"}, desc:`여러 효과가 영웅에게 <b>Madness광기</b>를 준다. 각 영웅은 <b>광기 트래커</b>를 0에서 시작한다.<br>
          광기는 <b>최대 6</b>까지만 쌓인다. 6을 넘게 되면 큐브를 더 얻는 대신 <b>무작위 스탯 랭크 1을 잃는다</b> —
          코어 주사위를 굴려 <b>1 본인 선택 · 2 체력 · 3 에너지 · 4 공격 · 5 방어 · 6 마스터리1 · 7 마스터리2 · 8 길찾기 · 9 탐험 · 10 생존</b>.<br>
          랭크는 <b>0까지</b> 내려갈 수 있고, 0이 되면 그 스탯을 <b>쓸 수 없다</b>.<br>
          영웅이 <b>죽으면 광기를 모두 잃는다</b>.`},

        {name:{en:"Purple Runes & Breach Dungeon",ko:"보라 룬 · 균열 던전"}, desc:`<b>보라 룬 스톤</b> — 룬 스톤을 놓을 때 <b>같은 숫자가 2개 이상</b> 나오면, 따로 놓는 대신 합쳐서 <b>보라 룬 스톤 1개</b>가 된다.
          보라 룬이 있는 헥스로 이동하면 <b>보라 던전 카드</b>를 뽑아 처리한다 — 위험하고 희귀하며 여러 유형이 섞여 있다.
          일반 던전 카드는 룬 하나를 만들려면 <b>같은 것 2장</b>이 필요하지만, <b>보라 던전 카드는 1장이 곧 보라 룬 1개</b>다. 이 규칙은 일반 게임에서도 쓸 수 있다.<br>
          <b>파괴된 지하묘지</b> — 던전에서 <b>나오는 출구</b>로는 쓸 수 있지만 <b>들어갈 수는</b> 없다. 수도원 아이템 해금에서는 <b>해금된 지하묘지</b>로 친다.<br>
          <b>균열 타일</b> — 던전 안에만 놓을 수 있는 특수 타일. 놓는 방법은 둘 —
          ① 보라 던전 카드 <b>“The Breach”</b>를 사용 · ② 피의 웅덩이가 <b>70 이하</b>가 되면, 녹티스 성(또는 던전의 그의 보스 위치)에서 이동 단계에 <b>균열 입구로 순간이동</b>.<br>
          <b>균열 안에서의 이동</b> — 룬 스톤은 <b>놓지 않는다</b>. 이동 <b>1헥스마다 시간 5</b>가 든다(평소 1).
          <b>뒤로 · 제자리 휴식 · 앞으로</b>만 가능하며 벽은 통과할 수 없다. 순간이동은 <b>Hearth Stone</b>으로만 가능하다.
          균열 안에서는 <b>이동 단계와 빌런 단계만</b> 진행한다.<br>
          <b>뒤로 이동</b>: 출구 쪽으로 1헥스 갈 때마다 각 영웅이 <b>자기 광기만큼</b> 체력·에너지를 회복한다. 시간을 다 쓰면 빌런 단계를 진행한다.<br>
          <b>제자리 휴식</b>: 각 영웅이 <b>광기의 절반</b>만큼 회복한 뒤 빌런 단계를 진행한다.`},

        {name:{en:"Rifts & Event Horizon",ko:"균열의 틈 · 사건의 지평선"}, desc:`<b>Rift 틈</b> — 균열 안에 <b>4개</b> 있다. 멈추지 않고 지나가도 된다.
          틈에서 이동을 끝내면(Encounter를 뽑아 균열 더미에 넣은 뒤) 각 영웅이 <b>코어 주사위</b>를 굴려 <b>자기 광기 이하</b>면 성공, 초과하면 실패하고 <b>광기 3</b>을 얻는다.
          <b>절반 이상</b> 성공하면 원하는 공포 하나의 <b>레벨을 3</b> 낮추고 그 틈 토큰을 치운다. 실패하면 다음 게임 턴에 다시 시도할 수 있다.<br>
          <b>Spawn 지점</b> — 초월자 유형이 나오는 곳으로, 여기서는 <b>Encounter</b>를 상대한다.<br>
          <b>균열 안에 있을 때 새 공포 등장</b> — 모든 영웅이 <b>현재 공포 수만큼</b> 광기를 얻고, 그 뒤 그 공포가 지도에 등장해 상황 슬롯 하나를 차지한다.<br>
          <b>균열 안에서의 죽음</b> — 위대한 양상을 얻을 수 없다. 대신 <b>킵세이크가 자동으로 발동</b>한다(있다면).<br>
          <b>Event Horizon 사건의 지평선</b> — 균열의 마지막 헥스. 여기서 이동을 끝내면 <b>공포들과의 전투</b>가 시작된다 —
          <b>레벨이 가장 낮은</b> 공포부터 <b>하나씩</b> 상대하며, 시작하면 <b>도주할 수 없다</b>.
          매 Declaration 단계마다(첫 라운드 포함) 모든 영웅이 <b>광기 1</b>을 얻고, 상대 중인 공포는 <b>레벨 3</b>을 잃는다.
          Resolution 단계에 공포의 레벨이 <b>3 이하</b>가 되거나 죽으면 격파되고 다음 공포가 들어온다. 전투 사이에는 <b>보상을 얻지 않는다</b>.
          아직 등장하지 않은 공포가 있으면, 마지막 공포가 쓰러진 순간 <b>다음 공포가 등장</b>하며 피의 웅덩이를 해당 단계로 낮춘다.<br>
          <b>계열 보너스</b> — 사건의 지평선에서는 <b>어시스트·스트라이커</b>가 광기만큼 <kw>block</kw>을,
          <b>힐러·새퍼</b>가 광기만큼 체력 또는 에너지 <kw>regen</kw>을(택1) 얻는다.
          <b>유틸리티</b>는 둘 중 하나를 고른다. 계열이 둘 이상이면 <b>중첩</b>된다.`},

        {name:{en:"Valor (Expansion)",ko:"용맹 (확장)"}, desc:`확장에서 추가로 얻을 수 있는 용맹 —
          <b>사건의 지평선에서 균열을 닫아 승리</b> · <b>한 게임에서 네 공포를 모두 격파</b> ·
          <b>한 게임에서 전설 카드 6장 이상 획득</b> · <b>영웅 하나의 킵세이크가 발동한 채로 승리</b>.`},
      ]};

/* ── 균열 모드 전용 룰 — 기본판과 달라지는 곳은 굵게 + '변경' 표시 ── */
const B_TAG = `<span class="rule-tag" style="border-color:var(--g-attack);color:var(--g-attack)">변경</span>`;

const B_DIFF = {title:{en:"What Changes", ko:"기본판과 달라지는 것"}, body:`
  <div class="rule-grid">
    <div class="rule-k">피의 웅덩이</div><div class="rule-v"><b>100에서 줄어든다</b> (기본판은 0에서 증가)</div>
    <div class="rule-k">녹티스</div><div class="rule-v"><b>싸울 수 없는 아군</b>. 매 턴 <b>맨 먼저</b> 행동한다 · <b>Ascended 판</b>을 쓴다</div>
    <div class="rule-k">지도</div><div class="rule-v">시작부터 <b>A~N 전부 공개</b> (던전은 그대로)</div>
    <div class="rule-k">차례</div><div class="rule-v"><b>6단계</b> — 맨 앞에 <b>녹티스 행동</b>이 붙는다</div>
    <div class="rule-k">승리</div><div class="rule-v"><b>네 공포 격파</b> 또는 <b>균열 닫기</b></div>
    <div class="rule-k">패배</div><div class="rule-v">영웅 전멸 <b>또는 웅덩이 0</b>(공포가 살아 있을 때)</div>
    <div class="rule-k">새 시스템</div><div class="rule-v"><b>광기 · 공포 4종 · Dark Grace · 보라 룬 · 균열 던전 · Nightmare Level</b></div>
    <div class="rule-k">무시하는 규칙</div><div class="rule-v">수도원 룬 헌납 · 지하묘지 룬 활성화의 <b>웅덩이 감소</b> · <b>콜렉터 주사위 배치</b> · <b>빌런 행동 보정</b></div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">공포 · 광기 · 균열 던전의 세부는 <b>균열</b> 탭에 있다.</div>`};

const B_SETUP = {title:{en:"Game Setup (Breach)", ko:"게임 준비"}, body:`
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>지도</b> ${B_TAG} — <b>A~N 전체</b>를 원하는 방향으로 모두 깐다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>첫 공포</b> ${B_TAG} — 달 주사위로 정한다(<b>~3 Calamity · 4~6 Tragedy · 7~9 Cataclysm · 10~12 Disaster</b>).
      그 덱을 <b>밤 1번 슬롯</b>에 뒷면으로 놓고, 판을 꺼내 <b>레벨 5</b>로 적은 뒤 토큰을 배치한다</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><b>상황 카드</b> ${B_TAG} — 낮·밤 각 <b>2~4번 슬롯</b>에만 3장씩 공개한다. <b>낮 1번은 비운다</b>.
      Interrupt는 다시 섞어 뽑는다. 공개된 조사에 룬 스톤을 놓는다</span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><b>시작 위치</b> ${B_TAG} — <b>마을 · 수도원 · 지하묘지</b> 중에서 고른다(콜렉터 주사위로 무작위도 가능).
      수도원: 골드 5 · 음식 소모량×4 · 기어 3 · <b>Grace</b> / 지하묘지: 골드 15 · 음식 소모량×2 · 기어 3 · <b>해금 + 피의 마법 1티어</b></span></div>
    <div class="rule-step"><span class="n">5</span><span class="t"><b>기타</b> — 던전 덱 4종을 섞고, 각자 <b>치명상 · 광기 트래커</b>를 받는다 ${B_TAG}</span></div>
  </div>`};

const B_TURN = {title:{en:"Turn Sequence (Breach)", ko:"차례 진행"}, body:`
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>녹티스 행동</b> ${B_TAG} — 콜렉터 주사위를 모두 굴려 <b>합계</b>로 Ascended 판의 행동을 처리한다.
      <b>4개 이상 일치</b>하면 <b>Dark Grace</b>를 얻는다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>이동</b> — 낮·밤을 정하고 방식(야영·신중·보통·무모)을 골라 그룹이 함께 움직인다.
      <b>빌런 행동 보정 주사위는 쓰지 않으며, 누적된 보정도 무시한다</b> ${B_TAG}</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><b>기술 굴림</b> — 영웅마다 길찾기·탐험·생존을 굴린다.
      <b>탐험에서 치명적 성공</b>하면 기존 보너스 대신 <b>아무 영웅의 광기 1개를 제거</b>할 수 있다 ${B_TAG}</span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><b>상황 굴림</b> — 6면체를 굴려 낮·밤 바의 해당 슬롯을 처리한다(<b>5 또는 헥스</b>면 조우 덱).
      보스·지하묘지·수도원·마을에서 이동을 끝냈다면 건너뛴다.
      결과가 <b>공포 슬롯</b>이면 그 공포 덱에서 뽑는다 ${B_TAG}</span></div>
    <div class="rule-step"><span class="n">5</span><span class="t"><b>이벤트</b> — 마을·수도원·지하묘지·조사·보스에서 해당 사건을 처리한다.
      <b>녹티스 성은 이벤트 장소가 아니며</b>, 수도원 룬 헌납·지하묘지 룬 활성화는 <b>웅덩이를 줄이지 않는다</b> ${B_TAG}</span></div>
    <div class="rule-step"><span class="n">6</span><span class="t"><b>빌런: 공포</b> ${B_TAG} — 웅덩이를 <b>공포 수만큼(최소 1)</b> 줄이고 발동을 확인한다.
      <b>달 주사위 1회</b>로 공포들의 효과를 처리한 뒤, 각 공포가 목표를 향해 이동한다</span></div>
  </div>`};

const B_CIRC = {title:{en:"Circumstance (Breach)", ko:"상황 카드"}, body:`
  <div class="rule-h">공포 덱 ${B_TAG}</div>
  <div class="rule-grid">
    <div class="rule-k">구성</div><div class="rule-v">조사 · 고통 · 사건 · 발견 · 보물이 섞여 있으며 <b>전부 회피 불가</b>다</div>
    <div class="rule-k">슬롯 잠식</div><div class="rule-v">공포가 나올 때마다 <b>다음 슬롯</b>을 차지한다(그 자리의 카드는 버린다). 격파하면 <b>원래대로</b> 돌아온다</div>
    <div class="rule-k">덱이 떨어지면</div><div class="rule-v">그 슬롯이 나올 때마다 <b>모든 영웅이 광기 +1</b> — 그 공포를 잡을 때까지</div>
    <div class="rule-k">Boss Enhance</div><div class="rule-v">뽑히면 그 공포가 <b>강해진다</b>. <b>보라 룬</b>을 바쳐 버릴 수 있다(뽑았을 때 또는 전투 전)</div>
    <div class="rule-k">단서</div><div class="rule-v">공포 덱 슬롯에도 <b>놓고 뺄 수 있다</b>(한 슬롯 최대 3개)</div>
  </div>
  <div class="rule-h">공포 덱의 조사 ${B_TAG}</div>
  <div class="rule-grid">
    <div class="rule-k">처리</div><div class="rule-v">지도 장소에 <b>묶이지 않는다</b>. 뽑은 <b>그 자리에서 즉시</b>(인터럽트처럼) 처리한다</div>
    <div class="rule-k">재시도</div><div class="rule-v">실패하면 그 자리에서 <b>야영</b>하며 다음 턴에 다시 시도할 수 있다. <b>자리를 뜨면 폐기</b>된다</div>
    <div class="rule-k">완료 후</div><div class="rule-v">낮·밤 양쪽 바에서 그 슬롯의 <b>단서를 모두 제거</b>한다</div>
    <div class="rule-k">룬 보상</div><div class="rule-v"><b>보라 룬</b>을 준다</div>
    <div class="rule-k">Nightmare Level</div><div class="rule-v">기본판 <b>Suspicion Level</b>에 대응. 이 값 <b>이상</b>을 굴리면 카드의 <b>Trap</b>이 발동한다</div>
    <div class="rule-k">새 Trap</div><div class="rule-v">발동한 영웅마다 <b>광기 +1</b> · 발동한 영웅마다 <b>웅덩이 감소</b></div>
    <div class="rule-k">주의</div><div class="rule-v">낮·밤 덱의 조사는 <b>웅덩이를 올린다</b> — 녹티스의 잔재가 남아 있기 때문</div>
  </div>`};

/* 게임 난이도 — 캐릭터판 최상단에서 고른다.
   게임 중 상승 조건: 마을에서 Collector 3마리 격파 시 +1, 파워업 덱이 떨어지면 +1 */
const DIFFICULTY = [
  {id:"starter", en:"Starter", ko:"스타터", c:"#8fb6a8",
   passive:"적은 <kw>block</kw>·<kw>defend</kw>·<kw>evasion</kw>을 얻지 못한다",
   vitals:"레벨만큼 감소", outlast:"-2 (최소 1)", damage:"-1 (최소 1)", penalty:"변화 없음", gear:"변화 없음"},
  {id:"easy", en:"Easy", ko:"쉬움", c:"#5bbf5b",
   passive:"변화 없음", vitals:"변화 없음", outlast:"변화 없음", damage:"변화 없음", penalty:"변화 없음", gear:"변화 없음"},
  {id:"moderate", en:"Moderate", ko:"보통", c:"#d8c341",
   passive:"변화 없음", vitals:"영웅당 +5", outlast:"+1", damage:"+1", penalty:"변화 없음", gear:"기어 업그레이드 <b>2 이하</b>"},
  {id:"difficult", en:"Difficult", ko:"어려움", c:"#e8912f",
   passive:"보스가 <b>Difficult</b> 패시브를 얻는다",
   vitals:"영웅당 +10", outlast:"+2", damage:"+2", penalty:"+1", gear:"기어 업그레이드 <b>5 이하</b>"},
  {id:"heroic", en:"Heroic", ko:"영웅적", c:"#e8622f",
   passive:"변화 없음", vitals:"영웅당 +25", outlast:"+4", damage:"+4", penalty:"+2", gear:"기어 업그레이드 <b>9 이하</b>"},
  {id:"epic", en:"Epic", ko:"에픽", c:"#e03a3a",
   passive:"변화 없음", vitals:"영웅당 +50", outlast:"+6", damage:"+6", penalty:"+3", gear:"기어 업그레이드 <b>제한 없음</b>"},
];

const SERIES = {
  "4": {
    id:"4", name:{en:"Hexplore It — Edition 4", ko:"헥스플로어 잇 — 4편"}, short:"4", ord:1,

    keywords: KW_COMMON,
    conditions: CONDITIONS,
    rules: [
      {title:{en:"Game Setup", ko:"게임 준비"}, body:`
        <div class="rule-steps">
          <div class="rule-step"><span class="n">1</span><span class="t"><b>판 깔기</b> — 시작 타일 <b>A~D</b> 배치. 헥스 타일과 던전 타일은 <b>뒷면으로 섞어</b> 둔다. 토큰과 카드 덱을 섞어 자리에 놓는다.</span></div>
          <div class="rule-step"><span class="n">2</span><span class="t"><b>상황 카드 공개</b> — 낮·밤 각 <b>4장</b>. <b>Interrupt</b>가 나오면 덱에 다시 섞고 새로 뽑는다.
            공개된 <b>Investigation</b> 장소에 <b>룬 스톤</b>을 놓는다.</span></div>
          <div class="rule-step"><span class="n">3</span><span class="t"><b>시작 마을</b> — 낮·밤을 정하고 마을을 굴린다(<b>밤이면 +1</b>). 그 마을의 <b>시작 장비</b>를 받는다.</span></div>
          <div class="rule-step"><span class="n">4</span><span class="t"><b>장비 배분</b> — 그룹이 <b>기어 업그레이드 6개</b>를 나눈다. 마을에서 골드를 쓴 뒤 시작.</span></div>
        </div>
        <div class="rule-en">Place tiles A–D (hex &amp; dungeon tiles face-down), shuffle decks, reveal 4 Day and 4 Night cards
        (reshuffle Interrupts), place Rune Stones on revealed Investigations, roll the starting village (+1 at Night),
        take starting gear, split 6 Gear Upgrades, spend gold, begin.</div>`},

      {title:{en:"Turn Sequence", ko:"차례 진행"}, body:`
        <div class="rule-steps">
          <div class="rule-step"><span class="n">1</span><span class="t"><b>이동</b> — 낮·밤을 정하고 그룹이 함께 움직인다. 지도 경계에 닿으면 <b>맵 타일을 놓고</b> 이동을 이어간다.</span></div>
          <div class="rule-step"><span class="n">2</span><span class="t"><b>기술 굴림</b> — 영웅마다 각자 굴린다.</span></div>
          <div class="rule-step"><span class="n">3</span><span class="t"><b>상황 굴림</b> — <b>6면체</b>를 굴려 낮·밤에 맞는 카드를 적용한다. <b>5 또는 헥스</b>면 조우 덱을 공개한다.<br>
            <span class="rule-tag">건너뜀</span> 보스 · 지하묘지 · 수도원 · 마을에서 이동을 끝냈다면 이 단계를 건너뛴다.</span></div>
          <div class="rule-step"><span class="n">4</span><span class="t"><b>이벤트</b> — 마을 · 수도원 · 지하묘지 · 조사 · 보스에서 해당 사건을 처리한다.</span></div>
          <div class="rule-step"><span class="n">5</span><span class="t"><b>빌런</b> — 미르자 녹티스.</span></div>
        </div>
        <div class="rule-en">Move &rarr; roll Skills &rarr; roll a Circumstance (d6; 5 or Hex draws an Encounter; skipped at Boss/Crypt/
        Monastery/Village) &rarr; Event phase &rarr; Villain phase. Investigations receive a Clue (max 3); resolved cards are
        discarded and refilled.</div>`},

      {title:{en:"Movement", ko:"이동"}, body:`
        <div class="rule-grid">
          <div class="rule-k">기본 이동력</div><div class="rule-v"><b>턴당 4헥스</b> (더 적게 움직여도 된다)</div>
          <div class="rule-k">방식</div><div class="rule-v"><b>야영 · 신중 · 보통 · 무모</b> — 이 선택이 <b>빌런 단계</b>에까지 영향을 준다</div>
          <div class="rule-k">지도 확장</div><div class="rule-v">가장자리에 닿으면 새 맵 타일을 놓는다. <b>타일을 놓아도 이동이 끝나지 않는다</b></div>
        </div>
        <div class="rule-h">네 가지 방식</div>
        <div class="rule-grid">
          <div class="rule-k">Camp 야영</div><div class="rule-v">그 자리에 머문다. 스탯 테스트 <b>-1 보너스</b>(중첩) · 녹티스가 가장 감시하기 쉬워 빌런 행동에 <b>가장 불리</b></div>
          <div class="rule-k">Cautious 신중</div><div class="rule-v">아래 조건 중 하나. 안전하지만 느리다 — <kw>wander</kw> 없음 + 상황 카드 <b>버리기</b> 가능</div>
          <div class="rule-k">Normal 보통</div><div class="rule-v">이동력(<b>4헥스</b>) 범위에서 자유롭게 이동한다. 기본 방식</div>
          <div class="rule-k">Reckless 무모</div><div class="rule-v">가장 빠르게 내달린다. 첩자가 쫓기 어려워 빌런 행동에 <b>가장 유리</b>하지만, 그만큼 위험을 안고 간다</div>
        </div>
        <div class="rule-v" style="color:var(--ink-faint);font-size:12px">방식별 이동 거리·빌런 보정 수치는 Game Turn 참조판에 있다 — 추후 입력</div>
        <div class="rule-h">Camping 야영</div>
        <div class="rule-v">그 게임 턴의 스탯 테스트에 <b>-1 보너스</b>. <b>중첩</b>되지만(오래 야영할수록), 다른 효과로 위치가 옮겨지면 사라진다.</div>
        <div class="rule-h">Moving Cautiously 신중한 이동</div>
        <div class="rule-grid">
          <div class="rule-k">조건 (택1)</div><div class="rule-v">움직이지 않음 · 이동력 전부를 <b>강·도로만 따라</b> 씀 · 그 턴에 <b>1헥스만</b> 이동<br>
            <span style="color:var(--ink-faint)">지나는 헥스마다 도로나 강이 있어야 '따라 이동'으로 친다</span></div>
          <div class="rule-k">보상</div><div class="rule-v"><kw>wander</kw> 위험이 <b>없다</b> · 상황 단계에 나온 <b>카드를 버릴 수</b> 있다</div>
        </div>
        <div class="rule-h">Uncrossable 통행 불가</div>
        <div class="rule-v"><b>산맥</b>과 <b>물</b> 헥스는 들어갈 수 없다(나오는 것은 가능). <b>Scaling Kit</b> · <b>Canoe</b>를 얻으면 가능해진다.</div>
        <div class="rule-h">Villain Action 보정</div>
        <div class="rule-v">빠르게 움직일수록 녹티스의 첩자가 보고하기 어려워져 빌런 행동 굴림에 보정이 붙는다.
          <span style="color:var(--ink-faint)">(방식별 수치는 Game Turn 참조판 — 추후 입력)</span></div>`},

      {title:{en:"Skill Phase & Stat Tests", ko:"기술 페이즈 · 스탯 테스트"}, body:`
        <div class="rule-v">기술 페이즈에는 모든 영웅이 <b>동시에</b> 코어 주사위를 굴린다. 결과가 해당 <b>기술 랭크 이하</b>면 성공.</div>
        <div class="rule-h">치명적 성공 · 실패</div>
        <div class="rule-grid">
          <div class="rule-k">치명적 성공</div><div class="rule-v"><b>헥스</b> = 결과 <b>1</b>, <b>항상 성공</b></div>
          <div class="rule-k">범위 확대</div><div class="rule-v"><b>12랭크부터</b> 1랭크마다 <b>1씩</b> 넓어진다 (12: 헥스~2 · 13: 헥스~3 …)</div>
          <div class="rule-k">치명적 실패</div><div class="rule-v"><b>10</b> = <b>항상 실패</b></div>
          <div class="rule-k">보정 적용 후</div><div class="rule-v"><b>1 이하</b>가 되면 치명적 성공 · <b>10 이상</b>이 되면 치명적 실패 (랭크가 더 높아도 마찬가지)</div>
          <div class="rule-k">범위 변경</div><div class="rule-v"><state>disoriented</state> 같은 효과는 이 범위 자체를 바꾼다</div>
        </div>
        <div class="rule-h">기술 페이즈의 치명적 성공</div>
        <div class="rule-v">평소 보상에 더해 <b>추가 보상</b>(골드 · 단서 · 파워업 등)을 얻는다.
          <span style="color:var(--ink-faint)">(기술별 보상은 Game Play 참조판 — 추후 입력)</span></div>`},

      {title:{en:"Navigate · Explore · Survival", ko:"길찾기 · 탐험 · 생존"}, body:`
        <div class="rule-grid">
          <div class="rule-k"><span style="color:var(--g-navigate)">Navigate 길찾기</span></div>
          <div class="rule-v">영웅의 <b>절반</b>(올림)이 성공해야 <kw>wander</kw>를 피한다.
            한 명이라도 <b>치명적 성공</b>하면 그 턴 그룹 전체가 면한다. <b>신중한 이동</b>을 했다면 애초에 위험이 없다.</div>
          <div class="rule-k"><span style="color:var(--g-explore)">Explore 탐험</span></div>
          <div class="rule-v">성공하면 <b>골드 2</b>어치 보물. 실패하면 아무것도 없다.</div>
          <div class="rule-k"><span style="color:var(--g-survival)">Survival 생존</span></div>
          <div class="rule-v">성공하면 그 턴에 <b>음식을 먹지 않아도</b> 된다.
            실패하면 <b>음식 소모량</b>만큼 먹거나 <b>Food 하위 유형</b> 아이템 하나를 소비한다.
            소모량이 <b>0</b>이면 굴리지 않아도 된다.</div>
        </div>`},

      {title:{en:"Wander & Roam", ko:"헤매다 · 배회"}, body:`
        <div class="rule-h">Wander 헤매다</div>
        <div class="rule-grid">
          <div class="rule-k">굴림</div><div class="rule-v"><b>헥스 주사위</b> 1회 — <b>Wander Compass 배회 나침반</b>이 가리키는 방향으로 <b>1헥스</b> 더 이동</div>
          <div class="rule-k">사건 장소</div><div class="rule-v">들어가면 그 사건을 <b>평소대로</b> 처리한다. 새 맵 타일이 필요하면 놓는다</div>
          <div class="rule-k">막히면</div><div class="rule-v">지도의 <b>단단한 경계</b>나 장비 없이 못 가는 <b>통행 불가</b> 지형이면 <b>제자리에 머문다</b></div>
        </div>
        <div class="rule-h">Roam 배회</div>
        <div class="rule-grid">
          <div class="rule-k">굴림</div><div class="rule-v"><b>헥스 주사위 2회</b> — 첫 번째가 <b>방향</b>, 두 번째가 <b>헥스 수</b></div>
          <div class="rule-k">성격</div><div class="rule-v">그 턴의 이동을 <b>대체</b>하며, 따로 명시가 없으면 <b>보통 이동</b>으로 친다</div>
          <div class="rule-k">대상</div><div class="rule-v">그룹뿐 아니라 밴시 여왕 같은 다른 말도 배회한다</div>
        </div>`},

      {title:{en:"Starving", ko:"굶주림"}, body:`
        <div class="rule-v">생존에 실패했는데 그 턴에 먹을 음식이 <b>부족하면</b> 굶주린다.
          부족한 <b>첫 게임 턴</b>의 기술 페이즈 뒤에 첫 칸을 표시하고, 이후 부족한 턴마다 다음 칸으로 넘어간다.
          따로 명시가 없으면 <b>한 턴에 한 단계</b>만 오른다.</div>
        <div class="rule-h">단계</div>
        <div class="rule-grid">
          <div class="rule-k" style="color:var(--g-energy)">1단계</div><div class="rule-v"><st>energy</st>를 <b>쓸 수 없다</b></div>
          <div class="rule-k" style="color:var(--g-explore)">2단계</div><div class="rule-v"><st>energy</st> 사용 불가 + <st>survival</st>을 <b>굴릴 수 없다</b>(모두 치명적 실패)</div>
          <div class="rule-k" style="color:var(--g-attack)">3단계</div><div class="rule-v"><b>사망</b></div>
        </div>
        <div class="rule-h">벗어나기</div>
        <div class="rule-grid">
          <div class="rule-k">방법</div><div class="rule-v"><b>소모량만큼</b> 음식을 구해 즉시 먹거나 <b>Food 하위 유형</b> 아이템을 소비 &rarr; <b>한 단계</b> 감소</div>
          <div class="rule-k">제약</div><div class="rule-v">굶주린 영웅은 얻은 음식을 <b>반드시</b> 먹는다 · <b>한 턴에 한 단계</b>만 회복</div>
          <div class="rule-k">주의</div><div class="rule-v">굶주림은 <b>상태가 아니다</b> — 상태 제거 아이템·효과로는 없앨 수 없다</div>
        </div>
        <div class="rule-v" style="margin-top:8px">전투 밖에서는 <b>음식 · 골드 · 아이템</b>을 그룹원끼리 자유롭게 나눌 수 있다.</div>`},

      {title:{en:"Circumstance Cards", ko:"상황 카드"}, body:`
        <div class="rule-grid">
          <div class="rule-k">Interrupt</div><div class="rule-v">뽑는 <b>즉시</b> 해결한다. 카드를 들여다보는 효과로는 발동하지 않으며, 한 턴에 <b>여러 장</b>이 나올 수 있다</div>
          <div class="rule-k">Unavoidable</div><div class="rule-v">상황 단계에 나오면 <b>신중한 이동을 했더라도 피할 수 없다</b>.
            다만 <b>플레이 중이 아니라면</b> 아이템·효과로 버릴 수는 있다</div>
          <div class="rule-k">건너뛰는 경우</div><div class="rule-v">이동을 <b>보스 · 지하묘지 · 수도원 · 마을</b>에서 끝냈다면 상황 단계를 건너뛴다</div>
          <div class="rule-k">신중하게 버리기</div><div class="rule-v"><b>야영</b>했거나 <b>신중한 이동</b>을 했다면, 굴려 나온 카드를 <b>플레이하지 않고 버릴</b> 수 있다</div>
        </div>`},

      {title:{en:"Circumstance Types", ko:"상황 카드 종류"}, body:`
        <div class="rule-h">Investigations 조사</div>
        <div class="rule-v">결과가 나오면 해당 슬롯에 <b>단서</b>를 놓는다. 그룹은 <b>특정 장소로 이동</b>해 <b>이벤트 단계</b>에 해결해야 한다.
          다른 종류와 달리 <b>버려지지 않고</b>, 조사를 완료하거나 게임 효과로 버려질 때까지 상황 바에 남는다.</div>
        <div class="rule-h">Afflictions 고통</div>
        <div class="rule-v">그룹에 걸리는 <b>부정적</b> 상황으로 <b>여러 개</b>가 동시에 걸릴 수 있다.
          뽑은 턴부터 카드에 적힌 <b>턴 수</b>만큼 유지되며, <b>수도원</b> 방문으로도 제거된다. 일부는 카드를 <b>추가로 뽑게</b> 한다.</div>
        <div class="rule-h">Events · Discoveries · Treasure</div>
        <div class="rule-v">각 상황 덱에 다양하게 들어 있다. <b>발견</b>은 명시가 없으면 <b>같은 장소에 겹쳐</b> 놓을 수 있다.</div>
        <div class="rule-h">Nature 자연</div>
        <div class="rule-v">그룹에 영향을 주는 환경 상황. <b>한 번에 하나만</b> 유지되며, 새로 뽑은 카드가 기존 효과를 <b>대체</b>한다.</div>
        <div class="rule-h">Heroic 영웅</div>
        <div class="rule-grid">
          <div class="rule-k">짝</div><div class="rule-v">각 카드가 <b>미르자 녹티스의 직업 하나</b>와 짝지어져 있다. 시작 전에 원하는 카드를 덱에서 <b>빼둘 수</b> 있다</div>
          <div class="rule-k">뽑았을 때</div><div class="rule-v">그 직업이 게임에 있으면 슬롯에 놓고, 없으면 버리고 다시 뽑는다</div>
          <div class="rule-k">사용</div><div class="rule-v">굴림으로 나오면 <b>단서를 놓거나</b>(최대 3개) 카드에 적힌 <b>마스터리</b>로 <b>스탯 테스트</b>를 한다</div>
          <div class="rule-k">단서 효과</div><div class="rule-v">붙은 단서는 마스터리 굴림 결과를 <b>1씩 낮춘다</b></div>
          <div class="rule-k">결과</div><div class="rule-v">성공 &rarr; 효과를 얻고 카드를 <b>참고용으로 보관</b> · 실패 &rarr; <b>버린다</b></div>
        </div>`},

      {title:{en:"Events", ko:"이벤트 장소"}, body:`
        <div class="rule-v"><b>마을 · 수도원 · 지하묘지 · 보스 · 조사</b>에서 이동을 끝내면 그 장소의 카드나 판을 처리한다.
          찾아낸 <b>발견</b>이 이벤트를 부르기도 한다. 이런 장소가 아니면 그 턴에는 이벤트가 없다.
          따로 명시가 없으면 한 게임 턴에 처리하는 이벤트 <b>수에 제한이 없다</b>.</div>
        <div class="rule-grid">
          <div class="rule-k">Village 마을</div><div class="rule-v">소박한 물품을 판다. 여관에서 쉬어 <b>{defence} 랭크</b>만큼 생명력을 <kw>heal</kw>한다 ·
            모은 <b>룬을 판매</b>한다 · <b>밤</b>에 왔다면 <b>콜렉터</b>와 맞설 수 있다</div>
          <div class="rule-k">Monastery 수도원</div><div class="rule-v">아이템을 사고, <b>입장하는 순간 잃은 생명력을 전부</b> <kw>heal</kw>한다 ·
            룬을 <b>헌납</b>해 <b>Grace은총</b>을 얻는다 · 지하묘지를 해금할수록 <b>기어 업그레이드와 값진 물건</b>을 판다</div>
          <div class="rule-k">Crypt 지하묘지</div><div class="rule-v">시작 시 <b>잠겨</b> 있다. <b>Crypt Key</b>를 써서 연다 ·
            룬을 <b>활성화</b>해 <b>피의 마법</b>을 배운다 · 열고 나면 <b>던전</b>에 들어갈 수 있다</div>
          <div class="rule-k">Investigation 조사</div><div class="rule-v">이벤트 단계에 그 자리에 있으면 카드를 집어 처리한다</div>
          <div class="rule-k">Boss Lair 보스 소굴</div><div class="rule-v">이동을 끝내면 <b>전투가 시작</b>된다. <b>지나가기만</b> 하는 것은 전투를 부르지 않는다.
            쓰러뜨린 자리에는 <b>헥스 토큰</b>을 놓아 평범한 헥스로 만든다</div>
        </div>`},

      {title:{en:"Random Boss", ko:"무작위 보스"}, body:`
        <div class="rule-v">지도의 보스 소굴은 두 종류다 — <b>번호가 붙은 것</b>과 <b>달 주사위 아이콘이 있는 무작위 소굴</b>.</div>
        <div class="rule-h">무작위 소굴에서 상대를 정하는 법</div>
        <div class="rule-steps">
          <div class="rule-step"><span class="n">1</span><span class="t"><b>만나고 싶은 보스</b>를 고르고 그 판을 꺼낸다</span></div>
          <div class="rule-step"><span class="n">2</span><span class="t">그 판에 <b>무작위 보스표</b>가 있으면 <b>달 주사위</b>를 굴린다</span></div>
          <div class="rule-step"><span class="n">3</span><span class="t">결과에 <b>달 주사위 아이콘이 없으면</b> 그 보스와 싸운다.
            <b>아이콘이 있으면</b> 표가 가리키는 <b>다른 보스의 판</b>으로 옮겨 가 거기서 다시 굴린다</span></div>
        </div>
        <div class="rule-v" style="color:var(--ink-faint);font-size:12px">즉 원하는 상대를 <b>노릴 수는 있어도 보장되지 않는다</b> — 굴림이 이어지며 전혀 다른 보스와 만날 수 있다.</div>
        <div class="rule-h">번호가 붙은 소굴</div>
        <div class="rule-v">그 자리에서만 싸울 수 있는 보스다. <b>같은 번호와 같은 지도 아이콘</b>을 가진 판을 찾아 상대한다.</div>`},

      {title:{en:"Villain Phase", ko:"빌런 단계 · 미르자 녹티스"}, body:`
        <div class="rule-steps">
          <div class="rule-step"><span class="n">1</span><span class="t"><b>피 수확</b> — 마을에 있는 <b>콜렉터 수만큼</b> 피의 웅덩이가 오른다(각 주사위 눈을 합산)</span></div>
          <div class="rule-step"><span class="n">2</span><span class="t"><b>빌런 행동</b> — 그 턴의 <b>보정</b>을 확인한 뒤 <b>달 주사위</b>를 굴려 빌런 행동표의 효과를 처리한다</span></div>
          <div class="rule-step"><span class="n">3</span><span class="t"><b>배회</b> — 이 단계 끝에 배회하는 보스와 토큰이 <kw>roam</kw>한다(따로 명시가 없다면)</span></div>
        </div>
        <div class="rule-h">Blood Pool 피의 웅덩이</div>
        <div class="rule-grid">
          <div class="rule-k">강해짐</div><div class="rule-v">피 <b>20마다</b> <kw>aegis</kw> <b>2</b>를 얻는다</div>
          <div class="rule-k">유형 변화</div><div class="rule-v"><b>30 이상</b>이면 유형이 <b>Ascendant초월자</b>로 바뀐다</div>
          <div class="rule-k">레벨</div><div class="rule-v"><kw>aegis</kw> 값과 무관하게 <b>항상 레벨 10</b></div>
        </div>
        <div class="rule-h">Villain Action Modifier 빌런 행동 보정</div>
        <div class="rule-grid">
          <div class="rule-k">얻는 곳</div><div class="rule-v">이동 방식(<b>야영 · 무모</b>)과 카드의 보정 아이콘</div>
          <div class="rule-k">합산·초기화</div><div class="rule-v">그 턴의 보정은 <b>모두 합산</b>되고, 게임 턴이 끝나면 <b>0으로 초기화</b>된다</div>
          <div class="rule-k">범위</div><div class="rule-v"><b>-5 ~ +6</b></div>
        </div>`},

      {title:{en:"Collectors", ko:"콜렉터"}, body:`
        <div class="rule-grid">
          <div class="rule-k">등장</div><div class="rule-v">빌런 행동표에서 <b>9 · 10 · 11</b>이 나오면 <b>무작위 마을</b>에 콜렉터가 나타난다</div>
          <div class="rule-k">수 세기</div><div class="rule-v">마을마다 <b>콜렉터 주사위 1개</b>를 놓는다. 눈금 = <b>콜렉터 수</b> = 그 마을이 매 턴 녹티스에게 주는 <b>피의 양</b>.
            처음이면 <b>1</b>로 놓고, 이미 있으면 <b>1씩 올린다</b>. 한 마을에 <b>최대 3</b></div>
          <div class="rule-k">종류 결정</div><div class="rule-v">전투 전에 그 마을의 콜렉터 수만큼 <b>콜렉터 주사위</b>를 굴려 <b>1~3번</b> 종류를 정한다</div>
        </div>
        <div class="rule-h">Desolate Village 황폐한 마을</div>
        <div class="rule-v"><b>4마리째</b>가 되려는 순간 <b>황폐한 마을 토큰</b>을 놓고 주사위는 <b>3</b>에 고정한다.
          그 마을은 매 턴 <b>피 3</b>을 계속 생산하며, <b>구매 · 회복 · 룬 판매 · 콜렉터 전투가 모두 불가</b>해진다.
          더 이상 이벤트 장소가 아니며, 그 자리에서는 <b>상황 카드</b>를 처리한다.</div>
        <div class="rule-h">콜렉터와 싸우기</div>
        <div class="rule-grid">
          <div class="rule-k">찾기</div><div class="rule-v"><b>밤</b>에 마을에서 <b>이벤트 단계</b>에 <st>explore</st>를 굴린다. <b>절반 이상</b> 성공하면 콜렉터들을 찾아낸다</div>
          <div class="rule-k">전투</div><div class="rule-v">찾아낸 콜렉터 <b>전부와 한 전투</b>로 맞선다. <b>치명적 성공</b>이 하나라도 있으면 <b>기습</b>한다</div>
          <div class="rule-k">도주</div><div class="rule-v">도주하면 <b>쓰러뜨린 것까지 포함해 전부</b> 그 자리로 돌아온다</div>
          <div class="rule-k">난이도</div><div class="rule-v">마을에서 콜렉터를 <b>3마리</b> 쓰러뜨릴 때마다 <b>게임 난이도 +1</b></div>
        </div>`},

      {title:{en:"Facing Noctis", ko:"녹티스와의 최종 전투"}, body:`
        <div class="rule-grid">
          <div class="rule-k">시작 조건</div><div class="rule-v">피의 웅덩이가 <b>100</b>에 도달하거나, 그룹이 <b>녹티스 성</b>(HEXtile G 중앙 헥스)에서 이동을 끝낼 때</div>
          <div class="rule-k">증강 수</div><div class="rule-v">웅덩이 <b>10마다 1개</b>. 전투 전에 10당 <b>코어 주사위</b>를 굴려 증강표에서 결정한다</div>
          <div class="rule-k">중복</div><div class="rule-v">같은 증강을 <b>두 번 얻을 수 없다</b>. 같은 결과가 또 나오면 <b>바로 위나 아래</b>의 남은 능력 중에서 고른다</div>
          <div class="rule-k">보스 판</div><div class="rule-v">양면으로, <b>일반형</b>과 <b>승천형</b>이 있다. 증강된 능력은 조각을 <b>뒤집어</b> 표시한다</div>
        </div>`},

      RULES_COMBAT,
    ],
    items: [
      // {name:{en,ko}, desc:"...", tags:[]}
    ],
    extras: [
      {id:"dungeon", label:{en:"Dungeon", ko:"던전"}, entries:[
        {name:{en:"Overview & Entrances",ko:"개요 · 출입구"}, desc:`
          <div class="rule-grid">
            <div class="rule-k">구성</div><div class="rule-v"><b>7헥스</b>짜리 작은 타일들이 던전을 이룬다. 지상 맵 타일(A~N)과는 <b>절대 이어지지 않는다</b></div>
            <div class="rule-k">들어가기</div><div class="rule-v"><b>이동 단계</b>에 <b>잠기지 않은 지하묘지</b>에서 들어간다</div>
            <div class="rule-k">나오기</div><div class="rule-v"><b>지하묘지 아이콘</b>이 있는 헥스에서 나온다. 나온 뒤에는 <b>이벤트 단계</b>부터 이어서 진행한다</div>
            <div class="rule-k">낮·밤</div><div class="rule-v">던전 안은 <b>항상 밤</b>이다</div>
          </div>
          <div class="rule-h">지하묘지 잠금 해제</div>
          <div class="rule-v">지하묘지 <b>1~4번</b>이 각각 출입구다. 지도에 드러날 때마다 <b>잠긴 지하묘지 토큰</b>을 놓는다. 푸는 방법은 셋 —</div>
          <div class="rule-grid">
            <div class="rule-k">① 열쇠</div><div class="rule-v"><b>Crypt Key</b>를 그 자리에서 소모한다</div>
            <div class="rule-k">② 기술 굴림</div><div class="rule-v">지하묘지에서 <b>이벤트 단계</b>에 모든 기술을 굴려, <b>한 영웅이 3개 모두</b> 성공하면 열린다</div>
            <div class="rule-k">③ 안에서 나오기</div><div class="rule-v">던전에서 잠긴 지하묘지로 <b>나오면</b> 그대로 열린다</div>
          </div>
          <div class="rule-v" style="margin-top:8px;color:var(--ink-faint);font-size:12px">입구·지하묘지가 아직 드러나지 않았다면 해당 타일을 찾아 놓고 진행한다.
            이렇게 드러난 지하묘지에는 잠금 토큰을 놓지 않는다.</div>`},

        {name:{en:"Time & Movement",ko:"시간 · 이동"}, desc:`
          <div class="rule-h">Time 시간</div>
          <div class="rule-grid">
            <div class="rule-k">매 턴 획득</div><div class="rule-v">한 영웅의 <b>길찾기 + 탐험</b> 랭크 중 <b>가장 높은 조합</b>만큼</div>
            <div class="rule-k">소모</div><div class="rule-v">이동 <b>1헥스당 1</b> · 던전 카드도 각자 요구량만큼 소모</div>
          </div>
          <div class="rule-h">이동 또는 휴식 (택1)</div>
          <div class="rule-grid">
            <div class="rule-k">Move 이동</div><div class="rule-v">원하는 만큼 움직이며 헥스 수만큼 시간을 쓴다.
              <b>룬 스톤 · 보스 위치</b>에 닿거나 <b>시간이 떨어지면</b> 멈춰야 한다. 출입구에서 멈추면 지하묘지로 나갈 수 있다</div>
            <div class="rule-k">Rest 휴식</div><div class="rule-v">남은 시간을 <b>전부</b> 쓴다. <b>5 이상</b> 남아 있었다면 각 영웅이 <b>생존 랭크의 절반</b>만큼 체력·에너지를 <kw>heal</kw>한다</div>
          </div>
          <div class="rule-v" style="margin-top:8px">시간을 다 쓰면 <b>빌런 단계</b>로 넘어간다. 1 이상 남아 있으면 이동 단계로 돌아간다.</div>
          <div class="rule-h">벽 · 비밀 통로</div>
          <div class="rule-grid">
            <div class="rule-k">Dungeon Walls</div><div class="rule-v">벽은 <b>통과할 수 없다</b>. 드러난 길과 복도만 따라간다</div>
            <div class="rule-k">Secret Passage</div><div class="rule-v">벽에 <b>스탯 아이콘</b>으로 표시된다. <b>시간 1</b>을 써서 모든 영웅이 그 스탯으로 스탯 테스트를 하고,
              <b>절반 이상</b> 성공하면 벽 너머 헥스로 이동한다</div>
          </div>`},

        {name:{en:"Dungeon Cards",ko:"던전 카드"}, desc:`
          <div class="rule-v">룬 스톤이 있는 헥스로 이동하면(출구라도) 해당 색의 던전 카드를 뽑아 처리한다.</div>
          <div class="rule-grid">
            <div class="rule-k">Time Requirement</div><div class="rule-v">카드를 처리한 뒤 그만큼 시간을 줄인다. <b>0 이하</b>가 되면 빌런 단계로 넘어간다(낼 시간이 없어도 된다)</div>
            <div class="rule-k">Treasure</div><div class="rule-v">아이템으로, <b>Wielder Bonus</b>는 지닌 영웅이 얻는다. 룬 보상으로 쓰려면 이 아이템을 <b>잃어야</b> 한다</div>
            <div class="rule-k">Trap</div><div class="rule-v">처리 뒤 한 영웅이 스탯을 골라 테스트 — 실패 시 <kw>energy drain</kw> <b>2</b>,
              성공 시 그 스탯의 <b>Gear Upgrade</b>. <b>치명적 성공</b>이면 다른 영웅이 이어서 굴린다. 한 덫에서 <b>영웅 한 명은 최대 1개</b>까지만 얻는다</div>
            <div class="rule-k">Ambush</div><div class="rule-v">카드를 처리하기 전에 <b>시간 4</b>를 더 써서 적을 <b>기습</b>할 수 있다(시간 4가 온전히 있어야 한다)</div>
          </div>
          <div class="rule-h">보스 위치</div>
          <div class="rule-v">던전에 보스 위치가 몇 곳 있다. 그 칸에 들어가면 <b>반드시 멈춰</b> 보스 사건을 처리한다.
            룬 스톤이 함께 있어도 <b>던전 카드는 뽑지 않는다</b>. 보스를 쓰러뜨리면 대신 <b>그 유형의 룬 1개</b>를 얻는다.
            보스를 상대한 뒤 시간이 남아 있으면 계속 이동할 수 있다.</div>`},

        {name:{en:"Dungeon Game Turn",ko:"던전에서의 차례"}, desc:`
          <div class="rule-steps">
            <div class="rule-step"><span class="n">1</span><span class="t"><b>이동 또는 휴식</b> — 먼저 <b>시간을 회복</b>한 뒤 움직이거나 쉰다</span></div>
            <div class="rule-step"><span class="n">2</span><span class="t"><b>룬 스톤 처리</b>(이벤트 단계) — 해당 던전 덱에서 카드를 뽑아 처리하고, 처리한 카드는 <b>뒷면으로 보관</b>한다.
              시간이 <b>1 이상</b> 남아 있으면 이동 단계로 돌아가고, 아니면 빌런 단계로 넘어간다</span></div>
            <div class="rule-step"><span class="n">3</span><span class="t"><b>빌런</b> — 지상과 같은 빌런 단계를 진행한다</span></div>
          </div>`},
      ]},
      {id:"rune", label:{en:"Runes", ko:"룬"}, entries:[
        {name:{en:"Two Kinds of Rune",ko:"먼저 — 룬은 두 가지다"}, desc:`
          <div class="rule-v">같은 '룬'이라는 말이 <b>서로 다른 두 가지</b>를 가리킨다. 이것만 구분하면 나머지는 쉽다.</div>
          <div class="rule-grid">
            <div class="rule-k">Rune Stone 룬 스톤</div><div class="rule-v"><b>칸에 놓는 표식</b>. 던전 타일과 지상의 조사 위치에 놓이며,
              <b>밟으면 던전 카드를 뽑게</b> 만든다</div>
            <div class="rule-k">Rune 룬</div><div class="rule-v"><b>모아서 쓰는 재화</b>. 수도원·지하묘지·마을에서 <b>소비</b>해 보상을 받는다</div>
          </div>
          <div class="rule-h">전체 흐름</div>
          <div class="rule-steps">
            <div class="rule-step"><span class="n">1</span><span class="t"><b>룬 스톤이 놓인다</b> — 던전 타일을 깔 때 굴려서 배치 · 지상에서는 조사 위치마다</span></div>
            <div class="rule-step"><span class="n">2</span><span class="t"><b>밟으면 던전 카드를 뽑는다</b> — 스톤 색에 맞는 덱에서</span></div>
            <div class="rule-step"><span class="n">3</span><span class="t"><b>처리한 카드를 룬 보상으로 챙긴다</b> — 룬 면이 보이게 따로 둔다</span></div>
            <div class="rule-step"><span class="n">4</span><span class="t"><b>같은 색 2장 → 두 장을 버리고 룬 1개</b> (보라는 <b>1장이 곧 1개</b>)</span></div>
            <div class="rule-step"><span class="n">5</span><span class="t"><b>모은 룬을 세 곳 중 하나에서 쓴다</b> — 수도원 · 지하묘지 · 마을</span></div>
          </div>`},

        {name:{en:"Rune Stones",ko:"① 룬 스톤 — 놓기와 밟기"}, desc:`
          <div class="rule-h">던전에 놓기</div>
          <div class="rule-v">던전 타일을 놓을 때마다(첫 타일 포함) <b>그룹 말을 올리기 전에</b> 굴려 배치한다.</div>
          <div class="rule-grid">
            <div class="rule-k">굴림</div><div class="rule-v"><b>코어 주사위 2개</b>(빨강·초록용) + <b>달 주사위</b>(파랑용)를 굴려 <b>Dungeon Rune Compass</b>에서 위치를 본다</div>
            <div class="rule-k">놓는 조건</div><div class="rule-v"><b>7 이하</b>면 그 위치에 놓고, <b>8 이상</b>이면 그 색은 놓지 않는다</div>
            <div class="rule-k">겹칠 때</div><div class="rule-v">한 칸에 <b>하나만</b>. 같은 숫자가 또 나오면 <b>인접한 빈 칸</b>에 놓는다</div>
            <div class="rule-k">보라 룬 스톤</div><div class="rule-v">확장 규칙 — 같은 숫자가 <b>2개 이상</b> 나오면 따로 놓지 않고 <b>합쳐서 보라 1개</b>가 된다</div>
          </div>
          <div class="rule-h">지상에 놓기</div>
          <div class="rule-v">조사가 공개될 때마다 그 조사의 <b>룬 보상과 같은 색</b> 스톤을 그 위치에 놓는다.</div>
          <div class="rule-h">밟았을 때</div>
          <div class="rule-grid">
            <div class="rule-k">던전 카드</div><div class="rule-v">스톤이 있는 칸으로 이동하면(출구라도) <b>그 색 덱</b>에서 카드를 뽑아 처리한다</div>
            <div class="rule-k">색의 성격</div><div class="rule-v"><b>빨강</b> 위험 · <b>초록</b> 이로움과 위험이 섞임 · <b>파랑</b> 대개 이로움 · <b>보라</b> 드물고 강력(여러 유형이 섞임)</div>
            <div class="rule-k">보스 칸</div><div class="rule-v">보스 위치에 스톤이 함께 있으면 <b>카드는 뽑지 않고</b> 보스와 싸운다. 이기면 <b>그 색 룬 1개</b>를 바로 얻는다</div>
          </div>
          <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">스톤이 동나면 어느 한 곳에서 하나를 치워 새 자리에 놓는다.
            지상에서 치웠다면 대응하는 조사 카드도 버린다.</div>`},

        {name:{en:"Gaining Runes",ko:"② 룬 얻기"}, desc:`
          <div class="rule-grid">
            <div class="rule-k">던전 카드 2장</div><div class="rule-v">처리한 카드를 <b>룬 보상</b>으로 챙겨 두었다가, <b>같은 색 2장</b>이 모이면
              <b>두 장을 버리고 룬 1개</b>를 얻는다</div>
            <div class="rule-k">보라 카드</div><div class="rule-v"><b>1장이 곧 룬 1개</b> — 2장을 모을 필요가 없다</div>
            <div class="rule-k">조사 완료</div><div class="rule-v">조사를 끝내면 그 카드에 적힌 <b>룬 보상</b>을 얻는다</div>
            <div class="rule-k">던전 보스</div><div class="rule-v">격파하면 카드 대신 <b>그 색 룬 1개</b>를 바로 얻는다</div>
            <div class="rule-k">무작위 룬</div><div class="rule-v">보상이 '무작위 룬'이면 <b>달 주사위</b>로 색을 정한다 — <b>~4 · 5~8 · 9~12</b></div>
          </div>
          <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">보물(Treasure) 카드를 룬 보상으로 쓰려면 그 아이템을 잃어야 한다.</div>`},

        {name:{en:"Spending Runes",ko:"③ 룬 쓰기"}, desc:`
          <div class="rule-v">모은 룬은 <b>수도원 · 지하묘지 · 마을</b>로 가져가 소비한다. <b>바친 룬은 사라진다.</b></div>
          <div class="rule-grid">
            <div class="rule-k">수도원 <span style="color:var(--ink-faint)">헌납</span></div>
            <div class="rule-v">주 보상 <b>파워업</b> · 세트 보너스 <b>Grace은총</b><br>
              <span style="color:var(--ink-faint)">수도원마다 따로 기록 · 같은 색을 모아 내도 보너스</span></div>
            <div class="rule-k">지하묘지 <span style="color:var(--ink-faint)">활성화</span></div>
            <div class="rule-v">주 보상 <b>파워업</b> · 세트 보너스 <b>피의 마법 티어</b><br>
              <span style="color:var(--ink-faint)">지하묘지 전체를 합산해 기록 · 같은 색 보너스 있음</span></div>
            <div class="rule-k">마을 <span style="color:var(--ink-faint)">판매</span></div>
            <div class="rule-v">주 보상 <b>골드</b><br>
              <span style="color:var(--ink-faint)">기록하지 않음 · 같은 색·세트 보너스 없음</span></div>
          </div>
          <div class="rule-v" style="margin-top:9px"><b>세트</b> = <b>빨강 · 초록 · 파랑</b>을 하나씩 갖춘 것.</div>`},

        {name:{en:"Clues",ko:"단서"}, desc:`
          <div class="rule-v">단서는 룬과는 별개다. 낮·밤 바의 <b>빈 슬롯 어디에나</b> 놓을 수 있고, 보통 상황 단계에 <b>조사</b> 위에 놓인다.</div>
          <div class="rule-grid">
            <div class="rule-k">최대</div><div class="rule-v">한 슬롯에 <b>3개</b>까지</div>
            <div class="rule-k">효과</div><div class="rule-v">항상 <b>자기가 놓인 슬롯</b>에 작용한다. 조사를 플레이할 때 <b>Clue Bonus</b>를 읽어 적용한다</div>
            <div class="rule-k">제거</div><div class="rule-v">그 슬롯의 <b>마지막 카드</b>를 플레이하면 단서가 모두 버려진다</div>
          </div>`},
      ]},
      {id:"rewards", label:{en:"Rewards", ko:"보상"}, entries:[
        {name:{en:"Reward Types",ko:"보상 종류"}, desc:`
          <div class="rule-h">그룹 보상 — 영웅 각자가 받는 것</div>
          <div class="rule-grid">
            <div class="rule-k">파워업</div><div class="rule-v">표시된 장수만큼 <b>각자</b> 뽑는다</div>
            <div class="rule-k">골드 · 음식</div><div class="rule-v">표시된 양만큼 <b>각자</b> 얻는다</div>
          </div>
          <div class="rule-h">그룹 보상 — 그룹이 하나만 받는 것</div>
          <div class="rule-grid">
            <div class="rule-k">룬</div><div class="rule-v">표시된 종류의 룬 <b>1개</b>. 마을에서 판매 · 수도원에 헌납 · 지하묘지에서 활성화</div>
            <div class="rule-k">맵 타일</div><div class="rule-v">원하는 크기의 타일 <b>1장</b>을 뽑아 놓는다</div>
            <div class="rule-k">Crypt Key</div><div class="rule-v"><b>1개</b>를 얻는다</div>
            <div class="rule-k">단서</div><div class="rule-v">아무 상황 슬롯에 <b>1개</b>를 놓는다</div>
            <div class="rule-k">피의 마법</div><div class="rule-v"><b>티어 1</b>을 얻고 <b>주문 1장</b>을 뽑는다</div>
          </div>
          <div class="rule-h">단일 보상 — 목표 주사위로 받을 사람을 정한다</div>
          <div class="rule-grid">
            <div class="rule-k">스탯 보너스</div><div class="rule-v">9개 스탯 중 하나의 <b>랭크가 오른다</b></div>
            <div class="rule-k">기어 업그레이드</div><div class="rule-v">영웅 하나가 <b>원하는 것</b>으로 얻는다</div>
            <div class="rule-k">아이템 · 기타</div><div class="rule-v">아이템, 또는 전설 카드·패밀리어 같은 특정 카드</div>
            <div class="rule-k">Wielder Bonus</div><div class="rule-v">보물·전설 카드에 붙는다. <b>아이템으로 취급</b>하며, 지닌 영웅이 표시된 <b>랭크 보너스</b>를 얻는다</div>
          </div>`},

        {name:{en:"Keepsakes",ko:"킵세이크"}, desc:`
          <div class="rule-v">킵세이크는 영웅 <b>영혼의 파편</b>이다. 게임 시작 시 무작위로 <b>1장</b> 뽑아 역할판 아래에 두고, <b>발동할 때까지 보지 않는다</b>.</div>
          <div class="rule-grid">
            <div class="rule-k">발동</div><div class="rule-v">영웅이 죽는 순간, <b>위대한 양상을 얻지 못했다면</b> 달 주사위를 굴린다.
              결과가 <b>{defence} 랭크 + 방어 기어 업그레이드 수</b> 이하면 발동한다</div>
            <div class="rule-k">발동 후</div><div class="rule-v">카드를 뒤집어 마스터리 위에 놓는다. 그 영웅은 <b>킵세이크 능력만</b> 쓸 수 있고, <b>죽은 것으로 취급</b>된다</div>
            <div class="rule-k">능력</div><div class="rule-v"><b>종족 능력</b>처럼 다루며, 쓸 때마다 요구된 스탯의 <b>랭크를 소모</b>한다</div>
            <div class="rule-k">소멸</div><div class="rule-v">두 능력을 <b>모두 쓸 수 없게 되면</b> 영혼이 떠나 게임에서 제거된다 — 더는 <kw>revive</kw>할 수 없다</div>
            <div class="rule-k">부활</div><div class="rule-v">킵세이크가 활성이고 능력을 <b>하나라도</b> 쓸 수 있는 동안에는 <kw>revive</kw>될 수 있다</div>
          </div>`},

        {name:{en:"Familiars",ko:"패밀리어"}, desc:`
          <div class="rule-v">패밀리어는 영웅을 돕는 <b>동료</b>다. 저마다 고유하며 <b>게임당 한 번만</b> 얻을 수 있다. 여러 마리를 동시에 데릴 수 있다.</div>
          <div class="rule-grid">
            <div class="rule-k">랭크</div><div class="rule-v">처음 받을 때 <b>1 + 받는 영웅의 해당 스탯 랭크의 1/3</b>. 다른 영웅에게 넘어가도 <b>바뀌지 않는다</b></div>
            <div class="rule-k">소유권</div><div class="rule-v">다른 영웅에게 <b>줄 수 없다</b>. 다만 주인이 죽으면 다른 영웅에게 <b>묶일 수</b> 있다</div>
            <div class="rule-k">전투</div><div class="rule-v">따로 명시가 없으면 <b>목표가 되지 않는다</b></div>
            <div class="rule-k">얻는 법</div><div class="rule-v">구매 · 보스 격파 · 카드로 얻는다. 이미 있는 패밀리어를 또 얻으면 <b>랭크 +3</b>.
              파워업을 <b>4장 모아 버리면</b>(보너스는 포기) 무작위 패밀리어를 뽑을 수 있다</div>
            <div class="rule-k">스탯</div><div class="rule-v">9개 스탯 중 하나를 갖는다. 선택형이면 정해 적어두며 <b>다시 고를 수 없다</b></div>
            <div class="rule-k">랭크 올리기</div><div class="rule-v">패밀리어와 <b>같은 스탯</b>의 파워업을 얻을 때, 그 랭크를 자기 대신 <b>패밀리어에게</b> 줄 수 있다</div>
            <div class="rule-k">기어 업그레이드</div><div class="rule-v">파는 곳에서 사 줄 수 있다(스탯이 맞으면 주운 것도 가능). 따로 명시가 없으면 <b>최대 3개</b></div>
          </div>`},
      ]},
      {id:"modes", label:{en:"Play Styles", ko:"게임 모드"}, entries:[
        {name:{en:"Bounty Hunter",ko:"현상금 사냥꾼"}, desc:`<b>현상금과 보스 사냥</b>에 집중하는 방식. 위험도 보상도 큰, 숙련자용 구성이다.<br>
          &#9312; 낮·밤 덱에서 <b>Bounty 카드</b>를 모두 찾아 <b>각각의 덱</b>으로 따로 섞는다(낮과 밤은 섞지 않는다).<br>
          &#9313; 각 바의 <b>1·2번 슬롯</b>은 현상금 슬롯이 되어 해당 현상금 덱에서만 채운다. <b>3·4번</b>은 원래 상황 덱에서 평소대로 채운다.<br>
          &#9314; 시작 카드를 놓을 때 뽑힌 <b>Interrupt 현상금</b>은 평소 규칙대로 덱에 다시 섞는다.<br>
          &#9315; 현상금 슬롯은 <b>버릴 수 없다</b>. 완료하면 해당 덱에서 새 현상금을 뽑아 채운다.<br>
          &#9316; <b>보스를 쓰러뜨릴 때마다</b>, 다음 게임 턴에 그 자리에서 야영하면 그룹의 생명력을 <b>전부 회복</b>한다.<br>
          &#9317; 현상금을 <b>2개 완료할 때마다</b>, 원하는 덱에서 다음에 나오는 <b>보물</b>을 얻는다. 그 과정에서 나온 다른 카드는 덱에 다시 섞는다.`},
        {name:{en:"Blighted Lairs",ko:"오염된 소굴"}, desc:`지도의 <b>무작위 보스 위치</b>(달 주사위 표시)를 <b>여러 헥스짜리 소굴</b>로 바꾼다. 소굴 전체를 정리해야 그 보스와 맞설 수 있다. 번호가 붙은 보스 위치에는 적용되지 않는다.<br>
          &#9312; 소굴 타일은 <b>3헥스 4장 · 4헥스 6장</b>이다.<br>
          &#9313; 게임 시작 시 지도와 바를 놓은 뒤, 공개된 무작위 보스 위치 위에 소굴 타일을 덮는다(가능하면 <b>전부</b> 덮는다). 지형 유형도 그에 따라 바뀐다.<br>
          &#9314; 무작위 보스 위치가 있는 새 헥스 타일을 놓을 때마다, 남은 소굴 타일이 있으면 그 위에 덮는다.<br>
          &#9315; 마을·수도원·지하묘지·번호가 붙은 보스 소굴 등 다른 장소는 <b>덮을 수 없다</b>.<br>
          &#9316; 특수 장소(사건·발견·조사)는 소굴 위에 놓을 수 있지만, <b>소굴을 정리하기 전에는 이용할 수 없다</b>.<br>
          &#9317; 소굴의 각 헥스에는 <b>룬</b> 기호가 있다.<br>
          &#9318; 소굴 타일에 들어서면 그 보스의 영향 아래 놓인다. 타일 안의 다른 헥스로 <b>더 움직일 필요는 없다</b>. 시간은 던전에 들어간 것처럼 소모되지만, <b>던전 안에 있는 것으로 치지는 않는다</b>.<br>
          &#9319; 보스와 맞서기 전에, 있는 타일에 표시된 <b>룬과 맞는 던전 카드</b>를 뽑아 <b>한 장씩</b> 원하는 순서로 해결한다. 이때 그 카드들을 보상으로 가져가지는 않는다. 보스와 맞서려면 <b>시간이 최소 1</b> 남아 있어야 하며, 그 전에 시간이 떨어지면 <b>도주한 것으로</b> 처리한다.<br>
          &#9320; 던전 카드 사이에 <b>도주</b>할 수 있으나 보상 없이 사건이 끝난다. 도주 후에는 <kw>wander</kw> 대신 <kw>roam</kw>하며, 소굴 타일은 지도에 남는다. 한 번에 벗어나지 못하면 완전히 빠져나갈 때까지 계속 <kw>roam</kw>한다.<br>
          &#9321; 마지막 던전 카드를 해결하면 <b>즉시 보스 전투</b>가 시작된다. 쓰러뜨리면 사용한 던전 카드를 <b>모두 보상</b>으로 얻고, 실패하면 던전 카드도 보물도 얻지 못한다.<br>
          &#9322; 던전 카드를 모두 해결하고 보스를 쓰러뜨리면 소굴이 정리되어 타일을 치운다. 원래 자리에 <b>헥스 토큰</b>을 놓고 타일은 다시 소굴 더미로 돌린다. 가려져 있던 특수 장소가 이용 가능해진다.`},
        {name:{en:"Castle Noctis",ko:"녹티스 성"}, desc:`녹티스가 성을 <b>보강</b>해 가는 방식. <b>한 번 클리어한 뒤</b> 즐기기를 권한다. 여섯 갈래 길 중 하나로 잠입해야 하며, <b>피의 웅덩이가 100</b>이 되면 이 방식에서도 녹티스가 직접 나선다.<br>
          &#9312; <b>7헥스짜리 녹티스 성 타일</b>을 따로 빼두었다가, 성이 있는 헥스 타일이 놓이는 순간 방향을 맞춰 그 위에 덮는다.<br>
          &#9313; 이 타일의 각 헥스가 녹티스의 소굴이며 그의 보스 위치로 취급한다. 맞서기 전에 <b>고유 과제</b>를 먼저 완수해야 한다.<br>
          &#9314; 기술 페이즈가 끝난 뒤 그룹이 이 구역의 어느 헥스든 있으면 <b>최종 전투를 시작</b>한다. 중앙 헥스가 아니라면 중앙으로 옮긴다.<br>
          &#9315; 맞서기 전에, <b>지나온 헥스의 룬</b>과 맞는 던전 카드를 뽑아 해결한다. 여러 헥스를 지나왔다면 여러 장을 뽑는다. 이 카드들을 처리하는 동안 영웅이 <b>체력 피해를 입을 때마다 피의 웅덩이 +1</b>.<br>
          &#9316; 카드를 처리한 직후, 각 영웅은 <b>직전 위치에 표시된 스탯</b>으로 스탯 테스트를 <b>한 번</b> 굴린다 —
          <b>전원 성공</b>: 그룹이 녹티스를 <b>기습</b>한다. 영웅당 피의 웅덩이 <b>-5</b> 후 대결 ·
          <b>한 명이라도 실패</b>: 영웅당 <b>+3</b> 후 대결하며 녹티스가 그룹을 기습한다 ·
          <b>치명적 실패</b>가 나오면 진행 시점과 현재 피의 웅덩이에 따른 <b>보스</b>와 먼저 싸운다(이미 쓰러뜨린 보스가 나오면 녹티스와 대결). 피의 웅덩이 <b>30 미만 / 31~69 / 70 이상</b>으로 상대가 갈린다.`},
        {name:{en:"Želja Awakens",ko:"젤랴의 각성"}, desc:`밴시 여왕 <b>Želja젤랴</b>가 게임 시작부터 지도에 놓인다. 녹티스에게 살해당한 옛 여왕이 수백 년 만에 분노에 삼켜진 채 일어섰다.<br>
          &#9312; 밤 덱에서 젤랴의 현상금 <b>&ldquo;Banshee Queen&rdquo;</b>을 찾아 <b>밤 4번 슬롯</b>에 놓는다.<br>
          &#9313; 젤랴의 <b><kw>roam</kw> 거리</b>가 피의 웅덩이와 연동된다. 거리를 굴릴 때(방향은 제외) <b>피 20마다 +1</b>(20에 +1, 40에 +2 …).<br>
          &#9314; 젤랴를 쓰러뜨리면 격파 보상과 현상금 보상을 함께 얻고 그 현상금은 따로 빼둔다. <b>다시 돌아올 수 있다.</b><br>
          &#9315; 피의 웅덩이가 <b>20의 배수</b>가 될 때마다 젤랴가 <b>부활</b>한다. 게임 턴이 끝날 때 밤 4번 슬롯의 카드를 버리고 그 자리에 현상금을 다시 놓는다. 돌아올 때마다 <b>Dangerous</b>가 되며, 여러 번 중첩될 수 있다.<br>
          &#9316; <b>Dangerous</b>인 동안에는 녹티스의 <b>Collector</b>를 파괴한다. 콜렉터가 있는 곳에서 <b>1헥스 이내</b>로 이동할 때마다 그 자리에서 콜렉터를 <b>1개</b> 제거한다.<br>
          &#9317; 녹티스와의 <b>최종 전투</b>에는 젤랴도 등장한다(지도에 없더라도). <b>2라운드 Declaration</b>에 도착하며, 녹티스와 젤랴는 서로를 영웅처럼 목표로 삼을 수 있다. 둘의 목표 주사위는 <b>보정 없이</b> 굴린다.<br>
          &#9318; 젤랴는 녹티스의 <b>보스 2 능력과 패시브</b>의 영향을 받지 않는다.<br>
          &#9319; 젤랴를 반드시 쓰러뜨릴 필요는 없다. <b>녹티스를 쓰러뜨리면</b> 승리한다.`},
      ]},
      {id:"valor", label:{en:"Valor", ko:"용맹"}, entries:[
        {name:{en:"Gaining Valor",ko:"용맹 얻기"}, desc:`특정 업적을 달성하면 <b>용맹 1점</b>을 얻는다. 용맹은 <b>미르자 녹티스 전용이 아니라</b> 시리즈 전체에서 통한다.<br>
          플레이어의 용맹 점수는 시리즈의 어느 게임에서든 <b>모아 온 총합</b>이며, 함께 플레이하는 모두는 <b>가장 높은 사람</b>의 점수를 그대로 적용받는다.
          용맹은 <b>같은 출처에서 한 번만</b> 얻을 수 있고(녹티스를 몇 번 쓰러뜨리든 1점), 다른 게임 효과로 <b>바뀌지 않는다</b>.<br>
          <b>미르자 녹티스에서 얻는 법</b> — 쉬움에서 녹티스 격파 · 에픽에서 녹티스 격파 · 한 게임에서 <b>Grace 4개</b> 모두 획득 ·
          한 게임에서 <b>피의 마법 10티어</b> 이상 도달 · <b>Raveziel the Fallen</b>을 격파하거나 설득 ·
          지정된 <b>피의 웅덩이 수치</b>(0~100 구간, 6칸)에서 녹티스 격파.`},
        {name:{en:"Using Valor",ko:"용맹 사용"}, desc:`게임을 시작할 때 총 용맹 점수로 <b>해당 티어와 그 아래 티어의 보너스를 모두</b> 얻는다.
          다른 시리즈의 용맹 보너스와 <b>합쳐 쓸 수 없고</b>, 효과는 <b>그 게임에만</b> 적용된다.<br>
          <b>Initiate 입문 (1~7)</b> — 각 영웅은 용맹 점수의 <b>절반</b>만큼 골드를 얻어 <b>기어 업그레이드에만</b> 쓴다. 남은 골드는 사라진다.<br>
          <b>Adventurer 모험가 (8~19)</b> — 시작 전 <b>헥스 주사위</b>를 굴려 그 값을 이번 게임의 용맹 점수에 더한다(헥스플로드 가능). 그룹은 <b>지하묘지 열쇠 1개</b>를 갖고 시작한다.<br>
          <b>Hero 영웅 (20~32)</b> — 각 영웅은 <b>킵세이크 2개</b>로 시작하며 시작 전에 각각 확인할 수 있다. 승리하려면 <b>어려움 이상</b>에서 빌런을 쓰러뜨려야 한다.<br>
          <b>Champion 챔피언 (33~59)</b> — 그룹이 <b>피의 마법 1티어</b>를 갖고 시작한다. 승리하려면 <b>영웅적 이상</b>에서 빌런을 쓰러뜨려야 한다.<br>
          <b>Avatar 아바타 (60+)</b> — 시작 시 각 영웅이 능력 하나를 고른다. 게임 턴당 <b>2회</b>까지 기술 페이즈에 <b>코어 주사위</b>를 굴려 그 능력의 랭크 이하가 나오면 <b>치명상 1개</b>를 제거한다. 승리하려면 <b>에픽</b>에서 빌런을 쓰러뜨려야 한다.`},
      ]},
    ],
  },

  "4b": {
    id:"4b", name:{en:"Edition 4 · The Breach", ko:"4편 · 균열"}, short:"4B", ord:2,
    note:{ko:"녹티스가 승천한 뒤의 미래. 네 공포를 막아야 한다"},
    keywords: KW_COMMON,
    conditions: CONDITIONS,
    rules: [],      /* 아래에서 채운다 — 기본판 공통 룰 + 균열 전용 */
    items: [],
    extras: [],     /* 아래에서 채운다 */
  },

  "5": {
    id:"5", name:{en:"Hexplore It — Edition 5", ko:"헥스플로어 잇 — 5편"}, short:"5", ord:3,
    keywords: KW_COMMON,
    exKeywords: KW_SIEGE,
    conditions: CONDITIONS,
    rules: [RULES_COMBAT],
    items: [],
    extras: [],
  },
};

/* 균열 모드는 4편의 공통 룰을 그대로 쓰고, 달라지는 것만 앞에 얹는다 */
(function(){
  const base = SERIES["4"].rules;
  const pick = en => base.find(r => r.title.en === en);
  SERIES["4b"].rules = [
    B_DIFF, B_SETUP, B_TURN, B_CIRC,
    pick("Movement"), pick("Skill Phase & Stat Tests"),
    pick("Navigate · Explore · Survival"), pick("Wander & Roam"), pick("Starving"),
    pick("Circumstance Types"), RULES_COMBAT,
  ].filter(Boolean);
  const ex = SERIES["4"].extras, byId = id => ex.find(x => x.id === id);
  SERIES["4b"].extras = [byId("dungeon"), byId("rune"), BREACH_TAB, byId("valor")].filter(Boolean);
  SERIES["4b"].items = SERIES["4"].items;
})();

/* 엔진에서 접근할 수 있게 전역으로 노출 */
window.HEX = { CAT, STAT_ORDER, STAT_META, SHARED, SERIES, FOE_TYPES, GREATER_ASPECTS, COND_NOTE, DIFFICULTY };
