import { z } from "zod"
import { fetchWithRetry, maskSensitiveUrl } from "../lib/fetch-with-retry.js"
import { getDataGoKrKey } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()
const CANCER_BASE = "https://www.cancer.go.kr/api"

// ─── API client ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callCancerApi(path: string): Promise<any[]> {
  const key = getDataGoKrKey()
  const url = `${CANCER_BASE}${path}?Key=${encodeURIComponent(key)}`
  const response = await fetchWithRetry(url)

  if (!response.ok) {
    const status = response.status
    try { await response.text() } catch { /* ignore */ }
    throw new Error(`국가암정보센터 API 오류 (${status}) — ${maskSensitiveUrl(url)}`)
  }

  const text = await response.text()
  try {
    const parsed = JSON.parse(text)
    const items = parsed?.result
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch {
    throw new Error("국가암정보센터 API 응답 파싱 실패")
  }
}

// ─── HTML strip helper ─────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim()
}

function truncate(s: string, max = 500): string {
  const clean = stripHtml(s)
  return clean.length > max ? clean.slice(0, max) + "…" : clean
}

// ─── Tool schemas ──────────────────────────────────────────────────────────

const SearchCancerInfoSchema = z.object({
  cancerType: z.string().optional().describe(
    "검색할 암 종류 (예: '갑상선암', '폐암', '위암'). 미입력 시 전체 목록"
  ),
})

const GetCancerPreventionSchema = z.object({
  topic: z.string().optional().describe(
    "검색할 예방/검진 주제 (예: '금연', '음식', '운동'). 미입력 시 전체 목록"
  ),
})

const SearchCancerFaqSchema = z.object({
  query: z.string().optional().describe(
    "검색할 질문 키워드 (예: '금연', '항암치료'). 미입력 시 전체 FAQ"
  ),
  category: z.string().optional().describe(
    "카테고리 필터 (예: '금연', '식이요법')"
  ),
})

const SearchCancerDictionarySchema = z.object({
  term: z.string().describe("검색할 암 관련 용어 (예: '항암제', '면역항암', '전이')"),
})

const GetCancerStatisticsSchema = z.object({
  topic: z.string().optional().describe(
    "통계 주제 (예: '발생률', '생존율', '사망률'). 미입력 시 전체 통계 목록"
  ),
})

const GetCancerLifeGuideSchema = z.object({
  topic: z.string().optional().describe(
    "생활백서 주제 (예: '암생존자', '영양', '운동'). 미입력 시 전체 목록"
  ),
})

