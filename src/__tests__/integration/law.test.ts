import { describe, it, expect } from "vitest"
import { searchMedicalLaw, searchMedicalPrecedent } from "../../legal/client.js"

const SKIP = !process.env.MEDI_LAW_KEY && !process.env.LAW_OC && !process.env.KOREAN_LAW_API_KEY

describe.skipIf(SKIP)("법제처 API integration", () => {
  it("finds 응급의료에 관한 법률", async () => {
    const { laws } = await searchMedicalLaw({ query: "응급의료에 관한 법률" })
    expect(laws.length).toBeGreaterThanOrEqual(1)
    expect(laws[0].lawName).toContain("응급의료")
    expect(laws[0].mst).toBeTruthy()
  }, 15_000)

  it("finds medical malpractice precedents", async () => {
    const precedents = await searchMedicalPrecedent({ query: "의료", display: 3 })
    expect(precedents.length).toBeGreaterThanOrEqual(1)
    expect(precedents[0]).toHaveProperty("caseNo")
    expect(precedents[0]).toHaveProperty("decisionDate")
  }, 15_000)
})
