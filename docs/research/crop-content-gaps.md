# 작물 콘텐츠 공백 리서치

> 이 저장소에는 기존 "리서치 문서" 관행이 없어서, 이 파일이 `docs/research/` 폴더와 함께 처음 만들어졌습니다.

조사 대상: `frontend/features/crop-catalog/data/crop-references.ts`(기존 13종 + `CROP_SOURCES`), 스키마는 `frontend/features/crop-catalog/domain/crop-reference.ts`의 `CropReference`/`CropSource`. **이 문서는 리서치 전용이며 코드는 수정하지 않았습니다.**

---

## 1. 바질(basil) 신규 작물 데이터

### 조사 결과 요약
농사로(nongsaro.go.kr)에서 "바질"로 검색했으나 허브류 재배 매뉴얼(파종시기표, 재배기술 페이지)을 찾지 못했습니다. 기존 관엽식물 3종과 같은 방식으로, 해외 공식 원예 기관 자료를 1차 출처로 사용합니다.

**채택한 출처**: Royal Horticultural Society. 기존 `iowa-state-cut-flower-care`, `rhs-phalaenopsis-guide`, `rhs-african-violet-guide`와 같은 급의 1차 출처이며, 이미 카탈로그에서 RHS를 관엽식물 출처로 채택한 전례와 일관됩니다.

### CROP_SOURCES에 추가할 항목
```
{
  id: "rhs-basil-growing-guide",
  organization: "Royal Horticultural Society",
  title: "How to grow basil",
  url: "https://www.rhs.org.uk/herbs/basil/grow-your-own",
  reviewedAt: "2026-08-27",
}
```

### 제안하는 CropReference 객체
```
{
  id: "basil",
  name: "바질",
  familyName: "꿀풀과",
  category: "leaf",              // 아래 "category 판단 근거" 참고
  difficulty: "easy",
  plantingMaterial: "seed",
  supportedSpaces: ["indoor", "balcony", "garden"],
  plantingPeriod: 출처에 없음 — 확인 필요 (아래 설명 참고),
  harvestPeriod: 출처에 없음 — 확인 필요 (아래 설명 참고),
  plantSpacingCm: 10,
  minPotDepthCm: 20,
  sunRequirement: "full",
  needsSupport: false,
  summary: "따뜻하고 볕이 잘 드는 곳에서 씨앗부터 기르며, 잎을 자주 따 줄수록 더 무성해지는 허브입니다.",
  sourceId: "rhs-basil-growing-guide",
}
```

### 필드별 근거
- **category = "leaf" (제안, 판단 근거 포함)**: 스키마에는 "herb" 카테고리가 없습니다. 바질은 뿌리·열매·꼬투리가 아니라 잎을 반복 수확하는 작물이고(RHS: "Pick the tips of the shoots regularly, to keep basil plants bushy and productive."), 카탈로그의 상추·시금치·대파와 같은 "잎을 계속 따 먹는" 재배 패턴과 실제로 일치합니다. 따라서 "leaf"로 분류하는 것이 재배 특성상 타당하다고 판단했습니다. 다만 이는 이 리서치의 제안이며 스키마에 "herb" 카테고리를 추가할지는 별도 논의가 필요합니다.
- **difficulty = "easy"**: RHS 원문 "an easy-to-grow herb from seed".
- **plantingMaterial = "seed"**: RHS는 씨앗 파종(실내 3~7월)과 모종(plug plant) 구매 두 가지를 모두 안내하지만, 기존 카탈로그에서 씨앗으로 직파하는 작물(강낭콩·열무·시금치·당근)과 마찬가지로 "seed"를 기본값으로 제안. 모종 구매도 가능하다는 점은 출처에 있으나 스키마가 값 하나만 허용하므로 대표값만 선택.
- **supportedSpaces**: RHS "Ideal indoors on sunny windowsills... Does particularly well in a greenhouse... can be grown outdoors in summer in warm locations" → 실내·베란다·텃밭 모두 가능.
- **plantingPeriod / harvestPeriod = 출처에 없음 — 확인 필요**: RHS는 영국 기후 기준으로 "Sow seeds from March through to July"(실내), 실외 정식은 "일교차 없이 야간 기온이 10℃ 이상 유지되는 초여름부터", 수확은 "Basil leaves can be harvested throughout the summer"라고만 안내합니다. 이는 한국의 월별 캘린더로 그대로 환산할 수 있는 수치가 아니므로 추측해서 채우지 않았습니다. 참고로 카탈로그의 토마토·고추·오이(5월 초 정식, 야간 저온에 약함)와 요구 온도대가 비슷해 유사한 시기일 가능성이 있으나, 이는 리서치자의 추정이지 출처에 명시된 사실이 아닙니다. 한국 기준 시기는 별도로 nongsaro 허브 자료나 종자 회사 파종 안내를 확인해 채우는 것을 권장합니다.
- **plantSpacingCm = 10**: RHS "Space plants at least 10cm (4in) apart".
- **minPotDepthCm = 20**: RHS "Choose a container at least 20cm (8in) wide and deep."
- **sunRequirement = "full"**: RHS "Basil needs a warm, sunny, sheltered location", "thrives in warmth and sunshine".
- **needsSupport = false**: 출처에 지지대 관련 언급 없음(순지르기로 웃자람을 관리하라는 안내만 있음).
- **summary**: 출처 내용을 한국어 한 줄 요약으로 재구성(기존 데이터 톤에 맞춤).