// ─── Formatters ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterByQuery(items: any[], query: string | undefined, fields: string[]): any[] {
  if (!query) return items
  const q = query.toLowerCase()
  return items.filter((item) =>
    fields.some((f) => item[f]?.toLowerCase?.()?.includes(q))
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatMenuItems(items: any[], titleKey = "title", contsKey = "conts", naviKey = "page_navi"): string {
  if (items.length === 0) return "검색 결과가 없습니다."
  return items.slice(0, 10).map((item, i) => {
    const lines = [`${i + 1}. ${item[titleKey] ?? "-"}`]
    if (item[naviKey]) lines.push(`   경로: ${item[naviKey]}`)
    if (item[contsKey]) lines.push(`   내용: ${truncate(item[contsKey], 300)}`)
    if (item.page_uri) lines.push(`   링크: ${item.page_uri}`)
    return lines.join("\n")
  }).join("\n\n")
}

// ─── Tools ─────────────────────────────────────────────────────────────────

export const searchCancerInfoTool: McpTool = {
  name: "search_cancer_info",
  description: "국가암정보센터에서 암 종류별 정보를 검색합니다. 갑상선암, 폐암, 위암 등 암 종류별 개요, 원인, 증상, 치료법을 제공합니다.",
  schema: SearchCancerInfoSchema,
  handler: async (rawInput) => {
    const input = SearchCancerInfoSchema.parse(rawInput)
    const cacheKey = `cancer:info:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const items = await callCancerApi("/cancer.do")
    const filtered = filterByQuery(items, input.cancerType, ["title", "page_navi"])
    const body = formatMenuItems(filtered)

    const result =
      `암 정보 — ${input.cancerType ?? "전체"}\n\n` +
      body +
      `\n\n출처: 국가암정보센터 > 내가 알고 싶은 암` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}

export const getCancerPreventionTool: McpTool = {
  name: "get_cancer_prevention",
  description: "암 예방법과 국가암검진 안내를 조회합니다. 금연, 식이, 운동, 암 검진 기준 등을 확인할 수 있습니다.",
  schema: GetCancerPreventionSchema,
  handler: async (rawInput) => {
    const input = GetCancerPreventionSchema.parse(rawInput)
    const cacheKey = `cancer:prevention:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const items = await callCancerApi("/prevention.do")
    const filtered = filterByQuery(items, input.topic, ["title", "page_navi"])
    const body = formatMenuItems(filtered)

    const result =
      `암 예방과 검진 — ${input.topic ?? "전체"}\n\n` +
      body +
      `\n\n출처: 국가암정보센터 > 암예방과 검진` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}

export const searchCancerFaqTool: McpTool = {
  name: "search_cancer_faq",
  description: "국가암정보센터의 암 관련 자주 묻는 질문(FAQ)을 검색합니다.",
  schema: SearchCancerFaqSchema,
  handler: async (rawInput) => {
    const input = SearchCancerFaqSchema.parse(rawInput)
    const cacheKey = `cancer:faq:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const items = await callCancerApi("/faq.do")
    let filtered = filterByQuery(items, input.query, ["title", "conts"])
    if (input.category) {
      filtered = filtered.filter((item) =>
        item.cate?.toLowerCase?.()?.includes(input.category!.toLowerCase())
      )
    }

    if (filtered.length === 0) {
      return {
        content: [{
          type: "text",
          text: `암 FAQ 검색 결과 없음 — "${input.query ?? "전체"}"${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    const body = filtered.slice(0, 10).map((item, i) => {
      const lines = [
        `${i + 1}. [${item.cate ?? "-"}] ${item.title ?? "-"}`,
      ]
      if (item.conts) lines.push(`   답변: ${truncate(item.conts, 400)}`)
      if (item.page_uri) lines.push(`   링크: ${item.page_uri}`)
      return lines.join("\n")
    }).join("\n\n")

    const result =
      `암 FAQ — "${input.query ?? "전체"}"${input.category ? ` [${input.category}]` : ""}\n\n` +
      body +
      `\n\n출처: 국가암정보센터 > 질문과 답변` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}

export const searchCancerDictionaryTool: McpTool = {
  name: "search_cancer_dictionary",
  description: "암정보사전에서 암 관련 의학 용어를 검색합니다. 항암제, 면역항암, 전이 등 전문 용어의 정의를 확인합니다.",
  schema: SearchCancerDictionarySchema,
  handler: async (rawInput) => {
    const input = SearchCancerDictionarySchema.parse(rawInput)
    const cacheKey = `cancer:dict:${input.term}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const items = await callCancerApi("/dictionaryworks.do")
    const q = input.term.toLowerCase()
    const filtered = items.filter((item) =>
      item.work_kor?.toLowerCase?.()?.includes(q) ||
      item.work_eng?.toLowerCase?.()?.includes(q)
    )

    if (filtered.length === 0) {
      return {
        content: [{
          type: "text",
          text: `암정보사전 검색 결과 없음 — "${input.term}"\n\n다른 검색어를 시도해보세요.${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    const body = filtered.slice(0, 5).map((item, i) => {
      const lines = [
        `${i + 1}. ${item.work_kor ?? "-"}${item.work_eng ? ` (${item.work_eng})` : ""}`,
      ]
      if (item.sense_kor) lines.push(`   정의: ${truncate(item.sense_kor, 500)}`)
      return lines.join("\n")
    }).join("\n\n")

    const result =
      `암정보사전 — "${input.term}"\n\n` +
      body +
      `\n\n출처: 국가암정보센터 > 암정보사전` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}

export const getCancerStatisticsTool: McpTool = {
  name: "get_cancer_statistics",
  description: "국가 암 발생률, 생존율, 사망률 등 통계 정보를 조회합니다.",
  schema: GetCancerStatisticsSchema,
  handler: async (rawInput) => {
    const input = GetCancerStatisticsSchema.parse(rawInput)
    const cacheKey = `cancer:stats:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const items = await callCancerApi("/statistics.do")
    const filtered = filterByQuery(items, input.topic, ["title", "page_navi"])
    const body = formatMenuItems(filtered)

    const result =
      `통계로 보는 암 — ${input.topic ?? "전체"}\n\n` +
      body +
      `\n\n출처: 국가암정보센터 > 통계로 보는 암` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}

export const getCancerLifeGuideTool: McpTool = {
  name: "get_cancer_life_guide",
  description: "암환자 생활백서를 조회합니다. 암 생존자 지원, 영양, 운동, 정서 관리 등 암환자의 일상 생활 가이드를 제공합니다.",
  schema: GetCancerLifeGuideSchema,
  handler: async (rawInput) => {
    const input = GetCancerLifeGuideSchema.parse(rawInput)
    const cacheKey = `cancer:life:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const items = await callCancerApi("/life.do")
    const filtered = filterByQuery(items, input.topic, ["title", "page_navi"])
    const body = formatMenuItems(filtered)

    const result =
      `암환자 생활백서 — ${input.topic ?? "전체"}\n\n` +
      body +
      `\n\n출처: 국가암정보센터 > 암환자 생활백서` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}
