import { fetchWithRetry } from "../lib/fetch-with-retry.js"
import { MissingApiKeyError } from "../types/index.js"
import {
  parseLawSearchXml,
  parsePrecedentXml,
  parseAdminAppealXml,
  type LawSearchItem,
  type PrecedentItem,
  type AdminAppealItem,
} from "./xml-parser.js"
import { TTLCache, TTL } from "../lib/cache.js"

const LAW_API_BASE = "https://www.law.go.kr/DRF"

const lawCache = new TTLCache<string, string>()

function getApiKey(): string {
  const key = process.env.MEDI_LAW_KEY || process.env.LAW_OC || process.env.KOREAN_LAW_API_KEY
  if (!key) {
    throw new MissingApiKeyError(
      "MEDI_LAW_KEY",
      "법제처 공개 API",
      "https://open.law.go.kr/LSO/openApi/guideResult.do 에서 신청"
    )
  }
  return key
}

async function lawFetch(endpoint: string, params: URLSearchParams): Promise<string> {
  const cacheKey = `${endpoint}?${params.toString()}`
  const cached = lawCache.get(cacheKey)
  if (cached) return cached

  params.append("OC", getApiKey())
  params.append("type", "XML")

  const url = `${LAW_API_BASE}/${endpoint}?${params.toString()}`
  const response = await fetchWithRetry(url)

  if (!response.ok) {
    try { await response.text() } catch { /* ignore */ }
    throw new Error(`법제처 API 오류 (${response.status})`)
  }

  const text = await response.text()
  if (!text.trim()) return ""
  if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
    throw new Error("법제처 API가 HTML 에러 페이지를 반환했습니다. 파라미터를 확인해주세요.")
  }

  lawCache.set(cacheKey, text, TTL.MEDICAL_LAW)
  return text
}

export async function searchMedicalLaw(params: {
  query: string
  lawName?: string
}): Promise<{ laws: LawSearchItem[]; rawXml: string }> {
  const searchParams = new URLSearchParams({
    target: "law",
    query: params.lawName ?? params.query,
    display: "10",
  })

  const xml = await lawFetch("lawSearch.do", searchParams)
  return { laws: parseLawSearchXml(xml), rawXml: xml }
}

export async function getLawArticle(params: {
  mst: string
  articleNo?: string
}): Promise<string> {
  const searchParams = new URLSearchParams({
    target: "eflaw",
    MST: params.mst,
    type: "JSON",
  })
  if (params.articleNo) searchParams.append("JO", params.articleNo)

  // eflaw는 JSON 응답이므로 별도 처리
  const key = process.env.MEDI_LAW_KEY || process.env.LAW_OC || process.env.KOREAN_LAW_API_KEY
  if (!key) throw new MissingApiKeyError("MEDI_LAW_KEY", "법제처 공개 API", "https://open.law.go.kr/LSO/openApi/guideResult.do 에서 신청")

  searchParams.set("OC", key)

  const cacheKey = `lawService.do?${searchParams.toString()}`
  const cached = lawCache.get(cacheKey)
  if (cached) return cached

  const url = `${LAW_API_BASE}/lawService.do?${searchParams.toString()}`
  const response = await fetchWithRetry(url)
  if (!response.ok) throw new Error(`법제처 API 오류 (${response.status})`)
  const text = await response.text()

  lawCache.set(cacheKey, text, TTL.MEDICAL_LAW)
  return text
}

export async function searchMedicalPrecedent(params: {
  query: string
  fromDate?: string
  toDate?: string
  display?: number
}): Promise<PrecedentItem[]> {
  const searchParams = new URLSearchParams({
    target: "prec",
    query: params.query,
    display: String(params.display ?? 10),
    sort: "ddes",
  })
  if (params.fromDate) searchParams.append("fromDate", params.fromDate)
  if (params.toDate) searchParams.append("toDate", params.toDate)

  const xml = await lawFetch("lawSearch.do", searchParams)
  return parsePrecedentXml(xml)
}

export async function searchAdminDecision(params: {
  query: string
  display?: number
}): Promise<AdminAppealItem[]> {
  const searchParams = new URLSearchParams({
    target: "decc",
    query: params.query,
    display: String(params.display ?? 10),
  })

  const xml = await lawFetch("lawSearch.do", searchParams)
  return parseAdminAppealXml(xml)
}
