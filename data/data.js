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

/* 패밀리어 — 특수 능력에 붙는 동료. 육각형을 하나 가지되 칸이 **3개뿐**이고
   비용은 5·7·9 로 고정이다(능력치 육각형의 6칸·직업별 시작값과 다르다).

   육각형은 곧 **패밀리어의 랭크**다:  랭크 = 기준 랭크 + 채운 칸
   기준 랭크는 **얻는 순간에만** 1 + 주인의 rankStat 랭크로 정해지고, 그 뒤로는 주인이
   올라도 따라가지 않는다(능력에 baseRank 로 찍어 둔다). marks 는 능력이 갈리는 랭크,
   readout 은 랭크에 연동되는 수치를 판에 바로 띄우기 위한 것이다.
   아직 채우지 못한 패밀리어는 이름만 세워 두었다 — 카드를 봐야 알 수 있다. */
const FAMILIAR_HEX = [5, 7, 9];

/* rankStat 이 능력치 키가 아니라 "고를 것"인 패밀리어가 있다 — 카드 육각형에

   Choose 1 Stat / Lowest Stat when Gained 처럼 적혀 있는 것들이다.

   그런 것은 아래 네 값 중 하나를 쓰고, 기준 랭크는 얻을 때 직접 고르거나 ±로 맞춘다. */

const FAMILIARS = [

  /* ── 4편 ───────────────────────────────────────────────────────────

     카드 하단 공통 문구: "A Familiar's rank begins equal to 1 + 1/3 the receiving

     hero's matching stat rank." → 기준 랭크 = 1 + (기준 능력치 ÷ 3) 이라 baseDiv:3 이다. */

  {id:"rat", name:{en:"The Rat", ko:"쥐"}, ed:"4", baseDiv:3,

   rankStat:"survival", ability:{en:"Filth Guard", ko:"오물 수호"}, marks:[5,8],

   gain:"무작위 패밀리어 뽑기 · <b>Village 마을 / Monastery 수도원</b>에서 구매",

   readout:(r)=>[{lab:"Stat Test 목표 · 랭크", val:r}],

   desc:`<b>Movement 이동 페이즈</b>마다 <b>1회</b>, 그리고 <b>전투 라운드</b>마다 <b>1회</b>,

     컨디션을 가지고 있다면 <b>Filth Guard</b> 랭크로 <b>스탯 굴림</b>을 한다.

     성공하면 자신의 컨디션 <b>1개</b>를 <kw>negate</kw>한다.<br>

     <b>5랭크</b> — 그룹이 <b>Affliction고통</b>을 받고 있다면 <b>Filth Guard</b> 랭크로 스탯 굴림을 할 수 있다.

     성공하면 그 고통을 <b>끝낼</b> 수 있다.<br>

     <b>8랭크</b> — 자신의 컨디션이나 고통이 <kw>negate</kw>될 때마다

     <st>health</st> <b>2</b>와 <st>energy</st> <b>2</b>를 <kw>heal</kw>한다.`},



  {id:"viper", name:{en:"The Viper", ko:"독사"}, ed:"4", baseDiv:3,

   rankStat:"health", ability:{en:"Poisoned Strike", ko:"독 일격"}, marks:[6,10],

   gain:"무작위 패밀리어 뽑기 · <b>☾ Night 밤 덱</b>에서 발견",

   readout:(r)=>[{lab:"Energy 추가 피해", val:r}],

   desc:`상대에게 <st>energy</st> 피해를 줄 때마다, 그 상대는 <b>Poisoned Strike</b> 랭크만큼

     <kw>piercing</kw> <st>energy</st> 피해를 받고 <state>drained</state> 상태가 된다.<br>

     <b>6랭크</b> — 라운드가 끝날 때 상대가 <kw>energetic</kw> 상태가 아니면,

     <b>다음 라운드에</b> <state>vulnerable</state> 상태가 된다.<br>

     <b>10랭크</b> — 상대에게 <st>energy</st> 피해를 줄 때마다 <b>Poisoned Strike</b> 랭크로 스탯 굴림을 한다.

     <b>대성공</b>하면 그 상대는 <state>tethered</state> 상태가 된다.`},



  {id:"sword", name:{en:"The Sword", ko:"검"}, ed:"4", baseDiv:3,

   rankStat:"attack", ability:{en:"Living Blade", ko:"살아있는 검"}, marks:[5,8],

   gain:"무작위 패밀리어 뽑기 · <b>Dungeon 던전</b>에서 발견",

   readout:(r)=>[{lab:"Attack Boost · 들었을 때", val:"+"+r},

                 {lab:"피해 · 들지 않았을 때", val:(r>=8?Math.floor(r*1.5):r)}],

   desc:`전투 라운드마다 이 패밀리어를 <b>들지</b> 선택할 수 있다.

     들면 <st>attack</st> 랭크가 <b>Living Blade</b> 랭크만큼 <kw>boost</kw>된다.<br>

     <b>들지 않은 동안</b>에는, 능력으로 상대를 대상으로 삼을 때마다 이 패밀리어가 그 상대를 공격해

     <b>Living Blade</b> 랭크만큼 <kw>piercing</kw> <st>health</st> 피해를 준다.

     이 효과는 <kw>aegis</kw>를 <b>무시한다</b>.<br>

     <b>5랭크</b> — 들고 있을 때 당신의 공격이 <kw>piercing</kw>이 된다.<br>

     <b>8랭크</b> — 들지 않았을 때 주는 피해가 <b>Living Blade</b> 랭크의 <b>1.5배</b>가 된다.`},



  {id:"feyDragon", name:{en:"The Fey Dragon", ko:"요정 용"}, ed:"4", baseDiv:3,

   rankStat:"lowest", ability:{en:"Fey Touched", ko:"요정의 손길"}, marks:[3,7,10],

   gain:"무작위 패밀리어 뽑기 · <b>The Dark Fey</b> 처치",

   readout:(r)=>[{lab:"Regen 재생 · 2라운드", val:1+Math.floor(r/3)},

                 {lab:"게임 턴당 사용", val:(r>=10?3:1)}],

   desc:`<b>게임 턴당 1회</b>, 당신이나 동료가 대상의 <st>health</st>을 <kw>heal</kw>할 때,

     그 대상은 <b>Critical Wound 치명상</b> <b>1</b>을 없애거나

     <b>다음 2라운드 동안</b> <kw>regen</kw> <st>health</st> <b>1</b>을 얻는다.

     <b>3랭크</b>부터 <b>3랭크마다</b> 이 <kw>regen</kw> 양이 <b>1</b>씩 오른다.<br>

     <b>7랭크</b> — 대상의 <b>최대 <st>health</st>을 넘긴</b> 회복량은 <b>절반</b>이 되어

     <st>energy</st>로 바뀐다.<br>

     <b>10랭크</b> — 이 능력을 게임 턴당 <b>3회</b>까지 쓸 수 있다.`},



  {id:"flyingSnake", name:{en:"The Flying Snake", ko:"날뱀"}, ed:"4", baseDiv:3,

   rankStat:"chooseStat", ability:{en:"Pattern Coherence", ko:"문양의 일관성"}, marks:[5,8],

   gain:"무작위 패밀리어 뽑기",

   readout:(r)=>[{lab:"Stat Test 목표 · 랭크 ÷ 2", val:FR(r)}],

   desc:`능력치 보너스가 붙은 <b>파워업</b>을 얻을 때마다,

     <b>Pattern Coherence 랭크의 절반</b>으로 <b>스탯 굴림</b>을 할 수 있다.

     성공하면 카드에 적힌 보너스 중 <b>하나</b>를 <b>다른 능력치</b>로 바꿀 수 있다.<br>

     <b>5랭크</b> — <b>게임 턴당 1회</b>, 이 능력을 써서 <b>동료가 얻는</b> 능력치 보너스를 바꿀 수 있다.<br>

     <b>8랭크</b> — 파워업을 얻을 때마다 <b>1장을 더 뽑아</b> 그중 하나를 골라 얻는다.

     남은 카드는 덱에 다시 섞는다.`},



  {id:"fox", name:{en:"The Fox", ko:"여우"}, ed:"4", baseDiv:3,

   rankStat:"chooseAbilitySkill", ability:{en:"Cunning Mind", ko:"교활한 지혜"}, marks:[6,10],

   gain:"무작위 패밀리어 뽑기",

   readout:(r)=>[...(r>=6?[{lab:"주사위 조정 · 랭크 ÷ 2", val:"±"+FR(r)}]:[]),

                 {lab:"라운드당 Favored Opponent", val:(r>=10?2:1)}],

   desc:`<b>Cunning Mind</b> 랭크가 상대의 <b>레벨보다 높으면</b>,

     그 상대에게 <b>Favored Opponent</b>를 얻는다.<br>

     <b>6랭크</b> — 이미 그 상대에게 <b>Favored Opponent</b>를 가지고 있었다면,

     라운드마다 <b>첫 Favored Opponent 주사위</b> 결과를 <b>Cunning Mind 랭크의 절반</b>까지 조정할 수 있다.

     조정한 결과로 <b>HEXplode 헥스플로드</b>가 터질 수 있다.

     <out>Outlast 지속력</out>을 가진 상대에게는 <out>Outlast</out>를 <b>1 대신 2</b> 줄인다.<br>

     <b>10랭크</b> — 라운드마다 <b>서로 다른 Favored Opponent 효과 2개</b>까지 쓸 수 있다

     (각각 따로 굴린다).`},



  {id:"hellhoundPup", name:{en:"The Hellhound Pup", ko:"새끼 지옥사냥개"}, ed:"4", baseDiv:3,

   rankStat:"chooseMastery", ability:{en:"Fiery Temper", ko:"불같은 성미"}, marks:[8],

   gain:"무작위 패밀리어 뽑기 · <b>The Hellhound</b> 처치",

   readout:(r)=>[{lab:"Burn 피해 · 중첩", val:r}],

   desc:`전투 중 컨디션을 얻을 때마다 상대가 <state>burned</state> 상태가 된다.<br>

     이때 받는 피해는 일반 <b>Burn</b> 피해 대신 <b>Fiery Temper</b> 랭크만큼이다.

     이 효과는 <b>자기 자신과 중첩된다</b>.<br>

     <b>8랭크</b> — <b>게임 턴당 1회</b>, <st>energy</st> <b>2</b>를 써서

     <b>컨디션을 얻지 않고도</b> <b>Fiery Temper</b>를 발동할 수 있다.`},



  {id:"homunculus", name:{en:"The Homunculus", ko:"호문쿨루스"}, ed:"4", baseDiv:3,

   rankStat:"highest", ability:{en:"Transmutation", ko:"변성"}, marks:[8],

   gain:"무작위 패밀리어 뽑기 · <b>The Mad Alchemist</b> 처치",

   readout:(r)=>[{lab:"최고 랭크 감소 · ÷ 2", val:"−"+FR(r)},{lab:"최저 랭크 증가", val:"+"+r}],

   desc:`<b>Transmutation</b>과 <b>같은 종류</b>의 보너스가 붙은 <b>파워업</b>을 얻을 때,

     <b>최소 1랭크</b>는 반드시 Homunculus에게 줘야 한다.<br>

     <b>전투를 시작할 때</b> 능력치 종류를 <b>하나</b> 고른다

     (<b>Vital 생명력</b> · <b>Skill 기술</b> · <b>Ability 능력</b>).

     <b>전투가 끝날 때까지</b>, 고른 종류 중 <b>가장 높은 랭크</b>는

     <b>Transmutation 랭크의 절반</b>만큼 낮아지고, <b>가장 낮은 랭크</b>는

     <b>Transmutation 랭크</b>만큼 높아진다. 랭크가 같아 겹치면 어느 쪽인지 직접 고른다.<br>

     <b>8랭크</b> — <b>게임 턴당 1회</b>, 파워업을 얻을 때 <st>energy</st> <b>2</b>를 써서

     능력치 보너스 <b>1개</b>를 <b>다른 능력치</b>로 바꿀 수 있다.`},



  {id:"stormWolf", name:{en:"The Storm Wolf", ko:"폭풍 늑대"}, ed:"4", baseDiv:3,

   rankStat:"attack", ability:{en:"Flanking", ko:"측면 공격"}, marks:[3,5],

   gain:"무작위 패밀리어 뽑기",

   readout:(r)=>[{lab:"피해 Boost · 중첩", val:"+"+r},

                 ...(r>=3?[{lab:"달 주사위 목표", val:"≤ "+r}]:[])],

   desc:`상대가 당신이 주는 피해를 <b>줄이거나</b> <kw>negate</kw>할 때마다,

     <b>전투가 끝날 때까지</b> 그 상대에게 주는 피해를 <b>Flanking</b> 랭크만큼 <kw>boost</kw>한다.

     이 효과는 <b>자기 자신과 중첩된다</b>.<br>

     <b>3랭크</b> — <b>Event 이벤트 페이즈</b>에 <b>Moon 달 주사위</b>를 굴릴 수 있다.

     결과가 <b>Flanking 랭크 이하</b>면 <b>음식 2</b>를 얻는다.<br>

     <b>5랭크</b> — 당신의 공격을 <kw>evasion</kw>으로 피하려는 상대는

     <b>두 번 굴려 낮은 쪽</b>을 써야 한다.`},



  {id:"bat", name:{en:"The Bat", ko:"박쥐"}, ed:"4", baseDiv:3,

   rankStat:"explore", ability:{en:"Sonar", ko:"음파 탐지"}, marks:[5,9],

   gain:"무작위 패밀리어 뽑기 · <b>Kesh'kezuul</b> 처치",

   readout:(r)=>[{lab:"상대 Evasion 증가 · 랭크 ÷ 5", val:"+"+Math.floor(r/5)}],

   desc:`<kw>ambush</kw>당할 때마다 <b>Sonar</b> 랭크로 <b>스탯 굴림</b>을 한다.

     성공하면 그 <kw>ambush</kw>를 <kw>negate</kw>한다.

     <b>대성공</b>하면 대신 당신이 상대를 <kw>ambush</kw>할 수 있다.<br>

     <b>5랭크</b>부터 <b>5랭크마다</b> 상대의 <kw>evasion</kw> 수치가 <b>1</b>씩 오른다.<br>

     <b>9랭크</b> — 전투가 시작되기 전에 <st>energy</st> <b>2</b>를 써서

     상대를 <kw>ambush</kw>할 수 있다.`},



  {id:"owl", name:{en:"The Owl", ko:"올빼미"}, ed:"4", baseDiv:3,

   rankStat:"energy", ability:{en:"Clarity", ko:"명료함"}, marks:[4],

   gain:"무작위 패밀리어 뽑기 · <b>Monastery 수도원</b>에서 구매",

   readout:(r)=>[{lab:"Stat Test 목표 · 랭크", val:r},

                 ...(r>=4?[{lab:"행동 랭크 Boost · ÷ 2", val:"+"+FR(r)}]:[])],

   desc:`<st>energy</st>를 써서 <b>마스터리</b>를 발동할 때마다,

     <b>Clarity</b> 랭크로 <b>스탯 굴림</b>을 할 수 있다.

     성공하면 이번 라운드 그 비용을 <b>1</b> 줄인다(<b>최소 0</b>).

     결과가 <b>헥스</b>면 <st>energy</st> <b>1</b>도 <kw>raise</kw>한다.<br>

     <b>4랭크</b> — <b>Clarity</b>가 마스터리의 <st>energy</st> 비용을 줄일 때마다,

     이번 라운드 당신의 <b>행동 랭크</b>를 <b>Clarity 랭크의 절반</b>만큼 <kw>boost</kw>한다.`},



  {id:"feline", name:{en:"The Feline", ko:"고양이"}, ed:"4", baseDiv:3,

   rankStat:"firstMastery", ability:{en:"Nimble Movement", ko:"날렵한 몸놀림"}, marks:[3,7],

   gain:"무작위 패밀리어 뽑기 · <b>☾ Night 밤 덱</b>에서 발견",

   readout:(r)=>[{lab:"Evasion 수치", val:Math.max(0,10-Math.floor(r/3))}],

   desc:`상대가 당신에게 피해를 줄 때마다, <b>다음 라운드에</b> <kw>evasion</kw> <b>10</b>을 얻는다.<br>

     <b>3랭크</b>부터 <b>3랭크마다</b> 이 <kw>evasion</kw> 수치가 <b>1</b>씩 낮아진다.<br>

     <b>7랭크</b> — <b>그룹 공격</b>의 대상이 되었을 때 <kw>evasion</kw>을

     <b>두 번 굴려 높은 쪽</b>을 쓸 수 있다.`},



  {id:"crow", name:{en:"The Crow", ko:"까마귀"}, ed:"4", baseDiv:3,

   rankStat:"secondMastery", ability:{en:"Death Ties", ko:"죽음의 인연"}, marks:[7],

   gain:"무작위 패밀리어 뽑기 · <b>☾ Night 밤 덱</b>에서 발견",

   readout:(r)=>[{lab:"Raise 체력 · 에너지", val:r},{lab:"대성공 시", val:r*2}],

   desc:`<b>게임 턴마다 처음 죽었을 때</b>, <b>Death Ties</b> 랭크로 <b>스탯 굴림</b>을 한다.

     <b>성공</b>이면 <b>Death Ties</b> 랭크만큼 <st>health</st>과 <st>energy</st>를 <kw>raise</kw>한다.

     <b>대성공</b>이면 <kw>raise</kw>되는 생명력 양이 <b>2배</b>가 된다.<br>

     <b>7랭크</b> — <b>게임당 1회</b>, 이 <kw>raise</kw> 효과가 발동할 때

     원하는 <b>Greater Aspect 위대한 양상</b>도 하나 얻을 수 있다.

     이미 하나 가지고 있다면 <b>새것으로 바꿀</b> 수 있다.`},



  {id:"turtle", name:{en:"The Turtle", ko:"거북"}, ed:"4", baseDiv:3,

   rankStat:"defence", ability:{en:"Runic Shell", ko:"룬 등껍질"}, marks:[6,8],

   gain:"무작위 패밀리어 뽑기 · <b>Monastery 수도원</b>에서 구매",

   readout:(r)=>[{lab:"피해 감소 · 상대마다 1회", val:"−"+r},

                 ...(r>=6?[{lab:"대상 주사위 페널티", val:"−"+r}]:[])],

   desc:`전투에서 <b>각 상대가 처음 당신에게 피해를 줄 때</b>,

     받는 피해를 <b>Runic Shell</b> 랭크만큼 줄인다.

     이 효과는 <kw>piercing</kw> 피해도 줄일 수 있다.<br>

     <b>6랭크</b> — <b>전투 첫 라운드</b> 동안 자신의 <b>대상 주사위</b>에

     <b>Runic Shell</b> 랭크만큼 페널티를 받기로 선택할 수 있다.<br>

     <b>8랭크</b> — <b>게임 턴당 1회</b>까지, <b>Runic Shell</b>이 당신이 받을

     <kw>critical</kw> 피해를 전부 <kw>negate</kw>한다.`},



  {id:"falcon", name:{en:"The Falcon", ko:"매"}, ed:"4", baseDiv:3,

   rankStat:"survival", ability:{en:"Bird's Eye View", ko:"조감"}, marks:[3,8],

   gain:"무작위 패밀리어 뽑기 · <b>☾ Night 밤 덱</b>에서 발견",

   readout:(r)=>[{lab:"공개 카드 수 · 랭크 ÷ 2", val:FR(r)},

                 {lab:"덱 아래로 되돌리기", val:Math.floor(r/3)}],

   desc:`<b>Skill 기술 페이즈</b>에 <b>대성공</b>할 때마다,

     원하는 덱 <b>하나</b>의 맨 위에서 <b>Bird's Eye View 랭크의 절반</b>만큼

     카드를 공개할 수 있다(<b>최소 1</b>).<br>

     <b>3랭크</b>부터 <b>3랭크마다</b> 공개한 카드 중 <b>1장</b>을 덱 <b>맨 아래</b>에 놓을 수 있다.<br>

     <b>8랭크</b> — 이렇게 공개한 <b>Encounter조우</b>를 이번 턴 자신의

     <b>Circumstance상황</b>으로 삼아 맞서고 <kw>ambush</kw>할 수 있다.`},



  {id:"canine", name:{en:"The Canine", ko:"개"}, ed:"4", baseDiv:3,

   rankStat:"navigate", ability:{en:"Scout", ko:"정찰"}, marks:[5,7],

   gain:"무작위 패밀리어 뽑기 · <b>Village 마을 / Monastery 수도원</b>에서 구매",

   readout:(r)=>[{lab:"Stat Test 목표 · 랭크", val:r},{lab:"Time 시간 · 랭크 ÷ 2", val:FR(r)}],

   desc:`<b>Movement 이동 페이즈</b>에 <b>Scout</b> 랭크로 <b>스탯 굴림</b>을 한다.

     성공하면 <b>하나</b>를 고른다 — <b>Time시간</b>을 <b>Scout 랭크의 절반</b>만큼 얻기 ·

     이번 턴 모든 이동 유형의 속도를 <b>1</b> 올리기(<b>Camping야영</b> 포함) ·

     이번 턴 <b>얼마나 멀리 움직이든</b> <b>Moving Cautiously 조심스러운 이동</b>의 효과 얻기.<br>

     <b>5랭크</b> — 그룹의 <kw>wander</kw> · <kw>roam</kw>이 일어날 때마다 <b>방향을 직접 고를</b> 수 있다.<br>

     <b>7랭크</b> — <b>게임 턴당 1회</b>까지, <b>음식 2</b>를 써서

     <b>Circumstance상황</b> 주사위 결과를 <b>1</b> 바꿀 수 있다.`},



  /* ── 5편 ─────────────────────────────────────────────────────────── */

  {id:"chochinbi", name:{en:"Chochinbi", ko:"초친비"}, ed:"5",

   rankStat:"secondMastery", ability:{en:"Night Vision", ko:"야간 시야"}, marks:[6,8],

   readout:(r)=>[{lab:"Negate 횟수 · 게임 턴당", val:Math.floor(r/3)},

                  ...(r>=6?[{lab:"Tier I 추가", val:"+1"}]:[]), ...(r>=8?[{lab:"Tier II 추가", val:"+1"}]:[])],

   desc:`게임 턴당 <b>랭크 ÷ 3</b>(내림)회까지, <kw>consume</kw>로 자원을 잃는 효과를 <kw>negate</kw>한다 —

     <b>그룹이 스스로 발동한 것이라도</b> 막는다.

     다만 그룹이 <b>Defender 방어자에게 자원을 쓴 경우</b>에는 발동하지 않는다.<br>

     <b>6랭크</b> — <b>Tier I</b> 자원을 받을 때마다 <b>1 더</b> 얻는다.<br>

     <b>8랭크</b> — 여기에 더해 <b>Tier II</b> 자원을 받을 때마다 <b>1 더</b> 얻는다(두 효과가 함께 남는다).<br>

     이 추가 획득은 그룹이 <kw>harvest</kw>할 때는 작동하지 않는다.`},

  {id:"guardian", name:{en:"Guardian", ko:"수호자"}, ed:"5",

   rankStat:"firstMastery", ability:{en:"Katana Swipe", ko:"카타나 베기"}, marks:[4,8],

   readout:(r)=>[{lab:"Power 위력", val:"+"+FR(r)}],

   desc:`Guardian을 아무 <b>Defender 방어자</b>에게 <kw>equip</kw>처럼 배치할 수 있다.

     배치된 동안에도 이 랭크는 <b>그룹에 있는 패밀리어와 똑같이</b> 올릴 수 있다.<br>

     장비된 동안 그 Defender 방어자의 <b>Power 위력</b>이 <b>랭크 ÷ 2</b>만큼 오른다.<br>

     장비된 Defender 방어자가 <b>파괴되면</b> 그룹으로 돌아온다.<br>

     <b>4랭크 · 8랭크</b> — 이 랭크를 써서 Defender 방어자를 <b>추가로</b> <kw>bolster</kw>하거나

     <b>Pilot 조종</b>할 수 있다.`},

  {id:"hainu",          name:{en:"Hainu",             ko:"하이누"},       ed:"5", desc:""},

  {id:"littleDragon",   name:{en:"Little Dragon",     ko:"작은 용"},      ed:"5", desc:""},

  {id:"legendaryYoakai",name:{en:"Legendary Yoakai",  ko:"전설의 요괴"},  ed:"5", desc:""},

  {id:"panda",          name:{en:"Panda",             ko:"판다"},         ed:"5", desc:""},

  {id:"nineTailedFox",  name:{en:"Nine-Tailed Fox",   ko:"구미호"},       ed:"5", desc:""},

  {id:"kodama",         name:{en:"Kodama",            ko:"코다마"},       ed:"5", desc:""},

  {id:"ginkoKinko",     name:{en:"Ginko & Kinko",     ko:"긴코 & 킨코"},  ed:"5", desc:""},

  {id:"itachi",         name:{en:"Itachi",            ko:"이타치"},       ed:"5", desc:""},

  {id:"monkey",         name:{en:"Monkey",            ko:"원숭이"},       ed:"5", desc:""},

  {id:"crane",          name:{en:"Crane",             ko:"학"},           ed:"5", desc:""},

];

/* 규칙서 공통 — 값이 절반이 되거나 분수로 나뉘면 **내림하되 최소 1** 이다.
   (4편 규칙서 73쪽 · 5편 97쪽 "Rounding Numbers", 따로 언급이 없는 한 전부 이 규칙)
   readout 에서 랭크를 나눌 때는 소수로 두지 말고 반드시 이걸 거친다. */
const FR = (n, div = 2) => Math.max(1, Math.floor(n / div));

/* 육각형 칸의 골드 비용 — 전 직업 공용. 그룹별 시작값에서 칸마다 1씩 오른다.
   직업마다 다른 값을 쓰게 되면 그 직업에만 hexStart 를 적어 덮어쓴다. */
const HEX_START = {vital:2, combat:4, skill:3};

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
/* Greater Aspect 위대한 양상 — 4편 수록. 양상과 같은 틀이되 판을 크게 바꾼다.
   foodMod 는 음식 소모량 보정, foodSet 은 소모량을 그 값으로 아예 바꾸는 것(New Food Rating).
   축복은 결이 다른 갈래라 kind 로 갈라 둔다.
   ※ 능력치 보정(mods)은 카드 사진의 숫자 칸이 작아 아직 넣지 않았다 — 확인 후 채운다. */
