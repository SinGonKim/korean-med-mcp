import { describe, it, expect } from "vitest"
import { parseLawSearchXml, parsePrecedentXml } from "../../legal/xml-parser.js"

const SAMPLE_LAW_XML = `<?xml version="1.0" encoding="UTF-8"?>
<LawSearch>
  <totalCnt>1</totalCnt>
  <law>
    <법령ID>001945</법령ID>
    <법령명한글>의료법</법령명한글>
    <법령구분명>법률</법령구분명>
    <시행일자>20230101</시행일자>
    <공포일자>20221227</공포일자>
    <법령일련번호>183698</법령일련번호>
  </law>
</LawSearch>`

const SAMPLE_PREC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<PrecSearch>
  <totalCnt>1</totalCnt>
  <prec>
    <사건번호>2021다123456</사건번호>
    <사건명>손해배상(의)</사건명>
    <법원명>대법원</법원명>
    <선고일자>20230315</선고일자>
    <판시사항>의사의 설명의무 위반으로 인한 손해배상 책임</판시사항>
    <참조조문>의료법 제24조의2</참조조문>
    <판례일련번호>987654</판례일련번호>
  </prec>
</PrecSearch>`

describe("parseLawSearchXml", () => {
  it("parses law items correctly", () => {
    const results = parseLawSearchXml(SAMPLE_LAW_XML)
    expect(results).toHaveLength(1)
    expect(results[0].lawName).toBe("의료법")
    expect(results[0].lawType).toBe("법률")
    expect(results[0].mst).toBe("183698")
    expect(results[0].enforcementDate).toBe("20230101")
  })

  it("returns empty array for empty XML", () => {
    const results = parseLawSearchXml("<LawSearch><totalCnt>0</totalCnt></LawSearch>")
    expect(results).toHaveLength(0)
  })
})

describe("parsePrecedentXml", () => {
  it("parses precedent items correctly", () => {
    const results = parsePrecedentXml(SAMPLE_PREC_XML)
    expect(results).toHaveLength(1)
    expect(results[0].caseNo).toBe("2021다123456")
    expect(results[0].court).toBe("대법원")
    expect(results[0].decisionDate).toBe("20230315")
    expect(results[0].precedentId).toBe("987654")
  })

  it("returns empty array for empty XML", () => {
    const results = parsePrecedentXml("<PrecSearch><totalCnt>0</totalCnt></PrecSearch>")
    expect(results).toHaveLength(0)
  })
})