### 재조사(2026-08-27): `plantingPeriod`/`harvestPeriod`(한국 기준) 확인 결과

**결론: 여전히 확인 불가.** 한국(1순위) 및 기후대가 비슷한 일본(3순위, 차선책)의 공식 기관 자료 어디에서도 바질의 파종·수확 시기를 월 단위로 명시한 1차 출처를 찾지 못했습니다. 아래처럼 추측 없이 비워 두는 것이 맞다고 판단합니다.

**1순위 — 농사로(nongsaro.go.kr) 재확인**: 이전 리서치가 놓쳤을 수 있는 허브·화분원예 카테고리를 포함해 다시 확인했으나 결과는 동일합니다.
- 바질 단독 페이지(`http://nongsaro.go.kr/portal/ps/psz/psza/contentSub.ps?menuId=PS03172&sSeCode=335001&cntntsNo=218964&totalSearchYn=Y`, 메뉴 경로: 채소): 본문에 "잎이 둥글고 끝이 넓은 녹색으로 키는 40cm 정도 자랍니다", 관리법(볕·통풍·물주기)만 있고 **파종·수확 월 정보 없음**.
- "옥상허브정원"(`https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS03169`): 요리용 허브정원 목록에 그리스 바질·스위트 바질이 이름만 등장. 페이지 하단 "허브정원관리표"는 라벤더·레몬밤·민트·로즈마리·타임·셀러리만 다루고 **바질은 표에서 빠져 있음**. 즉 나머지 허브는 관리표가 있는데 바질만 제외된 것으로 보아, 농사로가 바질 재배력을 아직 정리하지 않았다고 판단됩니다.
- "농작업일정"(`workScheduleDtl.ps`, 토마토·상추 등에 있는 것과 같은 종류의 페이지) 계열에서 바질 항목 자체를 찾지 못함 — 검색 결과에 콩·벼·가지 등 다른 작물만 나옴.
- "농업기술길잡이" e-book 목록(`cropEbookMain.ps?menuId=PS65290`, 농업과학도서관 `lib.rda.go.kr/search/farmingSkillGuideList.do`, 총 708건): 확인한 페이지 범위 안에서는 허브·바질·향신채소 제목을 찾지 못함(전량 열람은 아님).
- 농사로 통합검색(`site:nongsaro.go.kr 바질`, `바질 파종` 등 복수 검색어)에서도 재배력·작업일정 성격의 결과는 나오지 않고, 병해(로즈마리·바질 뿌리 고사 Q&A) 게시판 글만 확인됨.

**2순위 — 한국의 다른 공식 기관**: 지자체 농업기술센터·원예연구소도 확인했으나 바질 항목 자체가 없습니다.
- 서울시 농업기술센터 "텃밭 작물 재배법"(`https://agro.seoul.go.kr/archives/category/cityfarm-c1/cityfarm_garden_c1/cityfarm_garden_info`): 감자·고구마·고추·당근·무·배추·상추·시금치·양배추·대파 10종만 있고 **바질 없음**.
- 부산시 농업기술센터: 사이트 검색으로 바질 관련 재배 정보를 찾지 못함.
- 국립원예특작과학원(nihhs.go.kr, RDA 산하 원예 전문 연구기관): 조직·연혁 정보만 확인되고 바질 재배기술 자료를 찾지 못함.
- 국가농작물병해충관리시스템(NCPMS, ncpms.rda.go.kr), 국립종자원(seed.go.kr): 바질 관련 병해충·품종 정보를 특정하지 못함(사이트 자체 검색 UI 한계로 완전히 배제하지는 못했으나, 웹 검색으로는 확인 불가).