const GREATER_ASPECTS = [
  {id:"damned", name:{en:"Damned",ko:"저주받은 자"}, ed:"4",
   mods:{health:3,energy:1,attack:2,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:1},
   freeRanks:{n:1, group:"mastery"},
   flavor:"피부가 달라지고 눈은 붉어졌으며 두개골에서 뿔이 돋았다. 이제 악마의 피가 혈관을 흐른다.",
   desc:`<b>내면에 흐르는 지옥의 힘(공격)</b> — 적의 <kw>aegis</kw>를 넘어설 때
     당신이 가진 <b>공격 기어 업그레이드 수를 2 높은 것으로</b> 친다.
     피해나 다른 효과가 늘어나지는 않는다.<br>
     <b>악의에 찬 일격</b> — 적에게 피해를 줄 때마다 <st>health</st> <b>1</b>을 써서
     <st>attack</st> 랭크의 <b>2배</b>만큼 <st>energy</st> 피해를 더 줄 수 있다.
     적이 이 피해를 받으면 <b>다음 라운드에</b> 당신이 주는 모든 피해를
     <st>attack</st> 랭크만큼 <kw>boost</kw>한다.<br>
     <b>고통받는 영혼</b> — 당신의 생명력이 <b>랭크보다 높이</b> <kw>raise</kw>되어 있는 동안,
     당신의 <b>모든 능력 랭크가 절반</b>이 된다.`},

  {id:"lycan", name:{en:"Lycan",ko:"늑대인간"}, ed:"4", foodMod:1,
   mods:{health:0,energy:1,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:1,survival:1},
   flavor:"안에서 짐승이 뛰쳐나오려 몸부림친다.",
   desc:`<b>포식자의 본능(길찾기 · 생존 · 탐험)</b> — Skill 기술 페이즈에 <b>기술 굴림 3개를 모두 성공</b>한 게임 턴에는
     <b>상황 주사위 결과를 최대 2까지</b> 조정할 수 있다.<br>
     <b>변신</b> — <st>energy</st> <b>3</b>을 써서 <b>게임 턴이 끝날 때까지</b> 변신한다.
     변신하면 <st>health</st>을 <b>5</b> <kw>raise</kw>하고, <b>공격 · 방어 · 기술 랭크를 3</b> <kw>boost</kw>하며,
     <b>마스터리는 2랭크 낮은 것으로</b> 친다.<br>
     <b>내면의 야수</b> — <b>밤</b>에 전투에 들어갈 때마다 헥스 주사위를 굴린다. <b>헥스</b>가 나오면
     아직 변신 중이 아닐 때 <b>변신이 발동</b>한다(<st>energy</st>를 쓰지 않는다).
     변신 중에 <b>밤</b>에 능력을 선언할 때마다 <b>달 주사위</b>를 굴려 <b>3을 더한다</b>.
     그 결과가 <st>attack</st> 랭크보다 높으면, 대신 <b>무작위 대상</b>에게 공격 능력을 쓴다.`},

  {id:"vampire", name:{en:"Vampire",ko:"뱀파이어"}, ed:"4", foodNote:"아래 참조",
   mods:{health:3,energy:0,attack:1,defence:1,firstMastery:1,secondMastery:1,navigate:1,explore:1,survival:0},
   flavor:"어두운 힘의 샘이 영혼에 스며든다. 그것은 채워지지 않는 피의 갈증과 햇빛을 꺼리는 성질을 함께 가져온다.",
   desc:`<b>움직임이 흐릿하다(길찾기)</b> — <kw>evasion</kw> <b>10</b>을 얻는다.
     <st>navigate</st> 랭크만큼 <st>energy</st>를 써서 <b>1라운드</b> 동안 쓴 만큼 회피 수치를 낮출 수 있다.
     <b>목표가 된 뒤, 회피 굴림 전에</b> 쓸 수 있다.<br>
     <b>피의 갈증</b> — 당신의 <b>음식 미터가 갈증 미터</b>가 되며 <b>0</b>에서 시작한다.
     <b>매 턴이 시작될 때 갈증이 3 오른다</b>. 갈증이 <b>20</b>에 이르면 <b>죽는다</b>.
     치료를 제공하는 장소에서 <b>야영</b>할 때마다 갈증을 <b>5</b> 줄인다.
     <b>인간형 · 인간형 괴수 · 생물</b>을 쓰러뜨릴 때마다 그 <b>레벨의 2배</b>만큼 갈증을 줄인다.
     동료가 <kw>critical</kw> <st>health</st> 피해 <b>2</b>를 받아 당신의 갈증을 <b>5</b> 줄여 줄 수도 있다.<br>
     <b>약점</b> — <b>낮</b>에 이동하면 게임 턴이 끝날 때까지 <state>wounded</state> 가 된다
     (이 상태는 <b>제거할 수 없다</b>).`},

  {id:"blessed", name:{en:"Blessed",ko:"축복받은 자"}, ed:"4", kind:"blessed",
   mods:{health:1,energy:3,attack:0,defence:2,firstMastery:0,secondMastery:0,navigate:1,explore:0,survival:1},
   freeRanks:{n:1, group:"mastery"},
   flavor:"피부에서 천사 같은 빛이 나고 고요한 기운이 감돈다. 어둠의 존재들은 당신 앞에서 움츠러든다.",
   desc:`<b>내면에 흐르는 성스러운 힘(공격)</b> — 적의 <kw>aegis</kw>를 넘어설 때
     당신이 가진 <b>공격 기어 업그레이드 수를 2 높은 것으로</b> 친다.
     피해나 다른 효과가 늘어나지는 않는다.<br>
     <b>빛을 품다</b> — 전투 중 <st>energy</st> <b>4</b>를 써서 <b>2라운드</b> 동안
     <st>defence</st> 랭크의 <b>1/3</b>만큼 <st>health</st> <kw>regen</kw>을 그룹에게 주고,
     그 재생을 가진 동안 <b>행동 랭크를 1</b> <kw>boost</kw>한다.
     이것을 <b>전투에서의 유일한 행동</b>으로 선언하면 <st>energy</st> 비용이 <b>0</b>이 된다.<br>
     <b>어둠에 둘러싸이다</b> — 전투를 시작할 때 <b>적 하나마다 주사위 1개</b>를 굴린다.
     결과가 <b>홀수</b>면 그 적이 당신에게 <kw>hatred</kw>를 얻는다(<b>직업 종류가 아니라 당신</b>에게).`},

  {id:"zombie", name:{en:"Zombie",ko:"좀비"}, ed:"4", foodSet:0,
   mods:{health:3,energy:-1,attack:1,defence:2,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:2},
   flavor:"강령술이 너를 되돌려 놓았다. 몸은 뻣뻣하고 썩어 가지만, 정신의 조각은 아직 남아 있다 — 지금은.",
   desc:`<b>산 자를 먹고 산다(체력)</b> — 적에게 피해를 줄 때마다 <st>health</st> <b>1</b>을 <kw>heal</kw>한다.
     가진 <st>health</st> 랭크 <b>10마다</b> 그 회복량을 <b>1</b> <kw>boost</kw>한다.
     다만 <b>그 밖의 모든 회복 효과는 절반</b>으로 받는다.<br>
     <b>뛰지 않는 심장</b> — <kw>critical</kw> 피해를 받을 때, 그 피해가 <st>defence</st> 랭크보다 <b>낮으면</b>
     <b>일반 피해로 바꾼다</b>.<br>
     <b>끊어진 패턴</b> — 매 게임 턴 Villain 페이즈에 마스터리 하나를 골라 <b>랭크를 1 줄인다</b>.
     <b>6랭크 이하</b>인 마스터리가 줄어들 때마다 <st>attack</st> 랭크를 <b>1</b> 얻는다.
     마스터리는 <b>0까지</b> 줄어들 수 있다.`},

  {id:"ghost", name:{en:"Ghost",ko:"유령"}, ed:"4", foodSet:0,
   mods:{health:0,energy:5,attack:-1,defence:-1,firstMastery:2,secondMastery:2,navigate:1,explore:1,survival:0},
   flavor:"몸은 죽었지만 영혼은 떠나지 못했다.",
   desc:`<b>영체(에너지)</b> — 더 이상 <b>화폐 · 음식 · 아이템</b>을 지니거나 쓸 수 없고
     <b>새 기어 업그레이드</b>도 얻지 못한다. 다만 <b>파워업</b>은 그대로 얻는다.
     당신의 <st>health</st> 랭크는 <b>현재 것도 앞으로 얻을 것도</b> <st>energy</st> 랭크로 바뀐다.
     더 이상 <st>health</st>을 얻을 수 없고 <b>영구히</b> <state>tethered</state> 상태다.
     <state>drained</state> 를 뺀 <b>모든 상태에 면역</b>이다.<br>
     <b>킵세이크</b> — 당신의 킵세이크를 <b>뒤집어 그 힘을 얻는다</b>.
     아직 나오지 않은 킵세이크를 <b>하나 더</b> 뽑아 발동시킨다.<br>
     <b>현현</b> — <st>health</st> 피해를 받게 될 때, 대신 <b>그 절반</b>을 <st>energy</st> 피해로 받는다.
     또한 당신이 주는 <b>모든 피해가</b> <kw>energy drain</kw>으로 바뀐다.`},

  {id:"reanimated", name:{en:"Reanimated",ko:"되살아난 자"}, ed:"4", foodMod:1,
   mods:{health:2,energy:0,attack:3,defence:2,firstMastery:0,secondMastery:0,navigate:-1,explore:-1,survival:1},
   flavor:"온몸이 꿰맨 자국투성이고, 많은 부분이 당신의 것이 아니다.",
   desc:`<b>보강된 몸(방어)</b> — <st>defence</st> 랭크의 <b>1/3</b>만큼 <kw>block</kw>을 얻고,
     전투 중 <st>survival</st> 기술 굴림에 <b>−1</b> 보너스를 받는다.<br>
     <b>꿰매 붙인 능력</b> — 게임 턴당 <b>1회</b>, <st>health</st> <b>1</b>을 쓰고
     <b>사용하지 않는 종족 하나</b>를 무작위로 뽑는다. 턴이 끝날 때까지 그 <b>종족 능력을 쓸 수 있고</b>
     (비용은 그대로 지불한다), 그 종족이 <b>같은 스탯에 주는 보정의 2배</b>만큼
     당신의 스탯 하나를 <kw>boost</kw>하며, 그 종족의 <b>숙적</b>도 얻는다.
     턴이 끝나면 그 종족 카드를 <b>덱 맨 아래로</b> 되돌린다.<br>
     <b>약해진 패턴</b> — <st>health</st>이 <b>절반 이하</b>인 동안 <st>health</st> 피해를 받을 때마다,
     <kw>piercing</kw> <st>energy</st> 피해 <b>2</b>도 함께 받는다.`},
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
    // ===== 확장 종족 =====
    // --- Return to the Domain of Mirza Noctis ---
    archon:{ id:"archon", ed:"4", exp:"H", name:{en:"Archon",ko:"아르콘"},
      favoredEnemy:{en:"Spirit",ko:"영혼"}, foodUse:0,
      mods:{health:4,energy:4,attack:0,defence:0,firstMastery:1,secondMastery:1,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`전투당 <b>1회</b>, <st>energy</st> 2를 소모해 <b>당신과 동료 하나</b>를 감싸는 <b>보호의 원</b>을 만든다.
    원은 <b>2라운드</b> 동안 남으며, 그 안의 대상을 노린 공격은 피해를 <b>3 덜</b> 주고
    <kw>piercing</kw>·<kw>critical</kw> 같은 효과가 <b>사라진다</b>.`,
        track:{type:"check"}},
      flavor:"아르콘은 선의 영역에서 온 천사 같은 존재다." },
    ettin:{ id:"ettin", ed:"4", exp:"H", name:{en:"Ettin",ko:"에틴"},
      favoredEnemy:{en:"Creature",ko:"생물"}, foodUse:4,
      mods:{health:6,energy:0,attack:5,defence:0,firstMastery:0,secondMastery:1,navigate:1,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`숙적을 <b>한 번에 하나만</b> 가질 수 있다(라운드마다 다시 고를 수 있다).
    게임 턴당 <b>2회</b>, <st>health</st> 2를 소모해 <b>공격 행동과 다른 행동을 함께</b> 하거나,
    당신이 받는 <kw>critical</kw> 피해를 <kw>negate</kw>한다.`,
        track:{type:"count",max:2}},
      flavor:"에틴은 머리가 둘 달린 — 주로 자기들끼리 다투는 — 지독하게 우둔한 싸움꾼이다." },
    incubus:{ id:"incubus", ed:"4", exp:"H", name:{en:"Incubus",ko:"인큐버스"},
      bribe:true,   /* 방어 육각형에 뇌물 표시 */
      favoredEnemy:{en:"Spirit",ko:"영혼"}, foodUse:1,
      mods:{health:6,energy:4,attack:1,defence:0,firstMastery:0,secondMastery:1,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<b>Bribe 뇌물</b> 능력을 가진다(방어 육각형에 표시된다).
    당신이나 동료가 <b>기술 굴림에 실패</b>하면, <st>health</st>을 <b>최대 3</b>까지 소모해
    소모한 만큼 <b>굴림값을 낮출</b> 수 있다.`,
        track:null},
      flavor:"인큐버스는 여러 종족을 홀리는, 명석하고 오만한 미남 악마다." },
    legion:{ id:"legion", ed:"4", exp:"H", name:{en:"Legion",ko:"군단"},
      favoredEnemy:{en:"Construct",ko:"구성물"}, foodUse:0,
      mods:{health:4,energy:4,attack:1,defence:1,firstMastery:1,secondMastery:1,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<b>Blood Magic 피의 마법 2티어</b>(딸린 주문 포함)를 갖고 시작한다.
    죽기 전까지 <b><kw>critical wound</kw>를 5개</b>까지 견딜 수 있다.`,
        track:null},
      flavor:"군단은 다른 차원에서 온 악마로, 제 뜻대로 움직이지 않는 거대한 힘을 품고 있다." },
    leprechaun:{ id:"leprechaun", ed:"4", exp:"H", name:{en:"Leprechaun",ko:"레프러콘"},
      favoredEnemy:{en:"Magical Nature",ko:"마법 생물"}, foodUse:1,
      mods:{health:0,energy:2,attack:1,defence:1,firstMastery:2,secondMastery:0,navigate:0,explore:4,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>최대 3회</b>, <b>골드 1</b>을 소모해 <b>피해 굴림 · 기술 굴림 · 환경 굴림</b>의
    결과를 <b>1 바꾼다</b>. 바꾼 결과로 <b>헥스플로드</b>가 터져도 그대로 인정된다.`,
        track:{type:"count",max:3}},
      flavor:"레프러콘은 장난치기를 좋아하는, 홀로 지내는 요정의 일종이다." },
    minotaur:{ id:"minotaur", ed:"4", exp:"H", name:{en:"Minotaur",ko:"미노타우로스"},
      favoredEnemy:{en:"Monstrous Humanoid",ko:"인간형 괴수"}, foodUse:3,
      mods:{health:3,energy:0,attack:3,defence:0,firstMastery:1,secondMastery:1,navigate:4,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <st>health</st> 3을 소모해 적을 <b>짓밟는다</b> —
    그 적의 <b>행동 결과를 1 바꾸고</b>, 더해서 <b>전투가 끝날 때까지</b> 그 적의
    <kw>defend</kw> 값을 <b>3 낮춘다</b>.`,
        track:{type:"check"}},
      flavor:"미노타우로스는 사나운 괴물이다." },
    redcap:{ id:"redcap", ed:"4", exp:"H", name:{en:"Redcap",ko:"레드캡"},
      favoredEnemy:{en:"Undead",ko:"언데드"}, foodUse:2,
      mods:{health:3,energy:6,attack:1,defence:0,firstMastery:0,secondMastery:0,navigate:2,explore:2,survival:2},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`적이 <b>쓰러지는 그 라운드</b>에 그 적의 <b>Vital 생명력</b>을 깎을 때마다,
    당신이 주는 피해를 <kw>strengthen</kw>로 <b>영구히 1</b> 올린다.`,
        track:null},
      flavor:"레드캡은 적의 피로 머리를 붉게 물들인, 노움만 한 살의로 가득 찬 요정의 일종이다." },
    solarElf:{ id:"solarElf", ed:"4", exp:"H", name:{en:"Solar Elf",ko:"태양 엘프"},
      favoredEnemy:{en:"Creature",ko:"생물"}, foodUse:2,
      mods:{health:2,energy:4,attack:1,defence:0,firstMastery:1,secondMastery:2,navigate:2,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <st>energy</st> 3을 소모해 <b>공개된 카드를 2장까지 버리거나</b>,
    고른 대상의 <kw>critical wound</kw> <b>1개를 제거</b>한다.`,
        track:{type:"check"}},
      flavor:"솔라리라고도 불리는 태양 엘프는 신성한 고대의 장로로 여겨져 숭배받는다." },
    succubus:{ id:"succubus", ed:"4", exp:"H", name:{en:"Succubus",ko:"서큐버스"},
      bribe:true,   /* 방어 육각형에 뇌물 표시 */
      favoredEnemy:{en:"Humanoid",ko:"인간형"}, foodUse:1,
      mods:{health:4,energy:6,attack:0,defence:1,firstMastery:1,secondMastery:0,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<b>Bribe 뇌물</b> 능력을 가진다(방어 육각형에 표시된다).
    당신이나 동료가 <b>기술 굴림에 실패</b>하면, <st>energy</st>를 <b>최대 3</b>까지 소모해
    소모한 만큼 <b>굴림값을 낮출</b> 수 있다.`,
        track:null},
      flavor:"서큐버스는 여러 종족을 홀리는, 명석하고 오만한 미녀 악마다." },
    rubyGolem:{ id:"rubyGolem", ed:"4", exp:"R", name:{en:"Ruby Golem",ko:"루비 골렘"},
      favoredEnemy:{en:"Choose 1",ko:"택 1"}, foodUse:0,
      mods:{health:4,energy:2,attack:2,defence:2,firstMastery:0,secondMastery:0,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<kw>critical</kw> 피해를 받을 때 <st>health</st>이나 <st>energy</st> 3을 소모해
    그 피해를 <kw>reflect</kw>하거나 <kw>negate</kw>한다.`,
        track:null},
      flavor:"루비 골렘은 아주 드문 거대 수정 구성물이다. 피를 다루는 마법사가 빚었다는 소문이 돌며, 자의식이 있다고도 한다." },
    youngRedDragon:{ id:"youngRedDragon", ed:"4", exp:"R", name:{en:"Young Red Dragon",ko:"어린 레드 드래곤"},
      favoredEnemy:{en:"Choose 1",ko:"택 1"}, foodUse:4,
      mods:{health:3,energy:3,attack:1,defence:1,firstMastery:1,secondMastery:1,navigate:2,explore:1,survival:2},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임을 시작할 때 <b>숙적 파워업</b> 하나를 찾아 얻는다.
    숙적 효과를 <b>하나만 고르는 대신 전부</b> 적용할 수 있다.`,
        track:null},
      flavor:"레드 드래곤은 탐욕스럽고, 저보다 못한 것들을 괴롭히기를 즐긴다." },
    youngSilverDragon:{ id:"youngSilverDragon", ed:"4", exp:"R", name:{en:"Young Silver Dragon",ko:"어린 실버 드래곤"},
      favoredEnemy:{en:"Choose 1",ko:"택 1"}, foodUse:4,
      mods:{health:2,energy:4,attack:0,defence:0,firstMastery:2,secondMastery:2,navigate:2,explore:2,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임을 시작할 때 원하는 <b>숙적</b>과 <b>Familiar 패밀리어</b>를 고른다.
    그 패밀리어의 <b>랭크가 오를 때마다</b>, 그 패밀리어의 <b>기준 능력치</b>(당신의 같은 능력치)도 함께 오른다.`,
        track:null},
      flavor:"불가사의한 실버 드래곤은 모든 문화를 존중한다. 대개 여느 사람들 틈에 숨어 지낸다." },
    // --- Return to Caprakan ---
    chaneque:{ id:"chaneque", ed:"5", exp:"H", name:{en:"Chaneque",ko:"차네케"},
      freeRanks:{n:3,group:"skill"},
      favoredEnemy:{en:"",ko:"기본 원소 중 택 1"}, foodUse:1,
      mods:{health:0,energy:4,attack:0,defence:0,firstMastery:2,secondMastery:2,navigate:0,explore:0,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <st>energy</st> 4를 소모해 그룹의 <b>Range 사정거리 밖</b>에 있는 공개된 <b>원소 · 백금 · 샤먼</b> 토큰을 즉시 얻는다.`,
        track:{type:"check"}},
      flavor:"이 작은 정령 같은 존재는 원소의 힘에 묶인 자연계의 수호자다." },
    hexanthi:{ id:"hexanthi", ed:"5", exp:"H", name:{en:"Hexanthi",ko:"헥산티"},
      favoredEnemy:{en:"Monstrous Humanoid",ko:"인간형 괴수"}, foodUse:2,
      mods:{health:1,energy:1,attack:4,defence:0,firstMastery:0,secondMastery:0,navigate:2,explore:0,survival:3},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`그룹이 가진 <b>서로 다른 숙적 하나마다</b>, 당신이 숙적에게 주는 피해가 <kw>boost</kw> <b>1</b> 된다. 게임 턴당 <b>1회</b>, <st>energy</st> 3을 소모해 당신의 숙적 유형 하나를 <b>전투가 끝날 때까지</b> 바꾼다.`,
        track:{type:"check"}},
      flavor:"헥산티는 여왕이 다스리는, 고도로 집단화되고 영역 의식이 강한 이족보행 개미다." },
    saurian:{ id:"saurian", ed:"5", exp:"H", name:{en:"Saurian",ko:"사우리안"},
      freeRanks:{n:4,group:"combat"},
      favoredEnemy:{en:"Creature",ko:"생물"}, foodUse:4,
      mods:{health:4,energy:4,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임을 시작하기 전에 <b>기본 Element 원소</b> 하나를 고른다. 그 원소의 <kw>augment</kw> 티어를 얻을 때마다 <b>1 더</b> 얻는다. 당신의 보강 티어는 <b>최대 5</b>까지 오를 수 있다.`,
        track:null},
      flavor:"사우리안 혈통은 공룡이 세상을 지배하던 아주 오래된 시대부터 이어져 왔다. 이 이족보행 생명체들은 저마다 다른 형태를 지닌다." },
    voidTouched:{ id:"voidTouched", ed:"5", exp:"H", name:{en:"Void Touched",ko:"공허에 닿은 자"},
      favoredEnemy:{en:"Horde & Swarm",ko:"무리 · 떼"}, foodUse:0,
      mods:{health:4,energy:4,attack:1,defence:1,firstMastery:0,secondMastery:0,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <b>전투가 아닐 때</b> <st>energy</st> 4를 소모해 <b>Void 공허 원소 1개</b>를 <b>Aetherial Ore 에테르 광석</b>인 것처럼 <kw>consume</kw>할 수 있다.`,
        track:{type:"check"}},
      flavor:"이 원초적인 원소 생명체는 태피스트리 차원 바깥에서 왔다. 인간형인지조차 흐릿한 이질적인 본성 탓에 다른 종족과 어울리지 못한다." },
    youngGreenDragon:{ id:"youngGreenDragon", ed:"5", exp:"R", name:{en:"Young Green Dragon",ko:"어린 그린 드래곤"},
      favoredEnemy:{en:"",ko:"택 1"}, foodUse:4,
      mods:{health:3,energy:6,attack:1,defence:2,firstMastery:1,secondMastery:1,navigate:3,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<kw>soar</kw>을 얻는다. 그룹이 <b>Tier I 자원</b>을 얻으면 <b>1개 더</b> 얻는다. 게임을 시작하기 전에 <b>기본 Element 원소</b> 하나를 골라 그 원소의 <kw>augment</kw> <b>1</b>을 얻는다.`,
        track:null},
      flavor:"그린 드래곤은 지성체와의 유대를 대개 저버리고 오직 영토만 생각한다." },
    // --- Return to Ishidan ---
    hitodama:{ id:"hitodama", ed:"5", exp:"H", name:{en:"Hitodama",ko:"히토다마"},
      favoredEnemy:{en:"Construct & Spirit",ko:"구성물 · 영혼"}, foodUse:0,
      mods:{health:0,energy:6,attack:0,defence:3,firstMastery:0,secondMastery:1,navigate:0,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<kw>soar</kw>을 얻는다. 마스터리를 쓸 때 <st>energy</st> 대신 <st>health</st>을 소모할 수 있다. <b><st>energy</st>가 0이 될 때만</b> 죽는다.`,
        track:null},
      flavor:"히토다마는 목이 잘려 죽은 영혼이 떠도는 원소령이다." },
    kitsune:{ id:"kitsune", ed:"5", exp:"H", name:{en:"Kitsune",ko:"키츠네"},
      favoredEnemy:{en:"Spirit",ko:"영혼"}, foodUse:2,
      mods:{health:0,energy:2,attack:0,defence:0,firstMastery:3,secondMastery:3,navigate:1,explore:0,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <b>골드 1</b>을 써서 <st>health</st>과 <st>energy</st>를 <st>defence</st> 랭크의 <b>1/3</b>만큼 <kw>heal</kw>한다. 이 능력을 쓸 때마다(<b>최대 6회</b>) 회복량을 <kw>strengthen</kw>로 <b>1씩</b> 올린다.`,
        track:{type:"count",max:6}},
      flavor:"키츠네는 영리하고 현명하며, 세월이 흐를수록 강해진다." },
    oni:{ id:"oni", ed:"5", exp:"H", name:{en:"Oni",ko:"오니"},
      favoredEnemy:{en:"Humanoid",ko:"인간형"}, foodUse:3,
      mods:{health:6,energy:3,attack:4,defence:0,firstMastery:1,secondMastery:0,navigate:0,explore:1,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴마다 <b>1회</b>, <st>health</st> 1을 소모해 <state>berserk</state>를 얻는다. 이 효과는 <kw>sustain</kw>할 수 있지만, <st>energy</st>가 아니라 <st>health</st>을 소모한다.`,
        track:{type:"check"}},
      flavor:"이 사납고 천성이 악한 요괴는 거인만큼 거대하다. 오니는 이 땅에 재앙을 불러오곤 한다." },
    sarugami:{ id:"sarugami", ed:"5", exp:"H", name:{en:"Sarugami",ko:"사루가미"},
      favoredEnemy:{en:"Humanoid",ko:"인간형"}, foodUse:2,
      mods:{health:1,energy:4,attack:2,defence:0,firstMastery:0,secondMastery:1,navigate:1,explore:2,survival:2},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <st>energy</st> 2를 소모해 <b>고른 영웅을 노린 공격</b>을 <kw>negate</kw>하고, 이어서 둘 중 하나를 한다 — 공격자에게 <st>survival</st> 랭크의 <b>2배</b>만큼 피해를 주거나, <st>outlast</st>을 <b>2까지</b> 조정한다.`,
        track:{type:"check"}},
      flavor:"사루가미는 원숭이 같은 생김새와 성질을 지닌 초자연적 인간형 생명체다." },
    prismaticDragon:{ id:"prismaticDragon", ed:"5", exp:"R", name:{en:"Prismatic Dragon",ko:"프리즈매틱 드래곤"},
      favoredEnemy:{en:"",ko:"택 1"}, foodUse:4,
      mods:{health:4,energy:3,attack:1,defence:2,firstMastery:0,secondMastery:0,navigate:2,explore:4,survival:2},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<kw>soar</kw>을 얻고, <b>서로 다른 기본 원소 <kw>augment</kw>을 2개 이상</b> 가질 수 있다. 게임 턴당 <b>2회</b>, <st>energy</st> 2를 소모해 <b>게임 턴이 끝날 때까지</b> 영웅 하나의 <b>보강 티어를 2</b> 올린다.`,
        track:{type:"count",max:2}},
      flavor:"프리즈매틱 드래곤은 드물고, 다른 지성체와 어울리기를 좋아하는 호기심 많은 드래곤이다." },
    // --- 특전 (펀딩 특별판) — 4·5편 어느 쪽 수록도 아니다 ---
    lemming:{ id:"lemming", exp:"P", name:{en:"Lemming",ko:"레밍"},
      favoredEnemy:{en:"",ko:"능력 참조"}, foodUse:1,
      mods:{health:1,energy:1,attack:0,defence:2,firstMastery:0,secondMastery:2,navigate:2,explore:2,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`당신의 숙적은 <b>동료들의 모든 숙적</b>이다. 전투 <b>첫 라운드에 방어하지 않으면</b> <kw>energy drain</kw> <b>2</b>를 받는다. 당신과 <b>같은 행동을 하는 동료 하나마다</b> 이번 행동의 랭크를 <kw>boost</kw> <b>3</b> 한다.`,
        track:null},
      flavor:"레밍은 키가 작고 비교적 유순하다." },
    elepharim:{ id:"elepharim", exp:"P", name:{en:"Elepharim",ko:"엘레파림"},
      favoredEnemy:{en:"",ko:"능력 참조"}, foodUse:4,
      mods:{health:1,energy:3,attack:3,defence:0,firstMastery:3,secondMastery:0,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>2회</b>, 당신이 <b>죽으려 할 때</b> <st>health</st> 3으로 되살아나고, <b>전투가 끝날 때까지</b> 당신의 공격이 <b>피해 +2</b>를 준다.<br>적을 물리칠 때마다 <st>energy</st> 테스트를 한다. 성공하면 <b>그 적 유형을 숙적에 추가</b>한다.`,
        track:{type:"count",max:2}},
      flavor:"고도로 영적인 엘레파림은 알파 리더가 이끄는 작은 부락을 이루고 산다." },
    rhincero:{ id:"rhincero", exp:"P", name:{en:"Rhincero",ko:"린세로"},
      favoredEnemy:{en:"",ko:"능력 참조"}, foodUse:4,
      mods:{health:3,energy:1,attack:0,defence:3,firstMastery:0,secondMastery:3,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`<st>health</st>이 <b>10 이상</b>인 동안, <st>defence</st> 랭크의 <b>절반</b>만큼 <kw>reflect</kw>를 얻고 <b>모든 적을 숙적으로 취급</b>한다.<br>게임 턴당 <b>1회</b>, <st>energy</st> 2를 써서 <b>전투가 끝날 때까지</b> 당신의 피해를 <kw>boost</kw> <b>3</b> 하거나, 방금 한 <b>스탯 굴림을 다시 한다</b>.`,
        track:{type:"check"}},
      flavor:"린세로는 영역 의식이 매우 강하고 저돌적인 종족이다." },
    pandari:{ id:"pandari", exp:"P", name:{en:"Pandari",ko:"판다리"},
      favoredEnemy:{en:"Spirit",ko:"영혼"}, foodUse:3,
      mods:{health:3,energy:3,attack:0,defence:3,firstMastery:0,secondMastery:1,navigate:2,explore:2,survival:0},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴마다 <b>횟수 제한 없이</b> 음식을 <b>소모량만큼</b> 먹을 수 있다. 이렇게 치른 <b>소모량 1회분마다</b> 다음 중 하나를 고른다 — 이번에 굴릴 <b>스탯 굴림 −2</b> · <st>energy</st> <b>2</b> <kw>raise</kw> · 당신이 주는 <b>피해 +2</b>.`,
        track:null},
      flavor:"판다리는 몹시 쾌활하고 즐거움을 사랑하는 거대한 판다족이다." },
    emeraldGolem:{ id:"emeraldGolem", exp:"PR", name:{en:"Emerald Golem",ko:"에메랄드 골렘"},
      favoredEnemy:{en:"",ko:"택 1"}, foodUse:0,
      mods:{health:2,energy:4,attack:0,defence:0,firstMastery:2,secondMastery:2,navigate:1,explore:1,survival:1},
      ability:{name:{en:"Racial Ability",ko:"종족 능력"},
        desc:`게임 턴당 <b>1회</b>, <b>피해를 받을 때</b> 그 피해를 <kw>negate</kw>하고 그 피해를 입힌 대상에게 <b>2배</b>로 되돌린다. 당신은 <b>Void 공허 피해에 <kw>immune</kw></b> 이다.`,
        track:{type:"check"}},
      flavor:"에메랄드 골렘은 거대한 수정 구조물로, 땅속 깊은 곳에서 압력이 꼭 맞는 순간에 태어난다는 소문이 있다." },
    // 다음 종족은 여기에 같은 형식으로 추가
  },

  classes: {
    warlock: {
      id:"warlock", ed:"4",
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
             val: (E.lv("firstMastery")*2 + (E.on(2)? FR(E.lv("attack")) : 0)) },
            ...(E.on(5)? [{lab:"+Energy 에너지", color:"energy", val:E.lv("attack")}] : [])
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
            {lab:"Damage 피해", color:"neutral", val:(E.lv("attack")+E.lv("secondMastery"))},
            {lab:"Heal 회복", color:"energy", val:FR(E.lv("attack")+E.lv("secondMastery"),3)},
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
              ...(fm>=7 ? [{lab:"Attack boost (마스터리2 후)", color:"attack", val:FR(fm)}] : [])
            ];
          },
          desc:`이번 라운드에 {attack} 행동을 <b>두 번</b> 사용한다. 대상이 <kw>energetic</kw> 상태가 아니면 대상의 <kw>block</kw>·<kw>defend</kw>·<kw>reflect</kw>를 {firstMastery} 랭크만큼 감소시킨다. 직전 라운드에 {secondMastery} 사용 시 이번 라운드 적들의 타겟 수가 <b>1</b> 감소한다(최소 1). <lvl n="7">직전 라운드에 {secondMastery} 사용 시 이번 라운드 {attack}의 피해를 {firstMastery} 랭크 <b>절반</b>만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Magnified Beam",ko:"광선 집중"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery"))},
            {lab:"+Damage (마스터리1 후)", color:"defence", val:E.lv("defence")},
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
      special:{ko:`아이템을 판매하는 곳에 있을 때 게임 턴당 <b>1회</b>: <st>energy</st> 2를 소모해 원하는 <b>마스터리</b>의 스탯 굴림을 한다. 성공하면 해당 마스터리 랭크의 <b>1/3</b>만큼 <b>골드</b>를 얻는다. 결과가 <b>헥스(Hex)</b>면 추가로 파워 업 하나를 뽑아 모든 영웅에게 적용한다.`},
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
          desc:`숙적에게 그룹이 주는 <st>health</st>·<st>energy</st>·<st>influence</st> 피해를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. 또는 적의 <st>outlast</st>을 감소시키기 위해 선택한 스탯 굴림을 자동으로 성공시킨다. 이 마스터리는 <kw>sustain</kw>할 수 있다.`,
          checks:[
            {at:6, txt:`<kw>sustain</kw> 중일 때는 모든 영웅이 원하는 임시 기어 업그레이드 <b>1</b>을 받는다.`},
            {at:9, txt:`<kw>sustain</kw> 중일 때 모든 영웅이 원하는 임시 기어 업그레이드 <b>1</b>을 추가로 받는다.`},
          ],
        },
        secondMastery:{base:2, name:{en:"Song of the Troubadour",ko:"서정가"}, cost:1, boostAt:[4,8],
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 비전투·동료 에너지", color:"energy", val:FR(E.lv("secondMastery"),3)},
            {lab:"Block 전투·그룹", color:"defence", val:FR(E.lv("secondMastery"))},
          ],
          desc:`<b>비전투:</b> 모든 동료의 <st>energy</st>를 {secondMastery} 랭크 <b>1/3</b>만큼 <kw>heal</kw>하거나, 이번 게임 턴에 영웅 하나의 모든 스탯 굴림에 <b>-1</b> 보너스를 준다. <b>전투:</b> 그룹이 {secondMastery} 랭크 <b>1/2</b>만큼 <kw>block</kw>을 얻는다. 이 마스터리는 <kw>sustain</kw>할 수 있다. <b>4·8랭크에 아래에서 하나 선택(중복 가능):</b>`,
          boosts:[
            {stack:true, txt:`모든 동료가 <st>energy</st> <kw>regen</kw> 2를 획득한다.`},
            {stack:true, txt:`모든 영웅은 스탯 굴림에 <b>-2</b> 보너스를 받는다.`},
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
            {lab:"Heal 비전투 회복", color:"health", val:FR(E.lv("firstMastery"),3)},
            {lab:"Boost 재사용 증폭", color:"attack", val:E.lv("firstMastery")},
            /* 변신 중인 또다른 자아의 값에서 자동 계산 */
            {lab:"변신 최대 체력 +", color:"health", val:(E.sel("alterEgo").health? FR(E.sel("alterEgo").health) : 0)},
            {lab:"목표 주사위 페널티", color:"neutral", val:E.sel("alterEgo").level||0},
          ],
          desc:`<b>비전투:</b> 대상의 <st>health</st>을 {firstMastery} 랭크의 <b>1/3</b>만큼 <kw>heal</kw>한다. <b>전투:</b> 전투가 끝날 때까지 원하는 <b>또다른 자아</b>로 변신한다. 현재·최대 <st>health</st>이 그 또다른 자아 <st>health</st>의 <b>절반</b>만큼 올라가고, 목표 주사위에 그 레벨만큼 페널티를 받는다. 전투 중 {firstMastery}를 다시 사용하면 다음 공격의 피해를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. <lvl n="6">이 라운드에 {attack} 또는 {defence}를 사용할 수 있다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Speciality",ko:"특기"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Skill 기술 보너스", color:"neutral", val:"-1"},
            {lab:"Boost 전투 증폭", color:"attack", val:E.lv("secondMastery")},
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
            {lab:"Boost 동료 공격·방어", color:"attack", val:E.lv("firstMastery")},
            ...(E.lv("firstMastery")>=8?[{lab:"Boost 대상 행동", color:"attack", val:E.lv("attack")}]:[]),
          ],
          desc:`턴당 <b>1회</b>까지 사용해, 당신의 <b>Time시간</b>을 <b>3</b> 늘리거나 이번 턴 모든 이동 유형의 속도를 <b>1</b> 올린다(<b>Camping야영</b> 포함). <b>Event 페이즈</b>에 사용해 쓰지 않은 이동력을 원하는 만큼 쓸 수도 있다. 이 초과 이동은 그룹의 이동 유형을 바꾸지 않는다. <b>전투:</b> 이번 라운드 동료 하나의 <act>attack</act>·<act>defend</act> 랭크를 {firstMastery} 랭크만큼 <kw>boost</kw>한다. <lvl n="5">이번 턴에 {defence}도 사용할 수 있다.</lvl> <lvl n="8">다음 라운드에 대상 하나의 행동 랭크를 {attack} 랭크만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Umbral Arrow",ko:"암영 화살"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 체력·에너지", color:"health", val:FR(E.lv("secondMastery"))},
            ...(E.lv("secondMastery")>=6?[{lab:"Reflect 반사", color:"defence", val:FR(E.lv("defence"),3)}]:[]),
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
            {lab:"Regen 전투 재생", color:"health", val:FR(E.lv("firstMastery"))},
            {lab:"Essence 추가 소모", color:"defence", val:Math.floor(E.lv("defence")/3)},
          ],
          desc:`<b>비전투:</b> <b>정수</b> <b>1</b>장을 버리고, 그 카드의 효과를 영웅 하나에게 해당 페이즈가 끝날 때까지 부여한다. <b>전투:</b> 추가로 그 영웅은 {firstMastery} 랭크의 <b>절반</b>만큼 <st>health</st> <kw>regen</kw>도 전투가 끝날 때까지 얻는다. {defence} 랭크 <b>3마다</b> 정수를 <b>1</b>장 더 버리고 그 효과와 <kw>regen</kw>을 영웅 하나에게 부여할 수 있다. <lvl n="9"><st>energy</st> <b>1</b>을 추가로 소모해 버린 정수 하나의 효과를 <b>2배</b>로 만든다(버린 정수당 1회).</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Enchantment",ko:"마법 부여"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Raise 체력 증가", color:"health", val:(E.lv("secondMastery")+FR(E.lv("attack")))},
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
        readout:(E)=>[{lab:"Heal 회복 = 현재 에너지", color:"energy", val:E.cur("energy")}]},
      stats:{
        health:{base:8}, energy:{base:8},
        attack:{base:1, name:{en:"Chi Block",ko:"점혈"}, dmg:["energy","influence","outlast"]},
        defence:{base:2, name:{en:"Aura Shield",ko:"오라 방패"}},
        firstMastery:{base:2, name:{en:"Cleanse",ko:"정화"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 회복", color:"health", val:FR(E.lv("firstMastery"))},
            ...(E.lv("firstMastery")>=8?[{lab:"Raise 에너지 증가", color:"energy", val:FR(E.lv("defence"))}]:[]),
          ],
          desc:`살아 있는 존재에게 당신의 기운을 흘려보낸다. 대상 하나의 <b>Condition상태</b>나 효과 중 원하는 하나를 무효화하고, 그 대상은 {firstMastery} 랭크의 <b>절반</b>만큼 <st>health</st>을 <kw>heal</kw>한다. 그 영웅은 전투가 끝날 때까지 모든 스탯 굴림에 <b>-1</b> 보너스를 받는다. 이 효과는 중첩된다. <lvl n="5"><st>energy</st> <b>1</b>을 소모해 다른 동료 하나도 목표로 삼을 수 있다.</lvl> <lvl n="8">동료에게 {firstMastery}를 사용할 때마다, 그 동료의 <st>energy</st>를 {defence} 랭크의 <b>절반</b>만큼 <kw>raise</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Chakra Flow",ko:"차크라 흐름"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Evasion 회피", color:"survival", val:Math.max(0,10-Math.floor(E.lv("secondMastery")/3))},
            ...(E.lv("secondMastery")>=10?[{lab:"Block 차단", color:"defence", val:FR(E.lv("defence"))}]:[]),
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
            {lab:"타겟 주사위 감소", color:"neutral", val:FR(E.lv("firstMastery"),3)},
            {lab:"피해 감소", color:"defence", val:FR(E.lv("defence"))},
            {lab:"Heal 회복 상한", color:"health", val:E.lv("firstMastery")},
          ],
          desc:`동료의 상처를 당신이 대신 짊어진다. 이번 라운드 당신의 타겟 주사위를 {firstMastery} 랭크의 <b>1/3</b>만큼 낮춘다. 이번 라운드 당신이 받는 피해를 {defence} 랭크의 <b>절반</b>만큼 줄일 수 있다. <b>Resolution 페이즈</b>가 끝나 모든 피해가 처리된 뒤, 동료 하나의 <st>health</st>을 최대 {firstMastery} 랭크만큼 <kw>heal</kw>하고 당신이 같은 양의 피해를 받는다. 이 <kw>heal</kw>은 <kw>negate</kw>될 수 없고 동료를 <kw>revive</kw>시킬 수도 없다. <lvl n="5">이 효과로 <kw>corrosive</kw> 피해도 <kw>heal</kw>할 수 있다.</lvl> <lvl n="8">{firstMastery}를 라운드당 <b>2회</b>까지 사용할 수 있다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Inflict Scourge",ko:"재앙 부여"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            /* 주 피해 = 지금 잃어버린 체력(+6랭크부터 공격 랭크). 판의 현재 체력에 따라 실시간으로 바뀐다 */
            {lab:"Damage 피해", color:"health", val:(E.miss("health")+(E.lv("secondMastery")>=6?E.lv("attack"):0))},
            {lab:"Regen 재생 2라운드", color:"health", val:FR(E.lv("secondMastery"))},
            {lab:"전투 종료 회복", color:"defence", val:E.lv("defence")},
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
             val:(E.lv("attack")+E.lv("firstMastery")+(E.lv("firstMastery")>=4?6*E.cnt("affliction"):0))},
            {lab:"Raise 증가", color:"energy", val:FR(E.lv("firstMastery"))},
          ],
          desc:`적을 약화시키고 당신과 동료에게 힘을 준다. {attack} 랭크 + {firstMastery} 랭크만큼 <st>energy</st> 피해를 주고, {firstMastery} 랭크의 <b>절반</b>만큼 <st>energy</st>를 원하는 영웅들에게 나눠 <kw>raise</kw>한다. <lvl n="4">전투 중이 아닐 때 {firstMastery}를 사용해, 플레이 중이거나 버린 더미에 있는 <b>Affliction고통</b> 카드 1장을 가져와 획득한다. {firstMastery}는 당신이 가진 <b>고통</b> 1장마다 <st>energy</st> 피해 <b>6</b>을 추가로 준다.</lvl> <lvl n="7">이 라운드에 {attack}도 함께 사용할 수 있다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Coven",ko:"마녀 집회"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Ally Spend 동료 소모 상한", color:"defence", val:E.lv("defence")},
            {lab:"Reduce 감소 기본", color:"secondMastery", val:FR(E.lv("secondMastery"))},
            ...(E.lv("secondMastery")>=6?[{lab:"Piercing 관통 피해", color:"health", val:(3*E.cnt("affliction"))}]:[]),
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
             val:(E.lv("attack")+E.lv("firstMastery")+(E.lv("firstMastery")>=8?3*E.cntEvery("trophy",2):0))},
            ...(E.lv("firstMastery")>=6?[{lab:"Reflect 반사", color:"defence", val:E.cntEvery("trophy",2)}]:[]),
          ],
          desc:`{attack} 랭크 + {firstMastery} 랭크만큼 <st>health</st> 피해를 준다. <lvl n="6">라운드가 끝날 때까지 가진 마스터 트로피 <b>개수</b>만큼 <kw>reflect</kw>를 얻는다.</lvl> <lvl n="8">가진 마스터 트로피 <b>1개마다</b> 이 마스터리의 피해를 <b>3</b>씩 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Bestiary",ko:"마물 도감"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Skill 기술 보너스", color:"secondMastery", val:FR(E.lv("secondMastery"),3)},
            {lab:"피해 감소", color:"defence", val:FR(E.lv("defence"),3)},
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
            {lab:"Boost 증폭", color:"firstMastery", val:FR(E.lv("firstMastery"))},
            ...(E.lv("firstMastery")>=5?[{lab:"Heal 전환 증폭", color:"defence", val:FR(E.lv("defence"))}]:[]),
          ],
          desc:`빙의령 <b>각각</b>에서 원하는 행동을 하나씩 수행하고, 그 수치 효과를 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다. <lvl n="5">빙의령의 공격 행동을 사용할 때, 그 피해 전부를 <st>energy</st> <kw>heal</kw>으로 바꿀 수 있다. 목표 수는 바뀌지 않으며, 그룹 대상 행동이 아니라면 목표를 직접 고를 수 있다. 이때 수치 효과는 {firstMastery} 대신 {defence} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Otherworldly Knowledge",ko:"이계의 지식"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"스탯 굴림 보너스", color:"neutral", val:"-"+Math.floor(E.lv("energy")/5)},
            {lab:"Boost 전투 증폭", color:"secondMastery", val:FR(E.lv("secondMastery"))},
            ...(E.lv("secondMastery")>=6?[{lab:"Heal 회복", color:"health", val:FR(E.lv("attack"))}]:[]),
          ],
          desc:`<b>비전투:</b> 게임 턴이 끝날 때까지 빙의령 <b>1체마다</b> 모든 스탯 굴림에 <b>-1</b> 보너스를 받는다. <lvl n="7">동료들도 이 보너스를 받는다.</lvl> <b>전투:</b> 빙의령 <b>각각</b>에서 원하는 행동을 하나씩 수행하고, 그 수치 효과를 {secondMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다. <lvl n="6">대상 <b>2명</b>이 {attack} 랭크의 <b>절반</b>만큼 <st>health</st>을 <kw>heal</kw>한다.</lvl>`,
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
          desc:`이 마스터리는 <b>Movement 페이즈</b>에만 사용할 수 있다. {firstMastery}에 대해 스탯 굴림을 <b>3회</b> 굴린다. 성공한 만큼 그 게임 턴 동안 다음 중 하나로 쓸 수 있다 — <b>Moon 주사위</b>를 굴려 그 결과를 대상의 <b>Favored Opponent</b> 판정에 더하기 · 실패한 스탯 굴림을 성공으로 바꾸기 · 방금 굴린 <b>Circumstance상황</b>을 다시 굴리기. <lvl n="7"><st>energy</st> <b>1</b>을 추가로 소모해 <b>3회</b> 대신 <b>6회</b> 굴릴 수 있다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Honed Instinct",ko:"벼려진 직감"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Boost 능력 증폭", color:"attack", val:FR(E.lv("secondMastery"),3)},
            ...(E.lv("secondMastery")>=5?[{lab:"아이템 사용 수", color:"explore", val:FR(E.lv("explore"))}]:[]),
          ],
          desc:`이번 라운드가 끝날 때까지 모든 영웅의 능력 랭크를 {secondMastery} 랭크의 <b>1/3</b>만큼(<b>최소 1</b>) <kw>boost</kw>하고, 전투가 끝날 때까지 적에게 <b>Mark표식</b>을 남긴다. 표식이 남은 적에게는 모든 공격 능력이 <kw>piercing</kw> 피해를 준다. <act>defend</act>를 사용하는 영웅 <b>1명마다</b> 표식이 남은 대상이 받는 회복이 <b>5</b>씩 줄어든다. {attack}는 표식이 남은 적에게 라운드당 <b>2회</b> 사용할 수 있다. <lvl n="5">표식이 남은 적과 맞선 상태에서 {defence}를 사용할 때, 아이템을 <b>1개</b> 대신 {explore} 랭크의 <b>절반</b>만큼 사용할 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:3, name:{en:"Explore",ko:"탐험"}},
        survival:{base:3, name:{en:"Survival",ko:"생존"}},
      }
    },
    bloodMage: {
      id:"bloodMage", ed:"4", exp:"H",
      name:{en:"Blood Mage",ko:"블러드 메이지"},
      category:{key:"dual",members:["striker","sapper"]},
      flavor:"네 피는 자유로이 흐른다 — 내 안에서.",
      /* Dominance 스탯 굴림 성공마다 Sanguimancy 피해가 영구히 1씩 쌓인다 */
      counters:[{id:"sang", name:{en:"Sanguimancy Strengthen",ko:"Sanguimancy 강화 누적"}}],
      special:{ko:`<st>health</st>이나 <st>energy</st>를 <b>둘 다 섞어</b> 어떤 능력의 비용으로도 낼 수 있다.
        <b>당신만 시전할 수 있는 Blood Magic 피의 마법 주문 1개</b>를 갖고 시작한다.
        추가 주문을 얻어도 <b>그룹의 티어는 오르지 않는다</b>.
        {defence} 랭크 <b>3마다</b> 게임 턴당 주문을 <b>1개 더</b> 시전할 수 있다.`,
        readout:(E)=>[
          {lab:"게임 턴당 시전 수", color:"defence", val:1+Math.floor(E.lv("defence")/3)},
        ]},
      stats:{
        health:{base:8}, energy:{base:8},
        attack:{base:2, name:{en:"Body Snap",ko:"육신 파열"}, dmg:["health","energy"]},
        defence:{base:2, name:{en:"Divert",ko:"전환"}},
        firstMastery:{base:3, name:{en:"Sanguimancy",ko:"혈술"}, cost:3,
          readout:(E)=>{const base=E.lv("attack")+E.lv("firstMastery")+E.cnt("sang");return[
            {lab:"Cost 비용 · 생명력", color:"health", val:3},
            {lab:"Health 피해", color:"health", val:base},
            {lab:"Energy 피해", color:"energy", val:E.lv("firstMastery")>=8?base*2:base},
          ];},
          desc:`대상에게 {attack} 랭크 + {firstMastery} 랭크만큼 <st>health</st>과 <st>energy</st> 피해를 준다.<br>
            <lvl n="6">이 피해가 <kw>corrosive</kw>나 <kw>piercing</kw>도 얻는다(<b>라운드마다 선택</b>).</lvl>
            <lvl n="8">{firstMastery}로 주는 <st>energy</st> 피해가 <b>2배</b>가 된다.</lvl>
            <lvl n="10">{firstMastery}을 쓰는 동안 적의 <kw>energetic</kw> 효과를 <kw>negate</kw>한다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Dominance",ko:"지배"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용 · 생명력", color:"health", val:2},
            {lab:"티어 Boost", color:"secondMastery", val:FR(E.lv("secondMastery"))},
            {lab:"성공 시 Strengthen", color:"firstMastery", val:1},
            ...(E.lv("secondMastery")>=6?[{lab:"얻은 주문 수", color:"neutral", val:1+Math.floor((E.lv("secondMastery")-6)/2)}]:[]),
          ],
          desc:`{secondMastery}로 <b>당신이나 그룹이 아는 Blood Magic 피의 마법 주문</b>을 시전할 수 있다.
            {secondMastery}로 <b>스탯 굴림</b>을 한다. 성공하면 주문 비용으로 받을 <kw>critical</kw> 피해를 <kw>negate</kw>한다.<br>
            <b>전투 중에 썼다면</b> 이번 라운드 당신의 피의 마법 티어를 {secondMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다
            (<b>주문을 더 뽑지는 않는다</b>).<br>
            또한 스탯 굴림에 성공했다면 {firstMastery}의 피해를 <b>1</b> <kw>strengthen</kw>한다.<br>
            <lvl n="6">이후 <b>2랭크마다</b> 피의 마법 주문을 하나 뽑아 얻는다. <b>당신만 시전할 수 있다.</b></lvl>`,
        },
        navigate:{base:3, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    deathKnight: {
      id:"deathKnight", ed:"4", exp:"H",
      name:{en:"Death Knight",ko:"데스 나이트"},
      category:{key:"dual",members:["healer","sapper"]},
      flavor:"너의 끝은 시작일 뿐이다.",
      /* Punishment 의 Energy Drain 은 Soul Tether 로 영구히 쌓인다(Strengthen) */
      counters:[{id:"drain", name:{en:"Strengthen",ko:"Energy Drain 강화 누적"}}],
      special:{ko:`전투에서 마스터리를 쓸 때마다, 대상의 <st>health</st>을 {defence} 랭크만큼 <kw>heal</kw>하거나
        적에게 {attack} 랭크만큼 <kw>energy drain</kw>를 줄 수 있다.`,
        readout:(E)=>[
          {lab:"Heal 회복", color:"defence", val:E.lv("defence")},
          {lab:"Energy Drain", color:"attack", val:E.lv("attack")+E.cnt("drain")},
        ]},
      stats:{
        health:{base:10}, energy:{base:6},
        attack:{base:4, name:{en:"Punishment",ko:"징벌"}, dmg:["health","energy","influence"]},
        defence:{base:2, name:{en:"Unholy Resilience",ko:"부정한 강인함"}},
        firstMastery:{base:2, name:{en:"Soul Tether",ko:"영혼의 사슬"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"성공 시 Strengthen", color:"attack", val:2},
            {lab:"대성공 시", color:"attack", val:4},
            {lab:"부활 시 체력 랭크", color:"health", val:-2},
          ],
          desc:`<b>대상이 죽는 바로 그 순간</b>에 쓸 수 있다. 또는, <b>죽은 영웅</b>에게는 <b>전투 상황이 아닐 때만</b> 쓸 수 있다.
            한 라운드에 <b>여러 번</b> 발동하고 쓸 수 있다.<br>
            {firstMastery}로 <b>스탯 굴림</b>을 한다.<br>
            <b>대상이 적이고 성공</b>하면 {attack}의 <kw>energy drain</kw>를 <b>2</b> <kw>strengthen</kw>한다.
            <b>대성공</b>이면 대신 <b>4</b> <kw>strengthen</kw>한다.<br>
            <b>대상이 동료이고 성공</b>하면, 그 동료의 <b>Keepsake 킵세이크를 발동</b>시키거나 <kw>revive</kw>시킬 수 있다.
            이 마스터리로 되살아난 영웅은 <b><st>health</st> 랭크를 2 잃는다</b>.<br>
            <lvl n="7">게임 턴당 <b>1회</b>, 전투 밖에서 살아 있는 영웅의 <kw>critical wound</kw> <b>1개</b>를 제거할 수 있다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Touch of Corruption",ko:"타락의 손길"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"무효 · 감소량", color:"secondMastery", val:FR(E.lv("firstMastery"))+FR(E.lv("secondMastery"))},
            ...(E.lv("secondMastery")>=7?[{lab:"Energy Drain Boost", color:"attack", val:5}]:[]),
            ...(E.lv("secondMastery")>=10?[{lab:"적 사망 시 Raise", color:"energy", val:5}]:[]),
          ],
          desc:`이번 라운드 동안, 적의 <kw>aegis</kw> 값을 <kw>negate</kw>하거나
            적의 <kw>heal</kw>·<kw>defend</kw>·<kw>block</kw> 중 <b>하나를 골라</b>
            그 값을 <b>{firstMastery} 랭크/2 + {secondMastery} 랭크/2</b>만큼 줄인다.<br>
            <lvl n="7">이번 라운드 {attack}의 <kw>energy drain</kw>를 <kw>boost</kw> <b>5</b> 한다.</lvl>
            <lvl n="10">적이 죽을 때마다, <b>{firstMastery}가 발동하기 전에</b> 당신의 <st>energy</st>를 <kw>raise</kw> <b>5</b> 한다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:3, name:{en:"Survival",ko:"생존"}},
      }
    },
    demonologist: {
      id:"demonologist", ed:"4",
      name:{en:"Demonologist",ko:"악마학자"},
      category:{key:"dual",members:["utility","assist"]},
      flavor:"진명을 아는게 중요하지",
      /* 광기 = Dretch 가 짊어진 양(정신의 닻 랭크까지) · 레벨 상승 = 10랭크 효과로 올린 횟수.
         Dretch 레벨은 고통의 소환 랭크에 실시간으로 붙으므로 여기서는 올린 횟수만 센다. */
      counters:[{id:"madness",  name:{en:"Madness",ko:"광기"}},
                {id:"dretchUp", name:{en:"Dretch Level Up",ko:"Dretch 레벨 상승"}}],
      special:{ko:`전설적인 동료 <b>Dretch드레치</b>와 함께 시작한다. 드레치의 <b>레벨</b>은 {firstMastery} 랭크의 <b>1/3</b>과 같다(<b>최소 1</b>). 드레치가 죽으면 <b>다음 게임 턴</b>에 다시 <kw>summon</kw>할 수 있다.`,
        readout:(E)=>[
          {lab:"Dretch 레벨", color:"neutral",
           val:(FR(E.lv("firstMastery"),3)+E.cnt("dretchUp"))},
        ]},
      stats:{
        health:{base:7}, energy:{base:7},
        attack:{base:2, name:{en:"Infernal Strength",ko:"지옥의 힘"}, dmg:["health","outlast"]},
        defence:{base:2, name:{en:"Planar Binding",ko:"차원 결속"}},
        firstMastery:{base:2, name:{en:"Harrowed Summoning",ko:"고통의 소환"}, cost:1,
          readout:(E)=>{const lv=FR(E.lv("firstMastery"),3)+E.cnt("dretchUp");return[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Dretch 레벨", color:"neutral", val:lv},
            {lab:"① 피해 Boost", color:"attack", val:E.lv("attack")},
            {lab:"② 동료 행동 Boost", color:"neutral", val:FR(lv)},
            {lab:"③ Defend 차단", color:"defence", val:E.lv("defence")},
          ];},
          desc:`드레치를 <kw>summon</kw>한다. 소환되어 있는 동안 <b>전투 라운드마다 Declaration 페이즈</b>에 드레치가 할 행동을 고른다.<br>
            이미 소환되어 있다면 다음 <b>셋 중 하나</b>를 고른다.<br>
            <b>①</b> 이번 라운드 드레치가 주는 피해를 {attack} 랭크만큼 <kw>boost</kw>한다.<br>
            <b>②</b> 드레치 <b>레벨의 절반</b>만큼 <b>모든 동료</b>의 행동 랭크를 <kw>boost</kw>한다.<br>
            <b>③</b> {defence} 랭크만큼 <kw>defend</kw>를 얻고, 영웅을 노린 공격을 드레치가 <b>대신 맞는다</b> — 이미 목표가 정해졌거나 그룹 전체를 노린 공격이어도 적용된다.`,
        },
        secondMastery:{base:2, name:{en:"Mind Anchor",ko:"정신의 닻"}, cost:2, uses:{max:1,scope:"round"},
          readout:(E)=>{const lv=FR(E.lv("firstMastery"),3)+E.cnt("dretchUp"),r=E.lv("secondMastery");return[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"광기 보유 상한", color:"secondMastery", val:r},
            {lab:"지금 광기", color:"neutral", val:E.cnt("madness")},
            ...(r>=10?[{lab:"10랭크 레벨 상승", color:"health", val:(lv<=FR(r))?"가능":"조건 미달"}]:[]),
          ];},
          desc:`전투 밖에서는 <b>게임 턴당 1회</b>, 전투 중에는 <b>라운드당 1회</b>, <b>Madness광기</b> 1개를 드레치에게 붙이거나 <b>다른 대상에게서 드레치로 옮긴다</b>. 드레치는 {secondMastery} 랭크까지만 광기를 가질 수 있다.<br>
            여기에 더해, 이 기술을 <b>전투 중에</b> 썼다면 드레치에게서 <b>광기 1개를 없애고 행동 2개</b>를 할 수 있다.<br>
            <lvl n="10">드레치의 레벨이 {secondMastery} 랭크의 <b>절반 이하</b>라면, 이 기술로 <b>광기 5</b>를 없애고 드레치의 <b>레벨을 1 올릴</b> 수 있다.</lvl>`,
        },
        navigate:{base:3, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:3, name:{en:"Explore",ko:"탐험"}},
        survival:{base:3, name:{en:"Survival",ko:"생존"}},
      }
    },
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
            {lab:"타겟 주사위 +", color:"neutral", val:E.lv("firstMastery")},
            {lab:"Counterattack 반격", color:"attack", val:FR(E.lv("attack"))},
            ...(E.lv("firstMastery")>=4?[{lab:"Block 차단", color:"defence", val:FR(E.lv("defence"))}]:[]),
          ],
          desc:`<b>비전투:</b> 게임 턴이 끝날 때까지 <kw>soar</kw>을 얻는다. <b>전투:</b> 라운드가 끝날 때까지 당신의 타겟 주사위를 {firstMastery} 랭크만큼 올리고, {attack} 랭크의 <b>절반</b>만큼 <kw>counterattack</kw>을 얻는다. <lvl n="4">이번 라운드에 {defence} 랭크의 <b>절반</b>만큼 <kw>block</kw>도 얻는다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Downstrike",ko:"내리찍기"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("secondMastery"))},
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
              ...(s==="itto"?[{lab:"Counterattack 반격", color:"attack", val:FR(E.lv("firstMastery"))}]:[]),
              ...(s==="nito"?[{lab:"Block 차단", color:"defence", val:FR(E.lv("defence"))}]:[]),
              {lab:"자세 강화 횟수", color:"firstMastery", val:E.lv("firstMastery")>=4?1+Math.floor((E.lv("firstMastery")-4)/2):0}];
          },
          desc:`전투가 끝나거나 이 마스터리를 다시 쓸 때까지 <b>Stance자세</b> 셋 중 하나를 취한다 — <b>Iaido거합</b>(<kw>evasion</kw> <b>10</b>) · <b>Itto-ryu일도류</b>({firstMastery} 랭크의 <b>절반</b>만큼 <kw>counterattack</kw>) · <b>Nito-ryu이도류</b>({defence} 랭크의 <b>절반</b>만큼 <kw>block</kw>). <lvl n="4">4랭크부터 <b>2랭크마다</b> 자세 하나를 골라 강화한다 — 그 자세일 때 주는 모든 피해를 <kw>boost</kw>하고 자세 보너스가 <b>1</b> 올라간다.</lvl> <lvl n="10">자세 <b>2개</b>를 동시에 취할 수 있다. 단 둘 다 유지하려면 {firstMastery}를 <kw>sustain</kw>해야 한다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Aikido",ko:"합기도"}, cost:1,
          readout:(E)=>{
            const s=E.stance(), base=E.lv("secondMastery");
            const dmg=s==="iaido"?base+FR(E.lv("attack")) : s==="itto"?base+E.lv("attack") : base;
            return [{lab:"Cost 비용", color:"energy", val:1},
              {lab:s==="nito"?"Damage 피해 ×2회":"Damage 피해", color:"health", val:dmg},
              ...(s==="iaido"?[{lab:"회피 성공 시", color:"health", val:(dmg*2)}]:[])];
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
        readout:(E)=>[{lab:"Block 차단", color:"defence", val:FR(E.lv("defence"))}]},
      stats:{
        health:{base:5}, energy:{base:6},
        attack:{base:2, name:{en:"Lunge",ko:"찌르기"}},
        defence:{base:1, name:{en:"Reposition",ko:"재배치"}},
        firstMastery:{base:2, name:{en:"Atlatl",ko:"아틀라틀"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Damage 피해", color:"health", val:(E.lv("attack")+E.lv("firstMastery"))},
            {lab:"Bleeding 출혈", color:"health", val:FR(E.lv("firstMastery"),3)},
            ...(E.lv("firstMastery")>=5?[{lab:"Vulnerable 추가 피해", color:"attack", val:FR(E.lv("firstMastery"))}]:[]),
          ],
          desc:`{firstMastery} 랭크 + {attack} 랭크만큼 <st>health</st> 피해를 주고 적은 <state>bleeding</state> 상태가 된다. 이 <state>bleeding</state> 피해는 1이 아니라 {firstMastery} 랭크의 <b>1/3</b>이다. <lvl n="5"><st>energy</st> <b>1</b>을 추가로 소모해 <state>vulnerable</state>이나 <state>slowed</state>도 걸 수 있다. <state>vulnerable</state> 상태인 적은 1이 아니라 {firstMastery} 랭크의 <b>절반</b>만큼 추가 피해를 받는다.</lvl> <lvl n="7">적이 <state>bleeding</state> 상태인 동안 그 적의 <st>health</st>·<st>energy</st> 회복 효과를 <kw>negate</kw>한다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Sōjutsu",ko:"창술"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"① 방어 전환 · Defend", color:"defence", val:FR(E.lv("defence"))},
            {lab:"① 반격 피해", color:"health", val:E.lv("attack")},
            {lab:"② 동료 피해 증폭", color:"attack", val:(E.lv("secondMastery")+FR(E.lv("attack")))},
            {lab:"③ 피해 감소", color:"secondMastery", val:FR(E.lv("secondMastery"),3)},
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
            {lab:"Raise 그룹 체력", color:"health", val:FR(E.lv("firstMastery"))},
          ],
          desc:`<b>비전투:</b> 턴당 <b>1회</b>, {defence} 랭크 <b>4마다</b>(<b>최소 1</b>) <b>아무 덱</b>이나 맨 위 카드를 뒤집는다. <b>전투:</b> 라운드당 <b>3회</b>까지 쓸 수 있다. 사용할 때마다 <kw>defend</kw> <b>3</b>을 얻고, 다음 라운드 <b>Declaration 페이즈</b>에 그룹의 <st>health</st>을 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>raise</kw>한다. 이 <kw>raise</kw> 효과는 <b>서로 중첩된다</b>. <lvl n="6">전투 밖에서도 <kw>raise</kw> 효과를 얻는다.</lvl> <lvl n="8">한 라운드에 이 마스터리를 <b>3번</b> 쓰면 <kw>raise</kw> 양을 <b>1</b> <kw>strengthen</kw>한다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Energetic Connection",ko:"에너지 연결"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Heal 체력", color:"health", val:E.lv("secondMastery")},
            {lab:"Heal 에너지", color:"energy", val:3},
            {lab:"스탯 굴림 보너스", color:"neutral", val:"-2"},
          ],
          desc:`<b>비전투 · 전투 라운드당 2회</b>까지, 동료의 <st>health</st>을 {secondMastery} 랭크만큼 <kw>heal</kw>하거나 <st>energy</st>를 <b>3</b> <kw>heal</kw>한다. 그 대상의 다음 스탯 굴림에 <b>-2</b> 보너스가 붙는다(중첩되지 않음). <lvl n="7"><b>Camping야영</b> 중 <b>Movement 페이즈</b>에 사용해 쓰러진 영웅을 <kw>revive</kw>시킬 수 있다. 되살아난 영웅은 <st>health</st> 랭크 <b>1</b> 또는 <st>energy</st> 랭크 <b>2</b>를 잃는다(본인 선택).</lvl>`,
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
            {lab:"Heal 회복", color:"health", val:(E.lv("defence")+FR(E.lv("attack")))},
            ...(E.lv("firstMastery")>=5?[
              {lab:"Regen 재생", color:"health", val:FR(E.lv("firstMastery"),3)},
              {lab:"스탯 굴림 보너스", color:"neutral", val:"-"+Math.floor(E.lv("firstMastery")/3)}]:[]),
          ],
          desc:`대상 하나의 <st>health</st>을 {defence} 랭크 + {attack} 랭크의 <b>절반</b>만큼 <kw>heal</kw>한다. 이 마스터리는 전투 밖에서도 쓸 수 있다. <lvl n="5">대상은 다음 중 하나를 함께 얻는다(본인 선택) — 전투가 끝날 때까지 {firstMastery} 랭크의 <b>1/3</b>만큼 <st>health</st> <kw>regen</kw> · {firstMastery} 랭크 <b>3마다</b> 다음 스탯 굴림에 <b>-1</b> 보너스. 이 스탯 굴림 보너스는 이후 게임 턴에도 쓸 수 있지만 <b>서로 중첩되지 않는다</b>.</lvl>`,
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
            {lab:"Damage 에너지 피해", color:"energy", val:(E.lv("attack")+E.lv("firstMastery"))},
          ],
          desc:`적에게 {attack} 랭크 + {firstMastery} 랭크만큼 <st>energy</st> 피해를 주고 이번 라운드에 <kw>counterattack</kw>을 얻는다. <kw>counterattack</kw>할 때는 <st>energy</st>가 들지 않으며, 그 피해는 <st>energy</st> 피해로 바뀐다. 이 마스터리는 <kw>counterattack</kw> 효과를 유지하기 위해 <kw>sustain</kw>할 수 있다. <lvl n="7">이 마스터리를 <kw>sustain</kw>하는 중에 죽으면 {defence}에 대해 스탯 굴림을 한다. <b>대성공</b>이면 <st>health</st> <b>1</b>로 라운드를 마치며, 다음 라운드에는 {firstMastery}를 <kw>sustain</kw>할 수 없다.</lvl>`,
        },
        secondMastery:{base:3, name:{en:"Quantum Leap",ko:"양자 도약"}, cost:2, uses:{max:1,scope:"turn"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"비전투 · 사용 횟수", color:"secondMastery", val:Math.floor(E.lv("secondMastery")/5)},
            {lab:"Teleport 헥스", color:"navigate", val:FR(E.lv("secondMastery"))},
            {lab:"Boost 다음 라운드", color:"attack", val:E.lv("secondMastery")},
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
              {lab:"Boost 환각·기술", color:"attack", val:FR(E.lv("firstMastery"))},
              {lab:"Reflect 반사", color:"defence", val:FR(E.lv("defence"),3)}]:[]),
          ],
          desc:`강력한 짐승의 모습으로 변한다. 전투 밖에서는 게임 페이즈당 <b>1회</b> 쓸 수 있고, 전투 중에는 <kw>sustain</kw>할 수 있다. 변신한 동안 {attack} 랭크와 기술 하나의 랭크를 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>하고, {defence} 랭크의 <b>1/3</b>만큼 <kw>reflect</kw>를 얻는다. <lvl n="6"><st>outlast</st>을 가진 적과 맞설 때, {firstMastery}를 쓴 라운드에 행동을 하나 더 할 수 있다.</lvl> <lvl n="9">변신한 동안 <b>모든 기술</b>이 <kw>boost</kw>을 얻는다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Reflection",ko:"반영"}, cost:1, uses:{max:2,scope:"round"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Reflect 반사", color:"defence", val:FR(E.lv("secondMastery"))},
            {lab:"반격 Energy Drain", color:"energy", val:E.lv("attack")},
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
            {lab:"Damage 피해", color:"health", val:(E.lv("firstMastery")+FR(E.lv("attack")))},
            {lab:"두루마리 보유", color:"explore", val:E.cnt("scroll")},
          ],
          desc:`{firstMastery} 랭크 + {attack} 랭크의 <b>절반</b>만큼 <st>health</st> 또는 <st>energy</st> 피해를 준다. 닌자 두루마리 <b>1</b>개를 써서 그 피해를 <b>Air바람·Earth대지·Fire불·Water물</b> 중 하나로 바꿀 수 있다. <lvl n="4">바꾼 원소의 효과가 함께 붙는다 — <b>바람</b>: <kw>piercing</kw> · <b>대지</b>: <kw>corrosive</kw> · <b>불</b>: 대상이 <state>burned</state> 상태가 된다 · <b>물</b>: 피해를 <b>절반</b>으로 줄이고 그만큼 <kw>heal</kw>으로 바꾼다.</lvl> <lvl n="8">인술이나 환술을 쓸 때 두루마리를 <b>1</b>개 대신 <b>2</b>개까지 쓸 수 있다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Genjutsu",ko:"환술"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"주사위 보정 총량", color:"secondMastery", val:(FR(E.lv("secondMastery"))+FR(E.lv("defence")))},
            {lab:"0 만들 때 Energy Drain", color:"energy", val:(E.lv("secondMastery")*2)},
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
            {lab:"Damage 피해", color:"health", val:E.lv("attack")},
            {lab:"적 방어·차단·피해 감소", color:"defence", val:FR(E.lv("firstMastery"),3)},
          ],
          desc:`적에게 {attack} 랭크만큼 <st>health</st> 피해를 주거나 적의 <st>outlast</st>을 <b>2</b> 조정한다. 이번 라운드에 적의 <kw>defend</kw>·<kw>block</kw>과 적이 주는 피해를 {firstMastery} 랭크의 <b>1/3</b>만큼 줄인다. <lvl n="6"><st>energy</st> <b>2</b>를 추가로 소모해, 게임 턴마다 처음 쓸 때 {firstMastery}의 피해를 <b>1</b> <kw>strengthen</kw>한다.</lvl>`,
        },
        secondMastery:{base:1, name:{en:"Ascend",ko:"상승"}, cost:1, uses:{max:1,scope:"turn"},
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"비전투 이동 헥스", color:"navigate", val:FR(E.lv("secondMastery"),3)},
            {lab:"Block 차단 총량", color:"defence", val:(E.lv("defence")+E.lv("secondMastery"))},
            {lab:"다음 라운드 Boost", color:"attack", val:FR(E.lv("firstMastery"))},
          ],
          desc:`<b>비전투:</b> 게임 턴당 <b>1회</b>까지, 아무 페이즈에나 써서 그룹을 {secondMastery} 랭크의 <b>1/3</b>까지의 헥스만큼 이동시킨다. <b>전투:</b> {defence} 랭크 + {secondMastery} 랭크만큼 <kw>block</kw>을 얻어, 대상 <b>2명</b>까지 골라 원하는 대로 분배한다. 다음 라운드에 그들이 주는 피해와 그들이 일으키는 회복 효과를 {firstMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다.`,
        },
        navigate:{base:3, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    ancestralChanneler: {
      id:"ancestralChanneler", ed:"5", exp:"H",
      name:{en:"Ancestral Channeler",ko:"선조 강령사"},
      category:{key:"dual",members:["utility","assist"]},
      flavor:"나는 먼저 간 이들을 담는 그릇일 뿐이다.",
      /* 손에 든 선조 카드 — 뽑는 수는 방어 랭크로 정해지고, 쓰면서 줄어든다 */
      counters:[{id:"ancestor", name:{en:"Ancestor Cards",ko:"손에 든 선조 카드"}}],
      special:{ko:`게임을 시작할 때 <b>선조 덱</b>을 섞어 당신의 판 옆에 둔다.
        {defence} 랭크 <b>3마다</b> 무작위 선조 카드 <b>1장</b>을 뽑아 손에 넣는다(<b>최소 1</b>).
        {firstMastery}과 {secondMastery}이 이 카드들의 효과를 발동시킨다.`,
        readout:(E)=>[{lab:"뽑는 선조 카드", color:"defence", val:FR(E.lv("defence"),3)}]},
      stats:{
        health:{base:6}, energy:{base:7},
        attack:{base:1, name:{en:"Guided Hand",ko:"인도된 손"}, dmg:["health"]},
        defence:{base:4, name:{en:"Ethereal Pressure",ko:"영묘한 압력"}},
        firstMastery:{base:2, name:{en:"Ancestral Strength",ko:"선조의 힘"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"카드당 Energy Drain", color:"firstMastery", val:E.lv("firstMastery")},
            {lab:"총 Energy Drain", color:"attack", val:E.lv("firstMastery")*E.cnt("ancestor")},
            ...(E.lv("firstMastery")>=8?[{lab:"추가 발동", color:"neutral", val:1}]:[]),
          ],
          desc:`둘 중 <b>하나를 고른다</b> —<br>
            · <b>가진 선조 카드 하나마다</b> {firstMastery} 랭크만큼 <kw>energy drain</kw>를 한다<br>
            · <b>앞면으로 놓인</b> 각 선조 카드들의 <b>마스터리 1 효과를 발동</b>한다<br>
            <lvl n="8">선조의 마스터리 1 효과 <b>하나를 한 번 더</b> 발동시킬 수 있다.</lvl>`,
        },
        secondMastery:{base:2, name:{en:"Venerate",ko:"추앙"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"발동하는 마스터리 2", color:"secondMastery", val:E.lv("secondMastery")>=12?2:1},
          ],
          desc:`이번 라운드에 <b>어느 영웅이든</b> 스탯 굴림나 목표 주사위를 굴릴 때,
            그 결과를 <b>다른 영웅과 맞바꿀</b> 수 있다.<br>
            당신의 선조 하나를 골라 그 <b>마스터리 2 효과</b>를 발동시킨 뒤, 그 카드를 <b>뒷면으로 뒤집는다</b>.<br>
            <b>전투 밖에서 게임 턴당 1회</b>, 이 마스터리를 쓰고 원하는 <b>생명력 랭크 1</b>을 잃어
            선조 카드 하나를 <b>앞면으로 뒤집을</b> 수 있다.<br>
            <lvl n="12">선조의 마스터리 2 효과를 <b>1개 대신 2개</b> 발동시킬 수 있다.</lvl>`,
        },
        navigate:{base:4, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:3, name:{en:"Survival",ko:"생존"}},
      }
    },
    kensai: {
      id:"kensai", ed:"5", exp:"H",
      name:{en:"Kensai",ko:"검성"},
      category:{key:"dual",members:["striker","assist"]},
      flavor:"오늘 일은 앞으로 수백 년 동안 회자될 것이다.",
      special:{ko:`{defence} 랭크가 적 <b>레벨의 2배 이상</b>이라면,
        그 적의 행동을 <b>굴린 뒤에</b> 당신의 행동을 선언할 수 있다.`,
        readout:(E)=>[{lab:"대응 가능한 적 레벨", color:"defence", val:FR(E.lv("defence"))}]},
      stats:{
        health:{base:8}, energy:{base:6},
        attack:{base:2, name:{en:"Perfect Strike",ko:"완벽한 일격"}, dmg:["health"]},
        defence:{base:2, name:{en:"Anticipate",ko:"간파"}},
        firstMastery:{base:4, name:{en:"Shatter Defense",ko:"방어 분쇄"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"Health 피해", color:"health", val:E.lv("attack")+E.lv("firstMastery")},
            {lab:"취약 적용 레벨", color:"firstMastery", val:FR(E.lv("firstMastery"))},
            ...(E.lv("firstMastery")>=10?[{lab:"피해 횟수", color:"attack", val:2}]:[]),
          ],
          desc:`{attack} + {firstMastery} 랭크만큼 <st>health</st> 피해를 준다.<br>
            이 공격이 적에게 피해를 줄 때마다, 그 적은 <b>전투가 끝날 때까지</b> 다음 페널티를 얻는다 —
            <kw>defend</kw> <b>−1</b> · <kw>block</kw> <b>−2</b> · <kw>evasion</kw> <b>+1</b>. 이 효과는 <b>중첩</b>된다.<br>
            적의 레벨이 {firstMastery} 랭크의 <b>절반 이하</b>라면 그 대상은 <state>vulnerable</state>도 얻는다.<br>
            <lvl n="10">이 공격이 대상에게 <b>한 번 더</b> 피해를 준다.</lvl>`,
        },
        secondMastery:{base:4, name:{en:"Standoff",ko:"대치"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"목표 주사위 페널티", color:"secondMastery", val:E.lv("secondMastery")},
            {lab:"0으로 막을 때 피해", color:"attack", val:E.lv("attack")*2},
            {lab:"동료 피해 Boost", color:"secondMastery", val:E.lv("secondMastery")},
            ...(E.lv("secondMastery")>=8?[{lab:"Piercing 감소", color:"defence", val:FR(E.lv("defence"))}]:[]),
          ],
          desc:`적 하나의 <b>개별 목표 공격</b>이 이번 라운드에 <kw>unyielding</kw>을 얻는다.<br>
            <b>라운드가 끝날 때까지</b> <kw>counterattack</kw>을 얻고, 당신의 목표 주사위에 {secondMastery} 랭크만큼
            페널티를 받는다. {defence}도 함께 쓸 수 있지만 <b>Item 아이템은 쓸 수 없다</b>.<br>
            이번 라운드에 <b>피해를 0으로 줄일 때마다</b>, 공격한 적에게 {attack} 랭크의 <b>2배</b>만큼
            <st>health</st> 피해를 준다.<br>
            {secondMastery} 랭크가 대상 <b>레벨의 2배 이상</b>이라면, <b>모든 동료의 피해</b>를
            {secondMastery} 랭크만큼 <kw>boost</kw>한다.<br>
            <lvl n="8">이 마스터리를 쓰는 동안 {defence}로 <kw>piercing</kw> 피해도 줄일 수 있다.</lvl>`,
        },
        navigate:{base:1, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:1, name:{en:"Explore",ko:"탐험"}},
        survival:{base:1, name:{en:"Survival",ko:"생존"}},
      }
    },
    mycotomancer: {
      id:"mycotomancer", ed:"5", exp:"H",
      name:{en:"Mycotomancer",ko:"균사술사"},
      category:{key:"dual",members:["assist","healer"]},
      flavor:"신성한 여정이 나를 모든 것과 잇는다.",
      special:{ko:`영웅들은 <b>음식 소모량만큼 음식</b>을 먹을 수 있다 —
        전투 중에는 <b>Item 아이템을 쓰는 것처럼</b> 다룬다. 영웅들이 음식을 먹을 때마다 <b>추가 효과를 선택할 수 있다</b> —
        <st>health</st> <b>1</b> <kw>raise</kw> · <st>energy</st> <b>2</b> <kw>raise</kw> ·
        이번 Event 페이즈의 스탯 굴림에 <b>−1</b> 보너스. <b>이 효과는 중첩된다.</b>`},
      stats:{
        health:{base:7}, energy:{base:7},
        attack:{base:1, name:{en:"Geometric Nets",ko:"기하학 그물"}, dmg:["health","outlast"]},
        defence:{base:2, name:{en:"Source Connection",ko:"근원 연결"}},
        firstMastery:{base:3, name:{en:"Alchemize",ko:"연성"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"Raise 증가량", color:"firstMastery", val:E.lv("firstMastery")},
            {lab:"Regen 재생량", color:"firstMastery", val:FR(E.lv("firstMastery"))},
            {lab:"능력 Boost", color:"defence", val:FR(E.lv("defence"))},
          ],
          desc:`대상의 <st>health</st>과 <st>energy</st>를 {firstMastery} 랭크만큼 <kw>raise</kw>하거나,
            그 대상의 <b>모든 상태를</b> <kw>negate</kw>한다.<br>
            <b>후자를 골랐다면</b>, <kw>negate</kw>한 <b>상태 하나마다</b> 대상은 <b>전투가 끝날 때까지</b>
            {firstMastery} 랭크의 <b>절반</b>만큼 <st>health</st>이나 <st>energy</st> <kw>regen</kw>을 얻는다.<br>
            이 마스터리를 쓴 뒤, <b>다음 라운드부터 전투가 끝날 때까지</b> 대상의 능력 하나를
            (<b>대상이 고른다</b>) {defence} 랭크의 <b>절반</b>만큼 <kw>boost</kw>한다. 이 효과는 <b>중첩</b>된다.`,
        },
        secondMastery:{base:2, name:{en:"Neural Link",ko:"균사 연결"}, cost:1,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:1},
            {lab:"숙적 피해", color:"attack", val:"×2"},
            ...(E.lv("secondMastery")>=6?[{lab:"피해 Boost", color:"secondMastery", val:FR(E.lv("secondMastery"))}]:[]),
          ],
          desc:`이번 라운드에 <b>숙적에게 주는 모든 피해를 2배</b>로 만든다.
            이 마스터리를 쓰는 동안 <b>방어하는 것처럼</b> <b>Item 아이템</b>을 쓸 수 있고,
            <b>그룹 전원</b>이 그 아이템의 이익을 얻는다.<br>
            <lvl n="6">원하는 대상이 주는 피해를 {secondMastery} 랭크의 <b>절반</b>만큼 <kw>boost</kw>하거나,
            <b>이번 라운드와 다음 라운드에 발동하는</b> <kw>heal</kw> 양을 <b>2배</b>로 만든다. <b>이 효과는 중첩된다.</b></lvl>
            <lvl n="10"><b>전투 외 상황에서 사용하여</b> 아이템의 효과를 얻을 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:3, name:{en:"Explore",ko:"탐험"}},
        survival:{base:4, name:{en:"Survival",ko:"생존"}},
      }
    },
    threadMage: {
      id:"threadMage", ed:"5", exp:"H",
      name:{en:"Thread Mage",ko:"직조 마법사"},
      category:{key:"dual",members:["sapper","healer"]},
      flavor:"네 패턴이 어긋나 보이는군. 내가 고쳐주지.",
      stats:{
        health:{base:8}, energy:{base:12},
        attack:{base:2, name:{en:"Thread Piercer",ko:"실 관통자"}, dmg:["health","energy","influence"]},
        defence:{base:2, name:{en:"Loomshift",ko:"베틀 전환"}},
        firstMastery:{base:2, name:{en:"Unravel",ko:"풀어헤치기"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"효과 수 · 라운드당", color:"firstMastery", val:FR(E.lv("firstMastery"),5)},
            {lab:"Energy 피해", color:"defence", val:E.lv("defence")},
            {lab:"Raise 회복", color:"health", val:FR(E.lv("secondMastery"))},
          ],
          desc:`{firstMastery} 랭크 <b>5마다</b> 적에게 효과를 하나씩 건다(<b>최소 1</b>).
            <b>동일한 효과는 중첩</b>되며 <b>전투가 끝날 때까지</b> 남는다.<br>
            · 대상이 <state>slowed</state> · <state>dissonant</state> · <state>vulnerable</state> ·
            <kw>weakness</kw> 중 <b>하나를 받는다</b><br>
            · <b>각 라운드가 시작되기 전</b> {defence} 랭크만큼 <st>energy</st> 피해를 준다<br>
            · 영웅들이 <b>그 적에게 목표가 될 때마다</b> {secondMastery} 랭크의 <b>절반</b>만큼 <st>health</st>을,
            또는 <st>energy</st> <b>3</b>을 <kw>raise</kw>한다`,
        },
        secondMastery:{base:2, name:{en:"Pattern Vibration",ko:"패턴 진동"}, cost:2,
          readout:(E)=>[
            {lab:"Cost 비용", color:"energy", val:2},
            {lab:"Energy Drain", color:"attack", val:E.lv("attack")},
            {lab:"진동 지속 라운드", color:"secondMastery", val:FR(E.lv("secondMastery"),3)},
            {lab:"영웅 보너스 수", color:"secondMastery", val:FR(E.lv("secondMastery"),5)},
            ...(E.lv("secondMastery")>=8?[{lab:"전투 밖 Heal", color:"defence", val:FR(E.lv("defence"))}]:[]),
          ],
          desc:`{attack} 랭크만큼 <kw>energy drain</kw>를 주고, 적의 패턴을
            {secondMastery} 랭크의 <b>1/3</b> 라운드 동안 <b>진동시킨다</b>(<b>최소 1</b>).<br>
            패턴이 진동하는 적을 <b>목표로 삼은 영웅</b>은 {secondMastery} 랭크 <b>5마다</b>
            아래에서 <b>원하는 효과를 1개씩</b> 얻는다(<b>최소 1</b>). <b>동일한 효과는 중첩</b>된다.<br>
            · <st>energy</st> <b>2</b>, 또는 <st>health</st>을 <b>입힌 피해/3</b>만큼 <kw>heal</kw><br>
            · 이번 라운드 자신이 받는 피해를 {defence} 랭크의 <b>절반</b>만큼 <kw>negate</kw><br>
            · <st>energy</st> 피해를 <b>2배</b>로<br>
            · 자신의 상태 <b>1개</b>를 <kw>negate</kw>하거나 <b>적에게 옮긴다</b>(가능하다면)<br>
            <lvl n="8">전투 밖에서 사용하여, 동료의 <st>health</st>과 <st>energy</st>를
            {defence} 랭크의 <b>절반</b>만큼 <kw>heal</kw>할 수 있다.</lvl>`,
        },
        navigate:{base:2, name:{en:"Navigate",ko:"길찾기"}},
        explore:{base:2, name:{en:"Explore",ko:"탐험"}},
        survival:{base:2, name:{en:"Survival",ko:"생존"}},
      }
    },
    // 다음 직업은 여기에 추가.  dual 예:  category:{key:"dual",members:["striker","sapper"]}
  },

  /* 특성: traits / aspects / keepsakes.  게임 중 추가·제거 가능. keepsake 은 공개형.
     지금은 예시만.  실제 데이터 주시면 채웁니다. */
  traits: {
    /* Aspect 양상 — 게임을 시작할 때 고를 수도 있고 게임 중에 얻을 수도 있다.
       종족과 같은 틀이라 mods 가 능력치에 그대로 더해지고, freeRanks 는 직접 분배/차감할 몫이다. */
    kukudriluTribe: {id:"kukudriluTribe", type:"aspect", ed:"5", name:{en:"Kukudrilu Tribe",ko:"쿠쿠드릴루 부족"},
      mods:{health:2,energy:0,attack:0,defence:1,firstMastery:-1,secondMastery:-1,navigate:1,explore:0,survival:1},
      foodMod:1,
      desc:`<b>시간이 너에게는 다르게 흐른다(마스터리)</b> — 전투에서 마스터리를 쓸 때마다
    그 효과를 <b>미룰</b> 수 있다. 그렇게 하면 이번 라운드에는 <st>defence</st> 랭크의 <b>절반</b>만큼만
    <kw>defend</kw>를 얻는다(<b>아이템은 쓸 수 없다</b>).
    다음 라운드에 고른 행동에 <b>더해</b> 미뤄 둔 마스터리가 발동하며, <b>수치 효과가 2배</b>가 된다.<br>
    <b>참을성 있는 사냥꾼</b> — 당신이나 동료가 적에게 <st>health</st>이나 <st>energy</st> 피해를 줄 때마다,
    그 적에게 <b>그 절반</b>만큼 <kw>energy drain</kw>도 줄 수 있다.<br>
    <b>느린 걸음</b> — <b>2헥스 이상 움직인</b> 게임 턴에는 기술 굴림에 <b>+2 페널티</b>를 받는다.
    <kw>teleport</kw>는 이 효과를 발동시키지 않는다.`,
      flavor:"늪지의 사람들이라고도 불리는 악어 부족은 저희끼리 지낸다.",
      track:null},
    pumaTribe: {id:"pumaTribe", type:"aspect", ed:"5", name:{en:"Puma Tribe",ko:"퓨마 부족"},
      mods:{health:2,energy:1,attack:1,defence:-1,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      foodMod:1,
      desc:`<b>남들이 못 견디는 것을 견딘다(공격)</b> — 매 턴 <b>처음 죽게 될 때</b>
    <st>attack</st> 스탯 굴림을 한다. 성공하면 <st>health</st>을 <b>2</b> <kw>raise</kw>하고,
    <b>굴림 결과와 <st>attack</st> 랭크의 차이 1점마다 2씩 더</b> <kw>raise</kw>한다.<br>
    <b>살수의 본능</b> — 적을 쓰러뜨릴 때마다 당신이 주는 피해를 <b>1</b> <kw>strengthen</kw>한다
    (<b>최대 +10</b>).<br>
    <b>섣부른 확신</b> — 당신의 피해가 적에게 줄어들거나 <kw>negate</kw>될 때마다,
    <b>다음 전투 행동 랭크가 2 줄어든다</b>.`,
      flavor:"빼어난 사냥꾼인 퓨마 부족은 호전적이라 여겨진다. 하지만 가까이서 보면, 그들이 떠받드는 큰 고양이들처럼 균형을 소중히 여긴다는 것을 알게 된다.",
      track:null},
    karneruTribe: {id:"karneruTribe", type:"aspect", ed:"5", name:{en:"Karneru Tribe",ko:"카르네루 부족"},
      mods:{health:0,energy:1,attack:0,defence:0,firstMastery:-1,secondMastery:-1,navigate:2,explore:0,survival:2},
      foodMod:1,
      desc:`<b>제 사람은 제가 챙긴다(방어)</b> — Resolution 페이즈에 <st>energy</st> <b>1</b>을 써서
    원하는 동료 하나에게 <st>defence</st> 랭크의 <b>절반</b>만큼 <kw>defend</kw>를 준다.<br>
    <b>육로의 달인</b> — 그룹이 <b>보통 이동이나 무모한 이동</b>을 할 때 <b>1헥스 더</b> 움직일 수 있고,
    <b>Riser 승강기</b>가 있는 <b>떠 있는 산</b>에 오를 때 <kw>soar</kw>가 필요 없다.<br>
    <b>거슬리는 훼방</b> — 전투당 <b>1회</b>까지, <st>health</st>이나 <st>energy</st> <b>2</b>를 써서
    <b>당신의 행동 랭크를 3 줄이고</b>(<b>최소 1</b>) <b>적의 행동 주사위 결과를 1</b> 바꿀 수 있다.`,
      flavor:"숫양 부족은 같은 종족과도 멀리 떨어진 높은 산꼭대기에 산다. 고집스럽고 의리 있기로 알려져 있다.",
      track:null},
    kuriquingaTribe: {id:"kuriquingaTribe", type:"aspect", ed:"5", name:{en:"Kuriquinga Tribe",ko:"쿠리킹가 부족"},
      mods:{health:-1,energy:-2,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:3,survival:0},
      foodMod:1,
      desc:`<b>공간 감각이 뛰어나다(탐험)</b> — <kw>evasion</kw> <b>10</b>을 얻는다.
    <st>explore</st> 랭크만큼 <st>energy</st>를 써서 <b>1라운드</b> 동안 쓴 만큼 회피 수치를 낮출 수 있다.
    <b>목표가 된 뒤</b>에도 쓸 수 있지만, <b>회피 굴림 전</b>이어야 한다.<br>
    <b>매의 눈</b> — <kw>soar</kw>을 얻고, 당신이 살아 있는 동안 그룹의
    <b>획득량</b>과 <b>Range 사정거리</b>가 <b>+1</b> 된다.<br>
    <b>방랑자</b> — 당신이 속한 그룹이 <kw>wander</kw>할 때마다, 대신 <kw>roam</kw>한다.`,
      flavor:"독수리 부족 사람들은 바깥에 좀처럼 모습을 보이지 않는다. 뛰어난 수집가인 이들은 구름살이라고도 불린다.",
      track:null},
    munuTribe: {id:"munuTribe", type:"aspect", ed:"5", name:{en:"Munu Tribe",ko:"무누 부족"},
      mods:{health:0,energy:2,attack:-1,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:1,survival:0},
      desc:`<b>패턴을 잘 읽는다(기술)</b> — 적이 <b>같은 행동을 연달아 두 번</b> 쓸 때마다,
    원하는 기술을 굴릴 수 있다. 성공하면 이번 라운드 그 행동의 효과에 <kw>immune</kw>이 된다.<br>
    <b>능숙한 손버릇</b> — 전투가 끝날 때마다 <b>골드 2 이하</b>짜리 아이템을 하나 얻는다.
    또한 <b>1회용 아이템</b>을 살 때마다 코어 주사위를 굴려 <b>헥스</b>가 나오면
    <b>같은 아이템을 하나 더</b> 공짜로 얻는다.<br>
    <b>사회 질서</b> — 동료가 <b>죽어 있거나 <st>health</st>이 2 이하</b>일 때마다
    기술 굴림에 <b>+2 페널티</b>를 받는다.`,
      flavor:"몇 주씩 이어지는 잔치로 이름난 원숭이 부족은 카피키아왈 밀림의 거대한 나무들에 산다.",
      track:null},
    clanKazan: {id:"clanKazan", type:"aspect", ed:"5", name:{en:"Clan Kazan",ko:"카잔 가문"},
      mods:{health:1,energy:0,attack:2,defence:0,firstMastery:0,secondMastery:0,navigate:-1,explore:-1,survival:0},
      foodMod:1,
      desc:`<b>화산의 불길이 네 안에서 날뛴다(공격)</b> — <st>attack</st> 랭크를 올려 주는 <b>파워업</b>을 얻었을 때,
    그 카드를 버리고 대신 <b>Fire 불 원소 티어</b>만큼 <kw>energy drain</kw>를 받아
    <b>불 티어를 1 올릴</b> 수 있다.<br>
    <b>능숙한 학습자</b> — 파워업 보상으로 <b>기술 랭크</b>가 오를 때마다,
    다른 <b>능력이나 생명력 랭크를 1</b> 올릴 수 있다.<br>
    <b>손대지 마</b> — 동료가 당신을 <kw>heal</kw>할 때마다, 그 동료가 <kw>nonlethal</kw> <st>health</st> 피해 <b>1</b>을 받는다.`,
      flavor:"카잔 가문의 분노는 화산이 터지는 것 같다고들 한다.",
      track:null},
    clanJishin: {id:"clanJishin", type:"aspect", ed:"5", name:{en:"Clan Jishin",ko:"지신 가문"},
      mods:{health:3,energy:3,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      foodMod:1,
      freeRanks:{n:-1, group:"atkDef"},
      desc:`<b>자기장이 보인다(생존)</b> — <st>survival</st> 랭크를 올려 주는 <b>파워업</b>을 얻었을 때,
    그 카드를 버리고 대신 <b>Earth 대지 원소 티어</b>만큼 <kw>energy drain</kw>를 받아
    <b>대지 티어를 1 올릴</b> 수 있다.<br>
    <b>공용 배낭</b> — <b>모든 영웅이 모든 배낭</b>에 접근할 수 있다.
    방어할 때 아이템을 <b>1개가 아니라 2개</b> 쓸 수 있다.<br>
    <b>위협적인 존재감</b> — 공격이 <b>둘 이상</b>을 목표로 삼는다면, 당신은 <b>언제나 그중 하나</b>가 된다.`,
      flavor:"지신 가문은 이 땅의 건축가이자 기술자다. 그들이 없었다면 이 세계를 떠받치는 토대가 무너졌을 것이라고들 한다.",
      track:null},
    clanHayase: {id:"clanHayase", type:"aspect", ed:"5", name:{en:"Clan Hayase",ko:"하야세 가문"},
      mods:{health:0,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      freeRanks:[{n:2, group:"vital"}, {n:-1, group:"atkDef"}],
      desc:`<b>물을 정화할 수 있다(길찾기)</b> — <st>navigate</st> 랭크를 올려 주는 <b>파워업</b>을 얻었을 때,
    그 카드를 버리고 대신 <b>Water 물 원소 티어</b>만큼 <kw>energy drain</kw>를 받아
    <b>물 티어를 1 올릴</b> 수 있다.<br>
    <b>정화</b> — <kw>corrosive</kw> 피해를 받을 때마다 <b>1 적게</b> 받고(<b>최소 0</b>),
    그 피해는 <b>부식 성질을 잃는다</b>.<br>
    <b>다정한 영혼</b> — 이 양상을 얻을 때 원하는 <b>Familiar 패밀리어 1</b>을 얻는다.
    당신이 얻는 <b>모든 패밀리어의 시작 랭크가 2</b>가 된다(원래의 <b>1 + 기준 능력치의 1/3</b> 대신).`,
      flavor:"하야세 가문 사람들은 이 땅의 백성을 위해 부지런히 일한다. 제국은 그들의 노동에 기대고 있다.",
      track:null},
    clanShiden: {id:"clanShiden", type:"aspect", ed:"5", name:{en:"Clan Shiden",ko:"시덴 가문"},
      mods:{health:1,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      freeRanks:[{n:-1, group:"atkDef"}, {n:1, group:"mastery"}],
      desc:`<b>번개를 다룰 수 있다(탐험)</b> — <st>explore</st> 랭크를 올려 주는 <b>파워업</b>을 얻었을 때,
    그 카드를 버리고 대신 <b>Air 바람 원소 티어</b>만큼 <kw>energy drain</kw>를 받아
    <b>바람 티어를 1 올릴</b> 수 있다.<br>
    <b>되살리는 번개</b> — <st>energy</st> <b>2</b>를 써서 이번 라운드에 주는
    <kw>piercing</kw> 피해나 <b>숙적 피해</b>를 <kw>boost</kw> <b>5</b> 한다.
    <kw>piercing</kw> 피해를 줄 때마다 <b>전투가 끝날 때까지</b> <st>energy</st> <kw>regen</kw> <b>1</b>을 얻는다.
    이 효과는 <b>중첩</b>된다.<br>
    <b>피뢰침</b> — <b>물이나 늪 헥스</b>로 이동할 때마다 <kw>nonlethal</kw> <st>health</st> 피해 <b>1</b>을 받는다.`,
      flavor:"시덴 가문의 분노는 번개가 내리치듯 갑작스럽다.",
      track:null},
    cultist: {id:"cultist", type:"aspect", ed:"4", name:{en:"Cultist",ko:"광신도"},
      mods:{health:-1,energy:2,attack:1,defence:-1,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      desc:`<b>적의 <st>energy</st>를 고갈시킬 수 있다(공격)</b> — 당신의 <b>공격 행동이 적의 <st>energy</st>에 적용</b>될 수 있다.<br>
    <b>열렬한 믿음</b> — 게임 턴당 <b>1회</b>까지, 당신의 <st>energy</st>가 <b>0이 될 때</b>
    <b>2라운드</b> 동안 <st>energy</st> <kw>regen</kw> <b>3</b>을 얻는다.
    <b>전투 밖에서</b> 바닥났다면 대신 <st>energy</st> <b>3</b>을 <kw>heal</kw>한다.<br>
    <b>숨은 동지</b> — 게임당 <b>2회</b>까지, 아이템을 파는 장소에 있는 동안 동지들을 불러
    <b>새 장소로 달아날</b> 수 있다 — <kw>teleport</kw> <b>10</b>.
    이때 당신은 <kw>critical</kw> <st>health</st> 피해 <b>1</b>을 받고,
    <b>모든 영웅</b>이 각자 <st>energy</st> 랭크의 <b>절반</b>만큼 <st>energy</st> 피해를 받는다.`,
      flavor:"너는 남들이 한사코 부정하는, 위험한 무언가를 믿는다. 그 믿음이 너에게 힘을 준다.",
      track:null},
    craftsman: {id:"craftsman", type:"aspect", ed:"4", name:{en:"Craftsman",ko:"장인"},
      mods:{health:-1,energy:2,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      freeRanks:[{n:-1, group:"atkDef"}, {n:1, group:"mastery"}],
      desc:`<b>지속력 전문화(공격)</b> — <st>outlast</st>을 가진 적을 마주하면,
    당신의 <b>공격 행동이 그 적의 <st>outlast</st>에 적용</b>될 수 있다.<br>
    <b>기어 특기</b> — 게임을 시작하기 전에 <b>스탯 종류</b>를 하나 고른다(<b>생명력 · 기술 · 능력</b>).
    한 번 고르면 <b>바꿀 수 없다</b>.
    게임 턴당 <b>1회</b>, Movement 이동 페이즈 전에 <b>골드 2</b>와 <b>그 기어 업그레이드의 골드 비용만큼</b>
    <st>energy</st>를 써서, 고른 스탯 종류에 맞는 <b>기어 업그레이드 1개</b>를 자신이나 동료에게 만들어 준다.<br>
    <b>손보는 데는 시간이 든다</b> — 기어 특기를 쓰면 그 게임 턴 <b>그룹의 이동력이 2 줄어든다</b>.`,
      flavor:"너는 늘 손재주가 좋았고, 무엇이든 고쳐 내는 재주가 있다.",
      track:null},
    noble: {id:"noble", type:"aspect", ed:"4", name:{en:"Noble",ko:"귀족"},
      mods:{health:0,energy:0,attack:1,defence:0,firstMastery:0,secondMastery:1,navigate:0,explore:0,survival:-1},
      foodMod:1,
      desc:`<b>뇌물 전문화(방어)</b> — 뇌물을 줄 수 있는 적을 마주하면, <b>전투를 시작하기 전에</b> 코어 주사위를 굴린다.
    결과가 <st>defence</st> 랭크 <b>이하</b>라면 뇌물에 드는 <b>골드를 <st>defence</st> 랭크만큼</b> 줄인다.<br>
    <b>부유함</b> — <b>음식을 가득 채운 채</b>, <b>골드 10</b>을 더 갖고,
    아이템을 파는 아무 장소에서든 <b>골드 10 이하</b>짜리 아이템 <b>1개</b>를 골라 가지고 시작한다.<br>
    <b>거점</b> — 당신은 <b>자기 성</b>을 가진다. 이벤트 장소가 아닌 헥스 하나를 <b>거점</b>으로 골라
    <b>헥스 토큰 2개</b>를 올린다. 한 번 고르면 <b>다시 고를 수 없다</b>.
    게임이 끝날 때까지 그룹은 이곳으로 돌아와 <b>생명력을 가득</b> <kw>heal</kw>할 수 있다.<br>
    성을 건사하는 데는 돈이 든다 — <b>골드를 얻을 때마다 2 적게</b> 얻는다(<b>최소 1</b>).`,
      flavor:"너의 지체는 여느 사람들보다 높다.",
      track:null},
    peasant: {id:"peasant", type:"aspect", ed:"4", name:{en:"Peasant",ko:"농민"},
      mods:{health:-1,energy:0,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:-1,explore:0,survival:1},
      foodMod:-1,
      desc:`<b>영향력 전문화(공격)</b> — <st>influence</st>을 줄 수 있는 적을 마주하면,
    당신의 <b>공격 행동이 그 적의 <st>influence</st>에 적용</b>될 수 있다.<br>
    <b>수의 힘</b> — <b>치료를 파는 장소를 떠날 때마다</b> <b>공짜로</b> <kw>heal</kw>한다.<br>
    <b>근면</b> — 게임 턴당 <b>1회</b>, 기술 굴림에 <b>실패한 뒤</b> <st>energy</st> <b>2</b>를 써서
    주사위를 <b>다시 굴릴</b> 수 있다. <b>두 번째도 실패</b>하면 <st>energy</st> <b>1</b>을 더 잃는다.`,
      flavor:"삶은 대개 고되다는 것을 너는 안다. 이 세상에 확실한 것이 하나 있다면, 값진 것은 결코 쉽게 오지 않는다는 것이다. 땀과 수고는 열 배로 돌아온다.",
      track:null},
    adventurer: {id:"adventurer", type:"aspect", ed:"4", name:{en:"Adventurer",ko:"모험가"},
      mods:{health:2,energy:-1,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      freeRanks:[{n:1, group:"atkDef"}, {n:-1, group:"mastery"}],
      desc:`<b>지속력 전문화(공격)</b> — <st>outlast</st>을 가진 적을 마주하면,
        당신의 <b>공격 행동이 그 적의 <st>outlast</st>에 적용</b>될 수 있다.<br>
        <b>견문</b> — 게임을 시작하기 전에 원하는 종류의 <b>무작위 지도 타일을 4장까지</b> 뽑아 놓는다.
        <b>서로 다른 종류</b>로 골라도 된다.<br>
        <b>위험쯤이야</b> — 전투에서 <b>도주</b>를 시도할 때 <b>두 번 굴려 높은 쪽</b>을 쓴다.
        또한 전투 중 <st>health</st>이 <b>4 이하로 떨어질 때마다</b> 다음 라운드에 행동 랭크를 <kw>boost</kw> <b>3</b> 한다.`,
      flavor:"새로운 곳을 누빌 때 가장 살아 있음을 느낀다. 그 길에는 늘 손볼 문제가 있기 마련이다.",
      track:null},
    humanKind: {id:"humanKind", type:"aspect", exp:"P", name:{en:"Human Kind",ko:"인간 혈통"},
      mods:{health:1,energy:1,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:1,explore:0,survival:0},
      freeRanks:{n:-1, group:"mastery"},
      desc:`<b>뇌물 전문화(방어)</b> — 뇌물을 줄 수 있는 적을 만나면, <b>전투를 시작하기 전에</b> d10을 굴린다.
    결과가 <st>defence</st> 랭크 <b>이하</b>라면 뇌물에 드는 <b>골드를 <st>defence</st> 랭크만큼</b> 줄인다.<br>
    <b>추가 특성</b> — <b>Trait 특성 2개</b>를 가지고 시작할 수 있다.<br>
    <b>희미해진 혈통</b> — 종족 능력을 쓸 때마다 <st>health</st>이나 <st>energy</st>를 <b>1 더</b> 소모한다.`,
      flavor:"인간의 다재다능함이 당신의 혈관에 흐른다. 다만 다른 혈통의 특징은 많이 희미해졌다.",
      track:null},
    sylvan: {id:"sylvan", type:"aspect", exp:"P", name:{en:"Sylvan",ko:"숲의 혈통"},
      mods:{health:1,energy:2,attack:-1,defence:0,firstMastery:0,secondMastery:0,navigate:1,explore:-1,survival:-1},
      freeRanks:{n:1, group:"mastery"},
      desc:`<b>영향력 전문화(공격)</b> — <st>influence</st>을 가진 적을 마주하면,
    당신의 <b>공격 행동을 <st>influence</st>에 적용</b>할 수 있다.<br>
    <b>향상된 감각</b> — Skill 기술 페이즈의 <st>explore</st> 굴림에서 <b>대성공</b>할 때마다,
    일반 보너스 대신 <b>아무 덱 2개의 맨 위 카드</b>를 확인한다.<br>
    <b>강력한 새퍼</b> — 당신이 주는 모든 <st>energy</st> 피해를 <kw>strengthen</kw>로 <b>2</b> 올린다.
    다만 당신이 <kw>piercing</kw> 피해를 받을 때 그 피해가 <b>2 늘어난다</b>.`,
      flavor:"엘프의 혈통이 눈과 귀에 드러나 당신의 인지력을 끌어올린다.",
      track:null},
    feyKind: {id:"feyKind", type:"aspect", exp:"P", name:{en:"Fey Kind",ko:"요정 혈통"},
      mods:{health:-1,energy:2,attack:-2,defence:0,firstMastery:1,secondMastery:1,navigate:-1,explore:1,survival:-1},
      foodMod:-1,
      desc:`<b>회복의 손길(마스터리 1)</b> — <st>firstMastery</st>를 다른 방식으로 쓴다.
    <st>energy</st>를 소모해 원래 능력을 쓰는 대신, <st>firstMastery</st> 랭크의 <b>절반</b>만큼 대상의 <st>health</st>을 <kw>heal</kw>한다.
    <b>전투 밖에서도</b> 쓸 수 있다.<br>
    <b>요정의 집</b> — 그룹이 <b>모든 Fey Realm 요정계 포탈</b>로 이동할 수 있다.
    또한 <b>요정계에 있는 동안 피해를 받지 않는다</b>.<br>
    <b>자연의 인도</b> — 게임 턴당 <b>1회</b>, Movement 이동 페이즈에 기술 하나의 랭크를
    원하는 만큼 낮추고(최소 0) <b>다른 기술 랭크를 그만큼</b> <kw>boost</kw>한다. 턴이 끝날 때까지 이어진다.`,
      flavor:"당신의 피부는 각도에 따라 다른 빛으로 빛난다. 아름다운 생명체의 후손임이 분명하다.",
      track:null},
    elemental: {id:"elemental", type:"aspect", exp:"P", name:{en:"Elemental",ko:"원소 혈통"},
      mods:{health:-1,energy:3,attack:0,defence:-1,firstMastery:0,secondMastery:0,navigate:0,explore:0,survival:0},
      foodMod:-1,
      desc:`<b>회복의 손길(마스터리 2)</b> — <st>secondMastery</st>를 다른 방식으로 쓴다.
    <st>energy</st>를 소모해 원래 능력을 쓰는 대신, <st>secondMastery</st> 랭크의 <b>절반</b>만큼 대상의 <st>energy</st>를 <kw>heal</kw>한다.
    <b>게임 턴당 1회</b>만 쓸 수 있고, <b>전투 밖에서도</b> 쓸 수 있다.<br>
    <b>연속적인 패턴</b> — 당신이 주는 모든 <st>energy</st> 피해를 <b>현재 <st>energy</st>의 절반</b>만큼
    <kw>boost</kw>하고, 당신이 받는 모든 <st>energy</st> <kw>heal</kw>을 <b>1</b> <kw>boost</kw>한다.<br>
    <b>유약한 패턴</b> — 당신이 <st>energy</st> 피해를 받을 때 그 피해가 <b>2 늘어난다</b>.`,
      flavor:"원소의 힘이 당신 안에 희미하게 남아 있다. 때로 그 힘이 넘쳐흐른다.",
      track:null},
    underFoot: {id:"underFoot", type:"aspect", exp:"P", name:{en:"Under Foot",ko:"지하 혈통"},
      mods:{health:2,energy:-1,attack:0,defence:1,firstMastery:0,secondMastery:0,navigate:0,explore:-1,survival:1},
      freeRanks:{n:-1, group:"mastery"},
      desc:`<b>조롱(길찾기)</b> — Resolution 페이즈에 <b>타겟 주사위를 굴리기 전</b> <st>energy</st> 1을 소모해
    당신의 타겟 주사위를 <st>navigate</st> 랭크만큼 <b>올린다</b>.<br>
    <b>단단한 체질</b> — 게임 턴당 <b>1회</b>, 기술 굴림에 실패해 상태를 얻게 될 때
    즉시 <b>−2 보너스</b>를 받고 <b>다시 굴릴</b> 수 있다.<br>
    <b>둔함</b> — 그룹을 노린 공격에 피해를 <b>1 더</b> 받는다.`,
      flavor:"당신은 빛에 익숙하지 않고 춥고 습한 곳을 좋아한다. 어둠 속을 보는 눈을 얻었지만 지상은 불편하다.",
      track:null},
    goblinoid: {id:"goblinoid", type:"aspect", exp:"P", name:{en:"Goblinoid",ko:"고블린 혈통"},
      mods:{health:1,energy:-2,attack:0,defence:1,firstMastery:0,secondMastery:0,navigate:0,explore:2,survival:0},
      foodMod:1,
      freeRanks:{n:-1, group:"mastery"},
      desc:`<b>은밀함(탐험)</b> — Resolution 페이즈에 <b>타겟 주사위를 굴리기 전</b> <st>energy</st> 1을 소모해
    당신의 타겟 주사위를 <st>explore</st> 랭크의 <b>절반</b>만큼 <b>낮춘다</b>.<br>
    <b>더러운 성질</b> — <st>energy</st>가 <b>0</b>일 때, 공격 능력으로 주는 피해가
    <st>attack</st> 랭크의 <b>절반</b>만큼 늘어난다.<br>
    <b>까다롭지 않음</b> — 당신은 아무거나 잘 먹는다. Skill 기술 페이즈에 <st>explore</st>에 성공하고
    <st>survival</st>에 실패했다면 무언가 '음식'을 찾는 데 성공한다.
    또한 <kw>nonlethal</kw> <st>energy</st> 피해를 받아 <st>survival</st> 굴림을 <b>성공으로 취급</b>할 수 있다.`,
      flavor:"당신은 일족보다 조금 더 크고 입이 살짝 튀어나와 있다. 성격이 가장 마음에 안 드는 구석이라는 말도 듣는다. 대부분은 당신을 보면 혐오감에 움찔한다.",
      track:null},
    bestial: {id:"bestial", type:"aspect", exp:"P", name:{en:"Bestial",ko:"야수 혈통"},
      mods:{health:1,energy:0,attack:1,defence:1,firstMastery:-1,secondMastery:-1,navigate:0,explore:0,survival:1},
      foodMod:1,
      desc:`<b>엄청난 후각(생존)</b> — Skill 기술 페이즈에 <st>survival</st> 굴림에 성공하면,
    공개된 <b>환경 카드 하나를 버리고 새로 뽑을</b> 수 있다.<br>
    <b>야성</b> — <b>굶주린 동안</b> 당신의 공격이 <b>2배</b>의 피해를 준다.<br>
    <b>생존 본능</b> — 굶주림 <b>2단계까지</b> 페널티를 무시한다.
    다만 굶주린 동안 <b>게임 턴이 끝날 때마다</b> <st>energy</st> 피해 <b>1</b>을 받는다.`,
      flavor:"당신에게는 어딘가 야성적이고 달라진 구석이 있다. 몸은 어떤 짐승의 특징을 띠고, 본능은 놀랄 만큼 벼려져 있다.",
      track:null},
    ogreKin: {id:"ogreKin", type:"aspect", exp:"P", name:{en:"Ogre Kin",ko:"오우거 혈통"},
      mods:{health:3,energy:-2,attack:2,defence:0,firstMastery:-1,secondMastery:-1,navigate:0,explore:0,survival:1},
      foodMod:1,
      desc:`<b>치명적인 공격(공격)</b> — 적이 당신의 공격을 <kw>defend</kw>하거나 <kw>block</kw>한다면,
    <st>health</st> 피해 1을 받고 d10을 굴릴 수 있다. 결과가 <st>attack</st> 랭크 <b>이하</b>라면
    당신의 공격이 <kw>piercing</kw>을 얻는다.<br>
    <b>두꺼운 가죽</b> — <b>음식 소모량</b>만큼 당신이 받는 <kw>piercing</kw> 피해를 줄이고,
    타겟 주사위를 <b>올린다</b>.<br>
    <b>거대한 타겟</b> — 개인을 노린 공격이 <b>2명 이상</b>을 대상으로 한다면,
    당신의 타겟 주사위가 <b>10 이상</b>일 때 <b>첫 두 공격</b>을 당신이 대신 받는다.`,
      flavor:"당신은 일족보다 훨씬 크다(그리고 못생겼다). 대부분 당신을 보면 혐오감에 놀란다. 다행히 당신은 낯이 두껍다.",
      track:null},
    draconic: {id:"draconic", type:"aspect", exp:"P", name:{en:"Draconic",ko:"용의 혈통"},
      mods:{health:3,energy:2,attack:1,defence:-1,firstMastery:0,secondMastery:0,navigate:-1,explore:0,survival:0},
      foodMod:1,
      desc:`<b>믿을 수 없는 회복력(체력)</b> — 상태를 받는 순간 <st>health</st> 피해 1을 받고
    d10을 굴릴 수 있다. 결과가 <b>현재 <st>health</st> 이하</b>라면 그 기술을 <kw>negate</kw>한다.<br>
    <b>증오하는 적</b> — 숙적에게 주는 피해가 <b>2</b> 늘어난다.<br>
    <b>앞뒤 없는 돌진</b> — 숙적을 마주했을 때 방어를 쓰면
    <st>defence</st> 랭크의 <b>절반만큼만</b> 막는다.`,
      flavor:"피부는 비늘로 덮여 있고 얼굴은 어딘가 파충류를 닮았다.",
      track:null},
    entomorph: {id:"entomorph", type:"aspect", exp:"P", name:{en:"Entomorph",ko:"곤충 혈통"},
      mods:{health:0,energy:2,attack:0,defence:0,firstMastery:0,secondMastery:0,navigate:1,explore:1,survival:0},
      foodMod:1,
      freeRanks:{n:-1, group:"mastery"},
      desc:`<b>무리 속의 평온(에너지)</b> — <st>outlast</st>을 가진 적을 마주했을 때,
    이번 라운드의 행동 대신 d10을 굴릴 수 있다. 결과가 <b>현재 <st>energy</st> 이하</b>라면
    대상의 <st>outlast</st>을 <b>1</b> 줄이고, 그 대상의 행동으로 받는 피해를 <b>절반</b>만 받는다.<br>
    <b>군체 심리</b> — 공격이나 방어 행동을 할 때, <b>같은 행동을 한 다른 영웅 하나마다</b>
    당신의 랭크를 <b>1</b>씩 <kw>boost</kw>한다.<br>
    <b>기이한 신진대사</b> — 몸이 대부분의 약에 강하다.
    당신을 <kw>heal</kw>하는 <b>1회용 아이템</b>의 <st>health</st> 회복량이 <b>2</b> 줄어든다.`,
      flavor:"피부는 키틴질로 분절되어 있다. 곤충의 턱과 더듬이, 겹눈을 가지기도 한다. 대부분의 언어는 말하지 못한다.",
      track:null},
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
  hazardous:{name:{en:"Hazardous",ko:"재앙"}, desc:`그룹은 이 지역에서 Camp(야영)나 Moving Cautiously(조심스럽게 이동)의 이익을 얻지 못하며, Movement 페이즈 종료 시 해당 원소의 <st>health</st> 피해를 1 받는다. Nether(네더) 타일은 항상 Void(공허) 타입이다. 이 효과는 Defender 방어자에 있는 동안 무효가 된다.`},
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
  augment:{name:{en:"Augment",ko:"보강"}, desc:`원소를 Defender 방어자나 영웅에 엮는다. Temple 사원 · Elements 원소 참조표 및 Element 카드 참조 (TMoG).`},
  arcing:{name:{en:"Arcing",ko:"방전"}, desc:`Defender 방어자를 공격할 때, 그 Defender 방어자로부터 X헥스 이내의 다른 Defender 방어자는 가해진 Siege(공성) 피해의 절반을 받는다. 방전은 목표 Defender 방어자가 가진 Specialist 전문가 수만큼 1씩 감소한다.`},
  bolster:{name:{en:"Bolster",ko:"임시강화"}, desc:`Siege가 진행 중일 때, Villain 페이즈에 그룹이 Defender 방어자 안에 있다면 각 영웅은 <st>energy</st> 1을 소모하고 원하는 기술 하나를 굴려 임시 보너스를 줄 수 있다. <st>navigate</st>: 이번 턴 이 Defender 방어자의 Range 사정거리를 2 증가시킨다. <st>explore</st>: Range 사정거리 안의 Siege 적에게 Siege 피해 1을 준다. <st>survival</st>: 이 Defender 방어자가 이번 턴에 Siege 피해를 받았고 Resilience 내구도가 1 이상 남아 있다면 Resilience 내구도 1을 얻는다. 굴림이 치명적 성공이면 소모한 <st>energy</st>를 되돌려받는다.`},
  bulwark:{name:{en:"Bulwark",ko:"방벽"}, desc:`방벽을 가진 대상은 받는 Siege 피해를 방벽 수치만큼 감소시킨다(최소 0). 이 키워드 뒤에 Element 타입이 붙으면 해당 타입의 피해에만 적용된다. 이 키워드를 가진 Siege 적을 상대할 때는, 공격하는 Defender 방어자가 가진 Specialist 전문가 수만큼 방벽이 1씩 감소한다.`},
  consume:{name:{en:"Consume",ko:"소모"}, desc:`이 키워드 뒤에는 자원 종류와 수량이 붙는다. 표시된 자원의 Stockpile 비축량을 소모 수치만큼 줄인다. 이 키워드를 가진 Siege 적은 Defender 방어자에게 Siege 피해를 조금이라도 줄 때마다 Stockpile 비축량을 줄인다. 소모할 자원이 남아 있지 않다면 대신 원하는 City-State 도시국가 하나가 Resilience 내구도 1을 잃는다.`},
  cripple:{name:{en:"Cripple",ko:"손상"}, desc:`이 Siege 피해를 조금이라도 받은 Defender 방어자는 Power 위력도 1 잃는다(최소 1).`},
  deconstruct:{name:{en:"Deconstruct",ko:"해체"}, desc:`Defender 방어자가 이 피해를 받을 때마다 Recruit 신병 1을 잃는다. Recruit 신병가 없다면 대신 Potential 잠재력 1을 잃는다.`},
  equip:{name:{en:"Equip",ko:"장비"}, desc:`Defender 방어자에 Equip 카드를 부착한다. 그 Defender 방어자는 부착된 효과를 얻는다.`},
  freeze:{name:{en:"Freeze",ko:"빙결"}, desc:`이 Siege 적에게 피해를 받은 Defender 방어자는 이번 턴 Equip 효과를 잃는다.`},
  ignite:{name:{en:"Ignite",ko:"발화"}, desc:`이 Siege 적에게 피해를 받은 Defender 방어자 안에 있는 영웅은 X만큼 <kw>energy drain</kw>를 받고 <state>wounded</state> 상태가 된다. 발화는 목표 Defender 방어자가 가진 Specialist 전문가 수만큼 1씩 감소한다.`},
  imbalance:{name:{en:"Imbalance",ko:"불균형"}, desc:`Siege 카드를 뽑을 때마다 Elemental Imbalance가 발생한다. 불균형은 Jaethi의 참조판에 기록하며 각 Element마다 0~9 범위를 가진다.`},
  overpower:{name:{en:"Overpower",ko:"압도"}, desc:`Defender 방어자를 공격할 때, 이 Siege 적의 압도 수치가 그 Defender 방어자의 Power 위력보다 크면 Siege 피해를 1 더 주고, 영웅들은 이번 턴 그 Defender 방어자를 <kw>bolster</kw>하는 데 가장 높은 랭크의 기술을 사용할 수 없다. 압도는 목표 Defender 방어자가 가진 Specialist 전문가 수만큼 1씩 감소한다.`},
  retreat:{name:{en:"Retreat",ko:"후퇴"}, desc:`슬롯 2·3·4의 Siege 적이 처치되면 코어 주사위를 굴린다. 결과가 후퇴 수치 이하라면 죽음을 피한다(보상을 얻지 못한다). 이 Siege 적을 현재 슬롯의 왼쪽 슬롯 맨 아래에 놓는다. 후퇴는 공격하는 Defender 방어자가 가진 Recruit 신병 수만큼 1씩 감소한다.`},
  siege:{name:{en:"Siege",ko:"공성"}, desc:`피해의 한 종류다. Siege 적이나 Defender 방어자는 받은 Siege 피해 1점마다 Resilience 내구도를 1 잃는다. Siege 피해를 조금이라도 받은 영웅은 대신 <kw>piercing</kw> <kw>energy drain</kw> 20을 받는다.`},
  swift:{name:{en:"Swift",ko:"신속"}, desc:`이 키워드를 가진 Siege 적은 2헥스 추가로 이동하며, City-State 도시국가만 Magnetic으로 취급한다.`},
  tremor:{name:{en:"Tremor",ko:"진동"}, desc:`이 효과가 유지되는 동안, 효과 Range 사정거리 안의 모든 Recruit 신병·Specialist 전문가 보너스를 <kw>negate</kw>한다.`},
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
  dissonant:{name:{en:"Dissonant",ko:"부조화"}, q:["A","P","S"], desc:`대상의 패턴이 뒤틀려 흐트러지기 시작한다. 대상이 <st>energy</st> 피해를 받을 때마다 같은 양의 <kw>nonlethal</kw> <st>health</st> 피해를 함께 받는다. 부조화 상태의 영웅은 스탯 굴림에 -2 페널티를 받는다. 중첩은 페널티에만 적용된다.`},
  drained:{name:{en:"Drained",ko:"소진"}, q:["A","S"], desc:`소진 대상은 매 라운드 Declaration 페이즈 시작에 <st>energy</st> 3을 잃고, <st>energy</st>를 <kw>heal</kw>할 때마다 3 적게 회복한다. 회복 감소는 중첩되지만 피해는 중첩되지 않는다.`},
  encased:{name:{en:"Encased",ko:"감금"}, q:["A"], desc:`감금된 대상은 전투에서 적의 표적이 되지 않지만, 자신을 가둔 구속물은 자신이나 동료가 대상으로 삼을 수 있다. 감금된 대상은 매 라운드 <st>attack</st>만 사용할 수 있으며 구속물만 노릴 수 있다. 이 상태에는 괄호 안에 숫자가 있는데, 대상을 풀어주기 위해 구속물에 줘야 하는 <st>health</st> 피해량이다. 이 상태는 다른 수단으로 제거할 수 없고 전투가 끝나면 해제된다.`},
  entangled:{name:{en:"Entangled",ko:"얽힘"}, q:["S"], desc:`얽힌 영웅은 정상적으로 행동하려면 매 라운드 Declaration 페이즈에 <st>navigate</st> 굴림에 성공해야 한다. 실패하면 <st>attack</st>이나 <st>defence</st>만 -3 페널티를 받고 할 수 있다.`},
  fatigued:{name:{en:"Fatigued",ko:"피로"}, q:["A","S"], desc:`피로 대상은 전투 중 매 라운드 Declaration 페이즈 시작에 <st>energy</st> 1을 잃는다.`},
  frightened:{name:{en:"Frightened",ko:"공포"}, q:["S"], desc:`공포에 빠진 영웅은 <st>defence</st> 행동만 할 수 있고 -3 페널티를 받는다. 전투 중 매 라운드 Resolution 페이즈에 <st>survival</st>을 굴린다. 성공하면 상태가 해제된다.`},
  frozen:{name:{en:"Frozen",ko:"동결"}, q:[], desc:`동결된 영웅은 행동할 수 없다. 매 라운드 Declaration 페이즈에 <st>survival</st>을 굴린다. 2회 성공하면 정상적으로 행동할 수 있고 동결이 해제된다.`},
  imprisoned:{name:{en:"Imprisoned",ko:"투옥"}, q:[], desc:`투옥된 영웅은 자신의 의지와 무관하게 붙잡혀 있다. 소지금과 음식, 배낭을 사용할 수 없다. 영웅들이 City-State 도시국가에 있지 않다면 피라미드 주사위를 굴려 City-State 도시국가 중 한 곳으로 이동시킨다. 그룹은 Arena(투기장)에 한 번 참가하기로 선택할 수 있다. 획득한 소지금은 몰수된다. 이 상태에는 괄호 안에 숫자가 있으며, 그룹이 투옥되어 보낸 시간을 나타낸다. 게임 턴이 끝날 때 이 숫자만큼 Remnant를 보드에 놓는다. 그 후 그룹은 풀려나고 배낭을 다시 사용할 수 있다. 이 상태는 아이템으로 제거할 수 없다.`},
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
/* 전투 절차 — 편마다 달라질 수 있어 객체를 갈라 둔다.
   2026-08-13 확인: 4편 규칙서 71쪽과 5편 95쪽이 한 글자도 다르지 않아 지금은 본문을 함께 쓴다.
   한쪽만 고쳐야 할 때는 COMBAT_BODY 를 복사해 그 편 객체에 떼어 넣는다. */
const COMBAT_BODY = `
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
  Conditions apply last).</div>`;

const R4_COMBAT = {title:{en:"Combat Reference", ko:"전투 참조표"}, body:COMBAT_BODY};
const R5_COMBAT = {title:{en:"Combat Reference", ko:"전투 참조표"}, body:COMBAT_BODY};


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

/* ── 5편(고다이 산맥) 룰 — 수확·공성 두 단계로 굴러간다 ── */
const R5_STAGES = {title:{en:"Game Stages", ko:"게임의 두 단계"}, body:`
  <div class="rule-v">한 게임은 <b>Siege Wave 공성 물결</b> <b>3~4번</b>으로 이루어지고, 각 물결은 <b>수확 단계</b>와 <b>공성 단계</b>로 나뉜다.
    <b>4편과 달리 상황(Circumstance) 단계가 없다.</b></div>
  <div class="rule-h">Harvest Stage 수확 단계</div>
  <div class="rule-grid">
    <div class="rule-k">성격</div><div class="rule-v">게임 턴 하나가 <b>한 달</b>. 판단과 <b>자원 관리</b>가 중심이다</div>
    <div class="rule-k">하는 일</div><div class="rule-v"><b>자원</b>을 모아 <b>Defender 방어자를 강화</b>한다. 조우·보스와 싸우고 보물이나 발견을 얻기도 한다</div>
    <div class="rule-k">끝나는 조건</div><div class="rule-v">수확 게임 턴이 끝날 때마다 <b>Jaethi 카드</b>를 한 장 뽑는다.
      <b>siege! 카드</b>가 나오면 다음 <b>공성 단계</b>가 시작된다</div>
  </div>
  <div class="rule-h">Siege Stage 공성 단계</div>
  <div class="rule-grid">
    <div class="rule-k">성격</div><div class="rule-v">Wellspring이 옅어져 <b>원소 관문</b>이 열리고 <b>공성 적</b>이 쏟아진다. 게임당 <b>최대 4번</b></div>
    <div class="rule-k">구도</div><div class="rule-v"><b>4개의 공성 깃발</b>로 표현되는 적들이 <b>Magnetic Defender 방어자</b>를 향해 진군한다.
      <b>Jaethi, the Plumed Serpent</b> 본인도 이때 모습을 드러낸다</div>
    <div class="rule-k">끝</div><div class="rule-v">공성은 영원하지 않다 — Wellspring이 깨진 <b>패턴</b>을 계속 되돌리려 하기 때문</div>
  </div>
  <div class="rule-v" style="margin-top:9px">두 단계 모두 진행 순서는 <b>이동 → 기술 → 이벤트 → 빌런</b>으로 같다.</div>`};

/* 키워드 분류와 처리 순서 — 전 시리즈 공용.
   문구는 5편 Game Guide 6~7쪽에서 가져왔다. 4편에도 같은 분류가 있으나
   규칙서 목록이 가나다순이라 눈에 띄지 않을 뿐이며, 최신본을 기준으로 통일한다. */
const RULES_KWORDER = {title:{en:"Keyword Order", ko:"키워드 분류 · 처리 순서"}, body:`
  <div class="rule-h">네 갈래</div>
  <div class="rule-grid">
    <div class="rule-k">피해</div><div class="rule-v">피해의 <b>종류</b>나 <b>목표 수</b>를 정하거나 바꾼다</div>
    <div class="rule-k">방어</div><div class="rule-v"><b>목표가 되는 것</b>과 <b>피해를 받는 것</b>에 관여한다</div>
    <div class="rule-k">회복</div><div class="rule-v">대상의 <b>생명력·에너지</b>에 관여한다</div>
    <div class="rule-k">유틸리티</div><div class="rule-v">그 밖의 전부</div>
  </div>
  <div class="rule-h">방어 키워드가 여럿일 때 — 이 순서로</div>
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><kw>evasion</kw> — 아예 <b>안 맞았는지</b> 먼저 가린다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><kw>immune</kw></span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><kw>negate</kw></span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><kw>reflect</kw></span></div>
    <div class="rule-step"><span class="n">5</span><span class="t"><kw>block</kw> — <b>총 피해</b>를 줄인다(<st>energy</st> 피해부터)</span></div>
    <div class="rule-step"><span class="n">6</span><span class="t"><kw>defend</kw> — <b>피해 하나하나</b>를 줄인다</span></div>
    <div class="rule-step"><span class="n">7</span><span class="t"><kw>counterattack</kw> — 맞은 뒤에 되돌려준다</span></div>
  </div>
  <div class="rule-v" style="margin-top:9px"><kw>block</kw>과 <kw>defend</kw>를 <b>둘 다</b> 가졌다면 <b><kw>block</kw>이 먼저</b>다.</div>`};

const R5_SETUP = {title:{en:"Game Setup", ko:"게임 준비"}, body:`
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>영웅 만들기</b></span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>판 깔기</b></span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><b>빌런 덱 만들기 · Jaethi의 Resilience 내구도 기록</b> — 게임 길이와 난이도가 여기서 정해진다</span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><b>시작 위치 굴림 · 초기 자원 획득</b></span></div>
  </div>
  <div class="rule-h">1 · 영웅</div>
  <div class="rule-grid">
    <div class="rule-k">구성</div><div class="rule-v"><b>직업 + 종족</b>을 골라 능력치를 채운다. 다른 편의 영웅 추가 요소도 얹을 수 있다</div>
    <div class="rule-k">시작 소지품</div><div class="rule-v"><b>골드 10</b> · <b>음식 5</b> · <b>스탯 주사위 3개</b> · <b>수확 자원 참조 카드</b> 1장</div>
    <div class="rule-k">말</div><div class="rule-v">그룹 전체를 나타낼 영웅 미니어처 <b>하나</b>를 고른다</div>
  </div>
  <div class="rule-h">2 · 판</div>
  <div class="rule-grid">
    <div class="rule-k">제국 정하기</div><div class="rule-v">먼저 어느 제국으로 할지 정한다 — <b>Caprakan</b> · <b>Ishidan</b> · <b>둘 다</b>. 이 선택이 게임 바와 제국 타일 배치를 결정한다</div>
    <div class="rule-k">깔기</div><div class="rule-v"><b>게임 바 4개</b> · <b>제국 타일 2개</b> · <b>무작위 헥스타일 2개</b> · <b>Siege Portal 공성 관문 3개</b>.
      제국 타일은 각 City-State 도시국가가 <b>허용된 3방향 중 하나</b>에 오도록 돌려 놓는다</div>
    <div class="rule-k">하늘 타일</div><div class="rule-v"><b>SkyTile 하늘 타일 1장</b>을 놓는다. 놓는 자리에 따라 <b>새 헥스타일이 공개</b>될 수 있다</div>
    <div class="rule-k">보스 소굴</div><div class="rule-v">공개된 소굴마다 <b>무작위 보스 토큰</b>을 <b>숫자 면이 위로</b> 오게 놓는다</div>
    <div class="rule-k">추적판</div><div class="rule-v">각 City-State 도시국가의 초기 수치를 <b>Defender 방어자 추적판</b>에 적어 게임 바의 지정 자리에 놓는다.
      나머지 추적판은 <b>"Enhancing Defenders" 면이 위로</b> 오게 모아 둔다</div>
    <div class="rule-k">따로 빼둘 것</div><div class="rule-v"><b>Siege Banner 공성 깃발 4개</b> · <b>Jaethi 미니어처</b> · <b>Riser 승강기</b> · 참조판 전부</div>
  </div>
  <div class="rule-h">덱</div>
  <div class="rule-grid">
    <div class="rule-k">커미션</div><div class="rule-v">제국별 커미션 덱을 섞어 <b>맞는 제국 자리</b>에 놓고 <b>맨 위 카드를 공개</b>한다.
      <b>한 제국만</b> 쓴다면 그 덱을 <b>무작위로 반씩 나눠</b> 양쪽에 놓는다</div>
    <div class="rule-k">그 외</div><div class="rule-v"><b>수확 · 조우 · 파워업</b> 덱을 섞어 놓는다. <b>원소 공성 덱 5종</b>은 섞어서 <b>서로 섞이지 않게 따로</b> 판 옆에 둔다</div>
    <div class="rule-k">Jaethi</div><div class="rule-v">아래 3단계에서 <b>특별한 방식</b>으로 만든다</div>
  </div>
  <div class="rule-h">3 · 빌런 덱 — 게임 길이가 여기서 정해진다</div>
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>siege! 카드 5장</b>을 찾아 <b>뒷면으로</b> 빼둔다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t">남은 카드로 <b>3장짜리 더미 5개</b>를 만든다(뒷면으로).
      <b>더 긴 게임</b>을 원하면 더미당 <b>4장이나 5장</b>으로 한다</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t">그러고도 남은 카드는 <b>여섯 번째 더미</b>로 따로 둔다</span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><b>보지 않고</b> siege! 카드를 <b>더미마다 1장씩</b> 섞어 넣는다</span></div>
    <div class="rule-step"><span class="n">5</span><span class="t">다섯 더미 중 <b>원하는 3개</b>를 골라 <b>섞지도 보지도 말고</b> 그대로 쌓아 한 덱으로 만든다</span></div>
    <div class="rule-step"><span class="n">6</span><span class="t">여섯 번째 더미에서 <b>맨 위 2장</b>을 <b>섞지 말고</b> 그 위에 얹는다</span></div>
  </div>
  <div class="rule-v" style="margin-top:9px">이렇게 하면 <b>공성 3번</b>짜리 게임이 된다. 남은 카드는 쓰지 않는다.
    <b>어떤 게임 효과로도 빌런 덱을 섞을 수 없다.</b></div>
  <div class="rule-grid">
    <div class="rule-k">Jaethi의 내구도</div><div class="rule-v"><b>공성 물결 수 × 25</b>. 공성 <b>3번이면 75</b>, <b>4번이면 100</b>.
      시작 전에 <b>배틀 매트</b>에 적어 둔다</div>
  </div>
  <div class="rule-h">4 · 시작 위치와 초기 자원</div>
  <div class="rule-grid">
    <div class="rule-k">시작 위치</div><div class="rule-v"><b>헥스 주사위</b>를 굴려 <b>홀수면 City-State 도시국가 1</b>, <b>짝수면 2</b>.
      그 도시국가의 <b>아무 헥스</b>에나 그룹 말을 놓는다. (게임 중 무작위 도시국가를 정할 때도 같은 방법을 쓴다)</div>
  </div>
  <div class="rule-h">초기 장비 — 영웅마다 셋, 그룹이 하나</div>
  <div class="rule-grid">
    <div class="rule-k">기어 업그레이드</div><div class="rule-v"><b>생명력 2칸</b> · <b>기술 1칸</b> · <b>능력 1칸</b> 중 하나</div>
    <div class="rule-k">아이템</div><div class="rule-v"><b>Viper Potion 3개</b> · <b>Ring of Command</b> · <b>Gryphon Mount</b> ·
      <b>Peryton Mount</b>(음식 소모량 −1) 중 하나</div>
    <div class="rule-k">자원</div><div class="rule-v"><b>백금 10</b> · <b>백금 4</b> · <b>기본 원소 1</b> 중 하나</div>
    <div class="rule-k">그룹 테마</div><div class="rule-v">그룹이 하나를 고른다 —
      <b>Hunters</b> 각 영웅이 원하는 능력 랭크 <b>2</b> · <b>Explorers</b> Leyline Compass + Expedition Contract ·
      <b>Seeker</b> 커미션 카드 <b>5장</b> 공개 · <b>Collectors</b> 백금 1 + Wellspring Amplifier 3개</div>
  </div>
  <div class="rule-grid">
    <div class="rule-k">첫 Tower 탑</div><div class="rule-v">세울지 <b>고를 수 있다</b>. 세우면 <b>무너져 가는 상태</b>라 Resilience 내구도가 <b>절반(5)</b>으로 시작한다.
      게임 장소가 아닌(<b>색 테두리</b>) 아무 헥스에나 <b>Tower 1</b>을 놓고 추적판을 채운다.
      <b>세우지 않으면</b> 대신 <b>백금 4</b>와 <b>원하는 기본 원소 1개</b>를 얻는다</div>
  </div>
  <div class="rule-h">원소 주사위 굴리기</div>
  <div class="rule-v"><b>원소 주사위 5개</b>를 전부 굴려 초기 자원을 얻는다. 얻은 자원은 <b>Stockpile 비축량</b>에 기록한다.</div>
  <div class="rule-grid">
    <div class="rule-k">Air · Fire</div><div class="rule-v">결과마다 <b>목재 4</b></div>
    <div class="rule-k">Earth · Water</div><div class="rule-v">결과마다 <b>광석 4</b></div>
    <div class="rule-k">Void</div><div class="rule-v">결과마다 <b>백금 2</b> + <b>원하는 고급(Tier II) 자원 1</b></div>
    <div class="rule-k">Surge 쇄도</div><div class="rule-v">위 보상에 더해 <b>백금 4</b>. 그리고 <b>쇄도한 주사위를 다시 굴려</b> 원소를 얻을 수 있다</div>
  </div>
  <div class="rule-h">원소 얻기 — 다시 굴릴 때</div>
  <div class="rule-grid">
    <div class="rule-k">기본 주사위</div><div class="rule-v"><b>불일치</b> 없음 · <b>일치</b> 나온 원소 1 · <b>쇄도</b> 같은 원소 2</div>
    <div class="rule-k">Void 주사위</div><div class="rule-v"><b>불일치</b> 나온 원소 1 · <b>일치</b> 공허 1 ·
      <b>쇄도</b> 다시 굴려 또 쇄도면 공허 2, 아니면 공허 1</div>
  </div>`};

const R5_TURN = {title:{en:"Turn Sequence", ko:"차례 진행"}, body:`
  <div class="rule-h">단계 시작 <span class="rule-tag">수확</span></div>
  <div class="rule-v">게임을 시작하거나 새 수확 단계가 열리면, <b>Acquire Amount 획득량</b>만큼 <b>수확 카드</b>를 뽑아 처리한다.
    <b>즉시 효과</b>는 바로 적용하고, <b>단계 종료까지 지속 효과</b>는 기록해 둔다.</div>
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>이동</b> — 시작 이동력 <b>턴당 4헥스</b>. <b>보통 · 신중 · 무모 · 야영</b> 중에서 고른다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>기술</b> — 어떻게 움직였는지에 따라 굴리는 기술과 보정이 달라진다</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><b>이벤트</b> — <span class="rule-tag">수확</span> 위치에 따라 <b>자원을 수확</b>한다.
      게임 장소나 토큰이 있는 칸에 있으면 사건이 일어난다</span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><b>빌런</b> — <span class="rule-tag">수확</span> Jaethi 카드를 뽑아 처리 ·
      <span class="rule-tag">공성</span> 공성 빌런 단계를 진행</span></div>
  </div>`};

const R5_HARVEST = {title:{en:"Harvest Stage", ko:"수확 단계"}, body:`
  <div class="rule-h">단계를 열 때</div>
  <div class="rule-grid">
    <div class="rule-k">카드 뽑기</div><div class="rule-v"><b>획득량</b>만큼 수확 덱에서 뽑는다(시작 <b>3</b>)</div>
    <div class="rule-k">즉시 효과</div><div class="rule-v">원하는 순서로 처리한다</div>
    <div class="rule-k">지속 효과</div><div class="rule-v">뽑는 즉시 발동해 <b>수확 단계가 끝날 때까지</b> 유지된다. 전략이 이 효과에 좌우된다</div>
    <div class="rule-k">보관</div><div class="rule-v">이번 단계에 뽑은 수확 카드는 <b>따로 모아 두고</b> 필요할 때 참조한다</div>
  </div>
  <div class="rule-h">Acquire Amount 획득량</div>
  <div class="rule-v"><b>3</b>에서 시작하며 여러 효과로 늘어난다. 이 수치는 두 가지를 동시에 정한다 —
    단계 시작에 뽑는 <b>수확 카드 장수</b>, 그리고 매 게임 턴 <b>Range 사정거리</b> 안에서 자원을 거둘 <b>헥스 수</b>.
    그래서 수확 단계에는 <b>어디에 서 있느냐</b>가 곧 전략이 된다.</div>
  <div class="rule-h">Treasure 보물</div>
  <div class="rule-grid">
    <div class="rule-k">획득 조건</div><div class="rule-v">뽑았다고 바로 얻는 게 아니다. <b>Antiquity Site 유적</b>에서 이벤트를 치러야 얻는다</div>
    <div class="rule-k">얻으면</div><div class="rule-v">영웅 하나가 카드를 갖고 <b>Wielder Bonus 소지자 보너스</b>와 <b>보물 효과</b>를 쓴다. 그 자리에는 <b>헥스 토큰을 놓지 않는다</b></div>
    <div class="rule-k">못 얻으면</div><div class="rule-v">수확 단계가 끝날 때 <b>버려진다</b> — Jaethi가 그 패턴을 삼켜 버린다</div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">공성이 시작되면 이 단계에 뽑은 수확 카드는 모두 버린다.</div>`};

