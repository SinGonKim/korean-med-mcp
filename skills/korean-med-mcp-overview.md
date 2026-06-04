# Korean Med MCP Tool Skills Overview

이 문서는 `korean-med-mcp`의 API tool을 사용할 때 공통으로 따라야 할 원칙과 tool 선택 기준을 정리한다.

## 공통 원칙

- 이 서버의 모든 의료 정보는 공공 데이터 기반 참고 정보다. 진단, 처방, 응급 판단을 단정하지 말고 의료 전문가 상담을 안내한다.
- 사용자가 증상, 약물 복용, 응급 상황을 말하면 정보 조회와 함께 "의사의 진단·처방을 대체하지 않는다"는 점을 분명히 한다.
- 응급실 병상, 병원 전화번호, 약국 정보는 실제 방문 전 전화 확인을 권한다.
- 법령·판례 결과는 법률 자문이 아니라 공개 법령 데이터 조회 결과로 설명한다.
- API 키가 필요한 tool은 환경변수 설정과 data.go.kr 서비스 활용신청 상태에 영향을 받는다.

## API 키

| 환경변수 | 사용처 | 필요한 tool |
| --- | --- | --- |
| `DATA_GO_KR_API_KEY` | 공공데이터포털, 국가암정보센터 API | 병원, 약국, 응급실, 의약품, 의약품 특허, 의약품 사용량, 암 정보 |
| `LAW_OC` | 법제처 공개 API | 의료법령, 판례, 행정심판례 |

공공데이터포털 서비스는 인증키 발급과 서비스별 활용신청이 분리되어 있다. 특정 tool만 실패하면 해당 서비스 활용신청 승인 상태를 먼저 확인한다.

## Tool 선택 빠른 기준

| 사용자 요청 | 우선 tool |
| --- | --- |
| 병원명, 지역, 진료기관 연락처, 종별 검색 | `find_hospital` |
| 약국명, 지역 약국 검색 | `find_pharmacy` |
| 현재 응급실 병상, 지역 응급실 현황 | `get_er_status` |
| 약 이름의 효능, 용법, 주성분, 주의사항 | `search_drug` |
| 알약 모양, 색상, 각인으로 약 식별 | `identify_pill` |
| 성분명의 의약품 특허, 특허 만료일 | `search_drug_patent` |
| 특정 진료년월의 지역별 성분 사용량 | `get_drug_usage_by_area` |
| 특정 진료년월의 상병별 성분 사용량 | `get_drug_usage_by_disease` |
| 의료법, 약사법, 응급의료법 등 조문 | `search_medical_law` with `searchType: "law"` |
| 의료 관련 판례 | `search_medical_law` with `searchType: "precedent"` |
| 의료 관련 행정심판례 | `search_medical_law` with `searchType: "admin_appeal"` |
| 암 종류별 증상, 원인, 치료 정보 | `search_cancer_info` |
| 암 예방, 국가암검진 | `get_cancer_prevention` |
| 암 관련 FAQ | `search_cancer_faq` |
| 암 관련 의학 용어 | `search_cancer_dictionary` |
| 암 발생률, 생존율, 사망률 | `get_cancer_statistics` |
| 암환자 생활, 영양, 운동, 정서 관리 | `get_cancer_life_guide` |

## 캐시 특성

| 데이터 | 캐시 |
| --- | --- |
| 응급실 실시간 현황 | 2분 |
| 병원, 약국, 의약품, 의약품 특허, 사용량, 암 정보 | 6시간 |
| 법령 데이터 | 코드상 TTL 상수는 24시간이나 현재 `search_medical_law` tool 내부 캐시는 별도로 적용되어 있지 않다. |

## 응답 작성 방식

- 조회 결과의 출처를 함께 언급한다.
- 결과가 없으면 검색어를 더 넓히거나 공식 명칭, 성분명, 지역명을 바꿔 재시도하도록 안내한다.
- 복용량, 투약 중단, 약물 병용 가능 여부처럼 임상 판단이 필요한 질문에는 tool 결과를 근거로 단정하지 않는다.
- 응급 증상이나 즉각적인 위해 가능성이 있으면 지역 응급 전화, 119, 응급실 방문 같은 즉시 대응을 우선 안내한다.