**3순위 — 일본 공식 기관(차선책으로 확인, 결과: 없음)**: 농림수산성(maff.go.jp) 산하 아그리서처(agresearcher.maff.go.jp), JIRCAS(jircas.go.jp), 식품성분 DB(fooddb.mext.go.jp) 등을 확인했으나, 검색된 자료는 바질 시들음병(メボウキ立枯病) 연구, 항산화 성분 비교, 영양성분표 등 **재배력(播種時期・収穫時期)과 무관한 연구·통계 자료뿐**이었습니다. 일본 정부 기관이 발행한 월 단위 바질 파종·수확 캘린더는 찾지 못했습니다. 따라서 일본 자료도 이번에는 대안으로 채택할 수 없습니다.

**참고(채택하지 않음) — 비공식 출처에서 반복 등장하는 수치**: 웹 검색 시 AI 요약과 원예 블로그·앱(`furune.info`, `picturethisai.com` 등 커뮤니티·상업 사이트)에서 "노지 직파 파종시기 4월 중순~6월 하순(발아적온 20~25℃ 내외)", "수확시기 6월 중순~9월 하순"이라는 수치가 반복해서 나타납니다. 다만 이 수치들의 1차 출처(정부·학회 발행물)를 역추적하지 못했고, 사용자가 배제하기로 한 "블로그·커뮤니티 글"에 해당하므로 이번 리서치에서는 채택하지 않았습니다. 향후 이 수치의 근거 문헌을 찾거나 국립원예특작과학원·지역 농업기술센터에 직접 문의해 1차 확인을 받으면 재검토할 수 있습니다.

**이번 재조사에서 확인한 추가 URL**:
- `http://nongsaro.go.kr/portal/ps/psz/psza/contentSub.ps?menuId=PS03172&sSeCode=335001&cntntsNo=218964&totalSearchYn=Y` (농사로, 바질 단독 페이지)
- `https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS03169` (농사로, 옥상허브정원)
- `https://www.nongsaro.go.kr/portal/ps/psb/psbx/cropEbookMain.ps?menuId=PS65290` / `https://lib.rda.go.kr/search/farmingSkillGuideList.do` (농업기술길잡이 e-book 목록)
- `https://agro.seoul.go.kr/archives/category/cityfarm-c1/cityfarm_garden_c1/cityfarm_garden_info` (서울시 농업기술센터, 텃밭 작물 재배법)
- `https://agresearcher.maff.go.jp/` 및 관련 검색 결과 (일본 농림수산성 아그리서처)

---

## 2. 동반작물(companion planting)

### 방법
카탈로그 13종(감자·상추·강낭콩·열무·시금치·대파·당근·토마토·오이·고추, 관엽 3종 제외) + 바질을 대상으로, 공식 농업·원예 기관의 1차 출처가 "카탈로그 안의 두 작물"을 구체적으로 함께 언급한 조합만 채택했습니다. 관엽 3종(꽃다발·호접란·아프리칸 바이올렛)은 텃밭 동반작물 개념과 무관해 조사 대상에서 제외했습니다.

### 확인된 조합 (공식 출처 근거 있음)

| 조합 | 근거 | 출처 |
| --- | --- | --- |
| 토마토 + 바질 | "토마토 그루사이를 평소보다 넓게 하고 그 사이에 바질을 심으면, 토마토에 남아도는 수분을 바질이 잘 흡수할 수 있다."(열과 방지·충해 예방) | 농촌진흥청 보도자료, `https://www.rda.go.kr/board/board.do?mode=view&prgId=day_farmprmninfoEntry&dataNo=100000744525` (2018-04-10 게시) |
| 토마토 + 바질 (2차 확인) | "토마토와 바질을 함께 심으면 서로의 충해를 막을 수 있고... 수분을 좋아하는 바질과 함께 심으면 바질이 수분을 흡수하여 토마토가 터지는 것을 예방" | 농사로 큐레이션 "작지만 알찬 텃밭 꾸미려면 심을 작물들 궁합 먼저 보세요", `https://www.nongsaro.go.kr/portal/ps/psv/psvr/psvre/curationDtl.ps?menuId=PS03352&srchCurationNo=1678` (농촌진흥청, 2021-07-22 등록) |
| 대파 + 오이 | "파뿌리의 천연항생물질에 의해 오이의 덩굴쪼김병이 예방될 수 있다." | 농촌진흥청 보도자료(위와 동일 URL, 2018-04-10) |
| 대파 + 토마토 | "토마토나 수박 작물에 파나 마늘을 같이 심게 되면 파와 마늘의 뿌리에 공생하는 미생물에서 천연 항생물질이 나와 병해충 예방에 도움이 됩니다." | 농사로 큐레이션(위와 동일 URL, 2021-07-22) |
| 대파 + 시금치 | "시금치+파 등이 혼작에 좋습니다." (원문에 구체적인 작용 기전은 설명되어 있지 않음 — 조합 자체만 명시) | 농사로 큐레이션(위와 동일 URL, 2021-07-22) |