const R5_VILLAIN_H = {title:{en:"Villain Phase (Harvest)", ko:"빌런 단계 · 수확"}, body:`
  <div class="rule-v">Jaethi 덱에서 <b>한 장</b>을 뽑아 처리한다.</div>
  <div class="rule-grid">
    <div class="rule-k">공성 카드 배치</div><div class="rule-v">카드에 표시된 <b>원소 주사위</b>를 굴려, 그 유형의 공성 카드를 <b>다가오는 공성 슬롯</b>에 놓는다.
      결과가 <b>Surge</b>면 그 <b>오른쪽 슬롯</b>에도 한 장 더 놓는다(다음이 4번째 공성이면 왼쪽)</div>
    <div class="rule-k">조우 아이콘</div><div class="rule-v">뽑은 카드에 조우 아이콘이 있으면 <b>Encounter</b>를 뽑아 처리한다</div>
  </div>
  <div class="rule-h">뽑은 카드가 <b>siege!</b> 라면</div>
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t">캘린더 아래의 <b>다음 공성 물결</b> 칸(1~4)을 표시한다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>공성 지속</b>을 정한다 — <b>헥스 주사위</b>를 굴려 캘린더를 <b>2 + 공성 물결 번호 + 굴림의 절반(내림)</b>만큼 올린다(최대 7칸)</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t">Jaethi 공성 판에서 해당 <b>Imbalance 불균형</b>을 <b>1</b> 올린다</span></div>
    <div class="rule-step"><span class="n">4</span><span class="t">활성화된 공성마다 <b>맨 위 카드를 공개</b>하고, 굴려서 <b>Jaethi와 각 공성 깃발</b>을 배치한다.
      각 적의 <b>Resilience 내구도</b>를 전투 매트에 적는다</span></div>
    <div class="rule-step"><span class="n">5</span><span class="t"><b>Tier II 자원 비축</b>의 지속 효과를 얻는다</span></div>
    <div class="rule-step"><span class="n">6</span><span class="t">사용 중인 <b>수확 카드</b>를 모두 버리고, <b>확보하지 못한</b> 발견 토큰과 보물을 치운다</span></div>
    <div class="rule-step"><span class="n">7</span><span class="t">수확 단계가 끝나고 <b>같은 빌런 단계 안에서</b> 공성 단계가 곧바로 시작된다(새 게임 턴이 아니다)</span></div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">siege! 가 아니면 빌런 단계가 끝나고 새 수확 게임 턴이 시작된다.</div>`};

