import { z } from "zod"
import { callPublicApiXml, getDataGoKrKey } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const HOSPITAL_TYPE_MAP: Record<string, string> = {
  "01": "상급종합",
  "11": "종합병원",
  "21": "병원",
  "28": "요양병원",
  "29": "정신병원",
  "31": "의원",
  "41": "치과병원",
  "51": "치과의원",
  "61": "조산원",
  "71": "보건소",
  "72": "보건지소",
}

const FindHospitalSchema = z.object({
  keyword: z.string().describe(
    "검색어: 병원명 또는 지역명 포함 (예: '강남세브란스', '삼성서울병원', '강남 정형외과')"
  ),
  hospitalType: z.string().optional().describe(
    "종별코드 (01=상급종합, 11=종합병원, 21=병원, 28=요양병원, 31=의원, 41=치과병원)"
  ),
  pageNo: z.number().int().positive().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(20).default(10).describe("결과 개수"),
})

function xmlGet(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function parseHospitalXml(xml: string): Record<string, string>[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const raw = m[1]
    const fields = ["yadmNm", "addr", "telno", "clCdNm", "drTotCnt", "hospUrl"]
    const obj: Record<string, string> = {}
    for (const f of fields) obj[f] = xmlGet(raw, f)
    return obj
  })
}

function formatHospitals(items: Record<string, string>[]): string {
  if (items.length === 0) return "검색 결과가 없습니다."
  return items.map((h, i) => {
    const lines = [
      `${i + 1}. ${h.yadmNm || "-"} (${h.clCdNm || "-"})`,
      `   주소: ${h.addr || "-"}`,
      `   전화: ${h.telno || "-"}`,
    ]
    if (h.drTotCnt) lines.push(`   총 의사수: ${h.drTotCnt}명`)
    if (h.hospUrl) lines.push(`   홈페이지: ${h.hospUrl}`)
    return lines.join("\n")
  }).join("\n\n")
}

export const findHospitalTool: McpTool = {
  name: "find_hospital",
  description: "병원명 또는 지역명 키워드로 전국 병원·의원·종합병원을 검색합니다. 종별(상급종합·종합병원·의원 등) 필터도 지원합니다.",
  schema: FindHospitalSchema,
  handler: async (rawInput) => {
    const input = FindHospitalSchema.parse(rawInput)
    const cacheKey = JSON.stringify(input)
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const params: Record<string, string | number> = {
      yadmNm: input.keyword,
      pageNo: input.pageNo,
      numOfRows: input.numOfRows,
    }
    if (input.hospitalType) params.clCd = input.hospitalType

    const xml = await callPublicApiXml(
      "/B551182/hospInfoServicev2/getHospBasisList",
      serviceKey,
      params
    )

    const items = parseHospitalXml(xml)
    const typeName = input.hospitalType
      ? ` [${HOSPITAL_TYPE_MAP[input.hospitalType] ?? input.hospitalType}]`
      : ""
    const body = formatHospitals(items)
    const result =
      `병원 검색 결과 — "${input.keyword}"${typeName}\n\n` +
      body +
      `\n\n출처: 건강보험심사평가원 병원정보서비스 v2` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.HOSPITAL)
    return { content: [{ type: "text", text: result }] }
  },
}