참고: 토마토+바질 조합은 학술적으로도 뒷받침됩니다. 2024년 *Plant Cell Reports* 논문("Companion basil plants prime the tomato wound response through volatile signaling in a mixed planting system", PMC11263239)은 바질의 휘발성 물질이 토마토의 상처 방어 반응(Pin2 발현)을 촉진한다는 것을 실험으로 확인했습니다. 다만 이는 "충해 예방" 기전에 대한 보강 증거이며, "맛이 좋아진다"는 통념은 RHS 등 다수 원예 자료가 "과학적 근거 없음"이라고 명시하므로 이 부분은 채택하지 않았습니다.

### 출처 불확실 (근거가 상충하거나 약함)

| 조합 | 이유 |
| --- | --- |
| 당근 + 대파(파류) | RHS 컴패니언 플랜팅 페이지: "The scent of onions has been claimed to make it harder for carrot fly to find the carrots"라고 언급하지만, 같은 페이지에서 "Many benefits are claimed for companion planting, and it is likely that all of these benefits do exist, but not for every crop in every instance"라며 효과를 단정하지 않습니다. 또한 1984년 인터크로핑 연구는 당근뿌리파리 피해 최대 65% 감소를 보고했지만, 원예 방송인 Geoff Hamilton의 대조 실험에서는 보호 효과가 없었다는 상반된 결과도 있어 근거가 상충합니다. 카탈로그의 대파(Allium fistulosum)는 RHS 원문의 "onions"(Allium cepa, 양파)와 같은 속(Allium)이지만 다른 종이라 정확히 일치하지도 않습니다. (RHS: `https://www.rhs.org.uk/advice/grow-your-own/features/companion-planting`) |

### 참고만 가능 (카탈로그 품종과 정확히 일치하지 않음 — 확인 필요)

| 내용 | 비고 |
| --- | --- |
| "오이잎벌레는 적환무의 매운 향을 싫어하기 때문에 적환무가 어느 정도 자란 후에 옆에 오이를 심으면 피해를 줄일 수 있다."(농촌진흥청 보도자료, 위 URL) | "적환무"는 붉은색 서양 무 품종으로, 카탈로그의 "열무"(어린 무, Raphanus sativus 품종 중 하나)와 품종이 다릅니다. 같은 무속(Raphanus)이라는 공통점은 있으나 이 문장을 열무+오이 조합의 근거로 그대로 쓰기엔 품종 불일치 문제가 있어 채택하지 않았습니다. |
| "파: 무, 풋콩, 결구채소와 같이 심으면 안됨"(같은 보도자료) | 카탈로그의 열무(무 계열)·강낭콩(콩과, 풋콩과 유사하나 동일 품종 아님)과 느슨하게 관련되지만 정확한 품종이 명시되지 않아 "대파+열무" 또는 "대파+강낭콩" 상극 조합으로 단정하지 않았습니다. |

---

## 3. 작물 재배 단계 가이드 (5단계)

**참고**: 이 항목은 텍스트(단계 이름 + 한 줄 설명 + 출처)만 다룹니다. **사진 자체는 별도 촬영/구매 라이선스가 필요해 이 리서치 범위 밖입니다.** 이 앱의 기존 작물 이미지는 `frontend/public/figma/`의 디자인팀 제공 자산이며, 웹 이미지를 그대로 가져오면 저작권 문제가 발생합니다.

### 바질
출처: RHS "How to grow basil", `https://www.rhs.org.uk/herbs/basil/grow-your-own`

| 단계 | 한 줄 설명(출처 원문 발췌) |
| --- | --- |
| 1. 씨앗 파종 | "Scatter the seeds thinly on the surface" of moist seed compost, kept around 20°C. |
| 2. 발아·유묘 관리 | 씨앗을 뿌린 뒤 "warm, bright location, such as on a windowsill"에 두고 "water regularly but avoid overwatering." |
| 3. 본잎 성장(옮겨심기) | "When the seedlings have several leaves, move them into their own 7.5cm (3in) pot." |
| 4. 순지르기 | 꽃대가 보이는 즉시 "remove any flower stems as soon as you spot them"하여 잎 생산을 늘림. |
| 5. 수확 | "Pick the tips of the shoots regularly, to keep basil plants bushy and productive." 여름 내내 필요한 만큼 수확 가능. |