const R5_SIEGE = {title:{en:"Siege Stage", ko:"공성 단계"}, body:`
  <div class="rule-v">한 번에 <b>최대 5</b>의 공성 세력과 맞선다 — <b>공성 깃발 4개</b>(슬롯 1~4)와 <b>Jaethi</b>.</div>
  <div class="rule-h">공성 슬롯</div>
  <div class="rule-grid">
    <div class="rule-k">슬롯이 정하는 것</div><div class="rule-v"><b>이동 속도</b>와 <b>Power 위력 보너스</b></div>
    <div class="rule-k">카드가 정하는 것</div><div class="rule-v"><b>Resilience 내구도</b>, 기본 <b>Power 위력</b>, <b>Range 사정거리</b></div>
    <div class="rule-k">슬롯별 수치</div><div class="rule-v"><b>1</b> 이동 2 · 보너스 없음 &nbsp;|&nbsp; <b>2</b> 이동 2 · <b>+1</b> &nbsp;|&nbsp;
      <b>3</b> 이동 3 · <b>+2</b> &nbsp;|&nbsp; <b>4</b> 이동 4 · <b>+3</b></div>
    <div class="rule-k">카드 더미</div><div class="rule-v">한 슬롯에 여러 장이 쌓일 수 있다. <b>맨 위 카드만</b> 실제로 상대한다</div>
    <div class="rule-k">Jaethi</div><div class="rule-v">그 자체가 <b>공성 적</b>이며 Defender 방어자와 영웅이 <b>목표로 삼을 수 있다</b>. 공성 단계가 끝날 때까지 판에 남는다</div>
  </div>
  <div class="rule-h">공성 적 카드</div>
  <div class="rule-grid">
    <div class="rule-k">원소</div><div class="rule-v">다섯 원소 중 하나에 묶이며, <b>항상 그 원소의 공성 피해</b>를 준다</div>
    <div class="rule-k">보상</div><div class="rule-v">쓰러뜨릴 때마다 카드에 적힌 <b>공성 보상</b>을 얻는다</div>
  </div>`};

