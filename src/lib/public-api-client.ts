import { fetchWithRetry, maskSensitiveUrl } from "./fetch-with-retry.js"
import { MissingApiKeyError } from "../types/index.js"

export const DATA_GO_KR_BASE = "https://apis.data.go.kr"

export interface PublicApiParams {
  [key: string]: string | number | boolean | undefined
}

export async function callPublicApi(
  endpoint: string,
  serviceKey: string,
  params: PublicApiParams
): Promise<unknown> {
  const searchParams = new URLSearchParams({ serviceKey })
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) searchParams.append(k, String(v))
  }
  searchParams.append("_type", "json")

  const url = `${DATA_GO_KR_BASE}${endpoint}?${searchParams.toString()}`
  const response = await fetchWithRetry(url)

  if (!response.ok) {
    const status = response.status
    const body = await response.text().catch(() => "")
    if (status === 429) throw new Error("API 요청 한도 초과 (429) - 잠시 후 다시 시도하세요.")
    if (status === 403 || (status >= 500 && body.includes("Unexpected errors"))) {
      const svcCode = endpoint.split("/")[1] ?? ""
      throw new Error(
        `공공데이터포털 서비스 미활성 (${status}) — data.go.kr 에서 "${svcCode}" 서비스 활용신청 후 승인을 받아야 합니다.\n` +
        `활용신청: https://www.data.go.kr 로그인 → 해당 API 검색 → 활용신청`
      )
    }
    if (status >= 500) throw new Error(`공공데이터 서버 오류 (${status}) - ${maskSensitiveUrl(url)}`)
    throw new Error(`API 오류 (${status}) - ${maskSensitiveUrl(url)}`)
  }

  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`JSON 파싱 실패 — API 응답을 확인해주세요. (URL: ${maskSensitiveUrl(url)})`)
  }
}

export function requireApiKey(envVar: string, source: string, guide: string): string {
  const key = process.env[envVar]
  if (!key) throw new MissingApiKeyError(envVar, source, guide)
  return key
}

/** data.go.kr 공공 API 단일 키 반환 */
export function getDataGoKrKey(): string {
  return requireApiKey(
    "DATA_GO_KR_API_KEY",
    "공공데이터포털 (data.go.kr)",
    "https://www.data.go.kr 회원가입 후 활용신청"
  )
}


export async function callPublicApiXml(
  endpoint: string,
  serviceKey: string,
  params: PublicApiParams
): Promise<string> {
  const searchParams = new URLSearchParams({ serviceKey })
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) searchParams.append(k, String(v))
  }

  const url = `${DATA_GO_KR_BASE}${endpoint}?${searchParams.toString()}`
  const response = await fetchWithRetry(url)

  if (!response.ok) {
    const status = response.status
    const body = await response.text().catch(() => "")
    if (status === 403 || (status >= 500 && body.includes("Unexpected errors"))) {
      const svcCode = endpoint.split("/")[1] ?? ""
      throw new Error(
        `공공데이터포털 서비스 미활성 (${status}) — data.go.kr 에서 "${svcCode}" 서비스 활용신청 후 승인을 받아야 합니다.`
      )
    }
    if (status >= 500) throw new Error(`공공데이터 서버 오류 (${status}) - ${maskSensitiveUrl(url)}`)
    throw new Error(`API 오류 (${status}) - ${maskSensitiveUrl(url)}`)
  }

  return response.text()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractItems(data: any): any[] {
  try {
    const body = data?.response?.body
    const items = body?.items?.item
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch {
    return []
  }
}
