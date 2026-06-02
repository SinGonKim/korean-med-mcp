import { describe, it, expect } from "vitest"
import { callPublicApiXml, getDataGoKrKey } from "../../lib/public-api-client.js"

const SKIP = !process.env.DATA_GO_KR_API_KEY

function xmlGet(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function parseItems(xml: string): Record<string, string>[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const raw = m[1]
    return { yadmNm: xmlGet(raw, "yadmNm"), addr: xmlGet(raw, "addr"), telno: xmlGet(raw, "telno") }
  })
}

describe.skipIf(SKIP)("HIRA API — find_hospital integration", () => {
  it("returns hospitals for 삼성서울병원", async () => {
    const key = getDataGoKrKey()
    const xml = await callPublicApiXml(
      "/B551182/hospInfoServicev2/getHospBasisList",
      key,
      { yadmNm: "삼성서울병원", pageNo: 1, numOfRows: 3 }
    )
    const items = parseItems(xml)
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items[0].yadmNm).toBeTruthy()
    expect(items[0].addr).toBeTruthy()
  }, 15_000)

  it("returns pharmacies for 강남", async () => {
    const key = getDataGoKrKey()
    const xml = await callPublicApiXml(
      "/B551182/pharmacyInfoService/getParmacyBasisList",
      key,
      { yadmNm: "강남", pageNo: 1, numOfRows: 3 }
    )
    const items = parseItems(xml)
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items[0].yadmNm).toBeTruthy()
  }, 15_000)
})