const R5_VILLAIN_S = {title:{en:"Villain Phase (Siege)", ko:"빌런 단계 · 공성"}, body:`
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>Jaethi</b> — 먼저 움직인 뒤 <b>Imbalance 불균형</b>을 굴려 행동을 처리한다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>공성 깃발 이동</b> — 번호 순서대로, 이동 속도만큼 <b>가장 가까운 Magnetic 목표</b>를 향해</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t"><b>공성 피해</b> — 각 공성 적이 <b>Range 사정거리 안</b>의 Defender 방어자와 그룹에게 <b>Power 위력</b>만큼 피해를 준다.
      모든 대상에게 <b>동시에</b> 적용하며, 이때 파괴된 Defender 방어자는 <b>아직 치우지 않는다</b></span></div>
    <div class="rule-step"><span class="n">4</span><span class="t"><b>Defender 방어자 반격</b> — Defender 방어자가 공성 적을 파괴하려 시도한다</span></div>
    <div class="rule-step"><span class="n">5</span><span class="t"><b>캘린더 −1</b> — 남아 있으면 다음 턴으로, <b>0</b>이 되면 공성이 끝나고 수확 단계가 시작된다</span></div>
  </div>
  <div class="rule-h">① Jaethi</div>
  <div class="rule-grid">
    <div class="rule-k">이동</div><div class="rule-v">현재 <b>불균형 종류</b>에 따라 정해진 칸(<b>1~3</b>, Swift 패시브로 <b>+2</b>)만큼 <b>가장 가까운 City-State 도시국가</b>를 향해</div>
    <div class="rule-k">행동</div><div class="rule-v">현재 불균형과 <b>같은 원소 주사위</b>를 굴려 그 결과의 효과를 처리한다</div>
    <div class="rule-k">공격</div><div class="rule-v">Range 사정거리 안의 Defender 방어자에게 <b>Power 위력</b>만큼. 원소 유형은 <b>현재 불균형</b>과 같다.
      Jaethi의 공격은 <b>깃발들이 움직이기 전에</b> 끝난다</div>
    <div class="rule-k">SkyTile</div><div class="rule-v"><b>Floating Mountain</b> 면이 위인 SkyTile로 이동하면 Riser 승강기를 치운다 —
      산이 추락하며 <b>모든 Defender 방어자가 −1</b></div>
  </div>
  <div class="rule-h">Imbalance 불균형</div>
  <div class="rule-v">다섯 원소마다 <b>0~9</b> 사이로 기록된다. <b>siege! 카드</b>, Jaethi의 행동, 영웅의 감소 시도(Temple 사원)로 오르내린다.
    Jaethi는 <b>1 이상인 원소의 패시브를 모두</b> 얻는다.</div>
  <div class="rule-h">② 깃발 이동</div>
  <div class="rule-grid">
    <div class="rule-k">목표</div><div class="rule-v">가장 가까운 <b>Magnetic</b> 대상(City-State 도시국가 · Fortress 요새 · Wellspring 증폭기 등). 같은 거리면 <b>그룹이 고른다</b></div>
    <div class="rule-k">멈춤</div><div class="rule-v">목표의 <b>Range 사정거리 안</b>에 들면 멈춘다. <b>Defender 방어자 위에서는</b> 이동을 끝낼 수 없다</div>
    <div class="rule-k">지형</div><div class="rule-v">새 헥스 타일을 열 수 있고 <b>위험 지형의 영향을 받지 않으며</b>,
      물·산봉우리·공성 관문을 <b>평지처럼</b> 지난다(관문 위에서 멈추지는 못한다)</div>
    <div class="rule-k">SkyTile</div><div class="rule-v">Floating Mountain 면 위로는 <b>갈 수 없고 그 위의 Defender 방어자도 노리지 못한다</b> — 그 적이 <kw>soar</kw>를 가진 경우만 예외</div>
    <div class="rule-k">원소 토큰</div><div class="rule-v">공성 말(Jaethi 포함)이 <b>Range 사정거리 안</b>에 들어오면 토큰을 치우고 그 원소의 <b>불균형 +1</b></div>
    <div class="rule-k">정착지</div><div class="rule-v">공성 말이 <b>지나가거나 멈추면</b> 그 정착지는 파괴되고 <b>헥스 토큰</b>을 놓는다</div>
  </div>
  <div class="rule-h">③ 공성 피해</div>
  <div class="rule-v">Defender 방어자는 그대로 받지만, <b>그룹</b>은 다르게 받는다 — 공성 피해를 조금이라도 받으면
    <kw>immune</kw>이 아닌 영웅은 대신 <b><kw>energy drain</kw> 20</b>을 받는다.</div>
  <div class="rule-h">④ Defender 방어자 반격</div>
  <div class="rule-grid">
    <div class="rule-k">굴림</div><div class="rule-v">Range 사정거리 안에 공성 말이 있는 Defender 방어자마다 <b>Potential 잠재력</b>만큼 <b>코어 주사위</b>를 굴린다(Defender 방어자당 한 번)</div>
    <div class="rule-k">목표 수치</div><div class="rule-v">그 Defender 방어자의 <b>Power 위력</b>. 스탯 굴림처럼 다루므로 Power 위력이 높으면 <b>치명적 성공 범위도 넓어진다</b></div>
    <div class="rule-k">결과</div><div class="rule-v"><b>성공 1개당 공성 피해 1</b> · <b>치명적 성공은 2</b>. Range 사정거리 안 <b>모든</b> 공성 적에게 들어간다</div>
    <div class="rule-k">격파</div><div class="rule-v">보상을 얻고 그 카드를 뒤집어 놓은 뒤 <b>다음 카드를 공개</b>한다. 남은 카드가 없으면 <b>깃발을 치운다</b>.
      넘친 피해는 <b>아래 카드로 넘어가지 않는다</b></div>
    <div class="rule-k">Bolster</div><div class="rule-v">그룹이 Defender 방어자 안에 있으면 이때 <b>임시강화</b>를 시도할 수 있다</div>
    <div class="rule-k">정리</div><div class="rule-v">모든 Defender 방어자가 행동한 뒤, <b>Resilience 내구도 0</b>인 Defender 방어자를 치운다</div>
  </div>`};

