import { z } from "zod"
import { callPublicApiXml, getDataGoKrKey } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const SearchDrugSchema = z.object({
  drugName: z.string().describe("의약품명 (예: '타이레놀', '아스피린', '이부프로펜')"),
  pageNo: z.number().int().positive().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(5).default(3).describe("결과 개수"),
})

const IdentifyPillSchema = z.object({
  shape: z.string().optional().describe("모양 (원형, 타원형, 장방형, 삼각형, 사각형, 기타)"),
  color: z.string().optional().describe("색상 (예: '흰색', '노란색', '분홍색')"),
  imprint: z.string().optional().describe("각인 문자 또는 숫자 (예: 'ER', '524')"),
  formulation: z.string().optional().describe("제형 (정제, 캡슐제, 필름코팅정 등)"),
})

// ─── XML parser for Service07 ──────────────────────────────────────────────

function xmlGet(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function parsePillXml(xml: string): Record<string, string>[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const raw = m[1]
    const fields = ["ITEM_SEQ", "ITEM_NAME", "ENTP_NAME", "DRUG_SHAPE", "COLOR_CLASS1",
      "PRINT_FRONT", "PRINT_BACK", "FORM_CODE_NAME", "CLASS_NO_NAME"]
    const obj: Record<string, string> = {}
    for (const f of fields) obj[f] = xmlGet(raw, f)
    return obj
  })
}

function extractCdata(sectionXml: string): string[] {
  const matches = [...sectionXml.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)]
  return matches.map(m => m[1].replace(/&nbsp;/g, " ").trim()).filter(t => t.length > 3)
}

function getSectionCdata(itemXml: string, tag: string): string[] {
  const m = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? extractCdata(m[1]) : []
}

interface DrugItem {
  itemName: string
  entpName: string
  etcOtcCode: string
  mainIngr: string
  storageMethod: string
  ee: string[]
  ud: string[]
  nb: string[]
}

function parseDrugXml(xml: string): DrugItem[] {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return itemMatches.map(m => {
    const raw = m[1]
    const ingr = xmlGet(raw, "MAIN_ITEM_INGR").replace(/\[M\d+\]/g, "").trim()
    return {
      itemName: xmlGet(raw, "ITEM_NAME"),
      entpName: xmlGet(raw, "ENTP_NAME"),
      etcOtcCode: xmlGet(raw, "ETC_OTC_CODE"),
      mainIngr: ingr,
      storageMethod: xmlGet(raw, "STORAGE_METHOD"),
      ee: getSectionCdata(raw, "EE_DOC_DATA"),
      ud: getSectionCdata(raw, "UD_DOC_DATA"),
      nb: getSectionCdata(raw, "NB_DOC_DATA"),
    }
  })
}

function formatDrugItem(drug: DrugItem, index: number): string {
  const lines = [
    `${index + 1}. ${drug.itemName} (${drug.entpName})`,
    `   구분: ${drug.etcOtcCode || "-"} | 주성분: ${drug.mainIngr || "-"}`,
  ]
  if (drug.storageMethod) lines.push(`   보관: ${drug.storageMethod}`)

  const eeTexts = drug.ee.filter(t => !t.match(/^\d+\./)).slice(0, 3)
  if (eeTexts.length > 0) lines.push(`   효능·효과:\n     ${eeTexts.join("\n     ")}`)

  const udTexts = drug.ud.slice(0, 4)
  if (udTexts.length > 0) lines.push(`   용법·용량:\n     ${udTexts.join("\n     ")}`)

  const nbTitles = drug.nb.slice(0, 3)
  if (nbTitles.length > 0) lines.push(`   주의사항:\n     ${nbTitles.join("\n     ")}`)

  return lines.join("\n")
}

// ─── identify_pill formatter ────────────────────────────────────────────────

function formatPill(item: Record<string, string>, index: number): string {
  const lines = [
    `${index + 1}. ${item.ITEM_NAME || "-"} (${item.ENTP_NAME || "-"})`,
    `   모양: ${item.DRUG_SHAPE || "-"} | 색상: ${item.COLOR_CLASS1 || "-"}`,
  ]
  if (item.PRINT_FRONT || item.PRINT_BACK) {
    lines.push(`   각인: 앞면 "${item.PRINT_FRONT || ""}" / 뒷면 "${item.PRINT_BACK || ""}"`)
  }
  if (item.FORM_CODE_NAME) lines.push(`   제형: ${item.FORM_CODE_NAME}`)
  if (item.CLASS_NO_NAME) lines.push(`   분류: ${item.CLASS_NO_NAME}`)
  return lines.join("\n")
}

// ─── Tools ─────────────────────────────────────────────────────────────────

export const searchDrugTool: McpTool = {
  name: "search_drug",
  description: "의약품명으로 허가정보(효능, 용법, 주의사항, 주성분)를 검색합니다.",
  schema: SearchDrugSchema,
  handler: async (rawInput) => {
    const input = SearchDrugSchema.parse(rawInput)
    const cacheKey = `drug:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const xml = await callPublicApiXml(
      "/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq06",
      serviceKey,
      { item_name: input.drugName, pageNo: input.pageNo, numOfRows: input.numOfRows }
    )

    const drugs = parseDrugXml(xml)
    const body = drugs.length > 0
      ? drugs.map((d, i) => formatDrugItem(d, i)).join("\n\n")
      : "검색 결과가 없습니다."

    const result =
      `의약품 허가정보 — "${input.drugName}"\n\n` +
      body +
      `\n\n출처: 식품의약품안전처 의약품 제품 허가정보` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}

export const identifyPillTool: McpTool = {
  name: "identify_pill",
  description: "알 수 없는 약을 모양·색상·각인으로 식별합니다. 최소 하나의 파라미터가 필요합니다.",
  schema: IdentifyPillSchema,
  handler: async (rawInput) => {
    const input = IdentifyPillSchema.parse(rawInput)

    if (!input.shape && !input.color && !input.imprint) {
      return {
        content: [{
          type: "text",
          text: "오류: shape(모양), color(색상), imprint(각인) 중 하나 이상을 입력해야 합니다.",
        }],
        isError: true,
      }
    }

    const cacheKey = `pill:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const params: Record<string, string | number> = { pageNo: 1, numOfRows: 10 }
    if (input.shape) params.drug_shape = input.shape
    if (input.color) params.color_class1 = input.color
    if (input.imprint) params.print_front = input.imprint
    if (input.formulation) params.form_code_name = input.formulation

    const xml = await callPublicApiXml(
      "/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03",
      serviceKey,
      params
    )

    const items = parsePillXml(xml)
    const body = items.length > 0
      ? items.map((item, i) => formatPill(item, i)).join("\n\n")
      : "일치하는 약을 찾을 수 없습니다. 다른 조건을 시도해보세요."

    const conditions = [
      input.shape && `모양: ${input.shape}`,
      input.color && `색상: ${input.color}`,
      input.imprint && `각인: ${input.imprint}`,
      input.formulation && `제형: ${input.formulation}`,
    ].filter(Boolean).join(", ")

    const result =
      `알약 식별 결과 — ${conditions}\n\n` +
      body +
      `\n\n출처: 식품의약품안전처 의약품 낱알식별 정보` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}
