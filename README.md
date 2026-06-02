# korean-med-mcp

[![npm version](https://img.shields.io/npm/v/korean-med-mcp)](https://www.npmjs.com/package/korean-med-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Data: HIRA](https://img.shields.io/badge/data-HIRA-blue)](https://www.hira.or.kr)
[![Data: MFDS](https://img.shields.io/badge/data-MFDS-green)](https://www.mfds.go.kr)
[![Data: 국가암정보센터](https://img.shields.io/badge/data-국가암정보센터-red)](https://www.cancer.go.kr)
[![Data: 법제처](https://img.shields.io/badge/data-법제처-purple)](https://www.law.go.kr)

> 한국 공공 의료 OpenAPI를 하나의 MCP 서버로 통합. 병원·약국 찾기, 응급실 실시간 현황, 의약품 정보, 의약품 특허·사용통계, 의료법령·판례, 암 정보까지.

---

## 데모

```
사용자: 지금 서울 응급실에 자리 있어?
Claude: (get_er_status 호출) 서울 응급실 실시간 현황입니다...
         🟢 서울대학교병원 응급의료센터 — 일반 병상 12개 가용 중
         🟢 삼성서울병원 응급의료센터 — 일반 병상 8개 가용 중
         🔴 연세대학교 세브란스병원 — 현재 병상 없음

사용자: 강남에 있는 삼성서울병원 전화번호 알려줘
Claude: (find_hospital 호출) 삼성서울병원 검색 결과...
         1. 삼성서울병원 (상급종합)
            주소: 서울특별시 강남구 일원로 81
            전화: 02-3410-2114

사용자: 응급실에서 진료 거부하면 불법이야?
Claude: (search_medical_law 호출) 응급의료에 관한 법률 제6조에 따르면...
         응급의료기관은 정당한 사유 없이 응급환자의 진료를 거부할 수 없습니다.

사용자: 갑상선암 증상이 뭐야?
Claude: (search_cancer_info 호출) 국가암정보센터 갑상선암 정보...
         갑상선암은 초기에 특별한 증상이 없는 경우가 많습니다...
```

---

## 빠른 시작

### 1단계: API 키 발급

**필요한 키: 2개**

| 환경변수 | 발급처 | 용도 |
|---------|-------|------|
| `DATA_GO_KR_API_KEY` | [data.go.kr](https://www.data.go.kr) | 병원·약국·응급실·의약품·암정보 도구 전체 |
| `LAW_OC` | [open.law.go.kr](https://open.law.go.kr/LSO/openApi/guideResult.do) | 의료법령·판례 검색 |

발급 방법은 아래 **[API 키 발급 상세 가이드](#api-키-발급-상세-가이드)** 참조.

### 2단계: Claude Desktop 설정

`claude_desktop_config.json` 파일을 열어 아래 내용을 추가합니다.

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "korean-med-mcp": {
      "command": "npx",
      "args": ["-y", "korean-med-mcp"],
      "env": {
        "DATA_GO_KR_API_KEY": "여기에_발급받은_키_입력",
        "LAW_OC": "여기에_법제처_OC명_입력"
      }
    }
  }
}
```

### 3단계: Claude Desktop 재시작

재시작 후 Claude와 대화하면 자동으로 도구를 인식합니다.

---

## API 키 발급 상세 가이드

### DATA_GO_KR_API_KEY — 공공데이터포털

모든 의료 데이터 도구(응급실, 병원, 약국, 의약품, 암정보)가 이 키를 사용합니다.

#### 키 발급 (1회)

1. [data.go.kr](https://www.data.go.kr) 접속 → 회원가입 또는 로그인
2. 우측 상단 **마이페이지** → **인증키 관리**
3. **일반 인증키** 항목에서 키 확인 (자동 발급되어 있음)
4. 해당 키를 `DATA_GO_KR_API_KEY`에 입력

#### 서비스별 활용신청 (도구별로 별도 승인 필요)

공공데이터포털은 **키 발급과 서비스 활용신청이 분리**되어 있습니다. 키가 있어도 각 서비스에 별도로 활용신청 후 승인을 받아야 해당 API를 호출할 수 있습니다. 승인은 보통 즉시~수 시간 내에 처리됩니다.

아래 서비스를 [data.go.kr](https://www.data.go.kr) 에서 검색 후 **"활용신청"** 버튼을 클릭하세요.

##### 건강보험심사평가원 (HIRA) — `find_hospital`, `find_pharmacy`, `get_drug_usage_by_area`, `get_drug_usage_by_disease`

| 서비스명 | 검색 키워드 | 필요 도구 |
|---------|-----------|---------|
| 건강보험심사평가원_병원정보서비스 v2 | `병원정보서비스` | `find_hospital` |
| 건강보험심사평가원_약국정보서비스 | `약국정보서비스` | `find_pharmacy` |
| 건강보험심사평가원_의약품사용정보조회서비스 v1.2 | `의약품사용정보조회` | `get_drug_usage_by_area`, `get_drug_usage_by_disease` |

> **활용신청 경로**: data.go.kr 로그인 → 검색창에 서비스명 입력 → 해당 서비스 클릭 → **"활용신청"** 버튼

##### 국립중앙의료원 — `get_er_status`

| 서비스명 | 검색 키워드 | 필요 도구 |
|---------|-----------|---------|
| 국립중앙의료원_전국응급의료기관정보조회서비스 | `응급의료기관정보` | `get_er_status` |

##### 식품의약품안전처 (MFDS) — `search_drug`, `identify_pill`, `search_drug_patent`

| 서비스명 | 검색 키워드 | 필요 도구 |
|---------|-----------|---------|
| 식품의약품안전처_의약품 제품 허가정보 | `의약품제품허가정보` | `search_drug` |
| 식품의약품안전처_의약품 낱알식별 정보 | `낱알식별` | `identify_pill` |
| 식품의약품안전처_의약품특허정보서비스 | `의약품특허정보` | `search_drug_patent` |

##### 국가암정보센터 — 암 관련 6개 도구

cancer.go.kr API는 **별도 활용신청 없이** `DATA_GO_KR_API_KEY`로 바로 사용 가능합니다.

---

### LAW_OC — 법제처 공개 API

`search_medical_law` 도구(법령·판례·행정심판례 검색)에만 사용합니다.

#### 발급 방법

1. [open.law.go.kr](https://open.law.go.kr/LSO/openApi/guideResult.do) 접속
2. **오픈API 신청** 메뉴 클릭
3. 사용 용도 입력 후 신청
4. 승인 완료 후 발급받은 **OC(Open API 사용자 코드)** 를 `LAW_OC`에 입력

> OC는 영문+숫자로 구성된 식별자입니다. 이메일로 통보되며 즉시 사용 가능한 경우가 많습니다.

---

## 도구 목록 (15개)

### 병원·약국·응급실

| 도구 | 설명 | 예시 질의 | 필요 서비스 |
|------|-----|---------|-----------|
| `find_hospital` | 병원명·지역명으로 병원 검색 (주소·전화·종별) | "강남 세브란스병원 전화번호" | HIRA 병원정보서비스 v2 |
| `find_pharmacy` | 약국명·지역명으로 약국 검색 | "역삼동 약국 찾아줘" | HIRA 약국정보서비스 |
| `get_er_status` | 응급실 실시간 가용 병상 현황 | "지금 서울 응급실 자리 있어?" | 국립중앙의료원 응급의료정보 |

### 의약품

| 도구 | 설명 | 예시 질의 | 필요 서비스 |
|------|-----|---------|-----------|
| `search_drug` | 의약품 허가정보 (효능·용법·주의사항) | "타이레놀 부작용 알려줘" | MFDS 의약품제품허가정보 |
| `identify_pill` | 모양·색상·각인으로 알약 식별 | "흰색 타원형 각인 ER 무슨 약?" | MFDS 낱알식별정보 |
| `search_drug_patent` | 성분명으로 의약품 특허정보 조회 | "아세트아미노펜 특허 만료일" | MFDS 의약품특허정보 |
| `get_drug_usage_by_area` | 진료년월별 성분별 지역별 사용량·금액 | "2024년 메트포르민 서울 처방량" | HIRA 의약품사용정보 |
| `get_drug_usage_by_disease` | 진료년월별 성분별 상병별 사용량·금액 | "당뇨 치료에 가장 많이 쓰이는 약" | HIRA 의약품사용정보 |

### 의료법령

| 도구 | 설명 | 예시 질의 | 필요 서비스 |
|------|-----|---------|-----------|
| `search_medical_law` | 의료법령 조문·판례·행정심판례 검색 | "응급실 진료거부 위법이야?" | 법제처 공개 API (LAW_OC) |

`searchType` 파라미터:
- `"law"` (기본값) — 의료법, 응급의료에 관한 법률, 약사법 등 조문 검색
- `"precedent"` — 법원 판례
- `"admin_appeal"` — 행정심판례

`articleNo` 파라미터: 특정 조문 전문 조회 (예: `"제15조"`)

### 암 정보 (국가암정보센터)

| 도구 | 설명 | 예시 질의 |
|------|-----|---------|
| `search_cancer_info` | 암 종류별 개요·원인·증상·치료 | "갑상선암 증상이 뭐야?" |
| `get_cancer_prevention` | 암 예방법과 국가암검진 안내 | "위암 예방하려면?" |
| `search_cancer_faq` | 암 관련 자주 묻는 질문 | "항암치료 부작용이 뭐야?" |
| `search_cancer_dictionary` | 암 관련 의학 용어 사전 | "면역항암제가 뭐야?" |
| `get_cancer_statistics` | 암 발생률·생존율·사망률 통계 | "한국 암 발생률 알려줘" |
| `get_cancer_life_guide` | 암환자 생활백서 (영양·운동·정서) | "암 생존자 식단 관리법" |

> 암 정보 6개 도구는 별도 활용신청 없이 `DATA_GO_KR_API_KEY`만으로 바로 사용 가능합니다.

---

## 도구별 필요 키 요약

| 도구 | DATA_GO_KR_API_KEY | LAW_OC | 추가 활용신청 |
|------|:-----------------:|:------:|:----------:|
| `find_hospital` | ✅ | | HIRA 병원정보서비스 v2 |
| `find_pharmacy` | ✅ | | HIRA 약국정보서비스 |
| `get_er_status` | ✅ | | 국립중앙의료원 응급의료정보 |
| `search_drug` | ✅ | | MFDS 의약품제품허가정보 |
| `identify_pill` | ✅ | | MFDS 낱알식별정보 |
| `search_drug_patent` | ✅ | | MFDS 의약품특허정보 |
| `get_drug_usage_by_area` | ✅ | | HIRA 의약품사용정보 |
| `get_drug_usage_by_disease` | ✅ | | HIRA 의약품사용정보 |
| `search_medical_law` | | ✅ | — |
| 암 정보 6개 도구 | ✅ | | — (신청 불필요) |

---

## 로컬 개발

```bash
git clone https://github.com/SinGonKim/korean-med-mcp
cd korean-med-mcp
npm install
npm run build
```

환경변수 설정:

```bash
cp .env.example .env
# .env 파일을 열어 발급받은 키 입력
```

```bash
# 유닛 테스트
npm test

# 통합 테스트 (API 키 필요)
source .env && npm run test:integration

# MCP Inspector로 대화형 테스트
npm run inspect
```

---

## 트러블슈팅

### `공공데이터포털 서비스 미활성` 오류

data.go.kr에서 해당 서비스의 활용신청이 완료되지 않은 상태입니다.

1. [data.go.kr](https://www.data.go.kr) 로그인
2. **마이페이지** → **활용신청 현황** 에서 승인 여부 확인
3. 미신청 상태라면 위 **서비스별 활용신청** 섹션을 참고해 신청

### `법제처 API가 HTML 에러 페이지를 반환` 오류

`LAW_OC` 값이 잘못되었거나 만료된 경우입니다. [open.law.go.kr](https://open.law.go.kr) 에서 OC를 재확인하세요.

### 응답이 매우 느린 경우 (HIRA 서비스)

건강보험심사평가원 API는 응답이 수 초 걸리는 경우가 있습니다. 타임아웃 오류 시 잠시 후 재시도하세요.

---

## 면책 조항

이 MCP 서버가 제공하는 모든 의료 정보는 **공공 데이터 기반 참고 정보**입니다.
의사의 진단, 처방, 치료를 대체하지 않습니다.
건강 문제는 반드시 의료 전문가와 상담하세요.

---

## Powered by korean-med-mcp 배지

이 MCP를 기반으로 프로젝트를 만드셨다면 배지를 사용해주세요:

```markdown
[![Powered by korean-med-mcp](https://img.shields.io/badge/Powered%20by-korean--med--mcp-blue)](https://github.com/SinGonKim/korean-med-mcp)
```

---

## 로드맵

- **이터레이션 2**: 감염병 현황, 예방접종 일정, 진료비용 비교, 의료과오 판례 강화
- **이터레이션 3**: 건강검진기관, 암검진, 정신건강센터, 건강기능식품, 주간 자동 리포트

---

## 라이선스

MIT