const R5_CALENDAR = {title:{en:"Calendar & Victory", ko:"캘린더 · 승패"}, body:`
  <div class="rule-h">캘린더</div>
  <div class="rule-grid">
    <div class="rule-k">설정</div><div class="rule-v">공성이 시작될 때 <b>헥스 주사위</b>를 굴려
      <b>2 + 공성 물결 번호 + 굴림의 절반(내림)</b>만큼 채운다(<b>최대 7</b>)</div>
    <div class="rule-k">감소</div><div class="rule-v">공성 빌런 단계마다 <b>오른쪽 끝부터 1칸</b>씩 지운다</div>
    <div class="rule-k">0이 되면</div><div class="rule-v">그 공성이 끝나고 <b>수확 단계</b>가 시작된다</div>
  </div>
  <div class="rule-h">Final Moments 최후의 순간</div>
  <div class="rule-v">캘린더가 0이 되면 <b>현재 공성 물결까지의 수정치를 누적해</b> 적용한다.
    (예: 2번째 물결이면 1·2번째가 함께 적용되어 <b>Defender 방어자 합계 −4</b>. 3번째 물결에는 <b>무작위 City-State 도시국가 하나가 파괴</b>된다.)</div>
  <div class="rule-h">공성이 끝날 때</div>
  <div class="rule-grid">
    <div class="rule-k">치우는 것</div><div class="rule-v">남은 <b>공성 깃발과 Jaethi 말</b>을 판에서 치운다</div>
    <div class="rule-k">남기는 것</div><div class="rule-v">슬롯의 <b>공성 카드는 뒤집어 그대로</b> 둔다 — 다음 공성에서 <b>그 슬롯을 더 강하게</b> 만든다</div>
    <div class="rule-k">기록</div><div class="rule-v">공성 적의 <b>Resilience 내구도는 지운다</b>. <b>Jaethi의 수치는 지우지 않는다</b>(공성마다 초기화되지 않음)</div>
  </div>
  <div class="rule-h">승패</div>
  <div class="rule-grid">
    <div class="rule-k" style="color:var(--g-navigate)">승리</div><div class="rule-v"><b>Jaethi의 Resilience 내구도가 0</b>이 된다 ·
      또는 <b>마지막 공성 물결이 끝났을 때 City-State 도시국가가 하나라도 살아 있다</b></div>
    <div class="rule-k" style="color:var(--g-attack)">패배</div><div class="rule-v"><b>City-State 도시국가 둘 다 파괴</b>된다</div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">승패는 공성 단계의 <b>매 턴 끝</b>에 확인한다.</div>`};

const R5_RES = {title:{en:"Resources & Elements", ko:"자원 · 원소"}, body:`
  <div class="rule-v"><b>자원</b>은 그룹 공용 아이템으로, <b>Defender 방어자를 키우는 데</b> 쓴다. 모으는 데 <b>수량 제한이 없다</b>.</div>
  <div class="rule-grid">
    <div class="rule-k">Platinum 백금</div><div class="rule-v">Defender 방어자를 <b>처음 세울 때</b>(그리고 일부 개선에) 든다. 다른 자원을 <b>Emporium 교역소</b>에서 백금으로 바꿀 수 있다</div>
    <div class="rule-k">Tier I</div><div class="rule-v">Ore 광석 · Lumber 목재 · Recruit 신병</div>
    <div class="rule-k">Tier II</div><div class="rule-v">Essence 정수 · Sky Metal 하늘 금속</div>
    <div class="rule-k">Tier III</div><div class="rule-v">Specialist 전문가 · Aetherial Ore 에테르 광석 · Living Crystal 살아있는 결정</div>
    <div class="rule-k">원소</div><div class="rule-v">기본 4종 <b>Air 바람 · Earth 대지 · Fire 불 · Water 물</b> + <b>Void 공허</b></div>
  </div>
  <div class="rule-h">Augment 원소 부여</div>
  <div class="rule-v">원소를 <b>소비</b>하면 영웅이나 Defender 방어자에게 <b>원소 능력</b>을 붙일 수 있다.
    <b>Temple 사원</b>에서, 또는 그룹이 <b>Defender 방어자 안에 있을 때</b> 할 수 있으며, Defender 방어자 하나에 <b>각 원소를 하나씩</b>까지 붙인다.
    원소 자원은 각 영웅이 아니라 <b>그룹이 한 번</b> 받는다.</div>`};

const R5_DEFENDER = {title:{en:"Defenders", ko:"방어자"}, body:`
  <div class="rule-v">Defender 방어자는 공성 적을 막아 주는 <b>거점</b>이다. 종류마다 <b>추적판</b>이 따로 있다.</div>
  <div class="rule-grid">
    <div class="rule-k">City-State 도시국가</div><div class="rule-v">이름과 번호가 있다. 네 곳 중 <b>둘만</b> 게임에 등장한다</div>
    <div class="rule-k">Temple 사원</div><div class="rule-v">다섯 곳이 <b>하나의 추적판을 공유</b>한다. <b>Resilience 내구도만</b> 장소별로 따로 적으며 <b>8</b>에서 시작한다</div>
    <div class="rule-k">Tower 탑 · Fortress 요새</div><div class="rule-v"><b>1~4번</b>. Tower 탑을 올리면 <b>같은 번호의 Fortress 요새</b>가 된다(다른 번호로는 불가)</div>
    <div class="rule-k">기본 · 상승 수치</div><div class="rule-v"><b>+</b>가 없으면 기본 수치로, 새로 등장하거나 재건될 때 <b>그 값으로 초기화</b>한다.
      <b>+</b>가 있으면 이전 단계에서 물려받은 값에 <b>더한다</b></div>
  </div>
  <div class="rule-h">Defender 방어자 강화 <span class="rule-tag">이벤트 단계 끝</span></div>
  <div class="rule-grid">
    <div class="rule-k">Build 건설</div><div class="rule-v"><b>백금 6</b> — 그룹 <b>Range 사정거리 안</b>의 지형 헥스에 다음 번호의 <b>Tower 탑</b>을 세운다.
      게임 장소나 공성 관문에는 못 놓는다(SkyTile은 <kw>soar</kw>가 있으면 가능). 세울 때마다 <b>파워업</b>을 뽑아 그룹이 받는다</div>
    <div class="rule-k">Upgrade 승급</div><div class="rule-v"><b>백금 10</b> — <b>Tower 탑 1~3</b>을 같은 번호 <b>Fortress 요새</b>로. 같은 자리에 토큰을 교체한다.
      그 Tower 탑은 <b>Fortress 요새가 파괴되기 전까지</b> 다시 세울 수 없다</div>
    <div class="rule-k">Rebuild 재건</div><div class="rule-v">비용은 상황에 따라 다르다. 파괴돼 <b>뒤집힌</b> 토큰은 같은 자리에 <b>더 싸게</b> 재건할 수 있다.
      재건하면 <b>Resilience 내구도 · Recruit 신병 · Specialist 전문가만</b> 기본값으로 돌아가고 나머지는 유지된다.
      <b>Temple 사원 Fortress 요새는 재건 불가</b> — 파괴되면 모든 Temple 사원 장소와 함께 사라진다</div>
    <div class="rule-k">Relocate 이전</div><div class="rule-v"><b>백금 1</b> — 파괴되지 않은 Tower 탑·Fortress 요새를 그룹 <b>Range 사정거리</b>만큼 옮긴다.
      Defender 방어자당 <b>게임 턴에 1회</b>. Temple 사원 Fortress 요새는 불가</div>
    <div class="rule-k">Improve 개선</div><div class="rule-v"><b>자원</b>을 써서 강화한다. <b>City-State 도시국가와 Temple 사원</b>은 자원을 얼마를 쓰든 <b>백금 1</b>을 추가로 낸다</div>
    <div class="rule-k">Equip 장착</div><div class="rule-v"><b>비용 없음</b> — 보유한 Equip 카드를 Defender 방어자에 붙이거나 뗀다. Defender 방어자당 <b>게임 턴에 1장</b></div>
  </div>`};

const R5_MAP = {title:{en:"Special Tiles", ko:"특수 타일"}, body:`
  <div class="rule-v"><b>SkyTile</b>과 <b>Cataclysm 재앙 타일</b>은 지도를 넓히는 것이 아니라 <b>기존 지도 위에 덮는</b> 타일이다.
    그 아래에 깔린 게임 장소는 <b>없는 것으로 취급</b>되며, 타일이 치워지면 되살아난다.</div>
  <div class="rule-h">SkyTile (13장)</div>
  <div class="rule-grid">
    <div class="rule-k">두 면</div><div class="rule-v"><b>Floating Mountain 떠 있는 산</b> / <b>Nether 저편</b></div>
    <div class="rule-k">떠 있는 산</div><div class="rule-v">새로 놓을 때는 이 면이 위로 오고 <b>Riser 승강기</b>를 받쳐 놓는다.
      <kw>soar</kw>가 없으면 <b>들어갈 수 없다</b></div>
    <div class="rule-k">Riser 승강기 제거</div><div class="rule-v">그대로 <b>지상에 내려앉으면</b> 모든 Defender 방어자가 <b>Resilience 내구도 −1</b>.
      <b>Nether 면으로 뒤집히면</b> Defender 방어자는 피해를 받지 않는다. Riser 승강기가 없어진 산은 <kw>soar</kw> 없이도 들어갈 수 있다</div>
    <div class="rule-k">Nether</div><div class="rule-v">그 위의 영웅은 <state>dissonant</state> 상태가 되며, <b>Void 원소 Augment</b>가 없으면
      이 타일 위에서는 <b>무효화할 수 없다</b>. 들어가는 데 <kw>soar</kw>는 필요 없다</div>
    <div class="rule-k">겹칠 때</div><div class="rule-v">떠 있는 산 위에 또 놓이면 <b>Riser 승강기를 빼고 Nether로</b> 뒤집는다. Nether 위라면 <b>배치를 다시 굴린다</b></div>
  </div>
  <div class="rule-h">Cataclysm 재앙 타일 (4장)</div>
  <div class="rule-grid">
    <div class="rule-k">등장</div><div class="rule-v">수확 덱이나 Jaethi 덱에서 <b>재앙 카드</b>가 나오면 해당 타일을 놓고 그 카드를 뽑는다</div>
    <div class="rule-k">효과</div><div class="rule-v">그 타일 위에서는 <b>이동과 이벤트 단계가 달라진다</b>.
      카드 뒷면에 <b>Living Crystal 살아있는 결정 소비법</b>과 그 위에서 Defender 방어자·공성 적이 어떻게 달라지는지가 적혀 있다</div>
  </div>
  <div class="rule-h">Hazardous Terrain 위험 지형</div>
  <div class="rule-v"><b>재앙 타일과 Nether 타일의 모든 헥스</b>가 해당한다.
    여기서는 <b>야영·신중한 이동의 이점을 얻지 못하고</b>(맞는 Augment가 있어도),
    이동 단계가 끝날 때 그 원소의 <st>health</st> 피해를 <b>1</b> 받는다. Nether는 항상 <b>Void</b> 원소로 친다.</div>
  <div class="rule-h">Elemental Rift 원소 균열</div>
  <div class="rule-v">재앙 타일과 SkyTile의 일부 헥스에 원소 아이콘이 있다. 타일을 놓을 때 그 칸에 <b>원소 토큰</b>을 숫자 면이 아래로 가게 놓는다.
    이벤트 단계에 <b>주워서 비축에 넣을</b> 수 있고, <b>Temple 사원</b>에 있을 때 등 여러 시점에 다시 놓을 수 있다(개수 제한 없음).</div>`};

const R5_PORTAL = {title:{en:"Siege Portals", ko:"공성 관문"}, body:`
  <div class="rule-v"><b>10개</b>(1~10)의 통행 불가 지점으로, 그룹은 <b>절대 들어갈 수 없다</b>.
    지도 테두리의 게임 바에 <b>4개</b>, 지도 중앙에 <b>6개</b>가 있다.
    말·토큰도 <b>관문 위에 놓이지 않는다</b>.</div>
  <div class="rule-h">위치를 정하는 법</div>
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t"><b>코어 주사위</b> — 나온 번호의 관문이 기준점이 된다(헥스 토큰이 올라간 관문이면 다시 굴린다)</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t"><b>헥스 주사위</b> — <kw>wander</kw> 방향을 정해, 그 방향의 위치에 대상을 놓는다</span></div>
  </div>
  <div class="rule-grid">
    <div class="rule-k">쓰이는 곳</div><div class="rule-v">SkyTile · 재앙 타일 배치 · <b>공성 깃발</b>과 <b>Jaethi</b> 등장 등</div>
    <div class="rule-k">여러 헥스짜리</div><div class="rule-v">SkyTile · 재앙 타일 · Jaethi 말처럼 큰 것은 <b>방향과 위치를 그룹이 정한다</b></div>
    <div class="rule-k">다시 굴리는 경우</div><div class="rule-v"><kw>soar</kw> 없는 공성 깃발이 <b>Riser 승강기 있는 떠 있는 산</b>에 놓일 때 ·
      재앙 타일 자리에 <b>이미 SkyTile</b>이 있을 때 · SkyTile 자리에 <b>이미 Nether</b>가 있을 때</div>
  </div>`};

const R5_MOVE = {title:{en:"Movement Phase", ko:"이동 단계"}, body:`
  <div class="rule-grid">
    <div class="rule-k">기본 이동력</div><div class="rule-v"><b>턴당 4헥스</b>(더 적게 가도 된다) · <b>신중한 이동</b>은 <b>1헥스</b></div>
    <div class="rule-k">이동력 증가</div><div class="rule-v">늘어나면 <b>기본(4)과 신중(1)이 함께</b> 오른다</div>
    <div class="rule-k">방식</div><div class="rule-v"><b>야영 · 신중 · 보통 · 무모</b> 네 가지</div>
    <div class="rule-k">지도 확장</div><div class="rule-v">가장자리에 닿으면 새 헥스 타일을 놓는다. <b>타일을 놓아도 이동이 끝나지 않는다</b></div>
  </div>
  <div class="rule-h">Camping 야영</div>
  <div class="rule-v">그 게임 턴의 <b>수확 판정과 스탯 굴림</b>에 <b>-1 보너스</b>. <b>중첩</b>되지만
    <kw>wander</kw>나 <kw>teleport</kw> 등 다른 효과로 위치가 바뀌면 사라진다.</div>
  <div class="rule-h">Moving Cautiously 신중한 이동</div>
  <div class="rule-grid">
    <div class="rule-k">조건</div><div class="rule-v">이동력 전부를 <b>강·도로만 따라</b> 쓰거나, 그 턴에 <b>1헥스만</b> 이동.
      <b>City-State 도시국가의 네 헥스는 모두 도로로</b> 친다</div>
    <div class="rule-k">보상</div><div class="rule-v"><kw>wander</kw> 위험이 <b>없다</b> · 그 턴에 나온 <b>Encounter 카드를 버릴 수</b> 있다</div>
    <div class="rule-k">이동력과 연동</div><div class="rule-v">이동력을 올리는 아이템은 <b>신중한 이동 칸 수도</b> 함께 올린다(1 → 2 등)</div>
  </div>
  <div class="rule-h">Wander 헤매다 · Roam 배회</div>
  <div class="rule-grid">
    <div class="rule-k"><kw>wander</kw></div><div class="rule-v"><b>헥스 주사위 1회</b> — 나침반 방향으로 <b>1헥스</b></div>
    <div class="rule-k"><kw>roam</kw></div><div class="rule-v"><b>헥스 주사위 2회</b> — 첫 번째가 <b>방향</b>, 두 번째가 <b>거리</b></div>
    <div class="rule-k">막히면</div><div class="rule-v">지도의 단단한 경계나 <b>통행 불가</b> 지형(물 · 산봉우리 · SkyTile)이면 <b>제자리에 머문다</b></div>
  </div>
  <div class="rule-h">통행 불가</div>
  <div class="rule-v"><b>산맥</b>과 <b>물</b> 헥스에는 들어갈 수 없다(나오는 것은 가능).
    <b>Wayfarer's Supplies 여행자 보급품</b>를 얻으면 들어갈 수 있다.</div>`};

const R5_EVENT = {title:{en:"Event Phase & Range", ko:"이벤트 단계 · Range"}, body:`
  <div class="rule-v"><span class="rule-tag">공성</span> 공성 단계에는 <b>자원을 거두지 않는다</b>.
    <span class="rule-tag">수확</span> 수확 단계에는 <b>Range 사정거리 안</b>의 장소에서 자원을 거둔다.</div>
  <div class="rule-h">Group Range 그룹 사정거리</div>
  <div class="rule-grid">
    <div class="rule-k">결정 방식</div><div class="rule-v"><b>살아 있는 영웅 중 가장 큰 Range 사정거리</b>가 그룹 Range 사정거리가 된다(진행 중에 바뀔 수 있다)</div>
    <div class="rule-k">제외되는 칸</div><div class="rule-v">아직 <b>드러나지 않은</b> 헥스 · <b>들어갈 수 없는</b> 지형(산봉우리 · 물 · SkyTile)</div>
  </div>
  <div class="rule-h">계열별 Range 사정거리</div>
  <div class="rule-grid">
    <div class="rule-k" style="color:#ff5f68">Striker</div><div class="rule-v"><b>1</b> — SkyTile 크기</div>
    <div class="rule-k" style="color:#63d688">Assist</div><div class="rule-v"><b>2</b> — 헥스 타일 크기</div>
    <div class="rule-k" style="color:#71a5ff">Healer</div><div class="rule-v"><b>3</b> — 제국 타일 크기</div>
    <div class="rule-k" style="color:#bf94f5">Sapper</div><div class="rule-v"><b>3</b> — 제국 타일 크기</div>
    <div class="rule-k" style="color:#d09a5f">Utility</div><div class="rule-v"><b>2</b> — 헥스 타일 크기</div>
    <div class="rule-k">Dual</div><div class="rule-v">두 계열 중 <b>큰 쪽</b></div>
  </div>
  <div class="rule-h">자원 거두기 <span class="rule-tag">수확</span></div>
  <div class="rule-v"><b>획득량</b>만큼 Range 사정거리 안의 <b>서로 다른 헥스</b>를 골라 자원을 거둔다(시작 3).
    고를 수 있는 칸이 모자라면 <b>같은 칸을 여러 번</b> 골라도 된다. 거둔 자원은 <b>비축</b>에 적는다.</div>`};

const R5_ELEM = {title:{en:"Elemental Damage", ko:"원소 피해"}, body:`
  <div class="rule-v">일부 행동은 다섯 원소 중 하나 이상의 <b>원소 피해</b>를 준다. 두 키워드가 이 피해를 크게 바꾼다.</div>
  <div class="rule-grid">
    <div class="rule-k"><kw>immune</kw> 면역</div><div class="rule-v">같은 원소의 공격에서 <b>피해를 전혀 받지 않는다</b>. 아래 약점보다 <b>우선</b>한다.
      공격이 <b>여러 원소</b>를 가지면 <b>그 원소를 모두</b> 가져야 면역이 된다. 영웅은 <b>원소 Augment</b>로 얻는다</div>
    <div class="rule-k"><kw>weakness</kw> 약점</div><div class="rule-v">해당 피해를 받을 때마다 <b>헥스 주사위</b>를 굴려 그만큼 <b>추가 피해</b>를 받는다(<b>줄일 수 없다</b>).
      적에게 줄 때는 이 주사위가 <b>헥스플로드</b>한다. 영웅은 원소를 Augment하면 <b>반대 원소에 약점</b>이 생긴다</div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">즉 원소 부여는 <b>양날</b>이다 — 하나에 면역을 얻는 대신 반대 원소에 약점을 안는다.</div>`};

const R5_OUTLAST = {title:{en:"Outlast Opponents", ko:"지속력을 가진 적"}, body:`
  <div class="rule-v">일부 적은 <st>outlast</st>를 가진다. 이것은 <b>전투 타이머</b>로,
    <b>Swarm 떼</b>나 <b>Horde 무리</b>에서는 영웅들이 우위를 잡기까지 걸리는 시간을 뜻한다.</div>
  <div class="rule-grid">
    <div class="rule-k">스탯 굴림</div><div class="rule-v">지속력 아래에 <b>스탯 3종</b>이 표시된다. Declaration 단계에 <b>그 라운드의 행동으로</b>
      그중 하나를 골라 굴려 지속력을 줄인다(때로는 늘린다)</div>
    <div class="rule-k">결과</div><div class="rule-v"><b>성공 −1</b> · <b>치명적 성공 −2</b></div>
    <div class="rule-k">면역 효과</div><div class="rule-v">굴린 스탯이 <b>적의 이번 행동과 맞고 성공</b>했다면, 그 영웅은 <b>그 행동에 면역</b>이 된다.
      실패하면 <b>온전히</b> 받는다</div>
    <div class="rule-k">다른 행동</div><div class="rule-v">스탯 굴림 대신 <b>방어나 마스터리</b>를 써도 된다.
      적이 체력·에너지 피해를 못 받는 상태면 <b>피해 효과만 무시</b>되고, 방어·회복·증가·적 피해 감소 같은 <b>나머지 효과는 그대로</b> 적용된다</div>
    <div class="rule-k">자동 감소</div><div class="rule-v">따로 명시가 없으면 매 라운드 <b>Resolution 단계</b>에 지속력이 <b>1</b> 자동으로 줄어든다</div>
  </div>`};

const R5_DEATH = {title:{en:"Death & Revival", ko:"죽음 · 부활"}, body:`
  <div class="rule-h">음수 생명력</div>
  <div class="rule-v">전투 단계가 끝나면 <b>음수인 생명력은 0으로</b> 돌아온다.</div>
  <div class="rule-h">영웅이 죽으면</div>
  <div class="rule-grid">
    <div class="rule-k">소지품</div><div class="rule-v">살아 있는 영웅들이 <b>배낭 · 골드 · 음식</b>을 쓸 수 있다 —
      전투 밖에서는 언제나, 전투 중에는 <b>방어 행동을 할 때</b></div>
    <div class="rule-k">보상 분배</div><div class="rule-v">죽은 영웅이 받을 골드·음식·스탯 보너스·아이템은 <b>전투 밖에서 나눠 갖는다</b>.
      <b>파워업</b>은 죽은 영웅이 그대로 받되 <b>부활할 때까지 뒤집어</b> 둔다</div>
    <div class="rule-k">전멸해도</div><div class="rule-v"><b>게임은 끝나지 않는다</b>. 그룹이 부활할 때까지 매 턴 <b>빌런 단계만</b> 진행한다</div>
  </div>
  <div class="rule-h">Wave Revival 물결 부활</div>
  <div class="rule-v"><b>마지막 공성이 아니라면</b>, 죽은 영웅은 <b>현재 물결 번호</b>만큼의 게임 턴이 지난 뒤
    원하는 <b>City-State 도시국가</b>에서 자동으로 부활한다. 그 턴 <b>이동 단계</b>에 되살아나며,
    살아 있는 영웅이 그 City-State 도시국가의 <b>Range 사정거리 안</b>에 있으면 합류한다.
    City-State 도시국가마다 부활 시 주는 <b>기어 업그레이드 보너스가 다르다</b>.</div>
  <div class="rule-h">새 영웅 만들기</div>
  <div class="rule-v">죽었다면 새 영웅을 만들 수 있다. <b>공성 물결마다 파워업 3장</b>, <b>골드 10</b>, <b>음식 소모량×3</b>을 갖고 시작하며,
    그룹이 <b>City-State 도시국가 · Temple 사원 · 정착지 · 유적 · Tower 탑 · Fortress 요새</b> 중 한 곳에서 이동을 끝낸 다음 <b>기술 단계 뒤에</b> 합류한다.</div>`};

/* ── 5편 확장 게임 모드 — 카프라칸 귀환 · 이시단 귀환 ── */
const C_TAG = `<span class="rule-tag" style="border-color:var(--g-attack);color:var(--g-attack)">변경</span>`;

const RC_INTRO = {title:{en:"Return to Caprakan", ko:"카프라칸 귀환 — 개요"}, body:`
  <div class="rule-v">Jaethi가 오기 <b>이전</b>의 시간선. 반신들이 힘을 키워 원소 균형이 무너지고,
    영원한 황혼이 드리우며 <b>Kualotekutli</b>가 깨어난다. 세계의 장막이 얇아지면 Jaethi가 돌아온다.</div>
  <div class="rule-h" style="color:var(--g-navigate)">승리 조건 <span style="font-family:'Noto Serif KR';text-transform:none;letter-spacing:0;color:var(--ink-faint)">— 하나만 달성하면 된다</span></div>
  <div class="rule-grid">
    <div class="rule-k">보스 격파</div><div class="rule-v"><b>Kualotekutli</b>(레벨 10 보스)를 쓰러뜨린다</div>
    <div class="rule-k">태피스트리</div><div class="rule-v"><b>다섯 원소 모두</b>의 태피스트리를 <b>복원</b>한다</div>
    <div class="rule-k">헌신</div><div class="rule-v"><b>다섯 보스 모두</b>에게 <b>Dedicated</b> 상태가 된다</div>
  </div>
  <div class="rule-h" style="color:var(--g-attack)">패배 조건</div>
  <div class="rule-grid">
    <div class="rule-k">City-State 도시국가</div><div class="rule-v"><b>Aztlant</b>가 파괴된다</div>
    <div class="rule-k">시간</div><div class="rule-v">마지막 공성에서 <b>캘린더가 0</b>이 된다</div>
    <div class="rule-k">자원</div><div class="rule-v">비축의 <b>Recruit 신병이 0</b>이 된다</div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">이전 편들과 달리 <b>영웅의 죽음은 패배 조건이 아니다</b>.</div>`};

