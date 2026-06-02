import { z } from "zod"
import { callPublicApiXml, getDataGoKrKey } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const FindPharmacySchema = z.object({
  keyword: z.string().describe(
    "검색어: 약국명 또는 지역명 포함 (예: '강남약국', '강남', '역삼동')"
  ),
  pageNo: z.number().int().positive().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(20).default(10).describe("결과 개수"),
})

function xmlGet(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function parsePharmacyXml(xml: string): Record<string, string>[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const raw = m[1]
    const fields = ["yadmNm", "addr", "telno", "sidoCdNm", "sgguCdNm"]
    const obj: Record<string, string> = {}
    for (const f of fields) obj[f] = xmlGet(raw, f)
    return obj
  })
}

function formatPharmacies(items: Record<string, string>[]): string {
  if (items.length === 0) return "검색 결과가 없습니다."
  return items.map((p, i) => {
    const lines = [
      `${i + 1}. ${p.yadmNm || "-"}`,
      `   주소: ${p.addr || "-"}`,
      `   전화: ${p.telno || "-"}`,
      `   지역: ${p.sidoCdNm || "-"} ${p.sgguCdNm || "-"}`,
    ]
    return lines.join("\n")
  }).join("\n\n")
}

export const findPharmacyTool: McpTool = {
  name: "find_pharmacy",
  description: "약국명 또는 지역명 키워드로 전국 약국을 검색합니다.",
  schema: FindPharmacySchema,
  handler: async (rawInput) => {
    const input = FindPharmacySchema.parse(rawInput)
    const cacheKey = JSON.stringify(input)
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const xml = await callPublicApiXml(
      "/B551182/pharmacyInfoService/getParmacyBasisList",
      serviceKey,
      {
        yadmNm: input.keyword,
        pageNo: input.pageNo,
        numOfRows: input.numOfRows,
      }
    )

    const items = parsePharmacyXml(xml)
    const body = formatPharmacies(items)
    const result =
      `약국 검색 결과 — "${input.keyword}"\n\n` +
      body +
      `\n\n출처: 건강보험심사평가원 약국정보서비스` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.PHARMACY)
    return { content: [{ type: "text", text: result }] }
  },
}
