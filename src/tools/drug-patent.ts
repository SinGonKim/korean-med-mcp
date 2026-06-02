import { z } from "zod"
import { callPublicApiXml, getDataGoKrKey } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const SearchDrugPatentSchema = z.object({
  ingrName: z.string().describe(
    "의약품 성분명 (예: '아세트아미노펜', '이부프로펜', '암로디핀')"
  ),
  pageNo: z.number().int().positive().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(10).default(5).describe("결과 개수"),
})

function xmlGet(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function formatPatentItems(xml: string): string {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  if (itemMatches.length === 0) return "검색 결과가 없습니다."

  return itemMatches.map((m, i) => {
    const raw = m[1]
    const lines = [
      `${i + 1}. ${xmlGet(raw, "ITEM_NAME")} (${xmlGet(raw, "ENTP_NAME")})`,
      `   성분: ${xmlGet(raw, "INGR_NAME")} / ${xmlGet(raw, "INGR_ENG_NAME")}`,
      `   특허구분: ${xmlGet(raw, "PAGE_GB_NM")} — ${xmlGet(raw, "PATENT_GB_CODE")}`,
    ]
    const invn = xmlGet(raw, "DOMESTIC_INVN_NM")
    if (invn) lines.push(`   발명명칭: ${invn}`)
    const patentee = xmlGet(raw, "PATENTEE")
    if (patentee) lines.push(`   특허권자: ${patentee}`)
    const patentNo = xmlGet(raw, "DOMESTIC_PATENT_NO")
    const status = xmlGet(raw, "DOMESTIC_PATENT_STATUS")
    const endDate = xmlGet(raw, "DOMESTIC_END_DATE")
    if (patentNo) lines.push(`   특허번호: ${patentNo} [${status}] 만료: ${endDate || "-"}`)
    return lines.join("\n")
  }).join("\n\n")
}

export const searchDrugPatentTool: McpTool = {
  name: "search_drug_patent",
  description: "의약품 성분명으로 국내 의약품 특허정보(제품특허, 물질특허, 만료일)를 조회합니다.",
  schema: SearchDrugPatentSchema,
  handler: async (rawInput) => {
    const input = SearchDrugPatentSchema.parse(rawInput)
    const cacheKey = `patent:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const xml = await callPublicApiXml(
      "/1471000/MdcinPatentInfoService2/getMdcinPatentInfoList2",
      serviceKey,
      { ingr_name: input.ingrName, pageNo: input.pageNo, numOfRows: input.numOfRows }
    )

    // totalCount 확인
    const totalMatch = xml.match(/<totalCount>(\d+)<\/totalCount>/)
    const total = totalMatch ? parseInt(totalMatch[1]) : 0

    if (total === 0) {
      return {
        content: [{
          type: "text",
          text: `의약품 특허 검색 결과 없음 — "${input.ingrName}"\n다른 성분명으로 시도해보세요.${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    const body = formatPatentItems(xml)
    const result =
      `의약품 특허정보 — "${input.ingrName}" (총 ${total}건)\n\n` +
      body +
      `\n\n출처: 식품의약품안전처 의약품 특허정보` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}