const RC_DIFF = {title:{en:"What Changes", ko:"코어와 달라지는 것"}, body:`
  <div class="rule-h">지도 ${C_TAG}</div>
  <div class="rule-grid">
    <div class="rule-k">타일</div><div class="rule-v"><b>카프라칸 타일만</b> 사용하며, 진행 중 <b>지도를 넓히지 않는다</b></div>
    <div class="rule-k">공성 관문</div><div class="rule-v"><b>10개 대신 12개</b>. 배치를 굴릴 때 코어 주사위가 아니라 <b>Wellspring 주사위</b>를 쓴다</div>
    <div class="rule-k">보스</div><div class="rule-v">보스 토큰을 <b>처음에 놓지 않으며</b>, 보스 소굴은 <b>통행 불가</b>로 시작한다</div>
    <div class="rule-k">SkyTile</div><div class="rule-v"><b>Nether 면만</b> 쓴다 — 떠 있는 산과 Riser 승강기는 <b>사용하지 않는다</b></div>
  </div>
  <div class="rule-h">진행 ${C_TAG}</div>
  <div class="rule-grid">
    <div class="rule-k">획득량</div><div class="rule-v">시작값이 <b>2</b>로 줄어든다</div>
    <div class="rule-k">야영</div><div class="rule-v">야영할 때마다 <b>추가 효과</b>를 얻는다 — Nether 타일 배치 · <b>치명상 제거</b> · Primordial Center 뒤집기 등</div>
    <div class="rule-k">Tower 탑 · Fortress 요새</div><div class="rule-v"><b>건설할 수 없다</b>. 단 <b>Temple 사원 Fortress 요새</b>는 지을 수 있다</div>
    <div class="rule-k">Jaethi</div><div class="rule-v">말 · 공성 판 · <b>Imbalance를 쓰지 않는다</b>. 캘린더도 조금 다르다(<b>Short Count</b>)</div>
    <div class="rule-k">빌런 덱</div><div class="rule-v"><b>Fifth Sun 덱</b>이 Jaethi 덱을 대신한다. 그 덱의 <b>siege! 카드마다 코어 보스 하나</b>가 묶여 있다</div>
  </div>
  <div class="rule-h">새로 생기는 것</div>
  <div class="rule-grid">
    <div class="rule-k">Aztlant</div><div class="rule-v">새 City-State 도시국가. <b>반드시 지켜야 한다</b>. 코어의 카프라칸 City-State 도시국가 둘도 등장하지만 <b>그 몰락은 승패와 무관</b>하다.
      제국 타일 뒷면이 <b>Eternal Twilight 영원한 황혼</b>이며, 이때 새 빌런 <b>Kualotekutli</b>가 활동한다</div>
    <div class="rule-k">Temple 사원</div><div class="rule-v">영원한 황혼에 <b>Temple of the Everlasting</b>이 나타난다</div>
    <div class="rule-k">시작 자원</div><div class="rule-v">비축에 <b>Recruit 신병 40 · Specialist 전문가 8</b>을 갖고 시작한다</div>
    <div class="rule-k">Primordial Center</div><div class="rule-v">기본 4원소마다 하나씩, <b>네 곳</b>이 존재한다</div>
    <div class="rule-k">Shaman 샤먼</div><div class="rule-v">최대 <b>6개</b>의 샤먼 토큰을 얻을 수 있다. <b>Aetherial Ore 에테르 광석</b>처럼 소비할 수 있으며 <b>승리에 핵심</b>이다</div>
    <div class="rule-k">태피스트리 · 헌신</div><div class="rule-v"><b>복원</b>과 <b>Dedication</b>이 각각 승리 조건이 된다(헌신은 코어와 작동 방식이 다르다)</div>
  </div>`};

const RI_INTRO = {title:{en:"Return to Ishidan", ko:"이시단 귀환 — 개요"}, body:`
  <div class="rule-v">역시 Jaethi 이전의 시간선. 황금룡 <b>Tenryu</b>의 한 조각이 <b>네 원소로 갈라지고</b>,
    황제에 반기를 든 Temple 사원들이 그것을 풀어주려 한다. 봉인이 무너지며 원소 균형이 기울고 <b>패턴</b>이 풀리기 직전에 이른다.</div>
  <div class="rule-h" style="color:var(--g-navigate)">승리 조건</div>
  <div class="rule-v"><b>네 Divine Dragon</b>을 모두 쓰러뜨린다.</div>
  <div class="rule-steps">
    <div class="rule-step"><span class="n">1</span><span class="t">Divine Dragon의 소굴은 시작할 때 <b>통행 불가</b>다</span></div>
    <div class="rule-step"><span class="n">2</span><span class="t">영웅이 <b>이동식 Tower 탑을 Pilot 조종</b>해 <b>Temple 사원</b>으로 가서 <b>정복</b>한다</span></div>
    <div class="rule-step"><span class="n">3</span><span class="t">정복에 성공하면 그 Divine Dragon을 지키던 <b>장벽이 내려가고</b>(타일을 소굴 면으로 뒤집는다) 전투가 가능해진다</span></div>
  </div>
  <div class="rule-h" style="color:var(--g-attack)">패배 조건</div>
  <div class="rule-grid">
    <div class="rule-k">시간</div><div class="rule-v"><b>마지막 빌런 카드</b>를 처리했는데 Divine Dragon이 하나라도 살아 있다</div>
    <div class="rule-k">City-State 도시국가</div><div class="rule-v"><b>Hanei의 네 구역이 모두</b> 파괴된다</div>
    <div class="rule-k">토큰</div><div class="rule-v"><b>Fortify 축성 토큰</b>이 떨어진다</div>
  </div>
  <div class="rule-v" style="margin-top:9px;color:var(--ink-faint);font-size:12px">여기서도 <b>영웅의 죽음은 패배 조건이 아니다</b>.</div>`};

const RI_DIFF = {title:{en:"What Changes", ko:"코어와 달라지는 것"}, body:`
  <div class="rule-h">지도 ${C_TAG}</div>
  <div class="rule-grid">
    <div class="rule-k">타일</div><div class="rule-v"><b>이시단 타일만</b> 쓰고 <b>지도를 넓히지 않는다</b></div>
    <div class="rule-k">공성 관문</div><div class="rule-v"><b>10개 대신 4개</b>. 배치는 <b>Dragon 주사위</b>로 굴린다</div>
    <div class="rule-k">SkyTile</div><div class="rule-v">준비 단계에 <b>9장</b>을 놓는다 — <b>Riser 승강기 없는 5번</b>(Temple 사원이 있는 타일) + <b>Riser 승강기 있는 무작위 8장</b></div>
    <div class="rule-k">처음부터 배치</div><div class="rule-v"><b>Waypoint 경유지 토큰 5개</b>(새 이벤트 장소) · <b>Tower 탑 4개 전부</b> · <b>Divine Dragon 소굴 4곳</b> ·
      기본 4원소 <b>공성 덱</b>을 슬롯에</div>
    <div class="rule-k">보스</div><div class="rule-v">보스 토큰을 처음에 놓지 않는다. 코어의 보스 <b>2·3·4·5·8번은 등장하지 않는다</b></div>
  </div>
  <div class="rule-h">진행 ${C_TAG}</div>
  <div class="rule-grid">
    <div class="rule-k">획득량</div><div class="rule-v">시작값이 <b>4</b>로 늘어난다. 매 턴 이 값으로 <b>자원을 얻거나 Tower 탑을 Pilot 조종</b>한다</div>
    <div class="rule-k">이동</div><div class="rule-v">그룹 이동력이 <b>조금 빨라진다</b></div>
    <div class="rule-k">Jaethi</div><div class="rule-v">말과 공성 판을 쓰지 않고 <b>Imbalance는 무시</b>한다</div>
    <div class="rule-k">캘린더</div><div class="rule-v"><b>Short Count 캘린더를 쓰지 않는다</b>. 공성 적이 쓰러지면 그 깃발이 배정된 관문에서 <b>즉시 재등장</b>한다 — <b>끊이지 않는 공성</b></div>
    <div class="rule-k">빌런 덱</div><div class="rule-v"><b>Divine Dragon 덱</b>이 Jaethi 덱을 대신한다. 새 키워드
      <b>Voidtouched · Fortify 축성 · Rage · March</b>가 등장하며, <b>"Begin Game" 공성 카드</b>로 시작한다.
      이 덱의 siege! 카드는 <b>수확 카드를 뽑게</b> 만든다</div>
  </div>
  <div class="rule-h">Defender 방어자와 Temple 사원</div>
  <div class="rule-grid">
    <div class="rule-k">Hanei</div><div class="rule-v"><b>네 구역</b>으로 나뉜 새 City-State 도시국가로, <b>각 구역이 곧 하나의 City-State 도시국가</b>다.
      중앙의 <b>2헥스만</b>이 이 게임의 유일한 <b>Magnetic</b> 장소다</div>
    <div class="rule-k">수동 Defender 방어자</div><div class="rule-v">Hanei를 포함한 Defender 방어자는 공성 적을 <b>공격하지 않는다</b>. <b>Tower 탑 추적판만</b> 사용한다</div>
    <div class="rule-k">Tower 탑</div><div class="rule-v">시작부터 <b>4개 모두</b> 있고, 각자 <b>Tower 탑 Augment 카드</b>와 초기 보너스·기본 원소 Augment를 받는다.
      <b>Bolster가 Piloting 조종으로 대체</b>되며 새 행동들이 추가된다</div>
    <div class="rule-k">원소</div><div class="rule-v"><b>영웅과 Tower 탑에만</b> Augment할 수 있다 — 원소판의 "Defender 방어자에 부여" 부분은 쓰지 않는다</div>
    <div class="rule-k">Temple 사원</div><div class="rule-v">이 모드에서는 <b>Defender 방어자가 아니다</b>(코어 Temple 사원판 미사용).
      다섯 중 <b>네 곳</b>이 Divine Dragon에게 바쳐져 있으며, Tower 탑을 몰고 가 <b>Temple Guardian</b>과 싸워 정복한다</div>
    <div class="rule-k">Divine Dragon 레벨</div><div class="rule-v">현재 <b>공성 물결</b>에 따라 정해진다</div>
  </div>`};

/* 게임 난이도 — 캐릭터판 최상단에서 고른다.
   게임 중 상승 조건: 마을에서 Collector 콜렉터 3마리 격파 시 +1, 파워업 덱이 떨어지면 +1 */