### 토마토
출처: 농사로(농촌진흥청) 작업일정 안내 "토마토,방울토마토", `https://www.nongsaro.go.kr/portal/ps/psb/psbl/workScheduleDtl.ps?menuId=PS00087&cntntsNo=30646&sKidofcomdtySeCode=VC`

| 단계 | 한 줄 설명(출처 원문 발췌) |
| --- | --- |
| 1. 씨앗 파종 | "씨뿌림시기는 아주심기일을 기준으로 결정"하며 육묘 기간은 재배 방식에 따라 40~65일. |
| 2. 발아·유묘 관리 | 출처에 없음 — 확인 필요 (이 페이지는 좋은 묘의 기준만 제시: "초형이 직사각형이고 꽃이 정상적으로 발달", "잎은 두껍고 흐늘거리지 않음"). |
| 3. 본잎 성장(정식/아주심기) | "아주심기 후 기온과 토양온도가 묘의 활착에 큰 영향을 줌", 심는 거리는 "보통재배 100×40cm". |
| 4. 순지르기(곁순 제거) | "순지르기는 수확종료 예정일 약 50일 전에 마지막으로 수확할 화방 위의 잎 2~3매를 남기고 실시"하며 "곁가지는 맑은 날 오전에 해야 상처회복이 빠름". |
| 5. 수확 | 작형별로 시기가 다름(예: 촉성재배 "1월 중순~5월 상순"). 카탈로그 데이터(파종 5월 초·수확 6월 말~)는 `nongsaro-beginner-garden-manual`(초보자 텃밭 매뉴얼) 기준이며 이 작업일정 페이지의 전문 재배력과는 작형이 다름. |

### 상추
출처: 농사로(농촌진흥청) 작업일정 안내 "상추", `https://www.nongsaro.go.kr/portal/ps/psb/psbl/workScheduleDtl.ps?menuId=PS00087&cntntsNo=30624`

| 단계 | 한 줄 설명(출처 원문 발췌) |
| --- | --- |
| 1. 씨앗 파종 | "씨앗량 : 0.4~0.6㎗/10a", "파종상 : 3.3㎡/10a(200공 플러그 모 기르기 시 40㎡/10a)". |
| 2. 발아·유묘 관리 | "플러그트레이(128공, 200공) : 본잎 3~4매 시"까지 육묘. |
| 3. 본잎 성장(솎기) | 출처에 없음 — 확인 필요 (이 페이지에는 솎기 단계에 대한 명시적 설명이 없음. 다른 검색 결과 요약에는 "파종 후 7~10일 발아, 잘 자란 것만 남기고 나머지는 솎아준다"는 문장이 있었으나 원문 페이지를 직접 확인하지 못해 이 문서에는 출처 미확정으로 표시). |
| 4. 정식 | "시기 : 본엽 3~5매(플러그 묘)", "이랑 너비 : 150~180cm", "포기 사이 : 20×20cm 내외". |
| 5. 수확 | "표준출하규격 지켜서 수확물 포장", "저온저장고 이용 : 0℃". 카탈로그 데이터(파종 4월 초~말·수확 5월 중순~6월 말)는 `nongsaro-beginner-garden-manual` 기준이며 이 작업일정 페이지는 전문 재배력 기준이라 시기 표현이 다름. |

---

## 참고: 이번에 확인한 URL 목록

- `https://www.rhs.org.uk/herbs/basil/grow-your-own` (바질 재배)
- `https://www.rhs.org.uk/advice/grow-your-own/features/companion-planting` (컴패니언 플랜팅 원칙·당근-양파 불확실성)
- `https://www.rda.go.kr/board/board.do?mode=view&prgId=day_farmprmninfoEntry&dataNo=100000744525` (농촌진흥청 보도자료, 동반식물)
- `https://www.nongsaro.go.kr/portal/ps/psv/psvr/psvre/curationDtl.ps?menuId=PS03352&srchCurationNo=1678` (농사로 큐레이션, 작물 궁합)
- `https://www.nongsaro.go.kr/portal/ps/psb/psbl/workScheduleDtl.ps?menuId=PS00087&cntntsNo=30646&sKidofcomdtySeCode=VC` (농사로 토마토 작업일정)
- `https://www.nongsaro.go.kr/portal/ps/psb/psbl/workScheduleDtl.ps?menuId=PS00087&cntntsNo=30624` (농사로 상추 작업일정)
- 학술 참고: PMC11263239, *Plant Cell Reports* (2024), "Companion basil plants prime the tomato wound response through volatile signaling in a mixed planting system"
