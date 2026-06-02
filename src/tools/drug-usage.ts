import { z } from "zod"
import { callPublicApiXml, getDataGoKrKey } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const MSUP_BASE = "/B551182/msupUserInfoService1.2"

// 보험자구분 코드 (insupTp)
const INSR_TYPE: Record<string, string> = {
  "0": "전체",
  "4": "건강보험",
  "5": "의료급여",
  "7": "보훈",
}

// 조제처방구분 코드 (cpmdPrscTp)
const MDS_CD_TYPE: Record<string, string> = {
  "01": "조제기준",
  "02": "처방기준",
}

const GetDrugUsageByAreaSchema = z.object({
  diagYm: z.string().describe(
    "진료년월 (YYYYMM 형식, 예: '202501'). 통상 6개월 이상 전 데이터부터 제공됨."
  ),
  ingrName: z.string().optional().describe(
    "조회할 성분명 키워드 (예: '아세트아미노펜', '메트포르민'). 미입력 시 전체"
  ),
  insupTp: z.enum(["0", "4", "5", "7"]).default("4").describe(
    "보험자구분: 0=전체, 4=건강보험, 5=의료급여, 7=보훈 (기본값: 4)"
  ),
  cpmdPrscTp: z.enum(["01", "02"]).default("02").describe(
    "조제/처방구분: 01=조제기준, 02=처방기준 (기본값: 02)"
  ),
  pageNo: z.number().int().positive().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(20).default(10).describe("결과 개수"),
})

const GetDrugUsageBySickSchema = z.object({
  diagYm: z.string().describe("진료년월 (YYYYMM 형식, 예: '202501')"),
  ingrName: z.string().optional().describe("성분명 키워드 (예: '아세트아미노펜')"),
  insupTp: z.enum(["0", "4", "5", "7"]).default("4").describe(
    "보험자구분: 0=전체, 4=건강보험, 5=의료급여, 7=보훈"
  ),
  cpmdPrscTp: z.enum(["01", "02"]).default("02").describe(
    "조제/처방구분: 01=조제기준, 02=처방기준"
  ),
  pageNo: z.number().int().positive().default(1).describe("페이지 번호"),
  numOfRows: z.number().int().min(1).max(20).default(10).describe("결과 개수"),
})

function xmlGet(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ""
}

function parseUsageXml(xml: string): Record<string, string>[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const raw = m[1]
    const fields = ["cpntNm", "atcCdNm", "sidoCdNm", "sgguNm", "sickNm", "sickCd", "qty", "amt"]
    const obj: Record<string, string> = {}
    for (const f of fields) obj[f] = xmlGet(raw, f)
    return obj
  })
}

function formatAreaItems(items: Record<string, string>[], ingrFilter?: string): string {
  let filtered = items
  if (ingrFilter) {
    const q = ingrFilter.toLowerCase()
    filtered = items.filter(
      i => i.cpntNm?.toLowerCase().includes(q) || i.atcCdNm?.toLowerCase().includes(q)
    )
  }
  if (filtered.length === 0) return "조회 결과가 없습니다."

  return filtered.slice(0, 10).map((item, i) => {
    const lines = [`${i + 1}. ${item.cpntNm || item.atcCdNm || "-"}`]
    if (item.sidoCdNm) lines.push(`   지역: ${item.sidoCdNm} ${item.sgguNm || ""}`)
    if (item.qty) lines.push(`   사용량: ${Number(item.qty).toLocaleString()}`)
    if (item.amt) lines.push(`   금액: ${Number(item.amt).toLocaleString()}원`)
    return lines.join("\n")
  }).join("\n\n")
}