const DIFFICULTY = [
  {id:"starter", en:"Starter", ko:"스타터", c:"#8fb6a8",
   passive:"적은 <kw>block</kw>·<kw>defend</kw>·<kw>evasion</kw>를 얻지 못한다",
   vitals:"레벨만큼 감소", outlast:"-2 (최소 1)", damage:"-1 (최소 1)", penalty:"변화 없음", gear:"변화 없음"},
  {id:"easy", en:"Easy", ko:"쉬움", c:"#5bbf5b",
   passive:"변화 없음", vitals:"변화 없음", outlast:"변화 없음", damage:"변화 없음", penalty:"변화 없음", gear:"변화 없음"},
  {id:"moderate", en:"Moderate", ko:"보통", c:"#d8c341",
   passive:"변화 없음", vitals:"영웅당 +5", outlast:"+1", damage:"+1", penalty:"변화 없음", gear:"기어 업그레이드 <b>2 이하</b>"},
  {id:"difficult", en:"Difficult", ko:"어려움", c:"#e8912f",
   passive:"보스가 <b>Difficult</b> 패시브를 얻는다",
   vitals:"영웅당 +10", outlast:"+2", damage:"+2", penalty:"+1", gear:"기어 업그레이드 <b>5 이하</b>"},
  {id:"heroic", en:"Heroic", ko:"영웅적", c:"#e8622f",
   passive:"보스가 <b>Difficult</b> 패시브를 얻는다", vitals:"영웅당 +25", outlast:"+4", damage:"+4", penalty:"+2", gear:"기어 업그레이드 <b>9 이하</b>"},
  {id:"epic", en:"Epic", ko:"에픽", c:"#e03a3a",
   passive:"보스가 <b>Difficult</b> 패시브를 얻는다", vitals:"영웅당 +50", outlast:"+6", damage:"+6", penalty:"+3", gear:"기어 업그레이드"},
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
          <div class="rule-step"><span class="n">3b</span><span class="t"><b>Initial Equipment 시작 장비</b> — 시작 마을에 따라 그룹이 받는 것이 다르다.
            <b>"각 영웅"</b>은 인원수만큼, <b>"그룹"</b>은 하나만 받는다.</span></div>
        </div>
        <div class="rule-grid">
          <div class="rule-k">1 · Sithrindell</div><div class="rule-v"><b>Gear Upgrade 기어 업그레이드</b> — 각 영웅</div>
          <div class="rule-k">2 · Alizien</div><div class="rule-v"><b>Hunter's Gear 사냥꾼 장비</b> — 각 영웅</div>
          <div class="rule-k">3 · Dobrovizta</div><div class="rule-v"><b>Power Up 파워업</b> — 각 영웅</div>
          <div class="rule-k">4 · Ryzeria</div><div class="rule-v"><b>Magic Torch 마법 횃불</b> — 각 영웅</div>
          <div class="rule-k">5 · Kastvarjna</div><div class="rule-v"><b>Monster Bait 괴물 미끼</b> — 각 영웅</div>
          <div class="rule-k">6 · Rothlin</div><div class="rule-v"><b>Canoe 카누</b> — 그룹</div>
          <div class="rule-k">7 · Vigorna</div><div class="rule-v"><b>Gear Upgrade 기어 업그레이드</b> — 각 영웅</div>
        </div>
        <div class="rule-steps">
          <div class="rule-step"><span class="n">4</span><span class="t"><b>장비 배분</b> — 그룹이 <b>기어 업그레이드 6개</b>를 나눈다. 마을에서 골드를 쓴 뒤 시작.</span></div>
        </div>
        <div class="rule-en">Place tiles A–D (hex &amp; dungeon tiles face-down), shuffle decks, reveal 4 Day and 4 Night cards
        (reshuffle Interrupts), place Rune Stones on revealed Investigations, roll the starting village (+1 at Night),
        take starting gear, split 6 Gear Upgrades, spend gold, begin.</div>`},

      {title:{en:"Turn Sequence", ko:"차례 진행"}, body:`
        <div class="rule-steps">
          <div class="rule-step"><span class="n">1</span><span class="t"><b>이동</b> — 낮·밤을 정하고 그룹이 함께 움직인다. 지도 경계에 닿으면 <b>맵 타일을 놓고</b> 이동을 이어간다.</span></div>
          <div class="rule-step"><span class="n">2</span><span class="t"><b>기술 굴림</b> — 영웅마다 각자 굴린다.</span></div>
          <div class="rule-step"><span class="n">3</span><span class="t"><b>상황 굴림</b> — <b>영웅 한 명</b>이 <b>Hex 헥스 주사위</b>를 굴려 낮·밤에 맞는 바의 카드를 적용한다. <b>5 또는 헥스</b>면 조우 덱을 공개한다.<br>
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
          <div class="rule-k">Camp 야영</div><div class="rule-v"><b>움직이지 않기로</b> 고른다.
            대신 각 영웅이 <st>health</st> <b>3</b>과 <st>energy</st> <b>3</b>을 <kw>heal</kw>하고 <kw>critical wound</kw> <b>1</b>도 없앤다.
            기술 페이즈에 <b>길찾기가 자동으로 성공</b>한다.
            이번 턴 굴리는 <b>모든 기술에 -1 보너스</b>(이 효과는 <b>자기 자신과 중첩</b>된다).
            이번 턴 나온 <b>Circumstance상황</b>을 버릴 수 있다(허용될 때).</div>
          <div class="rule-k">Cautious 신중</div><div class="rule-v"><b>천천히 조심스럽게</b> 움직인다.
            <b>1헥스만</b> 움직이거나, <b>강 · 도로를 따라</b> 평소 속도까지 움직인다.
            기술 페이즈에 <b>길찾기가 자동으로 성공</b>한다.
            이번 턴 나온 <b>Circumstance상황</b>을 버릴 수 있다(허용될 때).</div>
          <div class="rule-k">Normal 보통</div><div class="rule-v"><b>평소대로</b> 움직인다 — 그룹의 이동력까지.
            그룹의 <b>절반</b>(올림)이 길찾기에 성공해야 <kw>wander</kw>를 피한다 — <ref t="rules" e="Wander &amp; Roam">헤매다 · 배회</ref>.</div>
          <div class="rule-k">Reckless 무모</div><div class="rule-v"><b>강행군</b>이라 길고 고되다.
            각 영웅이 <kw>energy drain</kw> <b>2</b>를 받고 그룹은 <b>2헥스 더</b> 간다.
            <b>길찾기를 굴리고</b>, <b>탐험과 생존 중 하나</b>를 골라 굴린다 — <b>나머지 기술은 자동으로 실패</b>한다.
            그룹의 <b>절반</b>(올림)이 길찾기에 성공해야 <kw>wander</kw>를 피한다.
            무모한 이동은 <b>다른 모든 이동 방식보다 우선</b>한다.</div>
        </div>
        <div class="rule-h">Camping 야영</div>
        <div class="rule-v">그 게임 턴의 스탯 굴림에 <b>-1 보너스</b>. <b>중첩</b>되지만(오래 야영할수록), 다른 효과로 위치가 옮겨지면 사라진다.</div>
        <div class="rule-h">Moving Cautiously 신중한 이동</div>
        <div class="rule-grid">
          <div class="rule-k">조건 (택1)</div><div class="rule-v">움직이지 않음 · 이동력 전부를 <b>강·도로만 따라</b> 씀 · 그 턴에 <b>1헥스만</b> 이동<br>
            <span style="color:var(--ink-faint)">지나는 헥스마다 도로나 강이 있어야 '따라 이동'으로 친다</span></div>
          <div class="rule-k">보상</div><div class="rule-v"><kw>wander</kw> 위험이 <b>없다</b> · 상황 단계에 나온 <b>카드를 버릴 수</b> 있다</div>
        </div>
        <div class="rule-h">Uncrossable 통행 불가</div>
        <div class="rule-v"><b>산맥</b>과 <b>물</b> 헥스는 들어갈 수 없다(나오는 것은 가능). <b>Scaling Kit</b> · <b>Canoe</b>를 얻으면 가능해진다.</div>
        <div class="rule-h">굴리는 기술 · Villain Action 보정</div>
        <div class="rule-v">빠르게 움직일수록 녹티스의 첩자가 보고하기 어려워져, 턴이 끝날 때 하는 <b>빌런 행동 굴림</b>에 보정이 붙는다.</div>
        <div class="rule-grid">
          <div class="rule-k">Camp 야영</div><div class="rule-v"><b style="color:var(--g-explore)">탐험</b> · <b style="color:var(--g-survival)">생존</b> &nbsp;—&nbsp; 빌런 행동 <b>+2</b></div>
          <div class="rule-k">Cautious 신중</div><div class="rule-v"><b style="color:var(--g-explore)">탐험</b> · <b style="color:var(--g-survival)">생존</b> &nbsp;—&nbsp; 빌런 행동 <b>+1</b></div>
          <div class="rule-k">Normal 보통</div><div class="rule-v"><b style="color:var(--g-navigate)">길찾기</b> · <b style="color:var(--g-explore)">탐험</b> · <b style="color:var(--g-survival)">생존</b> &nbsp;—&nbsp; 빌런 행동 <b>보정 없음</b></div>
          <div class="rule-k">Reckless 무모</div><div class="rule-v"><b style="color:var(--g-navigate)">길찾기</b> + <b style="color:var(--g-explore)">탐험</b> <b>또는</b> <b style="color:var(--g-survival)">생존</b> <b>중 하나</b> &nbsp;—&nbsp; 빌런 행동 <b>-2</b></div>
        </div>`},

      {title:{en:"Skill Phase & Stat Tests", ko:"기술 페이즈 · 스탯 굴림"}, body:`
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
        <div class="rule-v">평소 보상에 더해 <b>추가 보상</b>을 얻는다 — 기술별 내용은 <b>길찾기 · 탐험 · 생존</b> 항목에 있다.</div>
        <div class="rule-h">Multiple Critical Successes 대성공을 여럿 냈을 때</div>
        <div class="rule-grid">
          <div class="rule-k">3개 중 2개</div><div class="rule-v">평소 보상에 더해 <b>Moon 달 주사위</b>를 굴려 그룹이 <b>무작위 룬</b>을 얻는다.
            이 보상은 <b>게임 턴당 1회</b>까지만 얻는다</div>
          <div class="rule-k">3개 중 3개</div><div class="rule-v">이 보상과 <b>위의 것 중 하나만</b> 고른다(<b>둘 다는 안 된다</b>).
            평소 보상에 더해 <b>파워업 1장</b>을 뽑는다. <b>각 영웅</b>이 그 보상을 얻는다</div>
          <div class="rule-k">Random Rune 무작위 룬</div><div class="rule-v"><b>헥스 ~ 4</b> 빨강 · <b>5 ~ 8</b> 초록 · <b>9 ~ 12</b> 파랑</div>
        </div>`},

      {title:{en:"Navigate · Explore · Survival", ko:"길찾기 · 탐험 · 생존"}, body:`
        <div class="rule-grid">
          <div class="rule-k"><span style="color:var(--g-navigate)">Navigate 길찾기</span></div>
          <div class="rule-v">영웅의 <b>절반</b>(올림)이 성공해야 <kw>wander</kw>를 피한다.
            한 명이라도 <b>치명적 성공</b>하면 그 턴 그룹 전체가 면한다. <b>신중한 이동</b>을 했다면 애초에 위험이 없다.<br>
            <b>대성공</b> — 그룹을 <kw>wander</kw>에서 구하고 <b>하나</b>를 고른다:
            그룹이 <b>1헥스 더</b> 이동 · 원하는 <b>열린 Investigation조사</b>에 <b>Clue단서 1</b> 놓기.</div>
          <div class="rule-k"><span style="color:var(--g-explore)">Explore 탐험</span></div>
          <div class="rule-v">성공하면 <b>골드 2</b>어치 보물. 실패하면 아무것도 없다.<br>
            <b>대성공</b> — <b>골드 2</b>를 얻고 <b>하나</b>를 고른다:
            <b>각 영웅</b>이 잃은 <st>health</st> <b>1</b>을 <kw>heal</kw> · 원하는 <b>열린 Investigation조사</b>에 <b>Clue단서 1</b> 놓기.</div>
          <div class="rule-k"><span style="color:var(--g-survival)">Survival 생존</span></div>
          <div class="rule-v">성공하면 그 턴에 <b>음식을 먹지 않아도</b> 된다.
            실패했거나 <b>굴리지 못했다면</b> <b>음식 소모량</b>만큼 먹거나 <b>Food 하위 유형</b> 아이템 하나를 소비한다.
            소모량이 <b>0</b>이면 굴리지 않아도 된다.<br>
            <b>대성공</b> — 음식을 먹지 않아도 되고, 그 위에 <b>하나</b>를 고른다:
            <b>음식 1</b> 얻기 · <b>각 영웅</b>이 잃은 <st>energy</st> <b>1</b>을 <kw>heal</kw> ·
            영웅 하나가 <kw>critical wound</kw> <b>1</b> 없애기.</div>
        </div>
        <div class="rule-v" style="color:var(--ink-faint)">여러 명이 같은 기술에서 대성공하면
          <b>각자 보상 대안 중 하나씩</b>을 적용할 수 있다.</div>`},

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
        <div class="rule-v">기술 페이즈가 끝나면 <b>있는 위치에 따라</b> 그룹이 상황을 맞이한다.
          <b>영웅 한 명</b>이 <b>Hex 헥스 주사위</b>를 굴리고, 그 결과가 맞이할 상황이 된다.</div>
        <div class="rule-grid">
          <div class="rule-k">어느 바에서</div><div class="rule-v"><b>☀ 낮</b>에 이동했으면 <b>낮 바</b>,
            <b>☾ 밤</b>에 이동했으면 <b>밤 바</b>에서 굴린다</div>
          <div class="rule-k">5 또는 헥스</div><div class="rule-v">이 페이즈에 <b>5</b>나 <b>헥스</b>가 나오면,
            바의 카드 대신 <b>Encounter조우</b>를 뽑아 맞선다</div>
          <div class="rule-k">조사가 나오면</div><div class="rule-v">그 슬롯에 <b>Clue단서 1</b>을 놓는다(<b>최대 3개</b>).
            카드는 바에 <b>그대로 남는다</b></div>
          <div class="rule-k">그 밖의 카드</div><div class="rule-v"><b>플레이한다</b>.
            처리가 끝나면 <b>새 카드를 뽑아 빈 슬롯에 놓는다</b></div>
        </div>
        <div class="rule-h">카드의 성질</div>
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
          <div class="rule-k">사용</div><div class="rule-v">굴림으로 나오면 <b>단서를 놓거나</b>(최대 3개) 카드에 적힌 <b>마스터리</b>로 <b>스탯 굴림</b>를 한다</div>
          <div class="rule-k">단서 효과</div><div class="rule-v">붙은 단서는 마스터리 굴림 결과를 <b>1씩 낮춘다</b></div>
          <div class="rule-k">결과</div><div class="rule-v">성공 &rarr; 효과를 얻고 카드를 <b>참고용으로 보관</b> · 실패 &rarr; <b>버린다</b></div>
        </div>`},

      {title:{en:"Events", ko:"이벤트 장소"}, body:`
        <div class="rule-v"><b>마을 · 수도원 · 지하묘지 · 보스 · 조사</b>에서 이동을 끝내면 그 장소의 카드나 판을 처리한다.
          찾아낸 <b>발견</b>이 이벤트를 부르기도 한다. 이런 장소가 아니면 그 턴에는 이벤트가 없다.
          따로 명시가 없으면 한 게임 턴에 처리하는 이벤트 <b>수에 제한이 없다</b>.</div>
        <div class="rule-grid">
          <div class="rule-k">Village 마을</div><div class="rule-v">소박한 물품을 판다 —
            <ref t="items" e="Village">아이템 탭</ref>에 판매 목록이 있다.<br>
            <b>여관</b> — 그룹이 <b>골드 1</b>(총액)을 내고 <b>게임 턴당 1회</b> 묵는다.
            각 영웅이 <b><st>defence</st> 랭크까지</b> <st>health</st>과 <st>energy</st>를 <kw>heal</kw>한다.<br>
            <b>룬 판매</b> — 각 영웅이 <b>판 룬 1개당 골드 10</b>을 얻는다.
            그룹이 알아낸 정보에 값을 치르려는 수상한 자들이 있다.<br>
            <b>밤</b>에 왔다면 <b>콜렉터</b>와 맞설 수 있다</div>
          <div class="rule-k">Monastery 수도원</div><div class="rule-v"><b>들어서는 순간</b> 잃은 생명력을 <b>전부</b> <kw>heal</kw>하고,
            진행 중인 <b>컨디션과 Affliction고통을 전부</b> <kw>negate</kw>한다.<br>
            여기 있는 동안 <b>Circumstance상황 페이즈를 건너뛴다</b>.<br>
            수도원 물품은 물론 <b>마을 물품도</b> 여기서 살 수 있다.
            많은 물품이 지하묘지에 갇혀 있어 처음에는 살 수 없고,
            <b>지하묘지가 하나 열릴 때마다</b> 다음 단계의 물품과 <ref t="items" e="Gear Upgrades 1">기어 업그레이드</ref>가 모든 수도원에 풀린다.<br>
            룬을 <b>Impart 헌납</b>해 파워업과 <b>Grace은총</b>을 얻는다 — <ref t="rune" e="수도원 — 룬 헌납">룬 탭</ref> 참고</div>
          <div class="rule-k">Crypt 지하묘지</div><div class="rule-v">여기 있는 동안 <b>Circumstance상황 페이즈를 건너뛴다</b>.<br>
            지도에 드러날 때마다 <b>잠긴 지하묘지 토큰</b>을 놓는다 — 여는 방법 셋은 <ref t="dungeon" e="개요 · 출입구">던전 탭</ref>에 있다.
            <b>처음 세 번</b> 지하묘지가 열릴 때마다 <b>모든 수도원이 새 물품</b>을 팔기 시작한다.<br>
            룬을 <ref t="rune" e="지하묘지 — 룬 활성화">Activate 활성화</ref>해 파워업과 <ref t="rune" e="피의 마법">피의 마법</ref> 티어를 얻는다.
            활성화 기록은 <b>모든 지하묘지가 함께</b> 쓴다(잠겨 있어도 활성화할 수 있다).<br>
            열고 나면 <b>던전</b>에 들어갈 수 있다</div>
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

      R4_COMBAT, RULES_KWORDER,
    ],
    /* 상점 목록 — 마을 판과 수도원 판 뒷면의 판매표를 그대로 옮긴 것.
       * 표시가 붙은 것은 전투 중 Defend 방어 행동을 쓰는 동안에도 쓸 수 있다.
       비용의 "영웅당"은 인원수만큼 곱해 내는 것이고, 그 밖은 총액이다. */
    items: [
      {name:{en:"Village", ko:"마을"}, tags:["12종","언제나 판매"], desc:`
        <div class="rule-grid">
          <div class="rule-k">Mysterious Meat Pie<br><span class="it-sub">수상한 고기 파이 · <b class="g">1</b></span></div>
          <div class="rule-v"><b>고기 파이 2개</b>를 얻는다. 먹을 때마다 <st>energy</st> 피해 <b>2</b>를 받는다.
            <span class="rule-tag">1회 · 음식</span></div>
          <div class="rule-k">Suspicious Stew<br><span class="it-sub">수상쩍은 스튜 · <b class="g">1</b></span></div>
          <div class="rule-v">먹을 때 아무 주사위나 굴린다. <b>홀수</b>가 나오면 <b>게임 턴이 끝날 때까지</b>
            <state>disoriented</state> 상태가 된다. <span class="rule-tag">1회 · 음식</span></div>
          <div class="rule-k">Moonshine<br><span class="it-sub">밀주 · <b class="g">2</b></span></div>
          <div class="rule-v"><b>밀주 3개</b>를 얻는다. 먹으면 이번 기술 페이즈에 <st>explore</st> 굴림이 <b>실패</b>한다.
            이 아이템은 <b>굶주림 단계를 낮추지 못한다</b>. <span class="rule-tag">1회 · 음식</span></div>
          <div class="rule-k">Lesser Potion <span class="it-star">*</span><br><span class="it-sub">하급 물약 · <b class="g">1</b></span></div>
          <div class="rule-v"><st>health</st> <b>2</b> 또는 <st>energy</st> <b>2</b>를 <kw>heal</kw>한다(직접 선택).
            <span class="rule-tag">1회</span></div>
          <div class="rule-k">Voodoo Doll <span class="it-star">*</span><br><span class="it-sub">부두 인형 · <b class="g">4</b></span></div>
          <div class="rule-v">전투에서 <b>도주</b>할 때 <st>navigate</st> 굴림에 <b>-2 보너스</b>를 받는다.
            <kw>tenacious</kw>를 가진 적에게서도 <b>도주할 수 있다</b>. 영웅당 <b>1개</b>. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Monster Bait<br><span class="it-sub">괴물 미끼 · <b class="g">4</b></span></div>
          <div class="rule-v"><b>Circumstance상황 페이즈</b>에 써서 <b>Encounter조우</b>를 뽑아 맞서거나,
            <b>조우가 아닌 결과</b>가 나올 때까지 상황을 다시 굴린다. <span class="rule-tag">1회</span></div>
          <div class="rule-k">Magic Torch<br><span class="it-sub">마법 횃불 · <b class="g">5</b></span></div>
          <div class="rule-v">그룹이 <b>던전</b>에 있는 동안 <b>Time시간</b>을 <b>1</b> 더 얻는다. 영웅당 <b>1개</b>.
            <span class="rule-tag">영구</span></div>
          <div class="rule-k">Hunter's Gear<br><span class="it-sub">사냥꾼 장비 · <b class="g">5</b></span></div>
          <div class="rule-v">적을 쓰러뜨린 뒤 <st>health</st> <b>1</b>과 <st>energy</st> <b>1</b>을 <kw>heal</kw>한다.
            영웅당 <b>3개</b>까지. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Investigate<br><span class="it-sub">조사 의뢰 · <b class="g">8</b></span></div>
          <div class="rule-v">열린 <b>Investigation조사</b>에 <b>Clue단서 1</b>을 놓는다. <b>게임 턴당 3개</b>까지.
            <b>여관에 묵었다면</b> 단서를 <b>1개 더</b> 얻는다. <span class="rule-tag">즉시</span></div>
          <div class="rule-k">Familiar<br><span class="it-sub">패밀리어 · <b class="g">12</b></span></div>
          <div class="rule-v"><b>The Rat 쥐</b>와 <b>The Canine 개</b> 중 하나를 골라 얻는다. <span class="rule-tag">즉시</span></div>
          <div class="rule-k">Palm Reading<br><span class="it-sub">손금 보기 · <b class="g">2</b> <span class="it-per">영웅당</span></span></div>
          <div class="rule-v"><b>☀ 낮</b> 또는 <b>☾ 밤</b> 바에 깔린 카드를 <b>4장</b>까지 버리고 새로 뽑아 채운다.
            놓여 있던 <b>Clue단서는 그대로</b> 남는다. <span class="rule-tag">즉시</span></div>
          <div class="rule-k">Scaling Kit<br><span class="it-sub">등반 장비 · <b class="g">6</b> <span class="it-per">영웅당</span></span></div>
          <div class="rule-v">그룹이 <b>산맥</b>을 평소대로 지나갈 수 있게 된다. <span class="rule-tag">영구</span></div>
        </div>
        <div class="it-note"><span class="it-star">*</span> 전투 중 <b>Defend 방어</b> 행동을 쓰는 동안에도 사용할 수 있다.</div>`},

      {name:{en:"Monastery", ko:"수도원 · 기본"}, tags:["6종","마을 물품도 구매 가능"], desc:`
        <div class="rule-grid">
          <div class="rule-k">Blessed Ration<br><span class="it-sub">축복받은 배급 · <b class="g">1</b></span></div>
          <div class="rule-v">기술 페이즈에 <st>survival</st> 굴림에 <b>실패했을 때</b>, 음식을 먹는 대신 이것을 먹을 수 있다.
            <span class="rule-tag">1회 · 음식</span></div>
          <div class="rule-k">Healing Herbs <span class="it-star">*</span><br><span class="it-sub">치유 약초 · <b class="g">1</b></span></div>
          <div class="rule-v">먹으면 <st>health</st> <b>1</b>과 <st>energy</st> <b>1</b>을 <kw>heal</kw>한다.
            먹을 때 <b>Lesser Potion 하급 물약</b>을 함께 <b>바치면</b> 대신 <b>3과 3</b>을 <kw>heal</kw>한다. <span class="rule-tag">1회</span></div>
          <div class="rule-k">Holy Water <span class="it-star">*</span><br><span class="it-sub">성수 · <b class="g">2</b></span></div>
          <div class="rule-v">적에게 <st>health</st> <b>3</b>과 <st>energy</st> <b>3</b> 피해를 준다.
            <b>Sovereign Elixir 최상급 영약</b>을 바치면 이 피해가 <b>3배</b>가 된다.
            <kw>aegis</kw>를 가진 적에게는 <b>2배</b>로 들어간다. 이 피해는 <b>줄일 수 없다</b>. <span class="rule-tag">1회</span></div>
          <div class="rule-k">Swiftfoot Elixir<br><span class="it-sub">신속의 영약 · <b class="g">3</b></span></div>
          <div class="rule-v"><b>Time시간</b>을 <b>2</b> 늘리거나, <b>Event 이벤트 페이즈</b>에 써서 그룹을 <b>3헥스</b>까지 옮긴다.
            쓴 영웅은 그 뒤 <kw>energy drain</kw> <b>3</b>을 받는다. 영웅마다 <b>게임 턴당 1개</b>만 쓸 수 있다. <span class="rule-tag">1회</span></div>
          <div class="rule-k">Traveler's Kit<br><span class="it-sub">여행자 도구 · <b class="g">4</b></span></div>
          <div class="rule-v"><b>Movement 이동 페이즈</b>가 시작될 때 <st>health</st> <b>1</b> 또는 <st>energy</st> <b>1</b>을 <kw>heal</kw>한다.
            그룹이 <kw>wander</kw>하면 <b>Wander 주사위 결과를 1</b> 조정할 수 있다. 영웅당 <b>1개</b>. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Canoe<br><span class="it-sub">카누 · <b class="g">5</b> <span class="it-per">영웅당</span></span></div>
          <div class="rule-v">그룹이 <b>물</b> 헥스를 평소대로 지나갈 수 있게 된다.
            또한 <b>물 · 강</b> 헥스에 있는 동안 기술 굴림에 <b>-1 보너스</b>를 받는다. 그룹당 <b>1개</b>. <span class="rule-tag">영구</span></div>
        </div>
        <div class="it-note"><span class="it-star">*</span> 전투 중 <b>Defend 방어</b> 행동을 쓰는 동안에도 사용할 수 있다.</div>`},

      {name:{en:"Gear Upgrades 1", ko:"기어 업그레이드 1"}, tags:["지하묘지 1곳 해금","2번째 칸까지 구매"], desc:`
        <div class="rule-v">지하묘지가 <b>한 곳</b> 열리면 모든 수도원에서 이 물품과 <b>2번째 기어 업그레이드 칸</b>까지 살 수 있게 된다.</div>
        <div class="rule-grid">
          <div class="rule-k">Elder Berries <span class="it-star">*</span><br><span class="it-sub">엘더베리 · <b class="g">3</b></span></div>
          <div class="rule-v"><st>health</st> <b>2</b> 또는 <st>energy</st> <b>2</b>를 <kw>heal</kw>한다. <span class="rule-tag">1회 · 음식</span></div>
          <div class="rule-k">Training Regiment<br><span class="it-sub">훈련 과정 · <b class="g">6</b></span></div>
          <div class="rule-v">자신의 능력치 랭크를 <b>패밀리어에게 옮길</b> 수 있다.
            옮기는 능력치는 그 <b>패밀리어의 기준 능력치와 같은 종류</b>여야 한다. 영웅당 <b>1개</b>. <span class="rule-tag">즉시</span></div>
          <div class="rule-k">Familiar<br><span class="it-sub">패밀리어 · <b class="g">12</b></span></div>
          <div class="rule-v"><b>The Owl 올빼미</b>와 <b>The Turtle 거북</b> 중 하나를 골라 얻는다. <span class="rule-tag">즉시</span></div>
          <div class="rule-k">Hiking Gear<br><span class="it-sub">등산 장비 · <b class="g">4</b> <span class="it-per">영웅당</span></span></div>
          <div class="rule-v"><b>무모한 이동</b>으로 받는 <kw>energy drain</kw>을 <b>1</b> 줄이고,
            <b>야영</b>으로 <kw>heal</kw>하는 생명력을 <b>1</b> 늘린다. 그룹당 <b>1개</b>. <span class="rule-tag">영구</span></div>
        </div>
        <div class="it-note"><span class="it-star">*</span> 전투 중 <b>Defend 방어</b> 행동을 쓰는 동안에도 사용할 수 있다.</div>`},

      {name:{en:"Gear Upgrades 2", ko:"기어 업그레이드 2"}, tags:["지하묘지 2곳 해금","4번째 칸까지 구매"], desc:`
        <div class="rule-v">지하묘지가 <b>두 곳</b> 열리면 이 물품과 <b>4번째 기어 업그레이드 칸</b>까지 살 수 있게 된다.</div>
        <div class="rule-grid">
          <div class="rule-k">Sovereign Elixir <span class="it-star">*</span><br><span class="it-sub">최상급 영약 · <b class="g">6</b></span></div>
          <div class="rule-v"><kw>critical wound</kw> <b>1</b>을 없애거나 <st>health</st> <b>10</b>을 <kw>raise</kw>한다.
            영웅마다 <b>게임 턴당 1개</b>만 먹을 수 있다. <span class="rule-tag">1회</span></div>
          <div class="rule-k">Battle Horn<br><span class="it-sub">전투 나팔 · <b class="g">8</b></span></div>
          <div class="rule-v"><b>전투 라운드당 1회</b>, 자신의 <b>대상 주사위</b> 결과를 <b>3</b>까지 올리거나 내린다.
            영웅당 <b>1개</b>. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Consecration Charm<br><span class="it-sub">성별의 부적 · <b class="g">4</b> <span class="it-per">영웅당</span></span></div>
          <div class="rule-v">콜렉터를 찾는 <st>explore</st> 스탯 굴림에 <b>-3 보너스</b>를 받는다.
            콜렉터를 쓰러뜨릴 때마다 <b>피의 웅덩이를 2</b> 줄인다. 그룹당 <b>1개</b>. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Reins of Telgimere<br><span class="it-sub">텔지미어의 고삐 · <b class="g">4</b> <span class="it-per">영웅당</span></span></div>
          <div class="rule-v">그룹의 이동 속도가 턴당 <b>1헥스</b> 오른다(<b>신중한 이동</b> 포함).
            이 보너스는 비슷한 효과와 <b>중첩</b>된다. <b>무모하게 이동</b>할 때 기술 페이즈에 <b>기술 전부</b>를 굴릴 수 있다.
            그룹당 <b>1개</b>. <span class="rule-tag">영구</span></div>
        </div>
        <div class="it-note"><span class="it-star">*</span> 전투 중 <b>Defend 방어</b> 행동을 쓰는 동안에도 사용할 수 있다.</div>`},

      {name:{en:"Gear Upgrades 3", ko:"기어 업그레이드 3"}, tags:["지하묘지 3곳 해금","전부 구매"], desc:`
        <div class="rule-v">지하묘지가 <b>세 곳</b> 열리면 이 물품과 <b>기어 업그레이드 전부</b>를 살 수 있게 된다.</div>
        <div class="rule-grid">
          <div class="rule-k">Choker of Thorns<br><span class="it-sub">가시 목걸이 · <b class="g">10</b></span></div>
          <div class="rule-v"><b>Favored Opponent 주사위</b>를 굴릴 때마다, 원래 효과를 쓰는 대신
            그 라운드가 끝날 때까지 <b>그 적의 공격</b>에 대해 <b>결과값만큼</b> <kw>reflect</kw>를 얻기로 고를 수 있다.
            영웅당 <b>1개</b>. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Awakening Brew<br><span class="it-sub">각성의 물약 · <b class="g">10</b></span></div>
          <div class="rule-v">그룹이 <b>야영</b> 중일 때만 쓸 수 있다. 죽은 영웅을 <kw>revive</kw>시키고
            그 영웅의 <b>총 <st>health</st>을 2랭크</b> 낮춘다. 이 아이템은 <b>물약</b>의 일종이다. <span class="rule-tag">1회</span></div>
          <div class="rule-k">Holy Relic<br><span class="it-sub">성유물 · <b class="g">12</b></span></div>
          <div class="rule-v"><b>어느 HEXplore It 게임</b>에서든 원하는 <b>Treasure 보물</b>을 하나 찾아 얻는다.
            영웅당 <b>1개</b>. <span class="rule-tag">영구</span></div>
          <div class="rule-k">Crypt Key<br><span class="it-sub">지하묘지 열쇠 · 헌납</span></div>
          <div class="rule-v">남는 <b>Crypt Key 지하묘지 열쇠</b>를 수도원에 바치면 <b>각 영웅이 파워업 1장</b>을 얻는다.</div>
        </div>`},
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
          <div class="rule-h">타일 놓기</div>
          <div class="rule-grid">
            <div class="rule-k">첫 타일</div><div class="rule-v">들어온 <b>지하묘지 번호와 맞는</b> 던전 타일을 찾아 놓는다.
              이때 <b>Dungeon Rune Compass 던전 룬 나침반</b>도 함께 놓는다</div>
            <div class="rule-k">타일 넓히기</div><div class="rule-v">그룹이 <b>타일 가장자리로 이동할 때마다</b> 던전 타일을 <b>무작위로</b> 뽑아 놓는다.
              새 타일은 <b>그룹이 다음 헥스로 갈 수 있는 방향</b>으로 맞춰 놓아야 한다</div>
            <div class="rule-k">다른 입구로</div><div class="rule-v">던전 타일이 이미 깔려 있는데 <b>다른 지하묘지</b>로 들어가면,
              새 입구의 <b>벽 한 면</b>이 기존 던전 벽과 <b>맞닿게</b> 놓아야 한다</div>
            <div class="rule-k">나올 때</div><div class="rule-v">지도의 그 지하묘지 자리로 그룹을 옮긴다 —
              <b>헥스 토큰에 덮여 있어도</b> 그렇게 한다</div>
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
            <div class="rule-k">Secret Passage</div><div class="rule-v">벽에 <b>스탯 아이콘</b>으로 표시된다. <b>시간 1</b>을 써서 모든 영웅이 그 스탯으로 스탯 굴림을 하고,
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

        {name:{en:"Imparting Runes",ko:"④ 수도원 — 룬 헌납"}, desc:`
          <div class="rule-v" style="font-style:italic;color:var(--ink-faint);margin-bottom:6px">신앙의 수호자들은 어둠의 장막을 꿰뚫으려 쉼 없이 일한다.
            그러자면 오랜 세월의 인내와 지식이 필요하다.</div>
          <div class="rule-grid">
            <div class="rule-k">첫 룬</div><div class="rule-v">각 영웅이 <b>파워업 1장</b>을 얻는다.
              그 수도원 칸에 <b>룬 색을 표시</b>하고 룬은 버린다</div>
            <div class="rule-k">둘째 룬</div><div class="rule-v"><b>첫 룬과 같은 색인지</b>로 이후 보상이 갈린다.
              <b>같으면</b> 그 수도원은 앞으로 <b>같은 색만</b> 받는다. <b>다르면</b> <b>세트를 완성</b>해야 한다</div>
          </div>
          <div class="rule-h">Matching 같은 색으로 갈 때</div>
          <div class="rule-v">각 영웅이 <b>그 수도원에 낸 같은 색 룬 개수만큼</b> 파워업을 얻는다 —
            두 번째에 <b>2장</b>, 세 번째에 <b>3장</b>, 그다음 <b>4장</b>… 이 수도원에는 <b>다른 색을 낼 수 없다</b>.</div>
          <div class="rule-h">Set 세트로 갈 때</div>
          <div class="rule-v">한 종류씩 다 낼 때까지 <b>같은 색을 겹쳐 낼 수 없다</b>.
            낸 룬 <b>1개마다</b> 각 영웅이 <b>파워업 1장</b>을 얻고,
            <b>두 번째·세 번째</b> 헌납 때는 즉시 <b>피의 웅덩이를 5</b> 줄인다.
            <b>세트를 완성하면</b> 그 수도원의 <b>Grace은총</b>을 얻고 그 수도원의 기록을 <b>초기화</b>한다 —
            그 뒤로는 같은 색이든 세트든 다시 받을 수 있다.</div>
          <div class="rule-h">수도원 넷</div>
          <div class="rule-v"><b>Domiel</b> · <b>Last Dawn</b> · <b>Gesk</b> · <b>Lakenta</b> —
            기록은 <b>수도원마다 따로</b> 남는다.</div>`},

        {name:{en:"Graces",ko:"⑤ 은총"}, desc:`
          <div class="rule-v" style="font-style:italic;color:var(--ink-faint);margin-bottom:6px">모든 힘이 밤의 군주에게 빼앗긴 것은 아니다.
            옛 교단의 수도승들이 지켜 온 은총은 좀처럼 거저 주어지지 않는다.</div>
          <div class="rule-v">은총은 <b>게임이 끝날 때까지</b> 그룹에 남는다.
            수도원마다 <b>서로 다른 은총</b>을 주며 <b>게임당 한 번씩만</b> 얻을 수 있다.
            그룹은 <b>여러 은총</b>을 동시에 지닐 수 있다.
            아래의 추가 효과는 <b>드러난 수도원 수</b>만큼 커진다.</div>
          <div class="rule-grid">
            <div class="rule-k">☾ Grace of the Moon<br><span class="it-sub">달의 은총</span></div>
            <div class="rule-v">그룹의 <b>이동 속도가 2</b> 오른다(<b>신중한 이동</b>에도 적용된다).
              또한 <b>☾ 밤에 야영</b>할 때, <b>드러난 수도원마다</b> 빌런 행동 굴림에 <b>-1 보너스</b>를 받는다</div>
            <div class="rule-k">☀ Grace of the Sun<br><span class="it-sub">태양의 은총</span></div>
            <div class="rule-v"><b>게임 턴당 1회</b>, 이벤트 페이즈 전에 <b>Circumstance상황을 완료했다면</b>
              <b>☀ 낮 바</b>에서 카드 <b>1장</b>을 골라 플레이할 수 있다.
              또한 이벤트 페이즈의 <b>☀ 낮</b> 스탯 굴림 전부에 <b>드러난 수도원마다 -1 보너스</b>를 받는다</div>
            <div class="rule-k">Grace of Light<br><span class="it-sub">빛의 은총</span></div>
            <div class="rule-v"><b>게임 턴당 1회</b>, 영웅 하나가 자신의 <kw>critical wound</kw> <b>1</b>을 없앨 수 있다.
              또한 적에게 받는 <kw>critical</kw> 피해를 <b>드러난 수도원마다 1</b>씩 줄인다(<b>최소 1</b>)</div>
            <div class="rule-k">Grace of Darkness<br><span class="it-sub">어둠의 은총</span></div>
            <div class="rule-v">그룹이 <kw>evasion</kw> <b>10</b>을 얻는다.
              <b>다른</b> 드러난 수도원마다 이 수치를 <b>1</b>씩 낮춘다</div>
          </div>`},

        {name:{en:"Activate Runes",ko:"⑥ 지하묘지 — 룬 활성화"}, desc:`
          <div class="rule-v" style="font-style:italic;color:var(--ink-faint);margin-bottom:6px">지하묘지는 찾는 이에게 옛 비밀을 품고 있다.
            모험가들은 지하 회랑에서 곧잘 힘을 좇는다.</div>
          <div class="rule-grid">
            <div class="rule-k">활성화</div><div class="rule-v">표에 <b>룬 색을 표시</b>하고 <b>총 활성화 수</b>에 더한 뒤 그 룬을 버린다.
              활성화한 <b>룬 1개마다</b> 각 영웅이 <b>파워업 1장</b>을 얻는다</div>
            <div class="rule-k">활성화 2회마다</div><div class="rule-v"><b>2 · 4 · 6 · 8 · 10 · 12</b>번째 활성화 때,
              그룹이 <b>파워업 1장</b>을 뽑아 그 <b>보너스를 2배</b>로 얻는다</div>
            <div class="rule-k">세트 활성화</div><div class="rule-v"><b>완전한 세트</b>를 활성화하면 즉시 <b>피의 마법 티어 1</b>을 얻는다</div>
            <div class="rule-k">기록</div><div class="rule-v">활성화 기록은 <b>모든 지하묘지가 함께</b> 쓴다(<b>잠겨 있어도</b> 활성화할 수 있다)</div>
          </div>
          <div class="rule-h">게임 종료 시 피의 웅덩이 감소</div>
          <div class="rule-v">녹티스와 맞설 때 <b>딱 한 번</b> 적용한다. <b>색마다</b> 활성화한 개수를 보고 아래 값을 뺀다 —</div>
          <div class="rule-grid">
            <div class="rule-k">활성화 개수</div><div class="rule-v"><b>1</b> &rarr; -1 · <b>2</b> &rarr; -4 · <b>3</b> &rarr; -9 ·
              <b>4</b> &rarr; -16 · <b>5</b> &rarr; -25 · <b>6 이상</b> &rarr; -36</div>
            <div class="rule-k">세트 보너스</div><div class="rule-v">활성화한 <b>세트 1개마다 -5</b>를 더 뺀다</div>
            <div class="rule-k">예</div><div class="rule-v">빨강 <b>2</b> · 초록 <b>1</b> · 파랑 <b>3</b>을 활성화했다면
              <b>-4</b>, <b>-1</b>, <b>-9</b>, 세트 하나로 <b>-5</b> &rarr; 합쳐서 <b>-19</b></div>
          </div>`},

        {name:{en:"Blood Magic",ko:"⑦ 피의 마법"}, desc:`
          <div class="rule-v" style="font-style:italic;color:var(--ink-faint);margin-bottom:6px">강대한 존재들은 Wellspring을 여는 대신 사악한 다른 길을 쓴다.
            너희는 이제 겨우 그 겉을 긁었을 뿐이다.</div>
          <div class="rule-grid">
            <div class="rule-k">티어 얻기</div><div class="rule-v">지하묘지에서 <b>룬 세트를 활성화</b>할 때마다 <b>티어 1</b>을 얻는다.
              티어를 얻을 때마다 그룹이 <b>피의 마법 주문 1장</b>을 뽑는다</div>
            <div class="rule-k">첫 티어</div><div class="rule-v">첫 티어를 얻으면 아래 <b>세 주문</b>을 쓸 수 있게 된다</div>
            <div class="rule-k">시전 비용</div><div class="rule-v">아무 영웅이나 주문의 비용만큼 <kw>critical</kw> <b>생명력 피해</b>를 받는다.
              이 피해는 <b>줄일 수 없다</b></div>
            <div class="rule-k">횟수</div><div class="rule-v">각 영웅이 <b>게임 턴당 1개</b>까지, <b>종족 능력처럼</b> 시전한다</div>
          </div>
          <div class="rule-h">기본 주문 셋</div>
          <div class="rule-grid">
            <div class="rule-k">Body Control<br><span class="it-sub">육체 통제 · 치명 <st>health</st> <b>2</b></span></div>
            <div class="rule-v">방금 <b>실패한 스탯 굴림</b> 하나의 결과를 <b>티어만큼</b> 조정할 수 있다</div>
            <div class="rule-k">Kiss of Darkness<br><span class="it-sub">어둠의 입맞춤 · 치명 <st>health</st> <b>1</b></span></div>
            <div class="rule-v">대상 하나의 <st>health</st>을 <b>티어만큼</b> <kw>heal</kw>한다</div>
            <div class="rule-k">Accursed Revival<br><span class="it-sub">저주받은 부활 · 치명 <st>health</st> <b>5</b></span></div>
            <div class="rule-v">죽은 영웅을 <kw>revive</kw>시킨다. 그 영웅은 <b>Ghost 유령</b>이나 <b>Zombie 좀비</b>
              위대한 양상을 얻는다(직접 선택)</div>
          </div>`},


        {name:{en:"Clues",ko:"단서 — 룬과는 별개"}, desc:`
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
          <div class="rule-v" style="font-style:italic;color:var(--ink-faint);margin-bottom:6px">킵세이크는 영웅 영혼의 파편이다. 영웅이 죽으면 그 조각이 깨어나,
            아직 살아 있는 동료들을 돕도록 혼을 움직이기도 한다.</div>
          <div class="rule-v">게임 시작 시 무작위로 <b>1장</b> 뽑아 <b>역할판 아래</b>에 두고,
            <b>발동할 때까지 보지 않는다</b>. 킵세이크는 <b>어느 HEXplore It 게임에서든</b> 쓸 수 있다.</div>
          <div class="rule-h">발동</div>
          <div class="rule-grid">
            <div class="rule-k">굴림</div><div class="rule-v">영웅이 죽는 <b>순간</b>, <b>위대한 양상을 얻지 못했다면</b> <b>Moon 달 주사위</b>를 굴린다.
              결과가 <b><st>defence</st> 랭크 + 지닌 방어 기어 업그레이드 수</b> <b>이하</b>면 발동한다</div>
            <div class="rule-k">소지품</div><div class="rule-v">발동하면 <b>다른 영웅들이 소지품을 나눠 갖는다</b> —
              골드 · 음식 · 아이템 등 전부. 다만 <b>기어 업그레이드는 제외</b>다</div>
            <div class="rule-k">카드 놓기</div><div class="rule-v">킵세이크를 뒤집어 <b>마스터리 설명 위에</b> 덮어 놓는다.
              그 능력이 <b>마스터리를 대신한다</b></div>
            <div class="rule-k">사용 비용</div><div class="rule-v">카드에 적힌 대로 <b>자신의 스탯 랭크를 깎아</b> 능력을 쓴다.
              <b>종족 능력</b>처럼 다룬다</div>
            <div class="rule-k">Role 역할 일치</div><div class="rule-v">생전의 <b>역할(계통)</b>이 카드에 적힌 유형과 <b>같으면</b>
              킵세이크 능력 <b>하나가 더 강해진다</b></div>
            <div class="rule-k">소멸</div><div class="rule-v">두 능력을 <b>모두 쓸 수 없게 되면</b> 영혼이 떠나 게임에서 제거된다 — 더는 <kw>revive</kw>할 수 없다</div>
            <div class="rule-k">부활</div><div class="rule-v">킵세이크가 활성이고 능력을 <b>하나라도</b> 쓸 수 있는 동안에는 <kw>revive</kw>될 수 있다</div>
          </div>
          <div class="rule-h">카드는 이렇게 생겼다 <span class="rule-tag">견본</span></div>
          <div class="rule-v" style="color:var(--ink-faint)">역할 유형 <b>Striker</b> · <b>Assist</b>가 적힌 카드의 예 —
            비용의 <b>VITAL</b>은 생명력 스탯, <b>ANY</b>는 아무 스탯이나 그만큼 랭크를 깎는다는 뜻이다.</div>
          <div class="rule-grid">
            <div class="rule-k">Life Drain<br><span class="it-sub">생명 흡수 · <b>생명력 2랭크</b></span></div>
            <div class="rule-v">전투 중 <b>선언 페이즈</b>에 <b>전투 라운드당 1회</b>까지, 동료 하나에게
              <b>전투가 끝날 때까지 Life Drain</b>을 준다. 그 동료가 Life Drain으로 적의 생명력에 피해를 줄 때마다
              <b>전투가 끝날 때까지</b> <kw>regen</kw> <st>health</st> <b>1</b>을 얻는다. 이 효과는 <b>자기 자신과 중첩</b>된다.<br>
              생전에 <b>Striker</b>였다면 이 <kw>regen</kw>이 <b>2</b>로 오르고 <b><st>health</st>과 <st>energy</st> 모두</b>에 적용된다</div>
            <div class="rule-k">Protoplasm<br><span class="it-sub">원형질 · <b>아무 스탯 1랭크</b></span></div>
            <div class="rule-v"><b>게임 턴당 2회</b>까지, 구매할 수 있는 <b>1회용 아이템</b>을 만들어 내어 원하는 대상에게 쓴다.
              만들 수 있는 것은 <b>자신의 가장 높은 Ability 능력 랭크보다 비용이 낮은</b> 아이템뿐이다.<br>
              생전에 <b>Assist</b>였다면 <b>랭크를 1 더 써서</b> 비용에 상관없이 1회용 아이템을 만들 수 있다</div>
          </div>`},

        {name:{en:"Greater Aspects",ko:"위대한 양상 — 죽을 때"}, desc:`
          <div class="rule-v">영웅이 <b>죽는 순간</b>의 처리 순서다. 킵세이크와 위대한 양상은 <b>둘 중 하나만</b> 일어난다.</div>
          <div class="rule-steps">
            <div class="rule-step"><span class="n">1</span><span class="t">다른 효과가 <b>위대한 양상을 준다면</b> 그것을 얻는다</span></div>
            <div class="rule-step"><span class="n">2</span><span class="t">아니면 <b>킵세이크</b> 발동을 굴린다(<b>달 주사위</b>)</span></div>
            <div class="rule-step"><span class="n">3</span><span class="t">킵세이크도 발동하지 않았다면 <b>코어 주사위</b>를 굴려 아래 표를 본다</span></div>
          </div>
          <div class="rule-h">코어 주사위 표</div>
          <div class="rule-grid">
            <div class="rule-k">헥스</div><div class="rule-v">아래 <b>셋 중 하나</b>를 직접 고른다</div>
            <div class="rule-k">2</div><div class="rule-v"><b>Ghost 유령</b></div>
            <div class="rule-k">3</div><div class="rule-v"><b>Reanimated 되살아난 자</b></div>
            <div class="rule-k">4</div><div class="rule-v"><b>Zombie 좀비</b></div>
            <div class="rule-k">5 ~ 10</div><div class="rule-v">아무것도 얻지 못한다</div>
          </div>
          <div class="rule-h">얻은 뒤</div>
          <div class="rule-grid">
            <div class="rule-k">부활</div><div class="rule-v"><b>빌런 단계가 끝날 때</b> 생명력이 <b>가득 찬 채로</b> <kw>revive</kw>되고
              표에 나온 위대한 양상을 얻는다</div>
            <div class="rule-k">겹침</div><div class="rule-v"><b>여러 영웅이 같은</b> 위대한 양상을 얻어도 된다</div>
            <div class="rule-k">두 번째 죽음</div><div class="rule-v">위대한 양상을 가진 영웅이 죽으면 <b>영원히 죽는다</b> —
              다시는 <kw>revive</kw>될 수 없다. 그 패턴이 <b>부서져 되돌릴 수 없다</b></div>
          </div>
          <div class="rule-v" style="margin-top:8px;color:var(--ink-faint)">표에 없는 나머지 위대한 양상
            (저주받은 자 · 늑대인간 · 뱀파이어 · 축복받은 자)은 다른 경로로 얻는다.
            능력치와 능력은 <b>빌더의 양상 목록</b>에 있다.</div>`},

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
          &#9316; 카드를 처리한 직후, 각 영웅은 <b>직전 위치에 표시된 스탯</b>으로 스탯 굴림을 <b>한 번</b> 굴린다 —
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

  "5c": {
    id:"5c", name:{en:"Edition 5 · Return to Caprakan", ko:"5편 · 카프라칸 귀환"}, short:"5C", ord:4,
    note:{ko:"Jaethi 이전의 시간선. 반신들이 균형을 무너뜨린다"},
    keywords: KW_COMMON, exKeywords: KW_SIEGE, conditions: CONDITIONS,
    rules: [], items: [], extras: [],
  },

  "5i": {
    id:"5i", name:{en:"Edition 5 · Return to Ishidan", ko:"5편 · 이시단 귀환"}, short:"5I", ord:5,
    note:{ko:"봉인이 무너지고 네 신룡이 깨어난다"},
    keywords: KW_COMMON, exKeywords: KW_SIEGE, conditions: CONDITIONS,
    rules: [], items: [], extras: [],
  },

  "5": {
    id:"5", name:{en:"Hexplore It — Edition 5", ko:"헥스플로어 잇 — 5편"}, short:"5", ord:3,
    keywords: KW_COMMON,
    exKeywords: KW_SIEGE,
    conditions: CONDITIONS,
    rules: [R5_SETUP, R5_STAGES, R5_TURN, R5_HARVEST, R5_VILLAIN_H, R5_SIEGE, R5_VILLAIN_S, R5_CALENDAR, R5_MOVE, R5_EVENT, R5_RES, R5_DEFENDER, R5_MAP, R5_PORTAL, R5_COMBAT, RULES_KWORDER, R5_ELEM, R5_OUTLAST, R5_DEATH],
    items: [],
    extras: [],
  },
};

/* 5편 용맹 — 코어와 두 확장이 함께 쓴다(용맹은 시리즈 전체 공용 점수다) */
const V5_VALOR = {id:"valor5", label:{en:"Valor", ko:"용맹"}, entries:[
  {name:{en:"Gaining Valor",ko:"용맹 얻기"}, desc:`특정 업적을 달성하면 <b>용맹 1점</b>을 얻는다. 용맹은 <b>5편 전용이 아니라</b> 시리즈 전체에서 통한다.<br>
    플레이어의 용맹 점수는 시리즈의 어느 게임에서든 <b>모아 온 총합</b>이며, 함께 플레이하는 모두는 <b>가장 높은 사람</b>의 점수를 그대로 적용받는다.
    용맹은 <b>같은 출처에서 한 번만</b> 얻을 수 있고(Jaethi를 몇 번 쓰러뜨리든 1점), 다른 게임 효과로 <b>바뀌지 않는다</b>.
    업적들을 <b>한 게임 안에서 다 채울 필요는 없다</b>.<br>
    <b>5편에서 얻는 법</b> — <b>쉬움</b>에서 Jaethi(10레벨 보스) 격파 · <b>에픽</b>에서 Jaethi 격파 ·
    보스 <b>8종 전부</b>의 <b>Dedication 헌신</b> 획득 · <b>한 번의 Siege Wave 공성 물결</b>에서 <b>Siege Banner 공성 깃발 4개</b>를 모두 격파 ·
    <b>Temple Fortress 사원 요새</b> 건설 · <b>Arashiryū</b>(9레벨 보스) 격파.`},
  {name:{en:"Using Valor",ko:"용맹 사용"}, desc:`게임을 시작할 때 총 용맹 점수로 <b>해당 티어와 그 아래 티어의 보너스를 모두</b> 얻는다.
    다른 시리즈의 용맹 보너스와 <b>합쳐 쓸 수 없고</b>, 효과는 <b>그 게임에만</b> 적용된다.<br>
    <b>Initiate 입문 (1~7)</b> — 각 영웅은 용맹 점수의 <b>절반</b>만큼 골드를 얻어 <b>기어 업그레이드에만</b> 쓴다. 남은 골드는 사라진다.<br>
    <b>Adventurer 모험가 (8~19)</b> — 시작 전 <b>헥스 주사위</b>를 굴려 그 값을 이번 게임의 용맹 점수에 더한다(헥스플로드 가능). 그룹은 <b>획득량 +1</b>(4)로 시작한다.<br>
    <b>Hero 영웅 (20~32)</b> — 각 영웅은 원하는 <b>Element 원소 하나를 Augment 보강</b>한 채 시작한다. 승리하려면 <b>어려움 이상</b>에서 빌런을 쓰러뜨려야 한다.<br>
    <b>Champion 챔피언 (33~59)</b> — 건설하는 <b>Tower 탑</b>과 <b>Fortress 요새</b>는 <b>처음 세울 때 +5</b>를 얻는다. 승리하려면 <b>영웅적 이상</b>에서 빌런을 쓰러뜨려야 한다.<br>
    <b>Avatar 아바타 (60+)</b> — 시작 시 각 영웅이 능력 하나를 고른다. 게임 턴당 영웅마다 <b>1회</b>까지 Skill 기술 페이즈에 그 능력으로 <b>스탯 굴림</b>를 굴려,
    성공하면 게임 턴이 끝날 때까지 그 랭크를 <b><kw>boost</kw> 3</b>만큼 올린다. <b>대성공</b>이면 <b>그 랭크의 절반</b>만큼 올린다. 승리하려면 <b>에픽</b>에서 빌런을 쓰러뜨려야 한다.`},
]};

/* 균열 모드는 4편의 공통 룰을 그대로 쓰고, 달라지는 것만 앞에 얹는다 */
(function(){
  const base = SERIES["4"].rules;
  const pick = en => base.find(r => r.title.en === en);
  SERIES["4b"].rules = [
    B_DIFF, B_SETUP, B_TURN, B_CIRC,
    pick("Movement"), pick("Skill Phase & Stat Tests"),
    pick("Navigate · Explore · Survival"), pick("Wander & Roam"), pick("Starving"),
    pick("Circumstance Types"), R4_COMBAT, RULES_KWORDER,
  ].filter(Boolean);
  const ex = SERIES["4"].extras, byId = id => ex.find(x => x.id === id);
  SERIES["4b"].extras = [byId("dungeon"), byId("rune"), BREACH_TAB, byId("valor")].filter(Boolean);
  SERIES["4b"].items = SERIES["4"].items;
})();

/* 5편 확장 모드는 코어 5편의 공통 룰을 그대로 쓰고, 달라지는 것만 앞에 얹는다 */
(function(){
  const base = SERIES["5"].rules;
  const pick = en => base.find(r => r.title.en === en);
  const common = ["Movement Phase","Event Phase & Range","Resources & Elements","Defenders",
                  "Special Tiles","Siege Portals","Combat Reference","Keyword Order","Elemental Damage",
                  "Outlast Opponents","Death & Revival"].map(pick).filter(Boolean);
  SERIES["5c"].rules = [RC_INTRO, RC_DIFF, pick("Game Setup"), pick("Game Stages"), pick("Turn Sequence"),
                        pick("Harvest Stage"), pick("Siege Stage"), ...common];
  SERIES["5i"].rules = [RI_INTRO, RI_DIFF, pick("Game Setup"), pick("Game Stages"), pick("Turn Sequence"),
                        pick("Harvest Stage"), pick("Siege Stage"), ...common];
  SERIES["5c"].items = SERIES["5i"].items = SERIES["5"].items;
  SERIES["5"].extras = SERIES["5c"].extras = SERIES["5i"].extras = [V5_VALOR];
})();

/* 엔진에서 접근할 수 있게 전역으로 노출 */
window.HEX = { CAT, STAT_ORDER, STAT_META, HEX_START, FAMILIARS, FAMILIAR_HEX, SHARED, SERIES, FOE_TYPES, GREATER_ASPECTS, COND_NOTE, DIFFICULTY };
