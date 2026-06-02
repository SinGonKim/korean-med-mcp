export interface Hospital {
  yadmNm: string       // 병원명
  addr: string         // 주소
  telno: string        // 전화번호
  clCdNm: string       // 종별명 (상급종합, 종합병원, 병원, 의원 등)
  dgsbjtCdNm: string   // 진료과목
  hvWeek: string       // 평일 운영시간
  hvSat: string        // 토요일 운영시간
  hvSun: string        // 일요일 운영시간
  XPos: string         // 경도
  YPos: string         // 위도
}

export interface Pharmacy {
  yadmNm: string
  addr: string
  telno: string
  hvWeek: string
  hvSat: string
  hvSun: string
}

export interface ErStatus {
  dutyName: string     // 응급실명
  dutyAddr: string     // 주소
  dutyTel1: string     // 대표전화
  dutyTel3: string     // 응급실 직통전화
  hvec: string         // 가용 일반 병상
  hvoc: string         // 가용 중환자 병상
  hvcc: string         // 가용 흉부 중환자 병상
  hvncc: string        // 가용 신생아 중환자 병상
  hvpcbas: string      // 가용 소아 중환자 병상
  hvidate: string      // 입력 일시
}

export interface Drug {
  itemName: string       // 제품명
  entpName: string       // 업체명
  itemSeq: string        // 품목기준코드
  chart: string          // 성상
  efcyQesitm: string     // 효능·효과
  useMethodQesitm: string // 용법·용량
  atpnWarnQesitm: string  // 경고
  atpnQesitm: string     // 주의사항
  intrcQesitm: string    // 상호작용
  seQesitm: string       // 부작용
  depositMethodQesitm: string // 보관방법
}

export interface Pill {
  itemName: string
  entpName: string
  itemImage: string
  printFront: string
  printBack: string
  drugShape: string
  colorClass1: string
  lineFront: string
  lineBack: string
  formCodeName: string
  classNoName: string
}

export interface DurItem {
  typeName: string        // DUR 유형명 (병용금기, 연령금기 등)
  itemName: string        // 의약품명
  mixture: string         // 병용 의약품명 (병용금기인 경우)
  prohbtContent: string   // 금기 내용
  remark: string          // 비고
}

export interface LawSearchResult {
  lawId: string
  lawName: string
  lawType: string
  enforcementDate: string
  url: string
}

export interface LawArticle {
  lawName: string
  articleNo: string
  articleTitle: string
  articleContent: string
  enforcementDate: string
  url: string
}

export class MissingApiKeyError extends Error {
  constructor(keyName: string, apiSource: string, guide: string) {
    super(
      `환경변수 ${keyName}가 설정되지 않았습니다.\n` +
      `API 출처: ${apiSource}\n` +
      `발급 방법: ${guide}`
    )
    this.name = "MissingApiKeyError"
  }
}