function formatSickItems(items: Record<string, string>[], ingrFilter?: string): string {
  let filtered = items
  if (ingrFilter) {
    const q = ingrFilter.toLowerCase()
    filtered = items.filter(
      i => i.cpntNm?.toLowerCase().includes(q) || i.atcCdNm?.toLowerCase().includes(q)
    )
  }
  if (filtered.length === 0) return "조회 결과가 없습니다."

  return filtered.slice(0, 10).map((item, i) => {
    const lines = [`${i + 1}. ${item.cpntNm || item.atcCdNm || "-"}`]
    if (item.sickNm) lines.push(`   상병명: ${item.sickNm}`)
    if (item.sickCd) lines.push(`   상병코드: ${item.sickCd}`)
    if (item.qty) lines.push(`   사용량: ${Number(item.qty).toLocaleString()}`)
    if (item.amt) lines.push(`   금액: ${Number(item.amt).toLocaleString()}원`)
    return lines.join("\n")
  }).join("\n\n")
}

export const getDrugUsageByAreaTool: McpTool = {
  name: "get_drug_usage_by_area",
  description: "특정 진료년월의 건강보험 의약품 성분별 지역별 사용량·금액 통계를 조회합니다. 지역별 처방 트렌드 분석에 활용합니다.",
  schema: GetDrugUsageByAreaSchema,
  handler: async (rawInput) => {
    const input = GetDrugUsageByAreaSchema.parse(rawInput)
    const cacheKey = `drug_usage_area:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const xml = await callPublicApiXml(
      `${MSUP_BASE}/getCmpnAreaList1.2`,
      serviceKey,
      {
        diagYm: input.diagYm,
        insupTp: input.insupTp,
        cpmdPrscTp: input.cpmdPrscTp,
        pageNo: input.pageNo,
        numOfRows: input.numOfRows,
      }
    )

    const items = parseUsageXml(xml)
    const body = formatAreaItems(items, input.ingrName)
    const insrLabel = INSR_TYPE[input.insupTp] ?? input.insupTp
    const mdsLabel = MDS_CD_TYPE[input.cpmdPrscTp] ?? input.cpmdPrscTp
    const result =
      `의약품 지역별 사용량 — ${input.diagYm} [${insrLabel}/${mdsLabel}]` +
      (input.ingrName ? ` 성분: ${input.ingrName}` : "") +
      `\n\n${body}` +
      `\n\n출처: 건강보험심사평가원 의약품사용정보조회서비스` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.HOSPITAL)
    return { content: [{ type: "text", text: result }] }
  },
}

export const getDrugUsageBySickTool: McpTool = {
  name: "get_drug_usage_by_disease",
  description: "특정 진료년월의 건강보험 의약품 성분별 상병(질환)별 사용량·금액 통계를 조회합니다. 어떤 질환에 어떤 약이 많이 쓰이는지 파악할 수 있습니다.",
  schema: GetDrugUsageBySickSchema,
  handler: async (rawInput) => {
    const input = GetDrugUsageBySickSchema.parse(rawInput)
    const cacheKey = `drug_usage_sick:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()
    const xml = await callPublicApiXml(
      `${MSUP_BASE}/getCmpnSickList1.2`,
      serviceKey,
      {
        diagYm: input.diagYm,
        insupTp: input.insupTp,
        cpmdPrscTp: input.cpmdPrscTp,
        pageNo: input.pageNo,
        numOfRows: input.numOfRows,
      }
    )

    const items = parseUsageXml(xml)
    const body = formatSickItems(items, input.ingrName)
    const insrLabel = INSR_TYPE[input.insupTp] ?? input.insupTp
    const mdsLabel = MDS_CD_TYPE[input.cpmdPrscTp] ?? input.cpmdPrscTp
    const result =
      `의약품 상병별 사용량 — ${input.diagYm} [${insrLabel}/${mdsLabel}]` +
      (input.ingrName ? ` 성분: ${input.ingrName}` : "") +
      `\n\n${body}` +
      `\n\n출처: 건강보험심사평가원 의약품사용정보조회서비스` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.HOSPITAL)
    return { content: [{ type: "text", text: result }] }
  },
}
